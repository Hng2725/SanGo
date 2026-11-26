import {
  computeSlotStatus,
  SlotBookingInfo,
  SlotStatusContext,
} from './slot-status';
import type { SlotTemplate } from './slot-generator';

/** Helper: tạo SlotTemplate nhanh */
function makeSlot(startIso: string, endIso: string, minuteOfDay = 600): SlotTemplate {
  return {
    startAt: new Date(startIso),
    endAt: new Date(endIso),
    minuteOfDay,
  };
}

// Khung 10:00–11:00 VN ngày 2026-11-26
// 10:00 VN = 03:00 UTC → 2026-11-26T03:00:00.000Z
// 11:00 VN = 04:00 UTC → 2026-11-26T04:00:00.000Z
const futureSlot = makeSlot(
  '2026-11-26T03:00:00.000Z',
  '2026-11-26T04:00:00.000Z',
  600,
);

const now = new Date('2026-11-25T10:00:00.000Z'); // trước futureSlot

const bookingInfo: SlotBookingInfo = {
  id: 'booking-1',
  code: 'SG261126ABCD',
  status: 'PENDING',
  customerName: 'Nguyễn Văn A',
};

describe('computeSlotStatus', () => {
  describe('PAST', () => {
    it('trả PAST khi startAt <= now', () => {
      const pastSlot = makeSlot(
        '2026-11-25T02:00:00.000Z',
        '2026-11-25T03:00:00.000Z',
      );
      const ctx: SlotStatusContext = {
        now: new Date('2026-11-25T02:00:00.000Z'),
        locks: [],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(pastSlot, ctx)).toEqual({ status: 'PAST' });
    });

    it('trả PAST khi startAt === now (đúng bằng)', () => {
      const ctx: SlotStatusContext = {
        now: new Date('2026-11-26T03:00:00.000Z'),
        locks: [],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({ status: 'PAST' });
    });
  });

  describe('BOOKED', () => {
    it('trả BOOKED khi lock có bookingId', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: 'booking-1',
            holdUserId: null,
            expiresAt: null,
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({ status: 'BOOKED' });
    });

    it('không trả booking info khi includeBookingInfo = false', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: 'booking-1',
            holdUserId: null,
            expiresAt: null,
            booking: bookingInfo,
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      const result = computeSlotStatus(futureSlot, ctx);
      expect(result.status).toBe('BOOKED');
      expect(result.booking).toBeUndefined();
    });

    it('trả booking info khi includeBookingInfo = true', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: 'booking-1',
            holdUserId: null,
            expiresAt: null,
            booking: bookingInfo,
          },
        ],
        maintenance: [],
        includeBookingInfo: true,
      };
      const result = computeSlotStatus(futureSlot, ctx);
      expect(result.status).toBe('BOOKED');
      expect(result.booking).toEqual(bookingInfo);
    });
  });

  describe('MAINTENANCE', () => {
    it('trả MAINTENANCE khi có block bảo trì chồng khung', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [],
        maintenance: [
          {
            startAt: new Date('2026-11-26T02:30:00.000Z'),
            endAt: new Date('2026-11-26T05:00:00.000Z'),
          },
        ],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'MAINTENANCE',
      });
    });

    it('MAINTENANCE ưu tiên hơn HELD', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date('2026-11-26T10:00:00.000Z'),
          },
        ],
        maintenance: [
          {
            startAt: new Date('2026-11-26T02:00:00.000Z'),
            endAt: new Date('2026-11-26T05:00:00.000Z'),
          },
        ],
        includeBookingInfo: false,
      };
      // BOOKED ưu tiên hơn MAINTENANCE, nhưng đây là hold (không có bookingId)
      // Nên thứ tự: MAINTENANCE > HELD
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'MAINTENANCE',
      });
    });
  });

  describe('HELD_BY_ME', () => {
    it('trả HELD_BY_ME khi hold còn hạn và thuộc user hiện tại', () => {
      const ctx: SlotStatusContext = {
        now,
        currentUserId: 'user-1',
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date('2026-11-26T10:00:00.000Z'), // còn hạn
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'HELD_BY_ME',
      });
    });
  });

  describe('HELD', () => {
    it('trả HELD khi hold còn hạn và thuộc user khác', () => {
      const ctx: SlotStatusContext = {
        now,
        currentUserId: 'user-2',
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date('2026-11-26T10:00:00.000Z'),
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({ status: 'HELD' });
    });

    it('trả HELD khi hold còn hạn và không có currentUserId', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date('2026-11-26T10:00:00.000Z'),
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({ status: 'HELD' });
    });
  });

  describe('AVAILABLE', () => {
    it('trả AVAILABLE khi không có lock, maintenance, và chưa qua', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'AVAILABLE',
      });
    });
  });

  describe('hold hết hạn → AVAILABLE', () => {
    it('trả AVAILABLE khi hold đã hết hạn (expiresAt <= now)', () => {
      const ctx: SlotStatusContext = {
        now,
        currentUserId: 'user-1',
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date('2026-11-25T09:00:00.000Z'), // trước now
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'AVAILABLE',
      });
    });

    it('trả AVAILABLE khi hold expiresAt === now (đúng bằng)', () => {
      const ctx: SlotStatusContext = {
        now,
        currentUserId: 'user-1',
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: null,
            holdUserId: 'user-1',
            expiresAt: new Date(now.getTime()), // === now
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      expect(computeSlotStatus(futureSlot, ctx)).toEqual({
        status: 'AVAILABLE',
      });
    });
  });

  describe('ẩn/hiện booking theo includeBookingInfo', () => {
    it('BOOKED không có booking khi includeBookingInfo = false', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: 'b-1',
            holdUserId: null,
            expiresAt: null,
            booking: bookingInfo,
          },
        ],
        maintenance: [],
        includeBookingInfo: false,
      };
      const result = computeSlotStatus(futureSlot, ctx);
      expect(result.booking).toBeUndefined();
    });

    it('BOOKED có booking khi includeBookingInfo = true', () => {
      const ctx: SlotStatusContext = {
        now,
        locks: [
          {
            startAt: futureSlot.startAt,
            bookingId: 'b-1',
            holdUserId: null,
            expiresAt: null,
            booking: bookingInfo,
          },
        ],
        maintenance: [],
        includeBookingInfo: true,
      };
      const result = computeSlotStatus(futureSlot, ctx);
      expect(result.booking).toEqual(bookingInfo);
    });
  });
});
