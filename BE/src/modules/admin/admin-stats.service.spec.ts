import type { AuthUser } from '@sango/shared';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminStatsService } from './admin-stats.service';
const actor: AuthUser = {
  id: 'admin1',
  email: 'admin@sango.vn',
  fullName: 'Admin',
  role: 'ADMIN',
  ownerStatus: 'NONE',
};
describe('AdminStatsService', () => {
  it('groups bookings and revenue by Vietnam day', async () => {
    const prisma = {
      booking: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn(),
      },
      user: { count: jest.fn() },
      complaint: { count: jest.fn() },
      court: { findMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([
        [{ createdAt: new Date('2026-11-20T17:00:00Z') }],
        [
          {
            startAt: new Date('2026-11-20T17:00:00Z'),
            status: 'CONFIRMED',
            totalPrice: 200000,
            court: {
              sport: 'FOOTBALL',
              venue: {
                id: 'v1',
                slug: 'stadium',
                name: 'Stadium',
                district: 'Quận 1',
                city: 'TP.HCM',
                imageUrls: [],
                avgRating: 4.5,
                owner: { fullName: 'Owner' },
              },
            },
          },
        ],
        [{ status: 'CONFIRMED', _count: { _all: 1 } }],
        2,
        1,
        3,
        1,
        { _sum: { totalPrice: 200000 } },
        { _sum: { totalPrice: 100000 } },
        [
          {
            venue: {
              openingHours: [{ dayOfWeek: 6, isClosed: false, openMinute: 480, closeMinute: 600 }],
            },
            slotLocks: [{ startAt: new Date('2026-11-21T01:00:00Z') }],
          },
        ],
      ]),
    };
    const service = new AdminStatsService(prisma as never);
    const result = await service.overview(actor, new Date('2026-11-20T18:00:00Z'));
    expect(result.today).toMatchObject({
      date: '2026-11-21',
      newBookings: 1,
      newBookingsDelta: 0,
      revenue: 200000,
      revenueDeltaPct: 100,
      occupancyRate: 0.5,
    });
    expect(result.bySport).toEqual([{ sport: 'FOOTBALL', bookings: 1 }]);
    expect(result.topVenues[0]).toMatchObject({ slug: 'stadium', bookings: 1, revenue: 200000 });
  });
  it.each([
    {
      name: 'overnight slots remain in their Vietnam operating day',
      courts: [
        {
          venue: {
            openingHours: [{ dayOfWeek: 5, isClosed: false, openMinute: 1320, closeMinute: 1560 }],
          },
          slotLocks: [
            { startAt: new Date('2026-11-20T17:00:00Z') },
            { startAt: new Date('2026-11-20T18:00:00Z') },
            { startAt: new Date('2026-11-20T01:00:00Z') },
          ],
        },
      ],
      expected: 0.5,
    },
    { name: 'no active courts', courts: [], expected: 0 },
    {
      name: 'closed courts do not divide by zero',
      courts: [
        {
          venue: {
            openingHours: [{ dayOfWeek: 5, isClosed: true, openMinute: 480, closeMinute: 600 }],
          },
          slotLocks: [{ startAt: new Date('2026-11-20T01:00:00Z') }],
        },
      ],
      expected: 0,
    },
  ])('calculates occupancy: $name', async ({ courts, expected }) => {
    const prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockResolvedValue([
      [],
      [],
      [],
      0,
      0,
      0,
      0,
      { _sum: { totalPrice: null } },
      { _sum: { totalPrice: null } },
      courts,
    ]);
    prisma.booking.count.mockResolvedValue(0);
    const result = await new AdminStatsService(prisma).overview(
      actor,
      new Date('2026-11-20T10:00:00Z'),
    );
    expect(result.today.occupancyRate).toBe(expected);
    expect(prisma.court.findMany.mock.calls[0]?.[0]).toEqual({
      where: { isActive: true, venue: { status: 'ACTIVE' } },
      select: {
        venue: { select: { openingHours: true } },
        slotLocks: {
          where: {
            startAt: {
              gte: new Date('2026-11-19T17:00:00Z'),
              lt: new Date('2026-11-20T23:00:00Z'),
            },
            booking: { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
          },
          select: { startAt: true },
        },
      },
    });
  });
});
