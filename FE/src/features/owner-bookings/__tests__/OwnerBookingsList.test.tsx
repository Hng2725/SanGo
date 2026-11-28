import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.restoreAllMocks());
  it('render bảng quản trị đầy đủ các đơn trong trang hiện tại', () => {
    const items = Array.from({ length: 20 }, (_, index) => makeBooking(index));
    render(
      <OwnerBookingsList
        items={items}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
        onConfirm={vi.fn()}
        onComplete={vi.fn()}
        onReject={vi.fn()}
        onConfirmSeries={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId(/^owner-booking-/).length).toBe(20);
    expect(screen.getByText('SG0000')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Khách hàng' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Giá trị' })).toBeInTheDocument();
  });

  it('keeps booking actions and series confirmation attached to the correct booking', async () => {
    const user = userEvent.setup();
    const booking = {
      ...makeBooking(1),
      recurringSeriesId: 'series-1',
      allowedActions: ['CONFIRM', 'REJECT'] as BookingListItemDto['allowedActions'],
    };
    const select = vi.fn();
    const confirm = vi.fn();
    const reject = vi.fn();
    const confirmSeries = vi.fn();
    render(
      <OwnerBookingsList
        items={[booking]}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        onSelect={select}
        onConfirm={confirm}
        onComplete={vi.fn()}
        onReject={reject}
        onConfirmSeries={confirmSeries}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận cả chuỗi' }));
    expect(select).toHaveBeenCalledWith('booking-1');
    expect(confirm).toHaveBeenCalledWith('booking-1');
    expect(reject).toHaveBeenCalledWith('booking-1');
    expect(confirmSeries).toHaveBeenCalledWith('series-1');
  });

  it('only shows details for a terminal booking with no allowed actions', () => {
    render(
      <OwnerBookingsList
        items={[{ ...makeBooking(2), status: 'COMPLETED', allowedActions: [] }]}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
        onConfirm={vi.fn()}
        onComplete={vi.fn()}
        onReject={vi.fn()}
        onConfirmSeries={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Chi tiết' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
  });

  it('uses a mobile list with an accessible menu containing every allowed action', async () => {
    const media = window.matchMedia('');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...media,
      media: query,
      matches: query === '(max-width: 991px)',
    }));
    const user = userEvent.setup();
    const confirmSeries = vi.fn();
    render(
      <OwnerBookingsList
        items={[{ ...makeBooking(3), recurringSeriesId: 'series-3' }]}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
        onConfirm={vi.fn()}
        onComplete={vi.fn()}
        onReject={vi.fn()}
        onConfirmSeries={confirmSeries}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Danh sách đơn đặt sân' })).getByText('SG0003'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thao tác đơn SG0003' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Xác nhận cả chuỗi' }));
    expect(confirmSeries).toHaveBeenCalledWith('series-3');
  });
});
