export type RevenueGroupBy = 'day' | 'month';

export interface RevenuePoint {
  period: string;
  revenue: number;
  bookingCount: number;
}

export interface RevenueReportDto {
  groupBy: RevenueGroupBy;
  points: RevenuePoint[];
  totalRevenue: number;
  totalBookings: number;
  expectedRevenue: number;
}

export interface OwnerSummaryDto {
  todayBookings: number;
  pendingCount: number;
  monthRevenue: number;
  avgRating: number;
}
