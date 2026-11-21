import { vnDateMinuteToUtc } from '@sango/shared';
import {
  calculatePrice,
  InvalidPriceRangeError,
  priceForSlot,
  type PricingInput,
} from './pricing.calculator';

describe('pricing.calculator', () => {
  const basePricing: PricingInput = {
    basePricePerHour: 100_000,
    rules: [
      {
        dayType: 'WEEKDAY',
        startMinute: 1020, // 17:00
        endMinute: 1260, // 21:00
        pricePerHour: 150_000,
        label: 'Giờ vàng ngày thường',
      },
      {
        dayType: 'WEEKDAY',
        startMinute: 1380, // 23:00
        endMinute: 1440, // 24:00 (end of day)
        pricePerHour: 120_000,
        label: 'Đêm muộn T6',
      },
      {
        dayType: 'WEEKEND',
        startMinute: 1020, // 17:00
        endMinute: 1260, // 21:00
        pricePerHour: 200_000,
        label: 'Giờ vàng cuối tuần',
      },
      {
        dayType: 'WEEKEND',
        startMinute: 0, // 00:00
        endMinute: 360, // 06:00
        pricePerHour: 130_000,
        label: 'Rạng sáng cuối tuần',
      },
    ],
  };

  it('1. Ngày thường, không có rule → giá base', () => {
    // 2026-11-20 (Thứ 6), 08:00 - 09:00
    const start = vnDateMinuteToUtc('2026-11-20', 480);
    const end = vnDateMinuteToUtc('2026-11-20', 540);
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.total).toBe(100_000);
    expect(quote.breakdown).toHaveLength(1);
    expect(quote.breakdown[0].price).toBe(100_000);
    expect(quote.breakdown[0].label).toBeNull();
  });

  it('2. Ngày thường, khung nằm trong giờ vàng 17:00–21:00 → giá giờ vàng + label', () => {
    // 2026-11-20 (Thứ 6), 18:00 - 19:00
    const start = vnDateMinuteToUtc('2026-11-20', 1080);
    const end = vnDateMinuteToUtc('2026-11-20', 1140);
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.total).toBe(150_000);
    expect(quote.breakdown).toHaveLength(1);
    expect(quote.breakdown[0].price).toBe(150_000);
    expect(quote.breakdown[0].label).toBe('Giờ vàng ngày thường');
  });

  it('3. Đơn 16:00–18:00 cắt qua mốc bắt đầu giờ vàng → 1 khung base + 1 khung vàng', () => {
    // 2026-11-20 (Thứ 6), 16:00 - 18:00
    const start = vnDateMinuteToUtc('2026-11-20', 960);
    const end = vnDateMinuteToUtc('2026-11-20', 1080);
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.total).toBe(100_000 + 150_000);
    expect(quote.breakdown).toHaveLength(2);
    expect(quote.breakdown[0].price).toBe(100_000);
    expect(quote.breakdown[0].label).toBeNull();
    expect(quote.breakdown[1].price).toBe(150_000);
    expect(quote.breakdown[1].label).toBe('Giờ vàng ngày thường');
  });

  it('4. Khung bắt đầu đúng bằng endMinute của rule (21:00) → không áp rule (khoảng nửa mở)', () => {
    // 2026-11-20 (Thứ 6), 21:00 - 22:00
    const start = vnDateMinuteToUtc('2026-11-20', 1260);
    const end = vnDateMinuteToUtc('2026-11-20', 1320);
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.total).toBe(100_000);
    expect(quote.breakdown[0].label).toBeNull();
  });

  it('5. Thứ 7 → áp rule WEEKEND, không áp rule WEEKDAY cùng giờ', () => {
    // 2026-11-21 (Thứ 7), 17:00 - 18:00
    const start = vnDateMinuteToUtc('2026-11-21', 1020);
    const end = vnDateMinuteToUtc('2026-11-21', 1080);
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.total).toBe(200_000);
    expect(quote.breakdown[0].label).toBe('Giờ vàng cuối tuần');
  });

  it('6. Qua nửa đêm T6 → T7 (23:00–01:00) → khung 23h giá WEEKDAY, khung 0h giá WEEKEND', () => {
    // 2026-11-20 (Thứ 6) 23:00 đến 2026-11-21 (Thứ 7) 01:00
    const start = vnDateMinuteToUtc('2026-11-20', 1380); // 23:00 T6
    const end = vnDateMinuteToUtc('2026-11-20', 1500); // 01:00 T7
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.breakdown).toHaveLength(2);
    // Khung 23:00 - 24:00 (Thứ 6, WEEKDAY rule 'Đêm muộn T6' = 120_000)
    expect(quote.breakdown[0].price).toBe(120_000);
    expect(quote.breakdown[0].label).toBe('Đêm muộn T6');
    // Khung 00:00 - 01:00 (Thứ 7, WEEKEND rule 'Rạng sáng cuối tuần' = 130_000)
    expect(quote.breakdown[1].price).toBe(130_000);
    expect(quote.breakdown[1].label).toBe('Rạng sáng cuối tuần');
    expect(quote.total).toBe(120_000 + 130_000);
  });

  it('7. Qua nửa đêm CN → T2 → khung 23h WEEKEND, khung 0h WEEKDAY', () => {
    // 2026-11-22 (Chủ nhật, WEEKEND) 23:00 đến 2026-11-23 (Thứ 2, WEEKDAY) 01:00
    const pricing: PricingInput = {
      basePricePerHour: 100_000,
      rules: [
        {
          dayType: 'WEEKEND',
          startMinute: 1380,
          endMinute: 1440,
          pricePerHour: 180_000,
          label: 'Đêm Chủ nhật',
        },
      ],
    };
    const start = vnDateMinuteToUtc('2026-11-22', 1380);
    const end = vnDateMinuteToUtc('2026-11-22', 1500);
    const quote = calculatePrice(pricing, start, end);

    expect(quote.breakdown).toHaveLength(2);
    expect(quote.breakdown[0].price).toBe(180_000);
    expect(quote.breakdown[0].label).toBe('Đêm Chủ nhật');
    expect(quote.breakdown[1].price).toBe(100_000); // base price for Monday
    expect(quote.breakdown[1].label).toBeNull();
    expect(quote.total).toBe(280_000);
  });

  it('8. Rule endMinute = 1440 áp cho khung 23:00', () => {
    const start = vnDateMinuteToUtc('2026-11-20', 1380);
    const res = priceForSlot(basePricing, start);
    expect(res.price).toBe(120_000);
    expect(res.label).toBe('Đêm muộn T6');
  });

  it('9. Thời điểm UTC 17:00 = 00:00 giờ VN hôm sau → xác định đúng ngày (không lệch múi giờ)', () => {
    // UTC: 2026-11-20T17:00:00.000Z = VN: 2026-11-21 00:00 (Thứ 7, WEEKEND)
    const utcDate = new Date('2026-11-20T17:00:00.000Z');
    const res = priceForSlot(basePricing, utcDate);
    expect(res.price).toBe(130_000);
    expect(res.label).toBe('Rạng sáng cuối tuần');
  });

  it('10. endAt <= startAt → ném lỗi; startAt lệch phút (10:30) → ném lỗi', () => {
    const start = vnDateMinuteToUtc('2026-11-20', 600); // 10:00
    const endEarlier = vnDateMinuteToUtc('2026-11-20', 540); // 09:00
    expect(() => calculatePrice(basePricing, start, endEarlier)).toThrow(InvalidPriceRangeError);

    const startUnaligned = new Date('2026-11-20T03:30:00.000Z'); // 10:30 VN
    const endAligned = new Date('2026-11-20T04:00:00.000Z'); // 11:00 VN
    expect(() => calculatePrice(basePricing, startUnaligned, endAligned)).toThrow(
      InvalidPriceRangeError,
    );
  });

  it('11. Đơn 6 khung → total = tổng breakdown', () => {
    // 2026-11-20 (Thứ 6), 16:00 - 22:00 (6 khung)
    const start = vnDateMinuteToUtc('2026-11-20', 960); // 16:00
    const end = vnDateMinuteToUtc('2026-11-20', 1320); // 22:00
    const quote = calculatePrice(basePricing, start, end);

    expect(quote.breakdown).toHaveLength(6);
    const sum = quote.breakdown.reduce((acc, curr) => acc + curr.price, 0);
    expect(quote.total).toBe(sum);
  });
});
