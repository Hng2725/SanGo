import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';

const booking = {
  id: 'booking-1', code: 'SG0001', status: 'PENDING',
  court: { name: 'Sân 1' }, venue: { name: 'Hoa Lư' }, customer: { fullName: 'Nguyễn Văn A' },
  contactPhone: '0901234567', startAt: '2026-12-01T11:00:00Z', endAt: '2026-12-01T12:00:00Z', totalPrice: 150000,
  allowedActions: ['CONFIRM', 'REJECT'],
};

describe('BookingDetailDrawer', () => {
  it('confirms a booking directly from the owner schedule drawer and refreshes actions', async () => {
    const user = userEvent.setup();
    let confirmed = false;
    server.use(
      http.get('/api/bookings/booking-1', () => HttpResponse.json({ data: confirmed ? { ...booking, status: 'CONFIRMED', allowedActions: [] } : booking })),
      http.patch('/api/owner/bookings/booking-1/confirm', () => { confirmed = true; return HttpResponse.json({ data: { ...booking, status: 'CONFIRMED', allowedActions: [] } }); }),
    );
    renderWithProviders(<BookingDetailDrawer bookingId="booking-1" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Xác nhận' }));
    expect(await screen.findByText('Đã xác nhận')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).not.toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
  });

  it('shows rejection conflicts and keeps the reason for retry', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/bookings/booking-1', () => HttpResponse.json({ data: booking })),
      http.patch('/api/owner/bookings/booking-1/reject', () => HttpResponse.json({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION', error: 'Conflict', message: 'Đơn vừa thay đổi', path: '', timestamp: '2026-11-28T00:00:00Z' }, { status: 409 })),
    );
    renderWithProviders(<BookingDetailDrawer bookingId="booking-1" onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
    await user.type(screen.getByRole('textbox', { name: 'Lý do từ chối' }), 'Sân cần bảo trì');
    await user.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
    expect(await screen.findByText('Đơn vừa thay đổi')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Lý do từ chối' })).toHaveValue('Sân cần bảo trì');
  });
});
