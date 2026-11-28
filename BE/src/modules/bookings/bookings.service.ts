import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  enumerateSlotStarts,
  toVnParts,
  addDaysToDateStr,
  type CreateBookingInput,
  type BookingDto,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { isPrismaUniqueError } from '../../common/utils/prisma-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { generateDaySlots, type OpeningHourLike } from '../availability/slot-generator';
import { SlotLockService } from './slot-lock.service';
import { generateBookingCode } from './booking-code';
import { bookingDtoInclude, toBookingDto } from './bookings.mapper';
import { AppEvents, type BookingEventPayload } from '../../common/events/app-events';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotLockService: SlotLockService,
    private readonly pricingService: PricingService,
    private readonly maintenanceService: MaintenanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Kiểm tra khung giờ có hợp lệ: thuộc giờ mở cửa, chưa qua, không chồng bảo trì.
   * Public – Dương dùng cho lịch cố định.
   */
  async assertSlotsBookable(
    txOrPrisma: Prisma.TransactionClient,
    court: { id: string; venueId: string },
    startAt: Date,
    endAt: Date,
    now: Date,
  ): Promise<void> {
    // Serialize reservations with maintenance on the same court. Write callers use a transaction.
    await txOrPrisma.$queryRaw`SELECT id FROM "Court" WHERE id = ${court.id} FOR UPDATE`;
    const activeCourt = await txOrPrisma.court.findUnique({
      where: { id: court.id },
      include: { venue: { select: { status: true } } },
    });
    if (!activeCourt?.isActive || activeCourt.venue.status !== 'ACTIVE') {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Sân không còn hoạt động');
    }
    // 1. Kiểm tra startAt > now
    if (startAt.getTime() <= now.getTime()) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLOT_UNAVAILABLE',
        'Không thể đặt khung giờ đã qua',
      );
    }

    // 2. Kiểm tra thuộc giờ mở cửa
    const openingHours = await txOrPrisma.openingHour.findMany({
      where: { venue: { id: court.venueId } },
    });

    const slotStarts = enumerateSlotStarts(startAt, endAt);
    if (!this.isWithinOpeningHours(slotStarts, openingHours)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLOT_UNAVAILABLE',
        'Các khung giờ phải thuộc cùng một ngày hoạt động trong giờ mở cửa',
      );
    }

    // 3. Kiểm tra không chồng bảo trì
    const overlapping = await this.maintenanceService.findOverlapping(
      [court.id],
      startAt,
      endAt,
      txOrPrisma,
    );
    if (overlapping.length > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLOT_UNAVAILABLE',
        'Khung giờ trùng với lịch bảo trì',
      );
    }
  }

  /**
   * Kiểm tra 1 slot có nằm trong giờ mở cửa (kể cả ca qua đêm ngày trước).
   */
  private isWithinOpeningHours(
    slotStarts: readonly Date[],
    openingHours: readonly OpeningHourLike[],
  ): boolean {
    if (!slotStarts.length) return false;
    const { dateStr } = toVnParts(slotStarts[0]);

    // Kiểm tra ngày hoạt động chính
    const slotsToday = generateDaySlots(openingHours, dateStr);
    if (
      slotStarts.every((start) =>
        slotsToday.some((slot) => slot.startAt.getTime() === start.getTime()),
      )
    ) {
      return true;
    }

    // Kiểm tra ca qua đêm của ngày trước
    const prevDateStr = addDaysToDateStr(dateStr, -1);
    const slotsPrev = generateDaySlots(openingHours, prevDateStr);
    if (
      slotStarts.every((start) =>
        slotsPrev.some((slot) => slot.startAt.getTime() === start.getTime()),
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Tạo booking bên trong transaction (Dương dùng cho lịch cố định).
   * KHÔNG emit event.
   */
  async createBookingInTx(
    tx: Prisma.TransactionClient,
    customerId: string,
    input: CreateBookingInput,
    opts?: { recurringSeriesId?: string; now?: Date },
  ): Promise<{ id: string }> {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    // Keep the same customer -> court -> hold/slot lock order as hold replacement.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${customerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${input.courtId} FOR UPDATE`;
    const now = opts?.now ?? new Date();

    // 1. Kiểm tra court và venue active
    const court = await tx.court.findUnique({
      where: { id: input.courtId },
      include: { venue: { select: { id: true, status: true } } },
    });

    if (!court || !court.isActive) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Sân con không tồn tại hoặc đã ngừng hoạt động',
      );
    }
    if (court.venue.status !== 'ACTIVE') {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cụm sân không hoạt động');
    }

    // 2. assertSlotsBookable
    await this.assertSlotsBookable(
      tx,
      { id: court.id, venueId: court.venueId },
      startAt,
      endAt,
      now,
    );

    // 3. Xử lý hold
    const slotStarts = enumerateSlotStarts(startAt, endAt);

    if (input.holdId) {
      // Hold phải của user, chưa hết hạn, khớp court/start/end
      const hold = await tx.bookingHold.findUnique({ where: { id: input.holdId } });
      if (!hold) {
        throw new AppException(HttpStatus.CONFLICT, 'HOLD_EXPIRED', 'Giữ chỗ không tồn tại');
      }
      if (hold.userId !== customerId) {
        throw new AppException(HttpStatus.CONFLICT, 'HOLD_EXPIRED', 'Giữ chỗ không thuộc về bạn');
      }
      if (hold.expiresAt.getTime() < now.getTime()) {
        throw new AppException(HttpStatus.CONFLICT, 'HOLD_EXPIRED', 'Giữ chỗ đã hết hạn');
      }
      if (
        hold.courtId !== input.courtId ||
        hold.startAt.getTime() !== startAt.getTime() ||
        hold.endAt.getTime() !== endAt.getTime()
      ) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'HOLD_EXPIRED',
          'Giữ chỗ không khớp với đơn đặt',
        );
      }
    }

    // 4. Tính giá
    const quote = await this.pricingService.quote(input.courtId, startAt, endAt, tx);

    // 5. Tạo booking
    const code = generateBookingCode(now);
    const booking = await tx.booking.create({
      data: {
        code,
        customerId,
        courtId: input.courtId,
        startAt,
        endAt,
        totalPrice: quote.total,
        priceBreakdown: quote.breakdown as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
        contactPhone: input.contactPhone,
        note: input.note,
        recurringSeriesId: opts?.recurringSeriesId,
      },
    });

    // 6. Tạo/chuyển SlotLock
    if (input.holdId) {
      // Chuyển lock từ hold sang booking
      const converted = await tx.slotLock.updateMany({
        where: {
          holdId: input.holdId,
          courtId: input.courtId,
          startAt: { in: slotStarts },
          expiresAt: { gt: now },
        },
        data: {
          bookingId: booking.id,
          holdId: null,
          expiresAt: null,
        },
      });
      if (converted.count !== slotStarts.length) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'HOLD_EXPIRED',
          'Giữ chỗ không còn đủ khung giờ. Vui lòng chọn lại.',
        );
      }
      // Xóa hold
      await tx.bookingHold.delete({ where: { id: input.holdId } });
    } else {
      // Xóa lock hold hết hạn, rồi tạo mới
      await this.slotLockService.purgeExpiredHoldLocks(tx, input.courtId, slotStarts, now);
      await this.slotLockService.lockForBooking(tx, {
        courtId: input.courtId,
        startAt,
        endAt,
        bookingId: booking.id,
      });
    }

    return { id: booking.id };
  }

  /**
   * Tạo booking: chạy transaction, bắt P2002, emit event, trả BookingDto.
   */
  async createBooking(customerId: string, input: CreateBookingInput): Promise<BookingDto> {
    let bookingId: string;

    const tryCreate = async (): Promise<string> => {
      return this.prisma.$transaction(
        async (tx) => {
          const result = await this.createBookingInTx(tx, customerId, input);
          return result.id;
        },
        { timeout: 10_000 },
      );
    };

    try {
      bookingId = await tryCreate();
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const meta = error.meta as { target?: string[] } | undefined;
        if (meta?.target?.includes('code')) {
          // Trùng mã booking → retry 1 lần
          bookingId = await tryCreate();
        } else {
          throw new AppException(
            HttpStatus.CONFLICT,
            'SLOT_ALREADY_BOOKED',
            'Khung giờ bạn chọn vừa có người đặt. Vui lòng chọn khung khác.',
            { courtId: input.courtId, startAt: input.startAt, endAt: input.endAt },
          );
        }
      } else {
        throw error;
      }
    }

    // Emit event
    this.eventEmitter.emit(AppEvents.BookingCreated, {
      bookingId,
    } satisfies BookingEventPayload);

    // Trả BookingDto
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: bookingDtoInclude,
    });

    return toBookingDto(booking);
  }
}
