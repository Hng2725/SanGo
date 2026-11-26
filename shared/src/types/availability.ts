import type { BookingStatus } from '../constants/booking-status';
import type { CourtSummaryDto } from './venue';

/** Trạng thái của một khung giờ, theo thứ tự ưu tiên giảm dần */
export type SlotStatus =
  | 'PAST'
  | 'BOOKED'
  | 'MAINTENANCE'
  | 'HELD_BY_ME'
  | 'HELD'
  | 'AVAILABLE'
  | 'CLOSED';

/** Thông tin booking gắn với khung (chỉ trả cho OWNER sở hữu) */
export interface SlotBookingInfo {
  id: string;
  code: string;
  status: BookingStatus;
  customerName: string;
}

/** Một khung giờ trong lịch trống */
export interface AvailabilitySlot {
  startAt: string; // ISO 8601
  endAt: string;   // ISO 8601
  minuteOfDay: number;
  status: SlotStatus;
  price: number | null;
  label: string | null;
  booking?: SlotBookingInfo; // chỉ có khi includeBookingInfo = true và status = BOOKED
}

/** Lịch trống 1 sân theo tuần */
export interface CourtWeekAvailabilityDto {
  court: CourtSummaryDto;
  weekStart: string; // 'YYYY-MM-DD' (Thứ 2)
  days: {
    date: string;      // 'YYYY-MM-DD'
    isClosed: boolean;
    slots: AvailabilitySlot[];
  }[];
}

/** Lịch trống tất cả sân của venue trong 1 ngày */
export interface VenueDayAvailabilityDto {
  venueId: string;
  date: string; // 'YYYY-MM-DD'
  courts: {
    court: CourtSummaryDto;
    slots: AvailabilitySlot[];
  }[];
}
