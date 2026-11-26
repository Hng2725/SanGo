import { z } from 'zod';
import { SPORTS } from '../constants/sports';
import { dateStrSchema, timeStrSchema, paginationQuerySchema } from './common.schema';

export const searchVenuesQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().min(1).max(200).optional(),
    sport: z.enum(SPORTS).optional(),
    city: z.string().min(1).max(100).optional(),
    district: z.string().min(1).max(100).optional(),
    date: dateStrSchema.optional(),
    from: timeStrSchema.optional(),
    to: timeStrSchema.optional(),
    sort: z.enum(['rating', 'newest', 'name']).default('rating'),
  })
  .refine(
    (data) => {
      if (data.from || data.to) {
        return !!data.date;
      }
      return true;
    },
    { message: 'Phải cung cấp date khi có from/to', path: ['date'] },
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const [fh, fm] = data.from.split(':').map(Number);
        const [th, tm] = data.to.split(':').map(Number);
        return fh * 60 + fm < th * 60 + tm;
      }
      return true;
    },
    { message: 'from phải nhỏ hơn to', path: ['from'] },
  )
  .refine(
    (data) => {
      if (data.from) {
        const [, fm] = data.from.split(':').map(Number);
        return fm % 60 === 0;
      }
      return true;
    },
    { message: 'Phút của from phải chia hết cho 60', path: ['from'] },
  )
  .refine(
    (data) => {
      if (data.to) {
        const [, tm] = data.to.split(':').map(Number);
        return tm % 60 === 0;
      }
      return true;
    },
    { message: 'Phút của to phải chia hết cho 60', path: ['to'] },
  );

export type SearchVenuesQuery = z.infer<typeof searchVenuesQuerySchema>;
