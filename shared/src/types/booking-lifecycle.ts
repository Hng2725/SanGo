import type { BookingAction } from '../booking/booking-status-machine';
import type { BookingStatus } from '../constants/booking-status';
import type { BookingDto } from './booking';
import type { ReviewDto } from './review';

export interface BookingListItemDto extends BookingDto {
  allowedActions: BookingAction[];
}

export interface BookingTimelineItem {
  status: BookingStatus;
  at: string;
}

export interface BookingDetailDto extends BookingListItemDto {
  cancelDeadline: string | null;
  timeline: BookingTimelineItem[];
  review: ReviewDto | null;
  venueCancelBeforeHours: number;
}
