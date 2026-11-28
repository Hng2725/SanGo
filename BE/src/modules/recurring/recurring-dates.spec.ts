import { buildWeeklyOccurrences } from './recurring-dates';

describe('recurring-dates', () => {
  it('tạo đúng số tuần qua tháng và tính đúng ca qua nửa đêm', () => {
    // 2026-11-26 23:00 VN (1380) + 2 slots => 01:00 (+1)
    const occurrences = buildWeeklyOccurrences('2026-11-26', 1380, 2, 3);

    expect(occurrences).toHaveLength(3);
    expect(occurrences[0]).toEqual({
      date: '2026-11-26',
      startAt: new Date('2026-11-26T16:00:00.000Z'),
      endAt: new Date('2026-11-26T18:00:00.000Z'),
    });
    expect(occurrences[1]).toEqual({
      date: '2026-12-03',
      startAt: new Date('2026-12-03T16:00:00.000Z'),
      endAt: new Date('2026-12-03T18:00:00.000Z'),
    });
    expect(occurrences[2]).toEqual({
      date: '2026-12-10',
      startAt: new Date('2026-12-10T16:00:00.000Z'),
      endAt: new Date('2026-12-10T18:00:00.000Z'),
    });
  });
});
