import { z } from 'zod';
import { COMPLAINT_STATUSES } from '../constants/booking-status';
import { idSchema, paginationQuerySchema } from './common.schema';

export const createComplaintSchema = z.object({
  venueId: idSchema,
  bookingId: idSchema.optional(),
  title: z
    .string()
    .trim()
    .min(5, 'Tiêu đề tối thiểu 5 ký tự')
    .max(120, 'Tiêu đề tối đa 120 ký tự'),
  content: z
    .string()
    .trim()
    .min(10, 'Nội dung tối thiểu 10 ký tự')
    .max(2000, 'Nội dung tối đa 2000 ký tự'),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const adminUpdateComplaintSchema = z
  .object({
    status: z.enum(['IN_PROGRESS', 'RESOLVED', 'REJECTED']),
    adminResponse: z.string().trim().max(2000, 'Phản hồi tối đa 2000 ký tự').optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'RESOLVED' || data.status === 'REJECTED') {
        return typeof data.adminResponse === 'string' && data.adminResponse.length >= 3;
      }
      if (data.adminResponse !== undefined && data.adminResponse.length > 0) {
        return data.adminResponse.length >= 3;
      }
      return true;
    },
    {
      message: 'Phản hồi tối thiểu 3 ký tự',
      path: ['adminResponse'],
    },
  );
export type AdminUpdateComplaintInput = z.infer<typeof adminUpdateComplaintSchema>;

export const adminComplaintsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(COMPLAINT_STATUSES).optional(),
});
export type AdminComplaintsQuery = z.infer<typeof adminComplaintsQuerySchema>;

export const myComplaintsQuerySchema = paginationQuerySchema;
export type MyComplaintsQuery = z.infer<typeof myComplaintsQuerySchema>;
