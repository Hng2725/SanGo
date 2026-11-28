import { z } from 'zod';
import { BOOKING_STATUSES } from '../constants/booking-status';
import { dateStrSchema, idSchema, paginationQuerySchema } from './common.schema';

const optionalBooleanQuerySchema = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean().optional(),
);

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(300, 'Lý do hủy tối đa 300 ký tự').optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const rejectBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Lý do từ chối tối thiểu 3 ký tự')
    .max(300, 'Lý do từ chối tối đa 300 ký tự'),
});
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;

export const myBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  upcoming: optionalBooleanQuerySchema,
});
export type MyBookingsQuery = z.infer<typeof myBookingsQuerySchema>;

export const ownerBookingsQuerySchema = paginationQuerySchema.extend({
  venueId: idSchema.optional(),
  courtId: idSchema.optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  from: dateStrSchema.optional(),
  to: dateStrSchema.optional(),
  q: z.string().trim().max(100).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});
export type OwnerBookingsQuery = z.infer<typeof ownerBookingsQuerySchema>;
