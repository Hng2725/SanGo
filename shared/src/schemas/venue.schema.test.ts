import { describe, it, expect } from 'vitest';
import { createVenueSchema, openingHoursSchema } from './venue.schema';

describe('venue.schema', () => {
  describe('createVenueSchema', () => {
    it('chấp nhận khi cả latitude và longitude đều null hoặc undefined', () => {
      const valid = createVenueSchema.safeParse({
        name: 'Sân bóng Thăng Long',
        address: '123 Cầu Giấy',
        district: 'Cầu Giấy',
        city: 'Hà Nội',
        latitude: null,
        longitude: null,
      });
      expect(valid.success).toBe(true);
    });

    it('chấp nhận khi cả latitude và longitude đều có giá trị hợp lệ', () => {
      const valid = createVenueSchema.safeParse({
        name: 'Sân bóng Thăng Long',
        address: '123 Cầu Giấy',
        district: 'Cầu Giấy',
        city: 'Hà Nội',
        latitude: 21.0285,
        longitude: 105.8542,
      });
      expect(valid.success).toBe(true);
    });

    it('từ chối khi chỉ có latitude mà không có longitude hoặc ngược lại', () => {
      const invalidLatOnly = createVenueSchema.safeParse({
        name: 'Sân bóng Thăng Long',
        address: '123 Cầu Giấy',
        district: 'Cầu Giấy',
        city: 'Hà Nội',
        latitude: 21.0285,
      });
      expect(invalidLatOnly.success).toBe(false);

      const invalidLngOnly = createVenueSchema.safeParse({
        name: 'Sân bóng Thăng Long',
        address: '123 Cầu Giấy',
        district: 'Cầu Giấy',
        city: 'Hà Nội',
        longitude: 105.8542,
      });
      expect(invalidLngOnly.success).toBe(false);
    });
  });

  describe('openingHoursSchema', () => {
    const defaultHours = [
      { dayOfWeek: 0, isClosed: false, openMinute: 360, closeMinute: 1320 }, // CN: 06:00 - 22:00
      { dayOfWeek: 1, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T2: 06:00 - 22:00
      { dayOfWeek: 2, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T3: 06:00 - 22:00
      { dayOfWeek: 3, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T4: 06:00 - 22:00
      { dayOfWeek: 4, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T5: 06:00 - 22:00
      { dayOfWeek: 5, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T6: 06:00 - 22:00
      { dayOfWeek: 6, isClosed: false, openMinute: 360, closeMinute: 1320 }, // T7: 06:00 - 22:00
    ];

    it('chấp nhận cấu hình chuẩn 7 ngày không qua nửa đêm', () => {
      const result = openingHoursSchema.safeParse(defaultHours);
      expect(result.success).toBe(true);
    });

    it('chấp nhận ca qua nửa đêm khi ca tiếp theo mở sau giờ đóng', () => {
      // T6 (dayOfWeek=5): mở 18:00 (1080) đến 02:00 hôm sau (1440 + 120 = 1560)
      // T7 (dayOfWeek=6): mở từ 06:00 (360) => 120 <= 360 => hợp lệ
      const hours = defaultHours.map((h) =>
        h.dayOfWeek === 5 ? { ...h, openMinute: 1080, closeMinute: 1560 } : h,
      );
      const result = openingHoursSchema.safeParse(hours);
      expect(result.success).toBe(true);
    });

    it('từ chối ca qua nửa đêm nếu chồng vào giờ mở cửa của ngày tiếp theo', () => {
      // T6 (dayOfWeek=5): mở đến 08:00 hôm sau (1440 + 480 = 1920 > max 1800, hoặc thử 1440 + 420 = 1860)
      // Giả sử T6 mở đến 07:00 (1440 + 420 = 1860 - out of range; giả sử 1440 + 360 = 1800)
      // T7 mở từ 05:00 (300). Lúc này 1800 - 1440 = 360 > 300 => chồng ca!
      const hours = defaultHours.map((h) => {
        if (h.dayOfWeek === 5) return { ...h, openMinute: 1080, closeMinute: 1800 };
        if (h.dayOfWeek === 6) return { ...h, openMinute: 300, closeMinute: 1320 };
        return h;
      });
      const result = openingHoursSchema.safeParse(hours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('chồng'))).toBe(true);
      }
    });

    it('từ chối ca qua nửa đêm nếu ngày hôm sau nghỉ đóng cửa', () => {
      // T6 (dayOfWeek=5): mở đến 02:00 hôm sau (1560)
      // T7 (dayOfWeek=6): nghỉ (isClosed: true)
      const hours = defaultHours.map((h) => {
        if (h.dayOfWeek === 5) return { ...h, openMinute: 1080, closeMinute: 1560 };
        if (h.dayOfWeek === 6) return { ...h, isClosed: true };
        return h;
      });
      const result = openingHoursSchema.safeParse(hours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('ngày nghỉ'))).toBe(true);
      }
    });
  });
});
