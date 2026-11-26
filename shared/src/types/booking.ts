import type { BookingStatus } from '../constants/booking-status';
import type { Sport } from '../constants/sports';
import type { PriceBreakdownItem } from './pricing';

export interface BookingDto {
  id: string;
  code: string;
  status: BookingStatus;
  court: { id: string; name: string; sport: Sport };
  venue: { id: string; name: string; slug: string; address: string };
  customer: { id: string; fullName: string; phone: string | null };
  startAt: string;
  endAt: string;
  totalPrice: number;
  priceBreakdown: PriceBreakdownItem[];
  contactPhone: string;
  note: string | null;
  cancelReason: string | null;
  rejectReason: string | null;
  recurringSeriesId: string | null;
  createdAt: string;
}

export interface HoldDto {
  id: string;
  courtId: string;
  startAt: string;
  endAt: string;
  expiresAt: string;
}
