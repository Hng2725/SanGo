import { SLOT_MINUTES, VN_UTC_OFFSET_MINUTES } from '../constants/time';
const DAY_MS = 86400000;
const OFFSET_MS = VN_UTC_OFFSET_MINUTES * 60000;
function parseDateStr(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) throw new Error('Ngày không hợp lệ');
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const result = Date.UTC(year, month - 1, day);
  const check = new Date(result);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error('Ngày không hợp lệ');
  return result;
}
export function toVnParts(date: Date): { dateStr: string; dayOfWeek: number; minuteOfDay: number } {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return { dateStr: shifted.toISOString().slice(0, 10), dayOfWeek: shifted.getUTCDay(), minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}
export function vnDateMinuteToUtc(dateStr: string, minuteOfDay: number): Date {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0) throw new Error('Phút không hợp lệ');
  return new Date(parseDateStr(dateStr) + minuteOfDay * 60000 - OFFSET_MS);
}
export function addDaysToDateStr(dateStr: string, n: number): string {
  if (!Number.isInteger(n)) throw new Error('Số ngày không hợp lệ');
  return new Date(parseDateStr(dateStr) + n * DAY_MS).toISOString().slice(0, 10);
}
export function startOfWeekDateStr(dateStr: string): string {
  const day = new Date(parseDateStr(dateStr)).getUTCDay();
  return addDaysToDateStr(dateStr, -(day === 0 ? 6 : day - 1));
}
export function isWeekendDay(dayOfWeek: number): boolean { return dayOfWeek === 0 || dayOfWeek === 6; }
export function isSlotAligned(date: Date): boolean { return Number.isFinite(date.getTime()) && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0; }
export function enumerateSlotStarts(startAt: Date, endAt: Date): Date[] {
  if (!isSlotAligned(startAt) || !isSlotAligned(endAt) || endAt <= startAt) throw new Error('Khung giờ không hợp lệ');
  const result: Date[] = [];
  for (let value = startAt.getTime(); value < endAt.getTime(); value += SLOT_MINUTES * 60000) result.push(new Date(value));
  return result;
}
export function formatMinute(minute: number): string {
  if (!Number.isInteger(minute) || minute < 0) throw new Error('Phút không hợp lệ');
  const day = Math.floor(minute / 1440), value = minute % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}${day ? ` (+${day})` : ''}`;
}
