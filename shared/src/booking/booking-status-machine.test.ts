import { describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, type BookingStatus } from '../constants/booking-status';
import {
  BOOKING_TRANSITIONS,
  InvalidTransitionError,
  assertTransition,
  canTransition,
  isTerminalStatus,
  type BookingActor,
} from './booking-status-machine';

const ACTORS: readonly BookingActor[] = ['CUSTOMER', 'OWNER', 'ADMIN', 'SYSTEM'];

const EXPECTED_ALLOWED: Record<
  BookingStatus,
  Partial<Record<BookingStatus, readonly BookingActor[]>>
> = {
  PENDING: {
    CONFIRMED: ['OWNER'],
    REJECTED: ['OWNER', 'SYSTEM'],
    CANCELLED: ['CUSTOMER', 'ADMIN'],
  },
  CONFIRMED: {
    CANCELLED: ['CUSTOMER', 'ADMIN'],
    COMPLETED: ['OWNER', 'SYSTEM'],
  },
  COMPLETED: {},
  CANCELLED: {},
  REJECTED: {},
};

describe('booking-status-machine', () => {
  it('kiểm tra toàn bộ 5x5x4 = 100 tổ hợp chuyển trạng thái', () => {
    let checked = 0;
    for (const from of BOOKING_STATUSES) {
      for (const to of BOOKING_STATUSES) {
        for (const actor of ACTORS) {
          const expected = EXPECTED_ALLOWED[from][to]?.includes(actor) ?? false;
          expect(canTransition(from, to, actor)).toBe(expected);
          if (expected) {
            expect(() => assertTransition(from, to, actor)).not.toThrow();
          } else {
            expect(() => assertTransition(from, to, actor)).toThrow(InvalidTransitionError);
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBe(100);
  });

  it('trạng thái cuối không thể chuyển tiếp và isTerminalStatus trả true', () => {
    const terminals: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED'];
    const nonTerminals: BookingStatus[] = ['PENDING', 'CONFIRMED'];

    for (const status of terminals) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(Object.keys(BOOKING_TRANSITIONS[status])).toHaveLength(0);
      for (const to of BOOKING_STATUSES) {
        for (const actor of ACTORS) {
          expect(canTransition(status, to, actor)).toBe(false);
        }
      }
    }

    for (const status of nonTerminals) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });

  it('assertTransition ném InvalidTransitionError chứa đúng from, to, actor', () => {
    try {
      assertTransition('COMPLETED', 'CANCELLED', 'CUSTOMER');
      expect.unreachable('Phải ném lỗi');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      const err = error as InvalidTransitionError;
      expect(err.from).toBe('COMPLETED');
      expect(err.to).toBe('CANCELLED');
      expect(err.actor).toBe('CUSTOMER');
    }
  });
});
