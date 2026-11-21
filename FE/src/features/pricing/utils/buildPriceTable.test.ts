import { describe, it, expect } from 'vitest';
import { buildPriceTable } from './buildPriceTable';

describe('buildPriceTable', () => {
  it('tạo 24 dòng với giá mặc định khi không có rule', () => {
    const table = buildPriceTable({
      basePricePerHour: 100_000,
      rules: [],
    });

    expect(table).toHaveLength(24);
    expect(table[0].weekday).toBe(100_000);
    expect(table[0].weekend).toBe(100_000);
    expect(table[17].weekday).toBe(100_000);
  });

  it('áp dụng đúng rule ngày thường và cuối tuần vào bảng giờ', () => {
    const table = buildPriceTable({
      basePricePerHour: 100_000,
      rules: [
        {
          dayType: 'WEEKDAY',
          startMinute: 1020, // 17:00
          endMinute: 1260, // 21:00
          pricePerHour: 150_000,
          label: 'Giờ vàng',
        },
        {
          dayType: 'WEEKEND',
          startMinute: 480, // 08:00
          endMinute: 1260, // 21:00
          pricePerHour: 180_000,
          label: 'Cao điểm cuối tuần',
        },
      ],
    });

    // 17:00 (minute = 1020, row 17)
    expect(table[17].weekday).toBe(150_000);
    expect(table[17].weekdayLabel).toBe('Giờ vàng');
    expect(table[17].weekend).toBe(180_000);
    expect(table[17].weekendLabel).toBe('Cao điểm cuối tuần');

    // 08:00 (minute = 480, row 8)
    expect(table[8].weekday).toBe(100_000);
    expect(table[8].weekend).toBe(180_000);

    // 21:00 (minute = 1260, row 21, mốc kết thúc -> về base price)
    expect(table[21].weekday).toBe(100_000);
    expect(table[21].weekend).toBe(100_000);
  });
});
