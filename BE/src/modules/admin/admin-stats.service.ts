import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BOOKING_STATUSES,
  toVnParts,
  vnDateMinuteToUtc,
  addDaysToDateStr,
  type AdminOverviewDto,
  type AuthUser,
  type BookingStatus,
  type Sport,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { groupBookingsByVnDate } from './admin-overview.util';
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}
  async overview(actor: AuthUser, now = new Date()): Promise<AdminOverviewDto> {
    if (actor.role !== 'ADMIN')
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Chỉ quản trị viên được xem thống kê',
      );
    const today = toVnParts(now).dateStr,
      tomorrow = addDaysToDateStr(today, 1),
      yesterday = addDaysToDateStr(today, -1);
    const startToday = vnDateMinuteToUtc(today, 0),
      endToday = vnDateMinuteToUtc(tomorrow, 0),
      startYesterday = vnDateMinuteToUtc(yesterday, 0);
    const start7 = vnDateMinuteToUtc(addDaysToDateStr(today, -6), 0),
      startMonth = vnDateMinuteToUtc(`${today.slice(0, 7)}-01`, 0);
    const [
      recent,
      monthly,
      statusGroups,
      pendingOwners,
      openComplaints,
      pendingConfirm,
      startingSoon,
      todayRevenue,
      yesterdayRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { createdAt: { gte: start7, lt: endToday } },
        select: { createdAt: true },
      }),
      this.prisma.booking.findMany({
        where: { startAt: { gte: startMonth, lt: endToday } },
        select: {
          startAt: true,
          status: true,
          totalPrice: true,
          court: {
            select: {
              sport: true,
              venue: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  district: true,
                  city: true,
                  imageUrls: true,
                  avgRating: true,
                  owner: { select: { fullName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { role: 'OWNER', ownerStatus: 'PENDING' } }),
      this.prisma.complaint.count({ where: { status: 'OPEN' } }),
      this.prisma.booking.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.count({
        where: {
          status: 'PENDING',
          startAt: { gte: now, lte: new Date(now.getTime() + 3 * 3600000) },
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          startAt: { gte: startToday, lt: endToday },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          startAt: { gte: startYesterday, lt: startToday },
        },
        _sum: { totalPrice: true },
      }),
    ]);
    const last7Days = groupBookingsByVnDate(
      recent.map((item) => item.createdAt),
      today,
      7,
    );
    const yesterdayBookings = await this.prisma.booking.count({
      where: { createdAt: { gte: startYesterday, lt: startToday } },
    });
    const todayBookings = last7Days[6].bookings;
    const yesterdayAmount = yesterdayRevenue._sum.totalPrice ?? 0,
      todayAmount = todayRevenue._sum.totalPrice ?? 0;
    const bySport = new Map<Sport, number>();
    const byVenue = new Map<string, AdminOverviewDto['topVenues'][number]>();
    for (const booking of monthly) {
      bySport.set(booking.court.sport, (bySport.get(booking.court.sport) ?? 0) + 1);
      const venue = booking.court.venue;
      const item = byVenue.get(venue.id) ?? {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        district: venue.district,
        city: venue.city,
        imageUrl: venue.imageUrls[0] ?? null,
        sports: [],
        ownerName: venue.owner.fullName,
        bookings: 0,
        revenue: 0,
        avgRating: venue.avgRating,
      };
      item.bookings += 1;
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
        item.revenue += booking.totalPrice;
      if (!item.sports.includes(booking.court.sport)) item.sports.push(booking.court.sport);
      byVenue.set(venue.id, item);
    }
    const bookingsByStatus = Object.fromEntries(
      BOOKING_STATUSES.map((status) => {
        const count = statusGroups.find((group) => group.status === status)?._count;
        return [status, typeof count === 'object' ? (count?._all ?? 0) : 0];
      }),
    ) as Record<BookingStatus, number>;
    return {
      today: {
        date: today,
        newBookings: todayBookings,
        newBookingsDelta: todayBookings - yesterdayBookings,
        occupancyRate: null,
        revenue: todayAmount,
        revenueDeltaPct: yesterdayAmount
          ? Math.round(((todayAmount - yesterdayAmount) / yesterdayAmount) * 100)
          : 0,
        pendingConfirm,
        startingSoon,
      },
      last7Days,
      bySport: [...bySport]
        .map(([sport, bookings]) => ({ sport, bookings }))
        .sort((a, b) => b.bookings - a.bookings),
      bookingsByStatus,
      pendingOwners,
      openComplaints,
      topVenues: [...byVenue.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 5),
    };
  }
}
