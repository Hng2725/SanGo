import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { App } from 'antd';
import NewRecurringPage from '../pages/NewRecurringPage';

const preview = vi.fn();
const create = vi.fn();
const viewport = vi.hoisted(() => ({ mobile: false }));

vi.mock('@/common/hooks/useMediaQuery', () => ({ useMediaQuery: () => viewport.mobile }));

vi.mock('../api/recurringApi', () => ({
  usePreviewRecurringMutation: () => [preview, { data: { items: [{ date: '2026-12-01', startAt: '2026-12-01T10:00:00Z', endAt: '2026-12-01T11:00:00Z', available: false, reason: 'BOOKED', price: null }], totalAvailablePrice: 0 }, isLoading: false }],
  useCreateRecurringMutation: () => [create, { isLoading: false }],
}));

describe('NewRecurringPage', () => {
  beforeEach(() => { vi.clearAllMocks(); viewport.mobile = false; });
  it('hiển thị ngày bị trùng trong bảng xem trước', () => {
    render(<MemoryRouter initialEntries={['/me/recurring/new?courtId=court-1&date=2026-12-01&startMinute=600&slotCount=1']}><App><NewRecurringPage /></App></MemoryRouter>);
    expect(screen.getByText('Đã có người đặt hoặc giữ chỗ')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Đặt cố định hàng tuần' })).toBeInTheDocument();
    expect(screen.getByText('01/12/2026')).toBeInTheDocument();
    expect(screen.getByText('Tổng tiền: 0 ₫')).toBeInTheDocument();
  });

  it('gửi phút qua đêm cùng ngày hoạt động từ liên kết lịch sân sang preview', async () => {
    render(<MemoryRouter initialEntries={['/me/recurring/new?courtId=court-1&date=2026-11-30&startMinute=1500&slotCount=2']}><App><NewRecurringPage /></App></MemoryRouter>);
    await waitFor(() => expect(preview).toHaveBeenCalledWith({ courtId: 'court-1', firstDate: '2026-11-30', startMinute: 1500, slotCount: 2, weeks: 2 }));
  });

  it('dùng danh sách preview trên mobile và tóm tắt đúng giờ qua đêm', () => {
    viewport.mobile = true;
    render(<MemoryRouter initialEntries={['/me/recurring/new?courtId=court-1&date=2026-11-30&startMinute=1500&slotCount=2']}><App><NewRecurringPage /></App></MemoryRouter>);
    expect(screen.getByRole('list', { name: 'Các tuần đặt cố định' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/01:00.*\+1.*03:00.*\+1/)).toBeInTheDocument();
  });
});
