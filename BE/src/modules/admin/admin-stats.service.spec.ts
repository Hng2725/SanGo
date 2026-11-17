import type { AuthUser } from '@sango/shared';
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
      occupancyRate: null,
    });
    expect(result.bySport).toEqual([{ sport: 'FOOTBALL', bookings: 1 }]);
    expect(result.topVenues[0]).toMatchObject({ slug: 'stadium', bookings: 1, revenue: 200000 });
  });
});
