import type { Prisma } from '@prisma/client';
import type { RecurringSeriesDto } from '@sango/shared';

export const recurringSeriesInclude = {
  court: {
    select: {
      id: true,
      name: true,
      sport: true,
      venue: {
        select: { id: true, name: true, slug: true, address: true, ownerId: true },
      },
    },
  },
  bookings: {
    select: { status: true },
  },
} satisfies Prisma.RecurringSeriesInclude;

export type RecurringSeriesRecord = Prisma.RecurringSeriesGetPayload<{
  include: typeof recurringSeriesInclude;
}>;

export function toRecurringSeriesDto(series: RecurringSeriesRecord): RecurringSeriesDto {
  const stats = {
    total: series.bookings.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };

  for (const b of series.bookings) {
    if (b.status === 'PENDING') stats.pending += 1;
    else if (b.status === 'CONFIRMED') stats.confirmed += 1;
    else if (b.status === 'COMPLETED') stats.completed += 1;
    else if (b.status === 'CANCELLED') stats.cancelled += 1;
    else if (b.status === 'REJECTED') stats.rejected += 1;
  }

  return {
    id: series.id,
    customerId: series.customerId,
    courtId: series.courtId,
    court: {
      id: series.court.id,
      name: series.court.name,
      sport: series.court.sport,
    },
    venue: {
      id: series.court.venue.id,
      name: series.court.venue.name,
      slug: series.court.venue.slug,
      address: series.court.venue.address,
    },
    dayOfWeek: series.dayOfWeek,
    startMinute: series.startMinute,
    slotCount: series.slotCount,
    firstDate: series.firstDate,
    weeks: series.weeks,
    status: series.status,
    createdAt: series.createdAt.toISOString(),
    bookingStats: stats,
  };
}
