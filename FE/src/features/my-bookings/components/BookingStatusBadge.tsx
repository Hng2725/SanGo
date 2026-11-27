import { Tag } from 'antd';
import { BOOKING_STATUS_LABELS, type BookingStatus } from '@sango/shared';

export const BOOKING_STATUS_BADGE: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: BOOKING_STATUS_LABELS.PENDING, className: 'status-warning' },
  CONFIRMED: { label: BOOKING_STATUS_LABELS.CONFIRMED, className: 'status-success' },
  COMPLETED: { label: BOOKING_STATUS_LABELS.COMPLETED, className: 'status-success' },
  CANCELLED: { label: BOOKING_STATUS_LABELS.CANCELLED, className: 'status-neutral' },
  REJECTED: { label: BOOKING_STATUS_LABELS.REJECTED, className: 'status-error' },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const badge = BOOKING_STATUS_BADGE[status];
  return <Tag className={badge.className}>{badge.label}</Tag>;
}
