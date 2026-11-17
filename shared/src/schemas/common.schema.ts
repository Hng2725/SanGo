import { z } from 'zod';
export const idSchema = z.string().min(1);
export const dateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}, 'Ngày không hợp lệ');
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const timeStrSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const paginationQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
export const phoneVnSchema = z.string().regex(/^(0|\+84)\d{9}$/);
