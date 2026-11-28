import type { Paginated } from './api';

export interface ReviewDto {
  id: string;
  bookingId: string;
  venueId: string;
  venueName?: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string };
  court: { id: string; name: string };
}

export interface ReviewSummaryDto {
  avgRating: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewListDto extends Paginated<ReviewDto> {
  summary: ReviewSummaryDto;
}
