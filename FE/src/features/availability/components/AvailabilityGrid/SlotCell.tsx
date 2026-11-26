import React from 'react';
import { formatMinute, type AvailabilitySlot } from '@sango/shared';
import { cn, formatCurrency } from '@/common/utils/format';

export interface SlotCellProps {
  slot: AvailabilitySlot;
  selected: boolean;
  onClick?: (slot: AvailabilitySlot) => void;
}

const STATUS_LABELS: Record<AvailabilitySlot['status'], string> = {
  AVAILABLE: 'Trống',
  BOOKED: 'Đã đặt',
  MAINTENANCE: 'Bảo trì',
  HELD: 'Đang giữ',
  HELD_BY_ME: 'Giữ bởi bạn',
  PAST: 'Đã qua',
  CLOSED: 'Nghỉ',
};

// React.memo giúp chỉ re-render đúng ô thay đổi trạng thái selected thay vì cả 7x16 ô trong lưới
export const SlotCell = React.memo<SlotCellProps>(function SlotCell({
  slot,
  selected,
  onClick,
}) {
  const isInteractive = slot.status === 'AVAILABLE' || slot.status === 'HELD_BY_ME';

  const handleClick = () => {
    if (!isInteractive || !onClick) return;
    onClick(slot);
  };

  const getStyle = (): React.CSSProperties => {
    if (selected) {
      return {
        background: '#1677ff',
        borderColor: '#0958d9',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: 600,
      };
    }
    switch (slot.status) {
      case 'AVAILABLE':
        return {
          background: '#f6ffed',
          borderColor: '#b7eb8f',
          color: '#135200',
          cursor: 'pointer',
        };
      case 'HELD_BY_ME':
        return {
          background: '#e6f4ff',
          borderColor: '#1677ff',
          borderWidth: 2,
          color: '#003eb3',
          cursor: 'pointer',
        };
      case 'HELD':
        return {
          background: '#fffbe6',
          borderColor: '#ffe58f',
          color: '#ad6800',
          cursor: 'not-allowed',
        };
      case 'BOOKED':
        return {
          background: '#fff1f0',
          borderColor: '#ffa39e',
          color: '#a8071a',
          cursor: 'not-allowed',
        };
      case 'MAINTENANCE':
        return {
          background:
            'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 5px, #e8e8e8 5px, #e8e8e8 10px)',
          borderColor: '#d9d9d9',
          color: '#595959',
          cursor: 'not-allowed',
        };
      case 'PAST':
      case 'CLOSED':
      default:
        return {
          background: '#fafafa',
          borderColor: '#f0f0f0',
          color: '#bfbfbf',
          cursor: 'not-allowed',
        };
    }
  };

  const timeText = formatMinute(slot.minuteOfDay);
  const priceText = slot.price !== null ? formatCurrency(slot.price) : '';

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={handleClick}
      aria-pressed={selected}
      aria-label={`Khung ${timeText} - ${STATUS_LABELS[slot.status]}${priceText ? ` - ${priceText}` : ''}`}
      data-testid={`slot-cell-${slot.startAt || slot.minuteOfDay}`}
      data-status={slot.status}
      data-selected={selected ? 'true' : 'false'}
      className={cn('sango-slot-cell')}
      style={{
        width: '100%',
        minHeight: 52,
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
        transition: 'all 0.15s ease',
        ...getStyle(),
      }}
    >
      {slot.status === 'AVAILABLE' || slot.status === 'HELD_BY_ME' ? (
        <>
          <span style={{ fontWeight: 600 }}>
            {slot.price !== null ? formatCurrency(slot.price) : 'Trống'}
          </span>
          {slot.label && (
            <span style={{ fontSize: 11, opacity: 0.85 }}>{slot.label}</span>
          )}
          {slot.status === 'HELD_BY_ME' && !selected && (
            <span style={{ fontSize: 10, fontWeight: 600 }}>Giữ bởi bạn</span>
          )}
        </>
      ) : (
        <span>{STATUS_LABELS[slot.status]}</span>
      )}
    </button>
  );
});
