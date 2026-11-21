import { describe, it, expect } from 'vitest';
import { findMatchingPriceRule, type MatchingRuleInput } from './pricing-match';

describe('findMatchingPriceRule', () => {
  const rules: MatchingRuleInput[] = [
    {
      dayType: 'WEEKDAY',
      startMinute: 1020, // 17:00
      endMinute: 1260, // 21:00
      pricePerHour: 150_000,
      label: 'Giờ vàng ngày thường',
    },
    {
      dayType: 'WEEKEND',
      startMinute: 480, // 08:00
      endMinute: 1320, // 22:00
      pricePerHour: 200_000,
      label: 'Cuối tuần cao điểm',
    },
  ];

  it('trả về rule khớp khi phút nằm trong khoảng [startMinute, endMinute)', () => {
    const matched = findMatchingPriceRule(rules, 'WEEKDAY', 1080); // 18:00
    expect(matched?.label).toBe('Giờ vàng ngày thường');
    expect(matched?.pricePerHour).toBe(150_000);
  });

  it('không khớp nếu là thời điểm kết thúc endMinute (khoảng nửa mở)', () => {
    const matched = findMatchingPriceRule(rules, 'WEEKDAY', 1260); // 21:00
    expect(matched).toBeUndefined();
  });

  it('không khớp nếu khác dayType', () => {
    const matched = findMatchingPriceRule(rules, 'WEEKEND', 1080);
    expect(matched?.label).toBe('Cuối tuần cao điểm');
  });

  it('trả về undefined nếu không có rule nào khớp', () => {
    const matched = findMatchingPriceRule(rules, 'WEEKDAY', 480);
    expect(matched).toBeUndefined();
  });
});
