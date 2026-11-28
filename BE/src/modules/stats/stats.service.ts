import { Injectable } from '@nestjs/common';
import {
  toVnParts,
  vnDateMinuteToUtc,
  type OwnerSummaryDto,
  type RevenueQuery,
  type RevenueReportDto,
} from '@sango/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';
import { groupRevenue } from './revenue-grouping';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  async revenue(ownerId: string, query: RevenueQuery): Promise<RevenueReportDto> {
    if (query.venueId) {
      await this.venuesService.assertVenueOwner(query.venueId, ownerId);
    }

    const fromUtc = vnDateMinuteToUtc(query.from, 0);
    const toUtc = vnDateMinuteToUtc(query.to, 1440);
    const now = new Date();

    const courtFilter = {
      venue: { ownerId },
      ...(query.venueId ? { venueId: query.venueId } : {}),
    };

    const [completedRows, expectedAgg] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          court: courtFilter,
          startAt: { gte: fromUtc, lt: toUtc },
        },
        select: { startAt: true, totalPrice: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: 'CONFIRMED',
          court: courtFilter,
          startAt: { gte: now },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const points = groupRevenue(completedRows, query.groupBy, query.from, query.to);
    const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const totalBookings = points.reduce((sum, p) => sum + p.bookingCount, 0);

    return {
      groupBy: query.groupBy,
      points,
      totalRevenue,
      totalBookings,
      expectedRevenue: expectedAgg._sum.totalPrice ?? 0,
    };
  }

  async summary(ownerId: string): Promise<OwnerSummaryDto> {
    const now = new Date();
    const { dateStr } = toVnParts(now);
    const todayStart = vnDateMinuteToUtc(dateStr, 0);
    const todayEnd = vnDateMinuteToUtc(dateStr, 1440);
    const monthStartStr = `${dateStr.slice(0, 7)}-01`;
    const monthStart = vnDateMinuteToUtc(monthStartStr, 0);

    const [todayBookings, pendingCount, monthAgg, venues] = await Promise.all([
      this.prisma.booking.count({
        where: {
          court: { venue: { ownerId } },
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
          startAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.booking.count({
        where: {
          court: { venue: { ownerId } },
          status: 'PENDING',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          court: { venue: { ownerId } },
          status: 'COMPLETED',
          startAt: { gte: monthStart, lte: now },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.venue.findMany({
        where: { ownerId },
        select: { avgRating: true, reviewCount: true },
      }),
    ]);

    const totalReviews = venues.reduce((sum, v) => sum + v.reviewCount, 0);
    const weightedRating =
      totalReviews > 0
        ? Number(
            (
              venues.reduce((sum, v) => sum + v.avgRating * v.reviewCount, 0) / totalReviews
            ).toFixed(2),
          )
        : 0;

    return {
      todayBookings,
      pendingCount,
      monthRevenue: monthAgg._sum.totalPrice ?? 0,
      avgRating: weightedRating,
    };
  }
}
