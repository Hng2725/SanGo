import {
  canTransition,
  type BookingAction,
  type BookingActor,
  type BookingStatus,
} from '@sango/shared';
import { evaluateCancellation } from './cancellation-policy';

export interface AllowedActionsBooking {
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
}

export interface AllowedActionsContext {
  now: Date;
  cancelBeforeHours: number;
  hasReview: boolean;
}

export function getAllowedActions(
  booking: AllowedActionsBooking,
  actor: BookingActor,
  ctx: AllowedActionsContext,
): BookingAction[] {
  const actions: BookingAction[] = [];

  if (
    canTransition(booking.status, 'CONFIRMED', actor) &&
    booking.startAt.getTime() > ctx.now.getTime()
  ) {
    actions.push('CONFIRM');
  }

  if (canTransition(booking.status, 'REJECTED', actor)) {
    actions.push('REJECT');
  }

  if (
    canTransition(booking.status, 'CANCELLED', actor) &&
    (actor === 'CUSTOMER' || actor === 'ADMIN')
  ) {
    const decision = evaluateCancellation({
      status: booking.status,
      startAt: booking.startAt,
      now: ctx.now,
      cancelBeforeHours: ctx.cancelBeforeHours,
      actor,
    });
    if (decision.allowed) {
      actions.push('CANCEL');
    }
  }

  if (
    canTransition(booking.status, 'COMPLETED', actor) &&
    booking.endAt.getTime() <= ctx.now.getTime()
  ) {
    actions.push('COMPLETE');
  }

  if (actor === 'CUSTOMER' && booking.status === 'COMPLETED' && !ctx.hasReview) {
    actions.push('REVIEW');
  }

  if (actor === 'CUSTOMER') {
    actions.push('COMPLAIN');
  }

  return actions;
}
