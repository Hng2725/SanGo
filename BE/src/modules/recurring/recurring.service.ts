import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  enumerateSlotStarts,
  toVnParts,
  vnDateMinuteToUtc,
  type AuthUser,
  type CancelRecurringResultDto,
  type ConfirmRecurringResultDto,
  type CreateRecurringInput,
  type CreateRecurringResultDto,
  type RecurringConflictReason,
  type RecurringPreviewDto,
  type RecurringPreviewInput,
  type RecurringPreviewItemDto,
  type RecurringSeriesDto,
} from '@sango/shared';
import { AppEvents, type RecurringEventPayload } from '../../common/events/app-events';
import { AppException } from '../../common/exceptions/app.exception';
import { isPrismaUniqueError } from '../../common/utils/prisma-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingLifecycleService } from '../booking-lifecycle/booking-lifecycle.service';
import { evaluateCancellation } from '../booking-lifecycle/cancellation-policy';
import { bookingDtoInclude, toBookingDto } from '../bookings/bookings.mapper';
import { BookingsService } from '../bookings/bookings.service';
import { SlotLockService } from '../bookings/slot-lock.service';
import { PricingService } from '../pricing/pricing.service';
import { buildWeeklyOccurrences } from './recurring-dates';
import { recurringSeriesInclude, toRecurringSeriesDto } from './recurring.mapper';

