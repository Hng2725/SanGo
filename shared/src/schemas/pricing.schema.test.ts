import { describe, it, expect } from 'vitest';
import { pricingConfigSchema, priceRuleInputSchema } from './pricing.schema';

describe('pricing.schema', () => {
  it('từ chối khi startMinute >= endMinute', () => {
    const invalid = priceRuleInputSchema.safeParse({
      dayType: 'WEEKDAY',
      startMinute: 600,
      endMinute: 600,
      pricePerHour: 100000,
    });
    expect(invalid.success).toBe(false);
  });

  it('từ chối giá không chia hết cho 1.000', () => {
    const invalid = priceRuleInputSchema.safeParse({
      dayType: 'WEEKDAY',
      startMinute: 600,
      endMinute: 720,
      pricePerHour: 100500.5,
    });
    expect(invalid.success).toBe(false);

    const invalidPrice = pricingConfigSchema.safeParse({
      basePricePerHour: 150250,
      rules: [],
    });
    expect(invalidPrice.success).toBe(false);
  });

  it('báo lỗi đúng path khi các rule cùng dayType bị chồng khung giờ', () => {
    const result = pricingConfigSchema.safeParse({
      basePricePerHour: 100000,
      rules: [
        {
          dayType: 'WEEKDAY',
          startMinute: 1020, // 17:00
          endMinute: 1260, // 21:00
          pricePerHour: 150000,
          label: 'Giờ vàng',
        },
        {
          dayType: 'WEEKDAY',
          startMinute: 1200, // 20:00 (chồng với 17:00 - 21:00)
          endMinute: 1320, // 22:00
          pricePerHour: 180000,
          label: 'Giờ đêm',
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join('.') === 'rules.1.startMinute',
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('chồng');
    }
  });

  it('chấp nhận 2 rule có cùng khung giờ nhưng khác dayType', () => {
    const result = pricingConfigSchema.safeParse({
      basePricePerHour: 100000,
      rules: [
        {
          dayType: 'WEEKDAY',
          startMinute: 1020,
          endMinute: 1260,
          pricePerHour: 150000,
          label: 'Giờ vàng ngày thường',
        },
        {
          dayType: 'WEEKEND',
          startMinute: 1020,
          endMinute: 1260,
          pricePerHour: 200000,
          label: 'Giờ vàng cuối tuần',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
