import { z } from 'zod';
import { dateStrSchema, idSchema } from './common.schema';

function parseUtcDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function diffMonthsInclusive(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

export const revenueQuerySchema = z
  .object({
    venueId: idSchema.optional(),
    from: dateStrSchema,
    to: dateStrSchema,
    groupBy: z.enum(['day', 'month']).default('day'),
  })
  .refine((data) => data.from <= data.to, {
    message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
    path: ['from'],
  })
  .refine(
    (data) => {
      if (data.groupBy === 'day') {
        const diffDays = Math.floor((parseUtcDay(data.to) - parseUtcDay(data.from)) / 86400000) + 1;
        return diffDays <= 92;
      }
      return diffMonthsInclusive(data.from, data.to) <= 24;
    },
    {
      message: 'Khoảng thời gian tối đa 92 ngày (theo ngày) hoặc 24 tháng (theo tháng)',
      path: ['to'],
    },
  );
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
