import type { BookingStatus } from '../constants/booking-status';

export type BookingActor = 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'SYSTEM';

export const BOOKING_TRANSITIONS: Record<
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

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: BookingActor,
): boolean {
  const allowedActors = BOOKING_TRANSITIONS[from]?.[to];
  return allowedActors ? allowedActors.includes(actor) : false;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
    readonly actor: BookingActor,
  ) {
    super(`Không thể chuyển trạng thái đơn từ ${from} sang ${to} với vai trò ${actor}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: BookingActor,
): void {
  if (!canTransition(from, to, actor)) {
    throw new InvalidTransitionError(from, to, actor);
  }
}

export function isTerminalStatus(status: BookingStatus): boolean {
  return Object.keys(BOOKING_TRANSITIONS[status]).length === 0;
}

export type BookingAction = 'CONFIRM' | 'REJECT' | 'CANCEL' | 'COMPLETE' | 'REVIEW' | 'COMPLAIN';
