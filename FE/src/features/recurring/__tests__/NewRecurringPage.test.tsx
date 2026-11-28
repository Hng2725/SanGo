import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { App } from 'antd';
import NewRecurringPage from '../pages/NewRecurringPage';

const preview = vi.fn();
const create = vi.fn();

vi.mock('../api/recurringApi', () => ({
  usePreviewRecurringMutation: () => [preview, { data: { items: [{ date: '2026-12-01', startAt: '2026-12-01T10:00:00Z', endAt: '2026-12-01T11:00:00Z', available: false, reason: 'BOOKED', price: null }], totalAvailablePrice: 0 }, isLoading: false }],
  useCreateRecurringMutation: () => [create, { isLoading: false }],
}));

describe('NewRecurringPage', () => {
  it('hiển thị ngày bị trùng trong bảng xem trước', () => {
    render(<MemoryRouter initialEntries={['/me/recurring/new?courtId=court-1&date=2026-12-01&startMinute=600&slotCount=1']}><App><NewRecurringPage /></App></MemoryRouter>);
    expect(screen.getByText('Trùng lịch (BOOKED)')).toBeInTheDocument();
  });
});
