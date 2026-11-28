import { SLOT_MINUTES, VN_UTC_OFFSET_MINUTES } from '@sango/shared';
import { vnDateMinuteToUtc } from '@sango/shared';

export interface OpeningHourLike {
  dayOfWeek: number;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
}

export interface SlotTemplate {
  startAt: Date;
  endAt: Date;
  /** minuteOfDay theo ngày hoạt động, có thể >= 1440 khi ca qua nửa đêm */
  minuteOfDay: number;
}

/**
 * Sinh các khung 60 phút của NGÀY HOẠT ĐỘNG `dateStr` (giờ VN).
 * Ngày nghỉ (isClosed) hoặc không có cấu hình → [].
 *
 * Hỗ trợ ca qua nửa đêm: khi `closeMinute > 1440`, các khung sau 00:00
 * sẽ có `minuteOfDay >= 1440` và `startAt`/`endAt` rơi vào ngày calendar
 * hôm sau, nhưng vẫn thuộc ngày hoạt động `dateStr`.
 */
export function generateDaySlots(
  openingHours: readonly OpeningHourLike[],
  dateStr: string,
): SlotTemplate[] {
  // Xác định dayOfWeek của dateStr (giờ VN)
  const refUtc = vnDateMinuteToUtc(dateStr, 0); // 00:00 VN → UTC
  const shiftedMs = refUtc.getTime() + VN_UTC_OFFSET_MINUTES * 60_000;
  const dayOfWeek = new Date(shiftedMs).getUTCDay();

  // Tìm cấu hình cho ngày này
  const oh = openingHours.find((h) => h.dayOfWeek === dayOfWeek && !h.isClosed);
  if (!oh) return [];

  const slots: SlotTemplate[] = [];

  for (
    let minute = oh.openMinute;
    minute + SLOT_MINUTES <= oh.closeMinute;
    minute += SLOT_MINUTES
  ) {
    // minute có thể >= 1440 (qua nửa đêm)
    // vnDateMinuteToUtc xử lý được minute >= 1440 vì nó cộng minute * 60000
    const startAt = vnDateMinuteToUtc(dateStr, minute);

    // endAt: nếu minute + SLOT_MINUTES vượt qua nửa đêm, vẫn tính đúng
    const endAt = vnDateMinuteToUtc(dateStr, minute + SLOT_MINUTES);

    slots.push({
      startAt,
      endAt,
      minuteOfDay: minute,
    });
  }

  return slots;
}
