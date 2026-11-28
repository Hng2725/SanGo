import type { BookingStatus } from '@sango/shared';

export type CancellationDecision =
  | { allowed: true; deadline: Date | null }
  | {
      allowed: false;
      reason: 'INVALID_STATUS' | 'ALREADY_STARTED' | 'TOO_LATE';
      deadline: Date | null;
    };

export interface EvaluateCancellationInput {
  status: BookingStatus;
  startAt: Date;
  now: Date;
  cancelBeforeHours: number;
  actor: 'CUSTOMER' | 'ADMIN';
}

export function getCancelDeadline(startAt: Date, cancelBeforeHours: number): Date {
  return new Date(startAt.getTime() - cancelBeforeHours * 3600_000);
}

export function evaluateCancellation(input: EvaluateCancellationInput): CancellationDecision {
  const { status, startAt, now, cancelBeforeHours, actor } = input;

  if (status !== 'PENDING' && status !== 'CONFIRMED') {
    return { allowed: false, reason: 'INVALID_STATUS', deadline: null };
  }

  const deadline = status === 'CONFIRMED' ? getCancelDeadline(startAt, cancelBeforeHours) : null;

  if (now.getTime() >= startAt.getTime()) {
    return { allowed: false, reason: 'ALREADY_STARTED', deadline };
  }

  if (actor === 'ADMIN') {
    return { allowed: true, deadline };
  }

  if (status === 'PENDING') {
    return { allowed: true, deadline: null };
  }

  if (deadline && now.getTime() <= deadline.getTime()) {
    return { allowed: true, deadline };
  }

  return { allowed: false, reason: 'TOO_LATE', deadline };
}
