import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import CourtMaintenancePage from './CourtMaintenancePage';

describe('CourtMaintenancePage', () => {
  it.each([{ bookingCodes: ['SG261201ABCD'] }, { bookingCodes: [] }])(
    'shows a reservation or hold conflict returned by the server ($bookingCodes)',
    async ({ bookingCodes }) => {
      server.use(
        http.get('*/api/owner/courts/c1/maintenance', () => HttpResponse.json({ data: [] })),
        http.post('*/api/owner/courts/c1/maintenance', () =>
          HttpResponse.json(
            {
              statusCode: 409,
              error: 'Conflict',
              code: 'MAINTENANCE_CONFLICT',
              message: 'Khung giờ trùng với đơn hoặc giữ chỗ đang hiệu lực',
              path: '/maintenance',
              timestamp: '2026-11-28T00:00:00Z',
              details: { bookingCodes },
            },
            { status: 409 },
          ),
        ),
      );
      renderWithProviders(
        <App>
          <CourtMaintenancePage />
        </App>,
        { path: '/owner/courts/:courtId/maintenance', route: '/owner/courts/c1/maintenance' },
      );
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: /Tạo lịch khóa bảo trì/ }));
      if (bookingCodes.length) {
        expect(await screen.findByText(/SG261201ABCD/)).toBeInTheDocument();
      } else {
        expect(
          await screen.findByText(/Khung giờ trùng với đơn hoặc giữ chỗ đang hiệu lực/),
        ).toBeInTheDocument();
      }
    },
  );

  it('shows a query failure instead of an empty successful schedule', async () => {
    server.use(
      http.get('*/api/owner/courts/c1/maintenance', () => new HttpResponse(null, { status: 500 })),
    );
    renderWithProviders(
      <App>
        <CourtMaintenancePage />
      </App>,
      { path: '/owner/courts/:courtId/maintenance', route: '/owner/courts/c1/maintenance' },
    );
    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
    expect(screen.queryByText(/Sân hiện đang hoạt động bình thường/)).not.toBeInTheDocument();
  });
});