@Injectable()
export class RecurringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly slotLockService: SlotLockService,
    private readonly pricingService: PricingService,
    private readonly bookingLifecycleService: BookingLifecycleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private mapUnavailableReason(message: string): RecurringConflictReason {
    if (message.includes('đã qua')) return 'PAST';
    if (message.includes('bảo trì')) return 'MAINTENANCE';
    return 'CLOSED';
  }

  async preview(_customerId: string, input: RecurringPreviewInput): Promise<RecurringPreviewDto> {
    const court = await this.prisma.court.findUnique({
      where: { id: input.courtId },
      include: { venue: { select: { id: true, status: true } } },
    });

    if (!court || !court.isActive || court.venue.status !== 'ACTIVE') {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Sân con không tồn tại hoặc ngừng hoạt động',
      );
    }

    const now = new Date();
    const occurrences = buildWeeklyOccurrences(
      input.firstDate,
      input.startMinute,
      input.slotCount,
      input.weeks,
    );

    const items: RecurringPreviewItemDto[] = [];
    let totalAvailablePrice = 0;

    for (const occ of occurrences) {
      let reason: RecurringConflictReason | null = null;
      let price: number | null = null;

      try {
        await this.bookingsService.assertSlotsBookable(
          this.prisma,
          { id: court.id, venueId: court.venueId },
          occ.startAt,
          occ.endAt,
          now,
        );
      } catch (error) {
        if (error instanceof AppException) {
          reason = this.mapUnavailableReason(error.message);
        } else {
          throw error;
        }
      }

      if (!reason) {
        const slotStarts = enumerateSlotStarts(occ.startAt, occ.endAt);
        const locks = await this.slotLockService.findLocked(court.id, slotStarts);
        const hasActiveLock = locks.some(
          (lock) =>
            lock.bookingId !== null ||
            (lock.holdId !== null &&
              lock.expiresAt !== null &&
              lock.expiresAt.getTime() >= now.getTime()),
        );
        if (hasActiveLock) {
          reason = 'BOOKED';
        }
      }

      if (!reason) {
        const quote = await this.pricingService.quote(court.id, occ.startAt, occ.endAt);
        price = quote.total;
        totalAvailablePrice += quote.total;
      }

      items.push({
        date: occ.date,
        startAt: occ.startAt.toISOString(),
        endAt: occ.endAt.toISOString(),
        available: reason === null,
        reason,
        price,
      });
    }

    return { items, totalAvailablePrice };
  }

  async create(customerId: string, input: CreateRecurringInput): Promise<CreateRecurringResultDto> {
    const previewResult = await this.preview(customerId, input);
    const conflicted = previewResult.items.filter((item) => !item.available);
    const available = previewResult.items.filter((item) => item.available);

    if (conflicted.length > 0 && !input.skipConflicts) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLOT_ALREADY_BOOKED',
        'Một số tuần bị trùng lịch hoặc không khả dụng',
        { conflictedDates: conflicted.map((item) => item.date) },
      );
    }

    if (available.length === 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'SLOT_UNAVAILABLE',
        'Không có tuần nào khả dụng để tạo lịch cố định',
      );
    }

    const now = new Date();
    const { dayOfWeek } = toVnParts(vnDateMinuteToUtc(input.firstDate, 0));

    let result: CreateRecurringResultDto;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const series = await tx.recurringSeries.create({
          data: {
            customerId,
            courtId: input.courtId,
            dayOfWeek,
            startMinute: input.startMinute,
            slotCount: input.slotCount,
            firstDate: input.firstDate,
            weeks: input.weeks,
            status: 'ACTIVE',
          },
        });

        const createdIds: string[] = [];
        for (const item of available) {
          const created = await this.bookingsService.createBookingInTx(
            tx,
            customerId,
            {
              courtId: input.courtId,
              startAt: item.startAt,
              endAt: item.endAt,
              contactPhone: input.contactPhone,
              note: input.note,
            },
            { recurringSeriesId: series.id, now },
          );
          createdIds.push(created.id);
        }

        const [seriesRecord, bookingRecords] = await Promise.all([
          tx.recurringSeries.findUniqueOrThrow({
            where: { id: series.id },
            include: recurringSeriesInclude,
          }),
          tx.booking.findMany({
            where: { id: { in: createdIds } },
            include: bookingDtoInclude,
            orderBy: { startAt: 'asc' },
          }),
        ]);

        return {
          series: toRecurringSeriesDto(seriesRecord),
          created: bookingRecords.map(toBookingDto),
          skippedDates: conflicted.map((item) => item.date),
        };
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'SLOT_ALREADY_BOOKED',
          'Có khung giờ vừa được người khác đặt, vui lòng thử lại',
        );
      }
      throw error;
    }

    const payload: RecurringEventPayload = { seriesId: result.series.id };
    this.eventEmitter.emit(AppEvents.RecurringCreated, payload);

    return result;
  }

  async listMine(customerId: string): Promise<RecurringSeriesDto[]> {
    const list = await this.prisma.recurringSeries.findMany({
      where: { customerId },
      include: recurringSeriesInclude,
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toRecurringSeriesDto);
  }

  async cancelSeries(seriesId: string, user: AuthUser): Promise<CancelRecurringResultDto> {
    const existing = await this.prisma.recurringSeries.findUnique({
      where: { id: seriesId },
      include: {
        bookings: {
          include: {
            court: { include: { venue: { select: { cancelBeforeHours: true } } } },
          },
        },
      },
    });

    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Chuỗi lịch cố định không tồn tại');
    }
    if (existing.customerId !== user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền hủy chuỗi lịch này',
      );
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      let cancelledCount = 0;
      let skippedCount = 0;

      for (const b of existing.bookings) {
        if (b.status !== 'PENDING' && b.status !== 'CONFIRMED') {
          continue;
        }
        const decision = evaluateCancellation({
          status: b.status,
          startAt: b.startAt,
          now,
          cancelBeforeHours: b.court.venue.cancelBeforeHours,
          actor: 'CUSTOMER',
        });
        if (decision.allowed) {
          await this.bookingLifecycleService.transitionInTx(
            tx,
            b.id,
            'CANCELLED',
            'CUSTOMER',
            user,
            { now, reason: 'Hủy chuỗi lịch cố định' },
          );
          cancelledCount += 1;
        } else {
          skippedCount += 1;
        }
      }

      const updated = await tx.recurringSeries.update({
        where: { id: seriesId },
        data: { status: 'CANCELLED' },
        include: recurringSeriesInclude,
      });

      return {
        series: toRecurringSeriesDto(updated),
        cancelledCount,
        skippedCount,
      };
    });
  }

  async confirmSeries(seriesId: string, user: AuthUser): Promise<ConfirmRecurringResultDto> {
    const existing = await this.prisma.recurringSeries.findUnique({
      where: { id: seriesId },
      include: {
        court: { include: { venue: { select: { ownerId: true } } } },
        bookings: true,
      },
    });

    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Chuỗi lịch cố định không tồn tại');
    }
    if (existing.court.venue.ownerId !== user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xác nhận chuỗi lịch của sân này',
      );
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      let confirmedCount = 0;
      for (const b of existing.bookings) {
        if (b.status === 'PENDING' && b.startAt.getTime() > now.getTime()) {
          await this.bookingLifecycleService.transitionInTx(tx, b.id, 'CONFIRMED', 'OWNER', user, {
            now,
          });
          confirmedCount += 1;
        }
      }

      const refreshed = await tx.recurringSeries.findUniqueOrThrow({
        where: { id: seriesId },
        include: recurringSeriesInclude,
      });

      return {
        series: toRecurringSeriesDto(refreshed),
        confirmedCount,
      };
    });
  }
}
