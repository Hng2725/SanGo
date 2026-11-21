import { z } from 'zod';
import { DAY_TYPES } from '../constants/booking-status';
import { idSchema, isoDateTimeSchema } from './common.schema';

export const priceRuleInputSchema = z
  .object({
    dayType: z.enum(DAY_TYPES),
    startMinute: z.number().int().min(0).max(1380).multipleOf(60),
    endMinute: z.number().int().min(60).max(1440).multipleOf(60),
    pricePerHour: z.number().int().min(10_000).max(10_000_000).multipleOf(1_000),
    label: z.string().trim().max(50).optional().nullable(),
  })
  .refine((r) => r.startMinute < r.endMinute, {
    path: ['endMinute'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
  });

export const pricingConfigSchema = z
  .object({
    basePricePerHour: z.number().int().min(10_000).max(10_000_000).multipleOf(1_000),
    rules: z.array(priceRuleInputSchema).max(20),
  })
  .superRefine((cfg, ctx) => {
    for (const dayType of DAY_TYPES) {
      const items = cfg.rules
        .map((rule, idx) => ({ rule, idx }))
        .filter((item) => item.rule.dayType === dayType)
        .sort((a, b) => a.rule.startMinute - b.rule.startMinute);

      for (let i = 1; i < items.length; i++) {
        if (items[i].rule.startMinute < items[i - 1].rule.endMinute) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rules', items[i].idx, 'startMinute'],
            message: 'Khung giờ bị chồng với khung khác',
          });
        }
      }
    }
  });

export type PriceRuleInput = z.infer<typeof priceRuleInputSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;

export const copyPricingSchema = z.object({
  targetCourtIds: z.array(idSchema).min(1).max(50),
});
export type CopyPricingInput = z.infer<typeof copyPricingSchema>;

export const quotePriceSchema = z.object({
  courtId: idSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
});
export type QuotePriceInput = z.infer<typeof quotePriceSchema>;
