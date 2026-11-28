import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { beforeEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import OwnerBookingsPage from '../pages/OwnerBookingsPage';

const requests: URLSearchParams[] = [];
beforeEach(() => {
  requests.length = 0;
  server.use(
    http.get('/api/owner/venues', () => HttpResponse.json({ data: [] })),
    http.get('/api/owner/bookings', ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json({
        data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });
    }),
  );
});

it('filters rejected bookings with a Vietnamese status tab and resets pagination', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <App>
      <OwnerBookingsPage />
    </App>,
    { route: '/owner/bookings?page=3', path: '/owner/bookings' },
  );
  await waitFor(() => expect(requests.length).toBeGreaterThan(0));
  await user.click(screen.getByRole('tab', { name: 'Từ chối' }));
  await waitFor(() => {
    expect(requests.at(-1)?.get('status')).toBe('REJECTED');
    expect(requests.at(-1)?.get('page')).toBe('1');
  });
  expect(screen.queryByText('REJECTED')).not.toBeInTheDocument();
});

it('shows a single empty state for an empty page', async () => {
  renderWithProviders(
    <App>
      <OwnerBookingsPage />
    </App>,
  );
  await screen.findByText('Chưa có đơn đặt sân phù hợp.');
  expect(screen.getAllByText(/Chưa có đơn đặt sân/)).toHaveLength(1);
});

it('does not offer courts from the previous venue while the newly selected venue loads', async () => {
  const user = userEvent.setup();
  let releaseVenue: () => void = () => undefined;
  let loadingNewVenue = false;
  const venueGate = new Promise<void>((resolve) => {
    releaseVenue = resolve;
  });
  server.use(
    http.get('/api/owner/venues', () =>
      HttpResponse.json({
        data: [
          { id: 'a', name: 'Cụm A' },
          { id: 'b', name: 'Cụm B' },
        ],
      }),
    ),
    http.get('/api/owner/venues/:id', async ({ params }) => {
      if (params.id === 'b') {
        loadingNewVenue = true;
        await venueGate;
      }
      return HttpResponse.json({
        data: {
          id: params.id,
          courts: [
            { id: `court-${String(params.id)}`, name: params.id === 'a' ? 'Sân A' : 'Sân B' },
          ],
        },
      });
    }),
  );
  renderWithProviders(
    <App>
      <OwnerBookingsPage />
    </App>,
    { route: '/owner/bookings?venueId=a&courtId=court-a', path: '/owner/bookings' },
  );
  await screen.findByText('Sân A');
  await user.click(screen.getByRole('combobox', { name: 'Cụm sân' }));
  await user.click(await screen.findByText('Cụm B'));
  await waitFor(() => expect(loadingNewVenue).toBe(true));
  try {
    expect(screen.getByRole('combobox', { name: 'Sân con' })).toBeDisabled();
  } finally {
    releaseVenue();
  }
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Sân con' })).toBeEnabled());
  await user.click(screen.getByRole('combobox', { name: 'Sân con' }));
  expect(await screen.findByText('Sân B')).toBeInTheDocument();
  expect(screen.queryByText('Sân A')).not.toBeInTheDocument();
  expect(requests.at(-1)?.get('courtId')).toBeNull();
});

it('keeps rejection feedback open when the server rejects the action', async () => {
  const user = userEvent.setup();
  server.use(
    http.get('/api/owner/bookings', () =>
      HttpResponse.json({
        data: {
          items: [
            {
              id: 'b1',
              code: 'SG0001',
              status: 'PENDING',
              customer: { id: 'u1', fullName: 'Khách thử', phone: null },
              contactPhone: '0901234567',
              court: { id: 'c1', name: 'Sân 1', sport: 'FOOTBALL' },
              venue: { id: 'v1', name: 'Hoa Lư' },
              startAt: '2026-12-01T01:00:00Z',
              endAt: '2026-12-01T02:00:00Z',
              totalPrice: 300000,
              allowedActions: ['REJECT'],
              recurringSeriesId: null,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    ),
    http.patch('/api/owner/bookings/b1/reject', () =>
      HttpResponse.json(
        {
          statusCode: 409,
          error: 'Conflict',
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Trạng thái vừa thay đổi',
          path: '/api/owner/bookings/b1/reject',
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      ),
    ),
  );
  renderWithProviders(
    <App>
      <OwnerBookingsPage />
    </App>,
  );
  await user.click(await screen.findByRole('button', { name: 'Từ chối' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Từ chối đơn')).toBeInTheDocument();
  await user.type(within(dialog).getByPlaceholderText(/Lý do từ chối/), 'Sân đang bảo trì');
  await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
  await screen.findByText('Trạng thái vừa thay đổi');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Sân đang bảo trì')).toBeInTheDocument();
});
