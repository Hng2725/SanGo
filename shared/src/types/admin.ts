import type { BookingStatus } from '../constants/booking-status';
import type { Sport } from '../constants/sports';
export interface AdminOverviewDto {
  today: { date: string; newBookings: number; newBookingsDelta: number; occupancyRate: number | null; revenue: number; revenueDeltaPct: number; pendingConfirm: number; startingSoon: number };
  last7Days: { date: string; bookings: number }[];
  bySport: { sport: Sport; bookings: number }[];
  bookingsByStatus: Record<BookingStatus, number>;
  pendingOwners: number;
  openComplaints: number;
  topVenues: { id: string; slug: string; name: string; district: string; city: string; imageUrl: string | null; sports: Sport[]; ownerName: string; bookings: number; revenue: number; avgRating: number }[];
}
