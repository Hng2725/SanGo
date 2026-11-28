import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import BookingDetailPage from '../pages/BookingDetailPage';

const booking = {
  id: 'booking-1',
  code: 'SG0001',
  status: 'CONFIRMED' as const,
  court: { id: 'court-1', name: 'Sân 1', sport: 'FOOTBALL' as const },
  venue: { id: 'venue-1', name: 'Sân Hoa Lư', slug: 'hoa-lu', address: 'TP. Hồ Chí Minh' },
  customer: { id: 'customer-1', fullName: 'Nguyễn Văn A', phone: '0900000000' },
  startAt: '2026-11-20T11:00:00.000Z',
  endAt: '2026-11-20T12:00:00.000Z',
  totalPrice: 300000,
  priceBreakdown: [{ startAt: '2026-11-20T11:00:00.000Z', endAt: '2026-11-20T12:00:00.000Z', price: 300000, label: 'Giờ thường' }],
  contactPhone: '0900000000',
  note: null,
  cancelReason: null,
  rejectReason: null,
  recurringSeriesId: null,
  createdAt: '2026-11-19T00:00:00.000Z',
  allowedActions: ['CANCEL'] as const,
  cancelDeadline: '2026-11-20T08:00:00.000Z',
  timeline: [{ status: 'CONFIRMED' as const, at: '2026-11-19T01:00:00.000Z' }],
  review: null,
  venueCancelBeforeHours: 3,
};

describe('BookingDetailPage', () => {
  it('cho phép nhập lý do và gửi yêu cầu hủy', async () => {
    const user = userEvent.setup();
    let payload: unknown;
    let cancelled = false;
    server.use(
      http.get('/api/bookings/booking-1', () => HttpResponse.json({ data: cancelled ? { ...booking, status: 'CANCELLED', allowedActions: [] } : booking })),
      http.patch('/api/bookings/booking-1/cancel', async ({ request }) => {
        payload = await request.json();
        cancelled = true;
        return HttpResponse.json({ data: { ...booking, status: 'CANCELLED', allowedActions: [] } });
      }),
    );

    renderWithProviders(<BookingDetailPage />, { route: '/me/bookings/booking-1', path: '/me/bookings/:id' });
    expect(await screen.findByText('Đã xác nhận')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hủy đơn' }));
    await user.type(screen.getByPlaceholderText('Lý do hủy (không bắt buộc)'), 'Có việc đột xuất');
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => expect(payload).toEqual({ reason: 'Có việc đột xuất' }));
    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument();
  });

  it('hiển thị đánh giá hiện có, phản hồi và nhãn timeline tiếng Việt', async () => {
    server.use(http.get('/api/bookings/booking-1', () => HttpResponse.json({ data: {
      ...booking,
      status: 'COMPLETED',
      allowedActions: ['COMPLAIN'],
      priceBreakdown: [{ ...booking.priceBreakdown[0], label: undefined }],
      review: { id: 'review-1', rating: 4, comment: 'Sân sạch sẽ', ownerReply: 'Cảm ơn bạn' },
    } })));
    renderWithProviders(<BookingDetailPage />, { route: '/me/bookings/booking-1', path: '/me/bookings/:id' });
    expect(await screen.findByText('Sân sạch sẽ')).toBeInTheDocument();
    expect(screen.getByText('Cảm ơn bạn')).toBeInTheDocument();
    expect(screen.getByText(/Đã xác nhận ·/)).toBeInTheDocument();
    expect(screen.queryByText(/CONFIRMED/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026-11-20T11:00:00/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh giá' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khiếu nại' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sân Hoa Lư' })).toHaveAttribute('href', '/venues/hoa-lu');
  });

  it('hiển thị lỗi khi máy chủ từ chối hủy quá hạn', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/bookings/booking-1', () => HttpResponse.json({ data: booking })),
      http.patch('/api/bookings/booking-1/cancel', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'Conflict',
            code: 'CANCELLATION_NOT_ALLOWED',
            message: 'Đã quá hạn hủy',
            path: '/api/bookings/booking-1/cancel',
            timestamp: '2026-11-20T00:00:00.000Z',
          },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<BookingDetailPage />, { route: '/me/bookings/booking-1', path: '/me/bookings/:id' });
    await user.click(await screen.findByRole('button', { name: 'Hủy đơn' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    expect(await screen.findByText('Đã quá hạn hủy')).toBeInTheDocument();
  });
});
