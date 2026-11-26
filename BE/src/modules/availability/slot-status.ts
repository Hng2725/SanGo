import type { SlotTemplate } from './slot-generator';

/** Trạng thái của một khung giờ, theo thứ tự ưu tiên giảm dần */
export type SlotStatus =
  | 'PAST'
  | 'BOOKED'
  | 'MAINTENANCE'
  | 'HELD_BY_ME'
  | 'HELD'
  | 'AVAILABLE';

/** Thông tin booking gắn với khung (chỉ trả cho OWNER) */
export interface SlotBookingInfo {
  id: string;
  code: string;
  status: string;
  customerName: string;
}

export interface SlotStatusContext {
  now: Date;
  currentUserId?: string;
  locks: ReadonlyArray<{
    startAt: Date;
    bookingId: string | null;
    holdUserId: string | null;
    expiresAt: Date | null;
    booking?: SlotBookingInfo;
  }>;
  maintenance: ReadonlyArray<{ startAt: Date; endAt: Date }>;
  /** true khi người xem là OWNER sở hữu venue */
  includeBookingInfo: boolean;
}

/**
 * Tính trạng thái của một khung giờ theo thứ tự ưu tiên:
 * PAST → BOOKED → MAINTENANCE → HELD_BY_ME / HELD → AVAILABLE
 *
 * Hold hết hạn (expiresAt <= now) coi như không có.
 */
export function computeSlotStatus(
  slot: SlotTemplate,
  ctx: SlotStatusContext,
): { status: SlotStatus; booking?: SlotBookingInfo } {
  // 1. PAST: startAt đã qua
  if (slot.startAt.getTime() <= ctx.now.getTime()) {
    return { status: 'PAST' };
  }

  // Tìm lock khớp startAt
  const lock = ctx.locks.find(
    (l) => l.startAt.getTime() === slot.startAt.getTime(),
  );

  // 2. BOOKED: lock có bookingId
  if (lock?.bookingId) {
    const result: { status: SlotStatus; booking?: SlotBookingInfo } = {
      status: 'BOOKED',
    };
    if (ctx.includeBookingInfo && lock.booking) {
      result.booking = lock.booking;
    }
    return result;
  }

  // 3. MAINTENANCE: có block bảo trì chồng khung
  const inMaintenance = ctx.maintenance.some(
    (m) =>
      m.startAt.getTime() < slot.endAt.getTime() &&
      m.endAt.getTime() > slot.startAt.getTime(),
  );
  if (inMaintenance) {
    return { status: 'MAINTENANCE' };
  }

  // 4. HELD_BY_ME / HELD: lock hold còn hạn (expiresAt > now)
  if (lock && !lock.bookingId && lock.expiresAt) {
    const holdValid = lock.expiresAt.getTime() > ctx.now.getTime();
    if (holdValid) {
      if (ctx.currentUserId && lock.holdUserId === ctx.currentUserId) {
        return { status: 'HELD_BY_ME' };
      }
      return { status: 'HELD' };
    }
    // Hold hết hạn → coi như không có, rơi xuống AVAILABLE
  }

  // 5. AVAILABLE
  return { status: 'AVAILABLE' };
}
