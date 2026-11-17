import { groupBookingsByVnDate } from './admin-overview.util';
describe('groupBookingsByVnDate', () => {
  it('uses the Vietnam day boundary and fills missing dates with zero', () => {
    expect(
      groupBookingsByVnDate(
        [new Date('2026-11-20T16:59:00Z'), new Date('2026-11-20T17:00:00Z')],
        '2026-11-20',
        3,
      ),
    ).toEqual([
      { date: '2026-11-18', bookings: 0 },
      { date: '2026-11-19', bookings: 0 },
      { date: '2026-11-20', bookings: 1 },
    ]);
  });
});
