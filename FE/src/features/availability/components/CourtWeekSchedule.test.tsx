import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { App } from 'antd';
import userEvent from '@testing-library/user-event';
import {
  addDaysToDateStr,
  startOfWeekDateStr,
  toVnParts,
  type CourtSummaryDto,
  type CourtWeekAvailabilityDto,
} from '@sango/shared';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import { CourtWeekSchedule } from './CourtWeekSchedule';

const mockCourts: CourtSummaryDto[] = [{ id: 'c1', name: 'Sân 5A', sport: 'FOOTBALL' }];

function buildMockWeek(weekStart: string, price: number): CourtWeekAvailabilityDto {
  return {
    court: mockCourts[0],
    weekStart,
    days: [
      {
        date: weekStart,
        isClosed: false,
        slots: [
          {
            startAt: `${weekStart}T01:00:00.000Z`,
            endAt: `${weekStart}T02:00:00.000Z`,
            minuteOfDay: 480,
            status: 'AVAILABLE',
            price,
            label: `Giá tuần ${weekStart}`,
          },
        ],
      },
    ],
  };
}

describe('CourtWeekSchedule (MSW)', () => {
  it('hides the previous court data while loading a different court', async () => {
    const monday = startOfWeekDateStr(toVnParts(new Date()).dateStr);
    server.use(
      http.get('*/api/courts/:courtId/availability', async ({ params, request }) => {
        const weekStart = new URL(request.url).searchParams.get('weekStart') ?? monday;
        if (params.courtId === 'c2') await delay(150);
        return HttpResponse.json({
          data: {
            ...buildMockWeek(weekStart, params.courtId === 'c2' ? 280000 : 180000),
            court: { ...mockCourts[0], id: String(params.courtId) },
          },
        });
      }),
    );
    renderWithProviders(
      <CourtWeekSchedule
        venue={{ id: 'v1', slug: 'san', name: 'Sân' }}
        courts={[...mockCourts, { ...mockCourts[0], id: 'c2', name: 'Sân B' }]}
      />,
    );
    await screen.findByText(/180\.000 ₫/);
    await userEvent.setup().click(screen.getByRole('tab', { name: /Sân B/ }));
    expect(screen.queryByText(/180\.000 ₫/)).not.toBeInTheDocument();
    await screen.findByText(/280\.000 ₫/);
  });

  it('shows a retry action when availability cannot load', async () => {
    let failed = true;
    const monday = startOfWeekDateStr(toVnParts(new Date()).dateStr);
    server.use(
      http.get('*/api/courts/:courtId/availability', ({ request }) => {
        const weekStart = new URL(request.url).searchParams.get('weekStart') ?? monday;
        return failed
          ? HttpResponse.json({ message: 'Không tải được lịch' }, { status: 503 })
          : HttpResponse.json({ data: buildMockWeek(weekStart, 180000) });
      }),
    );
    renderWithProviders(
      <CourtWeekSchedule venue={{ id: 'v1', slug: 'san', name: 'Sân' }} courts={mockCourts} />,
    );
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    failed = false;
    await userEvent.setup().click(retry);
    await screen.findByText(/180\.000 ₫/);
  });

  it('keeps the customer on the schedule and clears the draft if hold creation fails', async () => {
    const monday = startOfWeekDateStr(toVnParts(new Date()).dateStr);
    server.use(
      http.get('*/api/courts/:courtId/availability', ({ request }) =>
        HttpResponse.json({
          data: buildMockWeek(new URL(request.url).searchParams.get('weekStart') ?? monday, 180000),
        }),
      ),
      http.post('*/api/holds', () =>
        HttpResponse.json(
          {
            statusCode: 503,
            error: 'Unavailable',
            code: 'INTERNAL_ERROR',
            message: 'Không thể giữ chỗ lúc này',
            path: '/api/holds',
            timestamp: '2026-11-28T00:00:00.000Z',
          },
          { status: 503 },
        ),
      ),
    );
    const { router, store } = renderWithProviders(
      <App>
        <CourtWeekSchedule venue={{ id: 'v1', slug: 'san', name: 'Sân' }} courts={mockCourts} />
      </App>,
      {
        preloadedState: {
          auth: {
            user: {
              id: 'customer-1',
              fullName: 'Khách',
              email: 'customer@test.local',
              phone: null,
              role: 'CUSTOMER',
              ownerStatus: 'NONE',
              status: 'ACTIVE',
              createdAt: '2026-11-20T00:00:00.000Z',
            },
            accessToken: 'test',
            status: 'authenticated',
          },
        },
      },
    );
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /Khung 08:00 - Trống/ }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Đặt sân' }));
    await screen.findByText('Không thể giữ chỗ lúc này');
    expect(router.state.location.pathname).toBe('/');
    expect(store.getState().bookingDraft.slots).toEqual([]);
  });

  it('bấm "Tuần sau" gọi API với weekStart mới và hiển thị dữ liệu tuần mới', async () => {
    const currentWeekMonday = startOfWeekDateStr(toVnParts(new Date()).dateStr);
    const nextWeekMonday = addDaysToDateStr(currentWeekMonday, 7);

    const requestedWeeks: string[] = [];

    server.use(
      http.get('*/api/courts/:courtId/availability', ({ request }) => {
        const url = new URL(request.url);
        const weekStart = url.searchParams.get('weekStart') ?? currentWeekMonday;
        requestedWeeks.push(weekStart);

        const price = weekStart === nextWeekMonday ? 280000 : 180000;
        return HttpResponse.json({
          data: buildMockWeek(weekStart, price),
        });
      }),
    );

    renderWithProviders(
      <CourtWeekSchedule
        venue={{ id: 'v1', slug: 'san-hoa-lu', name: 'Sân Hoa Lư' }}
        courts={mockCourts}
      />,
    );

    // Chờ dữ liệu tuần hiện tại hiển thị
    await waitFor(() => {
      expect(screen.getByText(/180\.000 ₫/i)).toBeInTheDocument();
    });
    expect(requestedWeeks).toContain(currentWeekMonday);

    // Bấm nút "Tuần sau"
    const nextBtn = screen.getByRole('button', { name: /Tuần sau/i });
    fireEvent.click(nextBtn);

    // Kiểm tra API đã được gọi với weekStart mới (nextWeekMonday) và hiển thị giá mới
    await waitFor(() => {
      expect(requestedWeeks).toContain(nextWeekMonday);
      expect(screen.getByText(/280\.000 ₫/i)).toBeInTheDocument();
    });
  });
});
