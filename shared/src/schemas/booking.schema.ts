import { z } from 'zod';
import { idSchema, isoDateTimeSchema, phoneVnSchema } from './common.schema';
import { MAX_SLOTS_PER_BOOKING, SLOT_MINUTES } from '../constants/time';

function isAlignedToSlot(isoStr: string): boolean {
  const d = new Date(isoStr);
  return d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}

export const createBookingSchema = z
  .object({
    courtId: idSchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    contactPhone: phoneVnSchema,
    note: z.string().max(500).optional(),
    holdId: idSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startAt);
    const end = new Date(v.endAt);

    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endAt'] });
      return;
    }

    if (!isAlignedToSlot(v.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ bắt đầu phải chia hết cho 60 phút', path: ['startAt'] });
    }
    if (!isAlignedToSlot(v.endAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải chia hết cho 60 phút', path: ['endAt'] });
    }

    const diffMinutes = (end.getTime() - start.getTime()) / 60_000;
    const slotCount = diffMinutes / SLOT_MINUTES;
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > MAX_SLOTS_PER_BOOKING) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Số khung giờ phải từ 1 đến ${MAX_SLOTS_PER_BOOKING}`,
        path: ['endAt'],
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const createHoldSchema = z
  .object({
    courtId: idSchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startAt);
    const end = new Date(v.endAt);

    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải sau giờ bắt đầu', path: ['endAt'] });
      return;
    }

    if (!isAlignedToSlot(v.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ bắt đầu phải chia hết cho 60 phút', path: ['startAt'] });
    }
    if (!isAlignedToSlot(v.endAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải chia hết cho 60 phút', path: ['endAt'] });
    }

    const diffMinutes = (end.getTime() - start.getTime()) / 60_000;
    const slotCount = diffMinutes / SLOT_MINUTES;
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > MAX_SLOTS_PER_BOOKING) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Số khung giờ phải từ 1 đến ${MAX_SLOTS_PER_BOOKING}`,
        path: ['endAt'],
      });
    }
  });

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
