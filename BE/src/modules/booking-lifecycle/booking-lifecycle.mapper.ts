import type { Prisma } from '@prisma/client';
import type {
  BookingActor,
  BookingDetailDto,
  BookingListItemDto,
  BookingTimelineItem,
  PriceBreakdownItem,
  ReviewDto,
} from '@sango/shared';
import { getAllowedActions } from './allowed-actions';
import { getCancelDeadline } from './cancellation-policy';

export const bookingLifecycleInclude = {
  court: {
    select: {
      id: true,
      name: true,
      sport: true,
      venue: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          ownerId: true,
          cancelBeforeHours: true,
        },
      },
    },
  },
  customer: {
    select: { id: true, fullName: true, phone: true },
  },
  review: {
    include: {
      user: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.BookingInclude;

export type BookingLifecycleRecord = Prisma.BookingGetPayload<{
  include: typeof bookingLifecycleInclude;
}>;

function mapReview(record: BookingLifecycleRecord): ReviewDto | null {
  if (!record.review) return null;
  return {
    id: record.review.id,
    bookingId: record.review.bookingId,
    venueId: record.review.venueId,
    venueName: record.court.venue.name,
    rating: record.review.rating,
    comment: record.review.comment,
    ownerReply: record.review.ownerReply,
    createdAt: record.review.createdAt.toISOString(),
    updatedAt: record.review.updatedAt.toISOString(),
    user: {
      id: record.review.user.id,
      fullName: record.review.user.fullName,
    },
    court: {
      id: record.court.id,
      name: record.court.name,
    },
  };
}

function buildTimeline(record: BookingLifecycleRecord): BookingTimelineItem[] {
  const items: BookingTimelineItem[] = [{ status: 'PENDING', at: record.createdAt.toISOString() }];
  if (record.confirmedAt) {
    items.push({ status: 'CONFIRMED', at: record.confirmedAt.toISOString() });
  }
  if (record.completedAt) {
    items.push({ status: 'COMPLETED', at: record.completedAt.toISOString() });
  }
  if (record.cancelledAt) {
    items.push({ status: 'CANCELLED', at: record.cancelledAt.toISOString() });
  }
  if (record.rejectedAt) {
    items.push({ status: 'REJECTED', at: record.rejectedAt.toISOString() });
  }
  return items;
}

export function toBookingListItemDto(
  record: BookingLifecycleRecord,
  actor: BookingActor,
  now: Date,
): BookingListItemDto {
  const allowedActions = getAllowedActions(
    { status: record.status, startAt: record.startAt, endAt: record.endAt },
    actor,
    {
      now,
      cancelBeforeHours: record.court.venue.cancelBeforeHours,
      hasReview: record.review !== null,
    },
  );

  return {
    id: record.id,
    code: record.code,
    status: record.status,
    court: {
      id: record.court.id,
      name: record.court.name,
      sport: record.court.sport,
    },
    venue: {
      id: record.court.venue.id,
      name: record.court.venue.name,
      slug: record.court.venue.slug,
      address: record.court.venue.address,
    },
    customer: {
      id: record.customer.id,
      fullName: record.customer.fullName,
      phone: record.customer.phone,
    },
    startAt: record.startAt.toISOString(),
    endAt: record.endAt.toISOString(),
    totalPrice: record.totalPrice,
    priceBreakdown: record.priceBreakdown as unknown as PriceBreakdownItem[],
    contactPhone: record.contactPhone,
    note: record.note,
    cancelReason: record.cancelReason,
    rejectReason: record.rejectReason,
    recurringSeriesId: record.recurringSeriesId,
    createdAt: record.createdAt.toISOString(),
    allowedActions,
  };
}

export function toBookingDetailDto(
  record: BookingLifecycleRecord,
  actor: BookingActor,
  now: Date,
): BookingDetailDto {
  const base = toBookingListItemDto(record, actor, now);
  const cancelBeforeHours = record.court.venue.cancelBeforeHours;
  const cancelDeadline =
    record.status === 'CONFIRMED'
      ? getCancelDeadline(record.startAt, cancelBeforeHours).toISOString()
      : null;

  return {
    ...base,
    cancelDeadline,
    timeline: buildTimeline(record),
    review: mapReview(record),
    venueCancelBeforeHours: cancelBeforeHours,
  };
}
