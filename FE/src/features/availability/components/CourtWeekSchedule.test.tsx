import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
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

const mockCourts: CourtSummaryDto[] = [
  { id: 'c1', name: 'Sân 5A', sport: 'FOOTBALL' },
];

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
