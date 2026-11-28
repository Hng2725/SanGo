import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { addDaysToDateStr, toVnParts } from '@sango/shared';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import OwnerDashboardPage from './OwnerDashboardPage';

const calls = { summary: 0, revenue: 0, venues: 0, pending: 0 };
const ranges: { from: string; to: string }[] = [];

beforeEach(() => {
  Object.assign(calls, { summary: 0, revenue: 0, venues: 0, pending: 0 });
  ranges.length = 0;
  server.use(
    http.get('/api/owner/stats/summary', () => {
      calls.summary += 1;
      return HttpResponse.json({
        data: { todayBookings: 2, pendingCount: 0, monthRevenue: 500000, avgRating: 4.5 },
      });
    }),
    http.get('/api/owner/stats/revenue', ({ request }) => {
      calls.revenue += 1;
      const params = new URL(request.url).searchParams;
      const from = params.get('from') ?? '';
      const to = params.get('to') ?? '';
      ranges.push({ from, to });
      const points = [];
      for (let date = from; date <= to; date = addDaysToDateStr(date, 1)) {
        points.push({ period: date, revenue: 100000, bookingCount: 1 });
      }
      return HttpResponse.json({
        data: {
          groupBy: 'day',
          points,
          totalRevenue: points.length * 100000,
          totalBookings: points.length,
          expectedRevenue: 0,
        },
      });
    }),
    http.get('/api/owner/venues', () => {
      calls.venues += 1;
      return HttpResponse.json({ data: [] });
    }),
    http.get('/api/owner/bookings', () => {
      calls.pending += 1;
      return HttpResponse.json({
        data: { items: [], total: 0, totalPages: 0, page: 1, pageSize: 3 },
      });
    }),
  );
});

afterEach(() => vi.useRealTimers());

it('refreshes every displayed data source when clicking Làm mới', async () => {
  const user = userEvent.setup();
  renderWithProviders(<OwnerDashboardPage />);
  await screen.findByText('Tổng 7 lượt');
  await user.click(screen.getByRole('button', { name: /Làm mới/ }));
  await waitFor(() => expect(calls).toEqual({ summary: 2, revenue: 2, venues: 2, pending: 2 }));
});

it('keeps the range selector available and loads all fourteen days', async () => {
  const user = userEvent.setup();
  renderWithProviders(<OwnerDashboardPage />);
  await screen.findByText('Tổng 7 lượt');
  await user.click(screen.getByRole('button', { name: '14 ngày' }));
  expect(await screen.findByText('Tổng 14 lượt')).toBeInTheDocument();
  expect(ranges.at(-1)).toEqual({
    from: addDaysToDateStr(toVnParts(new Date()).dateStr, -13),
    to: toVnParts(new Date()).dateStr,
  });
});

it('uses the Vietnamese calendar date around midnight', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-27T18:00:00.000Z'));
  renderWithProviders(<OwnerDashboardPage />);
  await screen.findByText('Tổng 7 lượt');
  expect(ranges[0]).toEqual({ from: '2026-11-22', to: '2026-11-28' });
});

it('abbreviates large daily revenue for the narrow scoreboard columns', async () => {
  server.use(
    http.get('/api/owner/stats/revenue', () =>
      HttpResponse.json({
        data: {
          groupBy: 'day',
          points: [{ period: toVnParts(new Date()).dateStr, revenue: 12300000, bookingCount: 1 }],
          totalRevenue: 12300000,
          totalBookings: 1,
          expectedRevenue: 0,
        },
      }),
    ),
  );
  renderWithProviders(<OwnerDashboardPage />);
  expect(await screen.findByText('12,3 tr ₫')).toBeInTheDocument();
});

it('shows a retry action for a failed summary instead of presenting empty success', async () => {
  server.use(
    http.get('/api/owner/stats/summary', () =>
      HttpResponse.json(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Không tải được tổng quan chủ sân',
          path: '/api/owner/stats/summary',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      ),
    ),
  );
  renderWithProviders(<OwnerDashboardPage />);
  expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  expect(screen.getByText('Không tải được tổng quan chủ sân')).toBeInTheDocument();
});
