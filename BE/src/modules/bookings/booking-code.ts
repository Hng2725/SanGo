import { VN_UTC_OFFSET_MINUTES } from '@sango/shared';

/**
 * Sinh mã đặt sân: SG + yyMMdd (giờ VN) + 4 ký tự base36 in hoa.
 * @param now Thời điểm hiện tại (UTC)
 * @param rand Hàm sinh số ngẫu nhiên [0, 1) – mặc định Math.random
 */
export function generateBookingCode(
  now: Date,
  rand: () => number = Math.random,
): string {
  // Chuyển sang giờ VN
  const vnMs = now.getTime() + VN_UTC_OFFSET_MINUTES * 60_000;
  const vn = new Date(vnMs);

  const yy = String(vn.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vn.getUTCDate()).padStart(2, '0');

  // 4 ký tự base36 in hoa (36^4 = 1_679_616 giá trị)
  const max = 36 ** 4;
  const randNum = Math.floor(rand() * max);
  const suffix = randNum.toString(36).toUpperCase().padStart(4, '0');

  return `SG${yy}${mm}${dd}${suffix}`;
}
