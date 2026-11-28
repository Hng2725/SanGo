import { groupRevenue } from './revenue-grouping';

describe('revenue-grouping', () => {
  it('đưa đơn lúc 23:30 VN (16:30 UTC) vào đúng ngày VN và lấp ngày trống bằng 0', () => {
    const rows = [
      // 2026-11-20 16:30:00Z == 2026-11-20 23:30:00 VN
      { startAt: new Date('2026-11-20T16:30:00.000Z'), totalPrice: 200_000 },
    ];

    const points = groupRevenue(rows, 'day', '2026-11-19', '2026-11-21');

    expect(points).toEqual([
      { period: '2026-11-19', revenue: 0, bookingCount: 0 },
      { period: '2026-11-20', revenue: 200_000, bookingCount: 1 },
      { period: '2026-11-21', revenue: 0, bookingCount: 0 },
    ]);
  });

  it('đưa đơn 00:30 VN ngày 1 (17:30 UTC ngày trước) vào đúng tháng mới', () => {
    const rows = [
      // 2026-11-30 17:30:00Z == 2026-12-01 00:30:00 VN
      { startAt: new Date('2026-11-30T17:30:00.000Z'), totalPrice: 350_000 },
      // 2026-11-15 10:00:00Z == 2026-11-15 17:00:00 VN
      { startAt: new Date('2026-11-15T10:00:00.000Z'), totalPrice: 150_000 },
    ];

    const points = groupRevenue(rows, 'month', '2026-10-01', '2026-12-31');

    expect(points).toEqual([
      { period: '2026-10', revenue: 0, bookingCount: 0 },
      { period: '2026-11', revenue: 150_000, bookingCount: 1 },
      { period: '2026-12', revenue: 350_000, bookingCount: 1 },
    ]);
  });
});
