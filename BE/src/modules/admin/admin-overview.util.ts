import { addDaysToDateStr, toVnParts } from '@sango/shared';
export function groupBookingsByVnDate(
  createdAt: Date[],
  today: string,
  days: number,
): { date: string; bookings: number }[] {
  const counts = new Map<string, number>();
  for (const date of createdAt) {
    const key = toVnParts(date).dateStr;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = addDaysToDateStr(today, index - days + 1);
    return { date, bookings: counts.get(date) ?? 0 };
  });
}
