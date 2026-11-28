import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  AuthUser,
  AvailabilitySlot,
  SlotBookingInfo as SharedSlotBookingInfo,
} from '@sango/shared';
import { addDaysToDateStr } from '@sango/shared';
import type { CourtWeekAvailabilityDto, VenueDayAvailabilityDto } from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { generateDaySlots, type OpeningHourLike } from './slot-generator';
import { computeSlotStatus } from './slot-status';
import type { SlotBookingInfo as LocalSlotBookingInfo, SlotStatusContext } from './slot-status';
import { calculatePrice } from '../pricing/pricing.calculator';
import type { PricingInput } from '../pricing/pricing.calculator';

/** An operating day's final slot may finish after the calendar boundary. */
function operatingEnd(
  hours: readonly OpeningHourLike[],
  lastDate: string,
  calendarEnd: Date,
): Date {
  const end = generateDaySlots(hours, lastDate).at(-1)?.endAt;
  return end && end > calendarEnd ? end : calendarEnd;
}

/** Map LocalSlotBookingInfo → SharedSlotBookingInfo (fields đều required sau khi sửa slot-status.ts) */
function toSharedBookingInfo(
  local: LocalSlotBookingInfo | undefined,
): SharedSlotBookingInfo | undefined {
  if (!local) return undefined;
  return {
    id: local.id,
    code: local.code,
    status: local.status as SharedSlotBookingInfo['status'],
    customerName: local.customerName,
  };
}

