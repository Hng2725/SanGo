import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BookingListItemDto } from '@sango/shared';
import { OwnerBookingsList } from '../components/OwnerBookingsList';

function makeBooking(index: number): BookingListItemDto {
  return {
    id: `booking-${index}`,
    code: `SG${String(index).padStart(4, '0')}`,
    status: 'PENDING',
    court: { id: 'court-1', name: 'Sân 1', sport: 'FOOTBALL' },
    venue: { id: 'venue-1', name: 'Sân Hoa Lư', slug: 'hoa-lu', address: 'TP. Hồ Chí Minh' },
    customer: { id: `customer-${index}`, fullName: `Khách ${index}`, phone: null },
    startAt: '2026-11-20T11:00:00.000Z',
    endAt: '2026-11-20T12:00:00.000Z',
    totalPrice: 300000,
    priceBreakdown: [],
    contactPhone: '0900000000',
    note: null,
    cancelReason: null,
    rejectReason: null,
    recurringSeriesId: null,
    createdAt: '2026-11-19T00:00:00.000Z',
    allowedActions: ['CONFIRM'],
  };
}

describe('OwnerBookingsList', () => {
  it('render bảng quản trị đầy đủ các đơn trong trang hiện tại', () => {
    const items = Array.from({ length: 300 }, (_, index) => makeBooking(index));
    render(<OwnerBookingsList items={items} hasNextPage={false} onLoadMore={vi.fn()} onSelect={vi.fn()} onConfirm={vi.fn()} onComplete={vi.fn()} onReject={vi.fn()} onConfirmSeries={vi.fn()} />);
    expect(screen.getAllByTestId(/^owner-booking-/).length).toBe(300);
    expect(screen.getByText('SG0000')).toBeInTheDocument();
  });
});
