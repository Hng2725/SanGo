import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { enumerateSlotStarts } from '@sango/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SlotLockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo SlotLock cho booking (bookingId != null, holdId = null, expiresAt = null).
   */
  async lockForBooking(
    tx: Prisma.TransactionClient,
    params: { courtId: string; startAt: Date; endAt: Date; bookingId: string },
  ): Promise<void> {
    const slotStarts = enumerateSlotStarts(params.startAt, params.endAt);
    await tx.slotLock.createMany({
      data: slotStarts.map((start) => ({
        courtId: params.courtId,
        startAt: start,
        bookingId: params.bookingId,
        holdId: null,
        expiresAt: null,
      })),
    });
  }

  /**
   * Xóa các SlotLock hold đã hết hạn cho các khung cụ thể.
   */
  async purgeExpiredHoldLocks(
    tx: Prisma.TransactionClient,
    courtId: string,
    startAts: Date[],
    now: Date,
  ): Promise<void> {
    if (startAts.length === 0) return;
    await tx.slotLock.deleteMany({
      where: {
        courtId,
        startAt: { in: startAts },
        holdId: { not: null },
        expiresAt: { lt: now },
      },
    });
  }

  /**
   * Giải phóng khung khi đơn CANCELLED/REJECTED.
   */
  async releaseBooking(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ): Promise<void> {
    await tx.slotLock.deleteMany({ where: { bookingId } });
  }

  /**
   * Tìm các khung đã bị khóa (Dương dùng cho lịch cố định).
   */
  async findLocked(
    courtId: string,
    startAts: Date[],
    tx?: Prisma.TransactionClient,
  ): Promise<{ startAt: Date; bookingId: string | null; holdId: string | null; expiresAt: Date | null }[]> {
    if (startAts.length === 0) return [];
    const db = tx ?? this.prisma;
    return db.slotLock.findMany({
      where: {
        courtId,
        startAt: { in: startAts },
      },
      select: {
        startAt: true,
        bookingId: true,
        holdId: true,
        expiresAt: true,
      },
    });
  }
}
