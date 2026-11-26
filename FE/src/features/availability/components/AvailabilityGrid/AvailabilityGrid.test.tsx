import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  MAX_SLOTS_PER_BOOKING,
  type AvailabilitySlot,
  type CourtWeekAvailabilityDto,
} from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import { useSlotSelection } from '../../hooks/useSlotSelection';
import { AvailabilityGrid, SlotCell } from './index';

const mockWeekData: CourtWeekAvailabilityDto = {
  court: { id: 'c1', name: 'Sân 5A', sport: 'FOOTBALL' },
  weekStart: '2026-11-23',
  days: [
    {
      date: '2026-11-23',
      isClosed: false,
      slots: [
        {
          startAt: '2026-11-23T01:00:00.000Z',
          endAt: '2026-11-23T02:00:00.000Z',
          minuteOfDay: 480, // 08:00
          status: 'AVAILABLE',
          price: 150000,
          label: 'Giờ sáng',
        },
        {
          startAt: '2026-11-23T02:00:00.000Z',
          endAt: '2026-11-23T03:00:00.000Z',
          minuteOfDay: 540, // 09:00
          status: 'AVAILABLE',
          price: 200000,
          label: 'Giờ sáng',
        },
        {
          startAt: '2026-11-23T03:00:00.000Z',
          endAt: '2026-11-23T04:00:00.000Z',
          minuteOfDay: 600, // 10:00
          status: 'BOOKED',
          price: 200000,
          label: null,
        },
      ],
    },
  ],
};

const TestGridHarness: React.FC = () => {
  const { selected, isSelected, toggle } = useSlotSelection<AvailabilitySlot>({
    getKey: (s) => s.startAt,
    isSelectable: (s) => s.status === 'AVAILABLE' || s.status === 'HELD_BY_ME',
    isAdjacent: (a, b) => a.endAt === b.startAt,
    max: MAX_SLOTS_PER_BOOKING,
  });

  const totalPrice = selected.reduce((sum, s) => sum + (s.price ?? 0), 0);

  return (
    <div>
      <AvailabilityGrid data={mockWeekData} mode="customer" isSelected={isSelected}>
        <AvailabilityGrid.Table
          renderCell={(slot, { isSelected: cellSelected }) => (
            <SlotCell slot={slot} selected={cellSelected} onClick={toggle} />
          )}
        />
      </AvailabilityGrid>
      <div data-testid="selected-count">{selected.length}</div>
      <div data-testid="total-price">{formatCurrency(totalPrice)}</div>
    </div>
  );
};

describe('AvailabilityGrid', () => {
  it('click 2 ô liền kề -> chọn cả 2 ô và tính tổng tiền đúng', () => {
    render(<TestGridHarness />);

    const slot1 = screen.getByTestId('slot-cell-2026-11-23T01:00:00.000Z');
    const slot2 = screen.getByTestId('slot-cell-2026-11-23T02:00:00.000Z');

    fireEvent.click(slot1);
    fireEvent.click(slot2);

    expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-price')).toHaveTextContent(formatCurrency(350000));
  });

  it('click ô BOOKED không chọn được', () => {
    render(<TestGridHarness />);

    const bookedSlot = screen.getByTestId('slot-cell-2026-11-23T03:00:00.000Z');
    expect(bookedSlot).toBeDisabled();

    fireEvent.click(bookedSlot);

    expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    expect(screen.getByTestId('total-price')).toHaveTextContent(formatCurrency(0));
  });
});
