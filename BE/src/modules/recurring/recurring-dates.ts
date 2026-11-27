import { SLOT_MINUTES, addDaysToDateStr, vnDateMinuteToUtc } from '@sango/shared';

export interface RecurringOccurrence {
  date: string;
  startAt: Date;
  endAt: Date;
}

export function buildWeeklyOccurrences(
  firstDate: string,
  startMinute: number,
  slotCount: number,
  weeks: number,
): RecurringOccurrence[] {
  const occurrences: RecurringOccurrence[] = [];
  const endMinute = startMinute + slotCount * SLOT_MINUTES;

  for (let w = 0; w < weeks; w += 1) {
    const date = addDaysToDateStr(firstDate, w * 7);
    const startAt = vnDateMinuteToUtc(date, startMinute);
    const endAt = vnDateMinuteToUtc(date, endMinute);
    occurrences.push({ date, startAt, endAt });
  }

  return occurrences;
}
