import type { RecurringStatus } from '../constants/booking-status';
import type { Sport } from '../constants/sports';
import type { BookingDto } from './booking';

export type RecurringConflictReason = 'BOOKED' | 'MAINTENANCE' | 'CLOSED' | 'PAST';

export interface RecurringPreviewItemDto {
  date: string;
  startAt: string;
  endAt: string;
  available: boolean;
  reason: RecurringConflictReason | null;
  price: number | null;
}

export interface RecurringPreviewDto {
  items: RecurringPreviewItemDto[];
  totalAvailablePrice: number;
}

export interface RecurringSeriesDto {
  id: string;
  customerId: string;
  courtId: string;
  court: { id: string; name: string; sport: Sport };
  venue: { id: string; name: string; slug: string; address: string };
  dayOfWeek: number;
  startMinute: number;
  slotCount: number;
  firstDate: string;
  weeks: number;
  status: RecurringStatus;
  createdAt: string;
  bookingStats: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };
}

export interface CreateRecurringResultDto {
  series: RecurringSeriesDto;
  created: BookingDto[];
  skippedDates: string[];
}

export interface CancelRecurringResultDto {
  series: RecurringSeriesDto;
  cancelledCount: number;
  skippedCount: number;
}

export interface ConfirmRecurringResultDto {
  series: RecurringSeriesDto;
  confirmedCount: number;
}
