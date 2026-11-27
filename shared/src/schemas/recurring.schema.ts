import { z } from 'zod';
import { MAX_SLOTS_PER_BOOKING } from '../constants/time';
import { dateStrSchema, idSchema, phoneVnSchema } from './common.schema';

export const recurringBaseSchema = z.object({
  courtId: idSchema,
  firstDate: dateStrSchema,
  startMinute: z.number().int().min(0).max(1740).multipleOf(60),
  slotCount: z.number().int().min(1).max(MAX_SLOTS_PER_BOOKING),
  weeks: z.number().int().min(2).max(12),
});

export const recurringPreviewSchema = recurringBaseSchema;
export type RecurringPreviewInput = z.infer<typeof recurringPreviewSchema>;

export const createRecurringSchema = recurringBaseSchema.extend({
  contactPhone: phoneVnSchema,
  note: z.string().trim().max(500).optional(),
  skipConflicts: z.boolean().default(false),
});
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
