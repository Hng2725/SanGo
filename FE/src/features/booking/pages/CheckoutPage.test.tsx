import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function renderCheckout(store: ReturnType<typeof makeStore>) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/booking/checkout']}>
        <Routes>
          <Route path="/booking/checkout" element={<CheckoutPage />} />
          <Route path="/me/bookings/:id" element={<div>Booking Detail</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
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
    store.dispatch(
      draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }),
    );
    store.dispatch(
      holdAttached({ holdId: 'hold-1', holdExpiresAt: HOLD_EXPIRES }),
    );

    renderCheckout(store);

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
    store.dispatch(
      draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }),
    );

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
});
