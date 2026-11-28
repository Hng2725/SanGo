import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import MyRecurringPage from '../pages/MyRecurringPage';

const series = {
  id: 'series-1', status: 'ACTIVE', venue: { name: 'Sân Hoa Lư' }, court: { name: 'Sân 1' }, weeks: 3,
  dayOfWeek: 1, startMinute: 1500, slotCount: 2,
  bookingStats: { total: 3, pending: 1, confirmed: 2, completed: 0, cancelled: 0, rejected: 0 },
};

describe('MyRecurringPage', () => {
  it('hiển thị thời gian qua đêm và thông báo lỗi hủy chuỗi', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/me/recurring', () => HttpResponse.json({ data: [series] })),
      http.patch('/api/me/recurring/series-1/cancel', () => HttpResponse.json({
        statusCode: 409, error: 'Conflict', code: 'INVALID_STATUS_TRANSITION', message: 'Đơn vừa thay đổi, vui lòng thử lại', path: '', timestamp: '2026-11-28T00:00:00Z',
      }, { status: 409 })),
    );
    renderWithProviders(<MyRecurringPage />);
    expect(await screen.findByText(/Thứ Hai/)).toBeInTheDocument();
    expect(screen.getByText(/01:00.*03:00/)).toBeInTheDocument();
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hủy chuỗi' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));
    expect(await screen.findByText('Đơn vừa thay đổi, vui lòng thử lại')).toBeInTheDocument();
  });
});
