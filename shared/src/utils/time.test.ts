import { describe, expect, it } from 'vitest';
import { addDaysToDateStr, enumerateSlotStarts, formatMinute, isSlotAligned, isWeekendDay, startOfWeekDateStr, toVnParts, vnDateMinuteToUtc } from './time';

describe('Vietnam time helpers', () => {
  it('moves to the next VN date at 17:00 UTC', () => {
    expect(toVnParts(new Date('2026-11-20T16:59:00Z'))).toEqual({ dateStr: '2026-11-20', dayOfWeek: 5, minuteOfDay: 1439 });
    expect(toVnParts(new Date('2026-11-20T17:00:00Z'))).toEqual({ dateStr: '2026-11-21', dayOfWeek: 6, minuteOfDay: 0 });
  });
  it('converts an overnight minute to UTC', () => {
    expect(vnDateMinuteToUtc('2026-11-20', 1500).toISOString()).toBe('2026-11-20T18:00:00.000Z');
    expect(formatMinute(1500)).toBe('01:00 (+1)');
  });
  it('handles a Sunday week boundary and leap day', () => {
    expect(startOfWeekDateStr('2026-11-22')).toBe('2026-11-16');
    expect(addDaysToDateStr('2024-02-28', 1)).toBe('2024-02-29');
    expect(isWeekendDay(0)).toBe(true);
    expect(isWeekendDay(6)).toBe(true);
    expect(isWeekendDay(1)).toBe(false);
  });
  it('enumerates aligned one-hour slots without including the end', () => {
    expect(enumerateSlotStarts(new Date('2026-11-20T10:00:00Z'), new Date('2026-11-20T12:00:00Z')).map(d => d.toISOString())).toEqual(['2026-11-20T10:00:00.000Z','2026-11-20T11:00:00.000Z']);
    expect(isSlotAligned(new Date('2026-11-20T10:00:00Z'))).toBe(true);
    expect(isSlotAligned(new Date('2026-11-20T10:00:01Z'))).toBe(false);
    expect(() => enumerateSlotStarts(new Date('2026-11-20T10:30:00Z'), new Date('2026-11-20T11:00:00Z'))).toThrow();
  });
});
