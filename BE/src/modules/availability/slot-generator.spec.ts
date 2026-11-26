import { generateDaySlots, OpeningHourLike } from './slot-generator';
import { vnDateMinuteToUtc } from '@sango/shared';

/** Helper: tạo OpeningHourLike cho 1 ngày */
function oh(
  dayOfWeek: number,
  openMinute: number,
  closeMinute: number,
  isClosed = false,
): OpeningHourLike {
  return { dayOfWeek, isClosed, openMinute, closeMinute };
}

/** Helper: lấy giờ VN từ Date UTC */
function vnHour(date: Date): number {
  return new Date(date.getTime() + 420 * 60_000).getUTCHours();
}
function vnMinute(date: Date): number {
  return new Date(date.getTime() + 420 * 60_000).getUTCMinutes();
}
function vnDateStr(date: Date): string {
  return new Date(date.getTime() + 420 * 60_000).toISOString().slice(0, 10);
}

describe('generateDaySlots', () => {
  // 2026-11-26 là Thứ 5 (dayOfWeek = 4)
  const thursday = '2026-11-26';

  describe('ngày thường 06:00–22:00', () => {
    const hours: OpeningHourLike[] = [oh(4, 360, 1320)]; // 06:00–22:00

    it('sinh đúng 16 khung', () => {
      const slots = generateDaySlots(hours, thursday);
      expect(slots).toHaveLength(16);
    });

    it('khung đầu bắt đầu lúc 06:00 VN, khung cuối bắt đầu lúc 21:00 VN', () => {
      const slots = generateDaySlots(hours, thursday);
      expect(vnHour(slots[0].startAt)).toBe(6);
      expect(vnMinute(slots[0].startAt)).toBe(0);
      expect(vnHour(slots[15].startAt)).toBe(21);
      expect(vnMinute(slots[15].startAt)).toBe(0);
    });

    it('endAt của khung cuối là 22:00 VN', () => {
      const slots = generateDaySlots(hours, thursday);
      expect(vnHour(slots[15].endAt)).toBe(22);
    });

    it('minuteOfDay tăng dần từ 360 đến 1260 bước 60', () => {
      const slots = generateDaySlots(hours, thursday);
      slots.forEach((s, i) => {
        expect(s.minuteOfDay).toBe(360 + i * 60);
      });
    });

    it('startAt/endAt đều là Date UTC hợp lệ', () => {
      const slots = generateDaySlots(hours, thursday);
      for (const s of slots) {
        expect(s.startAt).toBeInstanceOf(Date);
        expect(s.endAt).toBeInstanceOf(Date);
        expect(s.endAt.getTime() - s.startAt.getTime()).toBe(60 * 60_000);
      }
    });
  });

  describe('ngày nghỉ (isClosed: true)', () => {
    it('trả [] khi isClosed = true', () => {
      const hours: OpeningHourLike[] = [oh(4, 360, 1320, true)];
      expect(generateDaySlots(hours, thursday)).toEqual([]);
    });

    it('trả [] khi không có cấu hình cho dayOfWeek', () => {
      // Chỉ có cấu hình Thứ 2 (dayOfWeek=1), nhưng dateStr là Thứ 5
      const hours: OpeningHourLike[] = [oh(1, 360, 1320)];
      expect(generateDaySlots(hours, thursday)).toEqual([]);
    });
  });

  describe('ca qua nửa đêm 18:00–02:00', () => {
    // closeMinute = 26 * 60 = 1560 (02:00 ngày hôm sau)
    const overnightHours: OpeningHourLike[] = [oh(4, 1080, 1560)];

    it('sinh đúng 8 khung', () => {
      const slots = generateDaySlots(overnightHours, thursday);
      expect(slots).toHaveLength(8);
    });

    it('khung cuối có minuteOfDay = 1500 (01:00 ngày hôm sau)', () => {
      const slots = generateDaySlots(overnightHours, thursday);
      const lastSlot = slots[slots.length - 1];
      expect(lastSlot.minuteOfDay).toBe(1500);
    });

    it('khung cuối startAt thuộc ngày calendar hôm sau (giờ VN)', () => {
      const slots = generateDaySlots(overnightHours, thursday);
      const lastSlot = slots[slots.length - 1];
      // 2026-11-26 là Thứ 5, khung 01:00 phải thuộc ngày 2026-11-27
      expect(vnDateStr(lastSlot.startAt)).toBe('2026-11-27');
      expect(vnHour(lastSlot.startAt)).toBe(1);
    });

    it('khung cuối endAt là 02:00 VN ngày hôm sau', () => {
      const slots = generateDaySlots(overnightHours, thursday);
      const lastSlot = slots[slots.length - 1];
      expect(vnHour(lastSlot.endAt)).toBe(2);
      expect(vnDateStr(lastSlot.endAt)).toBe('2026-11-27');
    });

    it('minuteOfDay liên tục từ 1080 đến 1500', () => {
      const slots = generateDaySlots(overnightHours, thursday);
      slots.forEach((s, i) => {
        expect(s.minuteOfDay).toBe(1080 + i * 60);
      });
    });
  });

  describe('CN/T7 đúng dayOfWeek', () => {
    // 2026-11-29 là Chủ nhật (dayOfWeek = 0)
    const sunday = '2026-11-29';
    // 2026-11-28 là Thứ 7 (dayOfWeek = 6)
    const saturday = '2026-11-28';

    it('Chủ nhật chọn đúng cấu hình dayOfWeek=0', () => {
      const hours: OpeningHourLike[] = [
        oh(6, 480, 1200), // T7: 08:00–20:00
        oh(0, 600, 1080), // CN: 10:00–18:00 → 8 khung
      ];
      const slots = generateDaySlots(hours, sunday);
      expect(slots).toHaveLength(8);
      expect(vnHour(slots[0].startAt)).toBe(10);
    });

    it('Thứ 7 chọn đúng cấu hình dayOfWeek=6', () => {
      const hours: OpeningHourLike[] = [
        oh(6, 480, 1200), // T7: 08:00–20:00 → 12 khung
        oh(0, 600, 1080), // CN
      ];
      const slots = generateDaySlots(hours, saturday);
      expect(slots).toHaveLength(12);
      expect(vnHour(slots[0].startAt)).toBe(8);
    });
  });

  describe('đổi tháng/năm (31/12 → 01/01)', () => {
    // 2026-12-31 là Thứ 5 (dayOfWeek = 4)
    const newYearsEve = '2026-12-31';

    it('ngày thường 06:00–22:00 vẫn đúng', () => {
      const hours: OpeningHourLike[] = [oh(4, 360, 1320)];
      const slots = generateDaySlots(hours, newYearsEve);
      expect(slots).toHaveLength(16);
      expect(vnDateStr(slots[0].startAt)).toBe('2026-12-31');
    });

    it('ca qua nửa đêm: khung sau 00:00 thuộc ngày 01/01 năm sau', () => {
      const hours: OpeningHourLike[] = [oh(4, 1080, 1560)]; // 18:00–02:00
      const slots = generateDaySlots(hours, newYearsEve);
      expect(slots).toHaveLength(8);
      // Khung 00:00 trở đi phải thuộc 2027-01-01
      const midnightSlot = slots.find((s) => s.minuteOfDay === 1440);
      expect(midnightSlot).toBeDefined();
      expect(vnDateStr(midnightSlot!.startAt)).toBe('2027-01-01');
      expect(vnHour(midnightSlot!.startAt)).toBe(0);

      const lastSlot = slots[slots.length - 1];
      expect(vnDateStr(lastSlot.endAt)).toBe('2027-01-01');
    });
  });
});
