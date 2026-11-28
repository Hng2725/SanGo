import type { Prisma } from '@prisma/client';
import type { ReviewDto } from '@sango/shared';

export const reviewInclude = {
  user: { select: { id: true, fullName: true } },
  venue: { select: { id: true, name: true, ownerId: true } },
  booking: {
    select: {
      court: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

export function toReviewDto(review: ReviewWithRelations): ReviewDto {
  return {
    id: review.id,
    bookingId: review.bookingId,
    venueId: review.venueId,
    venueName: review.venue.name,
    rating: review.rating,
    comment: review.comment,
    ownerReply: review.ownerReply,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    user: {
      id: review.user.id,
      fullName: review.user.fullName,
    },
    court: {
      id: review.booking.court.id,
      name: review.booking.court.name,
    },
  };
}
