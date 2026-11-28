import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { App } from 'antd';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { makeStore } from '@/app/store';
import { draftStarted, holdAttached } from '../model/bookingDraftSlice';
import CheckoutPage from './CheckoutPage';

const mockVenue = { id: 'v1', slug: 'san-abc', name: 'Sân ABC' };
const mockCourt = {
  id: 'c1',
  name: 'Sân 1',
  sport: 'BADMINTON' as const,
  status: 'ACTIVE' as const,
};
const NOW_ISO = '2026-12-01T00:30:00.000Z';
const HOLD_EXPIRES = '2026-12-01T00:35:00.000Z';
const mockSlots = [
  {
    startAt: '2026-12-01T01:00:00.000Z',
    endAt: '2026-12-01T02:00:00.000Z',
    price: 100000,
    label: '08:00',
  },
];

function renderCheckout(store: ReturnType<typeof makeStore>, strict = false) {
  const ui = (
    <App>
      <Provider store={store}>
        <MemoryRouter initialEntries={['/venues/san-abc', '/booking/checkout']}>
          <Routes>
            <Route path="/venues/san-abc" element={<div>Venue Detail</div>} />
            <Route path="/booking/checkout" element={<CheckoutPage />} />
            <Route path="/me/bookings/:id" element={<div>Booking Detail</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </App>
  );
  return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

function storeWithHold() {
  const store = makeStore();
  store.dispatch(draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }));
  store.dispatch(
    holdAttached({ holdId: 'hold-1', holdExpiresAt: new Date(Date.now() + 300_000).toISOString() }),
  );
  return store;
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    server.use(
      http.post('/api/pricing/quote', () =>
        HttpResponse.json({
          data: {
            total: 100000,
            breakdown: [
              {
                startAt: '2026-12-01T01:00:00.000Z',
                endAt: '2026-12-01T02:00:00.000Z',
                price: 100000,
                label: '08:00 – 09:00',
              },
            ],
          },
        }),
      ),
      http.delete('/api/holds/:id', () => new HttpResponse(null, { status: 204 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('countdown reaches 0 → submit button disabled', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));

    const store = makeStore();
    store.dispatch(draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }));
    store.dispatch(holdAttached({ holdId: 'hold-1', holdExpiresAt: HOLD_EXPIRES }));

    renderCheckout(store);

    expect(screen.getByRole('heading', { level: 1, name: 'Xác nhận đặt sân' })).toBeInTheDocument();
    const submitBtn = screen.getByTestId('submit-booking');
    expect(submitBtn).not.toBeDisabled();
    expect(screen.getByTestId('hold-countdown')).toHaveTextContent('05:00');

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    expect(submitBtn).toBeDisabled();
    expect(screen.getByTestId('hold-countdown')).toHaveTextContent(/đã hết/i);
  });

  it('409 on createBooking shows error message', async () => {
    server.use(
      http.post('/api/bookings', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'Conflict',
            code: 'SLOT_ALREADY_BOOKED',
            message: 'Khung giờ đã được đặt',
            path: '/bookings',
            timestamp: new Date().toISOString(),
          },
          { status: 409 },
        ),
      ),
    );

    const store = makeStore();
    store.dispatch(draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }));

    renderCheckout(store);

    await waitFor(() => {
      expect(screen.getByTestId('submit-booking')).toBeInTheDocument();
    });

    const phoneInput = screen.getByPlaceholderText('0912345678');
    fireEvent.change(phoneInput, { target: { value: '0912345678' } });

    fireEvent.click(screen.getByTestId('submit-booking'));

    await waitFor(
      () => {
        const notice = document.querySelector('.ant-message-notice');
        const inlineErr = screen.queryByText(/vừa bị đặt/i);
        expect(notice ?? inlineErr).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('keeps the hold through StrictMode replay and does not release it after successful booking', async () => {
    const user = userEvent.setup();
    let releases = 0;
    server.use(
      http.delete('/api/holds/:id', () => {
        releases += 1;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post('/api/bookings', async ({ request }) => {
        expect(await request.json()).toMatchObject({ holdId: 'hold-1' });
        return HttpResponse.json({ data: { id: 'booking-1' } }, { status: 201 });
      }),
    );
    renderCheckout(storeWithHold(), true);
    await screen.findByRole('cell', { name: '08:00 – 09:00' });
    expect(releases).toBe(0);
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    await user.click(screen.getByTestId('submit-booking'));
    expect(await screen.findByText('Booking Detail')).toBeInTheDocument();
    expect(releases).toBe(0);
  });

  it('releases the hold exactly once when actually leaving checkout', async () => {
    const user = userEvent.setup();
    let releases = 0;
    server.use(
      http.delete('/api/holds/:id', () => {
        releases += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderCheckout(storeWithHold(), true);
    await screen.findByRole('cell', { name: '08:00 – 09:00' });
    expect(releases).toBe(0);
    await user.click(screen.getByTestId('choose-again'));
    expect(await screen.findByText('Venue Detail')).toBeInTheDocument();
    await waitFor(() => expect(releases).toBe(1));
  });

  it('explains an expired server hold and prevents retrying the stale hold', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/bookings', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'Conflict',
            code: 'HOLD_EXPIRED',
            message: 'Giữ chỗ không tồn tại',
            path: '/api/bookings',
            timestamp: new Date().toISOString(),
          },
          { status: 409 },
        ),
      ),
    );
    renderCheckout(storeWithHold());
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    await user.click(screen.getByTestId('submit-booking'));
    await waitFor(() => expect(screen.getByTestId('hold-countdown')).toHaveTextContent(/đã hết/i));
    expect(screen.getByTestId('submit-booking')).toBeDisabled();
    expect(screen.queryByText(/vừa bị đặt bởi người khác/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('choose-again')).toBeEnabled();
  });

  it('preserves the server explanation when a slot is unavailable', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/bookings', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'Conflict',
            code: 'SLOT_UNAVAILABLE',
            message: 'Khung giờ trùng với lịch bảo trì',
            path: '/api/bookings',
            timestamp: new Date().toISOString(),
          },
          { status: 409 },
        ),
      ),
    );
    renderCheckout(storeWithHold());
    await user.type(screen.getByPlaceholderText('0912345678'), '0912345678');
    await user.click(screen.getByTestId('submit-booking'));
    expect(await screen.findByText('Khung giờ trùng với lịch bảo trì')).toBeInTheDocument();
    expect(screen.queryByText(/vừa bị đặt bởi người khác/i)).not.toBeInTheDocument();
  });

  it.each([
    {
      startAt: '2026-12-01T01:00:00.000Z',
      endAt: '2026-12-01T02:00:00.000Z',
      label: null,
      interval: '08:00 – 09:00',
    },
    {
      startAt: '2026-12-01T16:00:00.000Z',
      endAt: '2026-12-01T17:00:00.000Z',
      label: 'Giờ vàng',
      interval: '23:00 – 00:00 (+1)',
    },
  ])(
    'shows $interval independently of the optional pricing label',
    async ({ startAt, endAt, label, interval }) => {
      const slot = { startAt, endAt, label, price: 100000 };
      server.use(
        http.post('/api/pricing/quote', () =>
          HttpResponse.json({ data: { total: 120000, breakdown: [{ ...slot, price: 120000 }] } }),
        ),
      );
      const store = makeStore();
      store.dispatch(draftStarted({ venue: mockVenue, court: mockCourt, slots: [slot] }));
      renderCheckout(store);
      await screen.findAllByText('120.000 ₫');
      expect(
        screen.getByRole('cell', { name: (name) => name.includes(interval) }),
      ).toBeInTheDocument();
      if (label) expect(await screen.findByText(label)).toBeInTheDocument();
    },
  );
});
