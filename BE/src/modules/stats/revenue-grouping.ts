import { addDaysToDateStr, toVnParts, type RevenueGroupBy, type RevenuePoint } from '@sango/shared';

export interface RevenueRow {
  startAt: Date;
  totalPrice: number;
}

function buildPeriods(groupBy: RevenueGroupBy, from: string, to: string): string[] {
  const periods: string[] = [];
  if (groupBy === 'day') {
    let cursor = from;
    while (cursor <= to) {
      periods.push(cursor);
      cursor = addDaysToDateStr(cursor, 1);
    }
    return periods;
  }

  const fromMonth = from.slice(0, 7);
  const toMonth = to.slice(0, 7);
  let [year, month] = fromMonth.split('-').map(Number);
  const [endYear, endMonth] = toMonth.split('-').map(Number);

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

export function groupRevenue(
  rows: ReadonlyArray<RevenueRow>,
  groupBy: RevenueGroupBy,
  from: string,
  to: string,
): RevenuePoint[] {
  const buckets = new Map<string, { revenue: number; bookingCount: number }>();
  const periods = buildPeriods(groupBy, from, to);

  for (const period of periods) {
    buckets.set(period, { revenue: 0, bookingCount: 0 });
  }

  for (const row of rows) {
    const { dateStr } = toVnParts(row.startAt);
    const key = groupBy === 'day' ? dateStr : dateStr.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenue += row.totalPrice;
      bucket.bookingCount += 1;
    }
  }

  return periods.map((period) => {
    const bucket = buckets.get(period)!;
    return {
      period,
      revenue: bucket.revenue,
      bookingCount: bucket.bookingCount,
    };
  });
}
