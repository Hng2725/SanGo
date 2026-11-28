import { z } from 'zod';
import { idSchema, paginationQuerySchema } from './common.schema';

export const createReviewSchema = z.object({
  bookingId: idSchema,
  rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  comment: z.string().trim().max(1000, 'Nhận xét tối đa 1000 ký tự').optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = createReviewSchema.omit({ bookingId: true }).partial();
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const replyReviewSchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập nội dung phản hồi')
    .max(1000, 'Phản hồi tối đa 1000 ký tự'),
});
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;

export const venueReviewsQuerySchema = paginationQuerySchema;
export type VenueReviewsQuery = z.infer<typeof venueReviewsQuerySchema>;

export const ownerReviewsQuerySchema = paginationQuerySchema.extend({
  venueId: idSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
export type OwnerReviewsQuery = z.infer<typeof ownerReviewsQuerySchema>;
