import clsx, { type ClassValue } from 'clsx';
import { toVnParts } from '@sango/shared';
export const cn = (...values: ClassValue[]) => clsx(values);
export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
}
export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
  return formatCurrency(value);
}
export function formatDate(value: string | Date): string {
  const { dateStr } = toVnParts(new Date(value));
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
export function formatDateTime(value: string | Date): string {
  const parts = toVnParts(new Date(value));
  return `${formatDate(value)} ${String(Math.floor(parts.minuteOfDay / 60)).padStart(2, '0')}:${String(parts.minuteOfDay % 60).padStart(2, '0')}`;
}
export function formatTimeRange(startAt: string | Date, endAt: string | Date): string {
  return `${formatDateTime(startAt)} – ${formatDateTime(endAt)}`;
}
