import { HttpStatus, Injectable } from '@nestjs/common';
import type { MaintenanceBlock, Prisma } from '@prisma/client';
import type { CreateMaintenanceInput, MaintenanceDto } from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CourtsService } from '../courts/courts.service';
import { toMaintenanceDto } from './maintenance.mapper';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courtsService: CourtsService,
  ) {}

  async findOverlapping(
    courtIds: string[],
    from: Date,
    to: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<MaintenanceBlock[]> {
    const db = tx ?? this.prisma;
    return db.maintenanceBlock.findMany({
      where: {
        courtId: { in: courtIds },
        startAt: { lt: to },
        endAt: { gt: from },
      },
    });
  }

  async listUpcoming(courtId: string, ownerId: string): Promise<MaintenanceDto[]> {
    await this.courtsService.getCourtForOwner(courtId, ownerId);

    const now = new Date();
    const blocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        courtId,
        endAt: { gte: now },
      },
      orderBy: { startAt: 'asc' },
    });

    return blocks.map(toMaintenanceDto);
  }

  async create(
    courtId: string,
    ownerId: string,
    userId: string,
    input: CreateMaintenanceInput,
  ): Promise<MaintenanceDto> {
    await this.courtsService.getCourtForOwner(courtId, ownerId);

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    const now = new Date();

    if (startAt.getTime() <= now.getTime()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Thời gian bắt đầu bảo trì phải ở tương lai',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Serialize maintenance with booking/hold validation for this court.
      await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${courtId} FOR UPDATE`;

      // Kiểm tra trùng với lịch bảo trì khác
      const existingMaintenance = await tx.maintenanceBlock.findFirst({
        where: {
          courtId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (existingMaintenance) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'Khung giờ bảo trì bị trùng với một lịch bảo trì khác đã có',
        );
      }

      // Kiểm tra trùng với đơn đang hiệu lực (có SlotLock của booking)
      const conflictedLocks = await tx.slotLock.findMany({
        where: {
          courtId,
          startAt: { gte: startAt, lt: endAt },
          OR: [{ bookingId: { not: null } }, { holdId: { not: null }, expiresAt: { gte: now } }],
        },
        include: {
          booking: { select: { code: true } },
        },
      });

      if (conflictedLocks.length > 0) {
        const bookingCodes = Array.from(
          new Set(
            conflictedLocks
              .map((lock) => lock.booking?.code)
              .filter((c): c is string => Boolean(c)),
          ),
        );
        throw new AppException(
          HttpStatus.CONFLICT,
          'MAINTENANCE_CONFLICT',
          'Khung giờ bảo trì trùng với đơn đặt sân hoặc lượt giữ chỗ đang hiệu lực',
          { bookingCodes },
        );
      }

      const created = await tx.maintenanceBlock.create({
        data: {
          courtId,
          startAt,
          endAt,
          reason: input.reason,
          createdById: userId,
        },
      });

      return toMaintenanceDto(created);
    });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const block = await this.prisma.maintenanceBlock.findUnique({
      where: { id },
      include: {
        court: {
          include: { venue: true },
        },
      },
    });

    if (!block) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Lịch bảo trì không tồn tại');
    }

    if (block.court.venue.ownerId !== ownerId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xóa lịch bảo trì này',
      );
    }

    await this.prisma.maintenanceBlock.delete({ where: { id } });
  }
}