/** Build một AvailabilitySlot từ slot + status result + pricing */
function buildSlot(
  slot: { startAt: Date; endAt: Date; minuteOfDay: number },
  statusResult: ReturnType<typeof computeSlotStatus>,
  pricing: PricingInput | undefined,
): AvailabilitySlot {
  let price: number | null = null;
  let label: string | null = null;
  if (pricing && statusResult.status !== 'PAST' && statusResult.status !== 'MAINTENANCE') {
    try {
      const quote = calculatePrice(pricing, slot.startAt, slot.endAt);
      price = quote.total;
      label = quote.breakdown[0]?.label ?? null;
    } catch {
      price = null;
    }
  }
  const result: AvailabilitySlot = {
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    minuteOfDay: slot.minuteOfDay,
    status: statusResult.status,
    price,
    label,
  };
  const sharedBooking = toSharedBookingInfo(statusResult.booking);
  if (sharedBooking) result.booking = sharedBooking;
  return result;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async getCourtWeek(
    courtId: string,
    weekStart: string,
    viewer?: AuthUser,
  ): Promise<CourtWeekAvailabilityDto> {
    // 1 query: court + venue + openingHours
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: {
        venue: {
          include: { openingHours: true },
        },
      },
    });

    if (!court) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Sân con không tồn tại');
    }

    const isOwner = viewer?.role === 'OWNER' && court.venue.ownerId === viewer.id;

    if (!isOwner && (court.venue.status !== 'ACTIVE' || !court.isActive)) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Sân con không tồn tại hoặc đã đóng',
      );
    }

    const includeBookingInfo = isOwner;
    const weekEndStr = addDaysToDateStr(weekStart, 7);
    const weekStartDate = new Date(`${weekStart}T00:00:00+07:00`);
    const weekEndDate = operatingEnd(
      court.venue.openingHours,
      addDaysToDateStr(weekStart, 6),
      new Date(`${weekEndStr}T00:00:00+07:00`),
    );

    // 1 query: pricing
    const pricingMap = await this.pricingService.getCourtPricing([courtId]);
    const pricing = pricingMap.get(courtId);

    // 1 query: SlotLock trong tuần kèm hold.userId, booking info
    const locks = await this.prisma.slotLock.findMany({
      where: {
        courtId,
        startAt: { gte: weekStartDate, lt: weekEndDate },
      },
      include: {
        hold: { select: { userId: true } },
        booking: {
          select: {
            id: true,
            code: true,
            status: true,
            customer: { select: { fullName: true } },
          },
        },
      },
    });

    // 1 query: MaintenanceBlock overlapping tuần
    const maintenanceBlocks = await this.maintenanceService.findOverlapping(
      [courtId],
      weekStartDate,
      weekEndDate,
    );

    const now = new Date();

    const normalizedLocks: SlotStatusContext['locks'] = locks.map((l) => ({
      startAt: l.startAt,
      bookingId: l.bookingId,
      holdUserId: l.hold?.userId ?? null,
      expiresAt: l.expiresAt,
      booking: l.booking
        ? {
            id: l.booking.id,
            code: l.booking.code,
            status: l.booking.status,
            customerName: l.booking.customer.fullName,
          }
        : undefined,
    }));

    const normalizedMaintenance = maintenanceBlocks.map((m) => ({
      startAt: m.startAt,
      endAt: m.endAt,
    }));

    const days: CourtWeekAvailabilityDto['days'] = Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysToDateStr(weekStart, i);
      const daySlots = generateDaySlots(court.venue.openingHours, dateStr);
      const isClosed = daySlots.length === 0;

      const slots: AvailabilitySlot[] = daySlots.map((slot) => {
        const statusResult = computeSlotStatus(slot, {
          now,
          currentUserId: viewer?.id,
          locks: normalizedLocks,
          maintenance: normalizedMaintenance,
          includeBookingInfo,
        });
        return buildSlot(slot, statusResult, pricing);
      });

      return { date: dateStr, isClosed, slots };
    });

    return {
      court: { id: court.id, name: court.name, sport: court.sport },
      weekStart,
      days,
    };
  }

  async getVenueDay(
    venueId: string,
    date: string,
    viewer?: AuthUser,
  ): Promise<VenueDayAvailabilityDto> {
    // 1 query: venue + openingHours + active courts
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        openingHours: true,
        courts: {
          where: { isActive: true },
          select: { id: true, name: true, sport: true },
        },
      },
    });

    if (!venue) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cụm sân không tồn tại');
    }

    const isOwner = viewer?.role === 'OWNER' && venue.ownerId === viewer.id;

    if (!isOwner && venue.status !== 'ACTIVE') {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Cụm sân không tồn tại hoặc đã đóng',
      );
    }

    const includeBookingInfo = isOwner;
    const courtIds = venue.courts.map((c) => c.id);

    if (courtIds.length === 0) {
      return { venueId, date, courts: [] };
    }

    const dayStartDate = new Date(`${date}T00:00:00+07:00`);
    const dayEndStr = addDaysToDateStr(date, 1);
    const dayEndDate = operatingEnd(
      venue.openingHours,
      date,
      new Date(`${dayEndStr}T00:00:00+07:00`),
    );

    // 1 query: pricing tất cả courts
    const pricingMap = await this.pricingService.getCourtPricing(courtIds);

    // 1 query: SlotLock tất cả courts trong ngày
    const locks = await this.prisma.slotLock.findMany({
      where: {
        courtId: { in: courtIds },
        startAt: { gte: dayStartDate, lt: dayEndDate },
      },
      include: {
        hold: { select: { userId: true } },
        booking: {
          select: {
            id: true,
            code: true,
            status: true,
            customer: { select: { fullName: true } },
          },
        },
      },
    });

    // 1 query: MaintenanceBlock tất cả courts trong ngày
    const maintenanceBlocks = await this.maintenanceService.findOverlapping(
      courtIds,
      dayStartDate,
      dayEndDate,
    );

    const now = new Date();

    const courts: VenueDayAvailabilityDto['courts'] = venue.courts.map((court) => {
      const courtLocks: SlotStatusContext['locks'] = locks
        .filter((l) => l.courtId === court.id)
        .map((l) => ({
          startAt: l.startAt,
          bookingId: l.bookingId,
          holdUserId: l.hold?.userId ?? null,
          expiresAt: l.expiresAt,
          booking: l.booking
            ? {
                id: l.booking.id,
                code: l.booking.code,
                status: l.booking.status,
                customerName: l.booking.customer.fullName,
              }
            : undefined,
        }));

      const courtMaintenance = maintenanceBlocks
        .filter((m) => m.courtId === court.id)
        .map((m) => ({ startAt: m.startAt, endAt: m.endAt }));

      const pricing = pricingMap.get(court.id);
      const daySlots = generateDaySlots(venue.openingHours, date);

      const slots: AvailabilitySlot[] = daySlots.map((slot) => {
        const statusResult = computeSlotStatus(slot, {
          now,
          currentUserId: viewer?.id,
          locks: courtLocks,
          maintenance: courtMaintenance,
          includeBookingInfo,
        });
        return buildSlot(slot, statusResult, pricing);
      });

      return {
        court: { id: court.id, name: court.name, sport: court.sport },
        slots,
      };
    });

    return { venueId, date, courts };
  }
}
