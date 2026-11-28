import { StatusDot } from '@/components/feedback/StatusDot';
import { BOOKING_STATUS_LABELS, type BookingStatus } from '@sango/shared';

const tones: Record<BookingStatus, 'warning' | 'success' | 'muted' | 'error'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'muted',
  REJECTED: 'error',
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return <StatusDot label={BOOKING_STATUS_LABELS[status]} tone={tones[status]} />;
}
