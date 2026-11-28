import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  enumerateSlotStarts,
  HOLD_TTL_MINUTES,
  type CreateHoldInput,
  type HoldDto,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { isPrismaUniqueError } from '../../common/utils/prisma-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { SlotLockService } from '../bookings/slot-lock.service';

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly slotLockService: SlotLockService,
  ) {}

  async createHold(userId: string, input: CreateHoldInput): Promise<HoldDto> {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    try {
      const hold = await this.prisma.$transaction(
        async (tx) => {
          // Serialize a customer's hold replacement with checkout. Lock all affected courts
          // in deterministic order before cascading deletes touch their SlotLock rows.
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
          const previousHolds = await tx.bookingHold.findMany({
            where: { userId },
            select: { courtId: true },
          });
          const courtIds = [
            ...new Set([input.courtId, ...previousHolds.map((hold) => hold.courtId)]),
          ].sort();
          await tx.$queryRaw`SELECT id FROM "Court" WHERE id IN (${Prisma.join(courtIds)}) ORDER BY id FOR UPDATE`;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + HOLD_TTL_MINUTES * 60_000);
          // 1. Xóa hold cũ của user (cascade xóa SlotLock)
          await tx.bookingHold.deleteMany({ where: { userId } });

          // 2. Kiểm tra court active
          const court = await tx.court.findUnique({
            where: { id: input.courtId },
            include: { venue: { select: { id: true, status: true } } },
          });
          if (!court || !court.isActive || court.venue.status !== 'ACTIVE') {
            throw new AppException(
              HttpStatus.NOT_FOUND,
              'NOT_FOUND',
              'Sân con không tồn tại hoặc đã ngừng hoạt động',
            );
          }

          // 3. assertSlotsBookable
          await this.bookingsService.assertSlotsBookable(
            tx,
            { id: court.id, venueId: court.venueId },
            startAt,
            endAt,
            now,
          );

          // 4. Purge expired hold locks cho các khung này
          const slotStarts = enumerateSlotStarts(startAt, endAt);
          await this.slotLockService.purgeExpiredHoldLocks(tx, input.courtId, slotStarts, now);

          // 5. Tạo BookingHold + SlotLock
          const created = await tx.bookingHold.create({
            data: {
              userId,
              courtId: input.courtId,
              startAt,
              endAt,
              expiresAt,
            },
          });

          await tx.slotLock.createMany({
            data: slotStarts.map((s) => ({
              courtId: input.courtId,
              startAt: s,
              holdId: created.id,
              bookingId: null,
              expiresAt,
            })),
          });

          return created;
        },
        { timeout: 10_000 },
      );

      return {
        id: hold.id,
        courtId: hold.courtId,
        startAt: hold.startAt.toISOString(),
        endAt: hold.endAt.toISOString(),
        expiresAt: hold.expiresAt.toISOString(),
      };
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'SLOT_ALREADY_BOOKED',
          'Khung giờ bạn chọn đã có người giữ hoặc đặt. Vui lòng chọn khung khác.',
        );
      }
      throw error;
    }
  }

  async deleteHold(holdId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const hold = await tx.bookingHold.findUnique({ where: { id: holdId } });
      if (!hold) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Giữ chỗ không tồn tại');
      if (hold.userId !== userId) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'Bạn không có quyền xóa giữ chỗ này',
        );
      }
      await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${hold.courtId} FOR UPDATE`;
      await tx.bookingHold.delete({ where: { id: holdId } });
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async purgeExpiredHolds(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.bookingHold.findMany({
      where: { expiresAt: { lt: now } },
      select: { id: true, userId: true, courtId: true },
    });
    if (!expired.length) return;
    const result = await this.prisma.$transaction(async (tx) => {
      const userIds = [...new Set(expired.map((hold) => hold.userId))].sort();
      const courtIds = [...new Set(expired.map((hold) => hold.courtId))].sort();
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${Prisma.join(userIds)}) ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Court" WHERE id IN (${Prisma.join(courtIds)}) ORDER BY id FOR UPDATE`;
      return tx.bookingHold.deleteMany({
        where: { id: { in: expired.map((hold) => hold.id) }, expiresAt: { lt: now } },
      });
    });
    if (result.count > 0) {
      this.logger.log(`Đã xóa ${result.count} giữ chỗ hết hạn`);
    }
  }
}
