import React from 'react';
import {
  BOOKING_STATUS_LABELS,
  formatMinute,
  type AvailabilitySlot,
  type BookingStatus,
} from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';

export interface OwnerSlotCellProps {
  slot: AvailabilitySlot;
  selected?: boolean;
  onClick?: (slot: AvailabilitySlot) => void;
}

const BOOKING_STATUS_COLORS: Record<
  BookingStatus,
  { bg: string; border: string; text: string }
> = {
  PENDING: { bg: '#fff7e6', border: '#ffd591', text: '#ad4e00' },
  CONFIRMED: { bg: '#e6f4ff', border: '#91caff', text: '#003eb3' },
  COMPLETED: { bg: '#f6ffed', border: '#73d13d', text: '#135200' },
  CANCELLED: { bg: '#fff1f0', border: '#ffa39e', text: '#a8071a' },
  REJECTED: { bg: '#fff1f0', border: '#ffa39e', text: '#a8071a' },
};

// React.memo giúp tối ưu hiệu năng render lưới tuần của chủ sân
export const OwnerSlotCell = React.memo<OwnerSlotCellProps>(function OwnerSlotCell({
  slot,
  selected = false,
  onClick,
}) {
  const hasBooking = slot.status === 'BOOKED' && Boolean(slot.booking);

  const handleClick = () => {
    if (onClick) {
      onClick(slot);
    }
  };

  const getStyle = (): React.CSSProperties => {
    if (selected) {
      return {
        background: '#1677ff',
        borderColor: '#0958d9',
        color: '#fff',
      };
    }
    if (slot.status === 'BOOKED') {
      const bStatus = slot.booking?.status ?? 'CONFIRMED';
      const palette = BOOKING_STATUS_COLORS[bStatus] ?? BOOKING_STATUS_COLORS.CONFIRMED;
      return {
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
        cursor: hasBooking ? 'pointer' : 'default',
      };
    }
    if (slot.status === 'MAINTENANCE') {
      return {
        background:
          'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 6px, #d9d9d9 6px, #d9d9d9 12px)',
        borderColor: '#bfbfbf',
        color: '#434343',
        cursor: 'default',
      };
    }
    if (slot.status === 'HELD' || slot.status === 'HELD_BY_ME') {
      return {
        background: '#fffbe6',
        borderColor: '#ffe58f',
        color: '#ad6800',
        cursor: 'default',
      };
    }
    if (slot.status === 'AVAILABLE') {
      return {
        background: '#f6ffed',
        borderColor: '#b7eb8f',
        color: '#135200',
        cursor: 'default',
      };
    }
    return {
      background: '#fafafa',
      borderColor: '#f0f0f0',
      color: '#bfbfbf',
      cursor: 'default',
    };
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`owner-slot-cell-${slot.startAt || slot.minuteOfDay}`}
      data-status={slot.status}
      aria-label={`Khung ${formatMinute(slot.minuteOfDay)} - ${slot.booking ? slot.booking.customerName : slot.status}`}
      style={{
        width: '100%',
        minHeight: 56,
        padding: '6px 8px',
        borderRadius: 6,
        borderStyle: 'solid',
        borderWidth: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        fontSize: 12,
        lineHeight: 1.25,
        ...getStyle(),
      }}
    >
      {slot.status === 'BOOKED' && slot.booking ? (
        <>
          <span
            style={{
              fontWeight: 700,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {slot.booking.customerName}
          </span>
          <span style={{ fontSize: 11 }}>
            {BOOKING_STATUS_LABELS[slot.booking.status] ?? slot.booking.status}
          </span>
        </>
      ) : slot.status === 'BOOKED' ? (
        <span style={{ fontWeight: 600 }}>Đã đặt</span>
      ) : slot.status === 'MAINTENANCE' ? (
        <span style={{ fontWeight: 600 }}>Bảo trì</span>
      ) : slot.status === 'HELD' || slot.status === 'HELD_BY_ME' ? (
        <span>Đang giữ chỗ</span>
      ) : slot.status === 'AVAILABLE' ? (
        <span>{slot.price !== null ? formatCurrency(slot.price) : 'Trống'}</span>
      ) : slot.status === 'PAST' ? (
        <span>Đã qua</span>
      ) : (
        <span>Nghỉ</span>
      )}
    </button>
  );
});
