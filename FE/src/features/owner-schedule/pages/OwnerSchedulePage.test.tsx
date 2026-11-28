import { expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { startOfWeekDateStr, toVnParts } from '@sango/shared';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import OwnerSchedulePage from './OwnerSchedulePage';

it('opens the actual booking drawer from a reserved slot instead of an unused highlight URL', async () => {
  const weekStart = startOfWeekDateStr(toVnParts(new Date()).dateStr);
  const startAt = `${weekStart}T01:00:00.000Z`;
  let requestedBooking = '';
  server.use(
    http.get('/api/owner/venues', () =>
      HttpResponse.json({ data: [{ id: 'venue-1', name: 'Cụm A' }] }),
    ),
    http.get('/api/owner/venues/venue-1', () =>
      HttpResponse.json({
        data: { courts: [{ id: 'court-1', name: 'Sân 1', sport: 'FOOTBALL', isActive: true }] },
      }),
    ),
    http.get('/api/courts/court-1/availability', () =>
      HttpResponse.json({
        data: {
          court: { id: 'court-1', name: 'Sân 1', sport: 'FOOTBALL' },
          weekStart,
          days: [
            {
              date: weekStart,
              isClosed: false,
              slots: [
                {
                  startAt,
                  endAt: `${weekStart}T02:00:00.000Z`,
                  minuteOfDay: 480,
                  status: 'BOOKED',
                  price: 150000,
                  label: null,
                  booking: {
                    id: 'booking-1',
                    code: 'SGTEST',
                    status: 'PENDING',
                    customerName: 'Khách An',
                  },
                },
              ],
            },
          ],
        },
      }),
    ),
    http.get('/api/bookings/:id', ({ params }) => {
      requestedBooking = String(params.id);
      return HttpResponse.json({
        data: {
          id: 'booking-1',
          code: 'SGTEST',
          status: 'PENDING',
          court: { name: 'Sân 1' },
          venue: { name: 'Cụm A' },
          customer: { fullName: 'Khách An' },
          contactPhone: '0901234567',
          startAt,
          endAt: `${weekStart}T02:00:00.000Z`,
          totalPrice: 150000,
          allowedActions: [],
        },
      });
    }),
  );
  renderWithProviders(<OwnerSchedulePage />);
  await userEvent
    .setup()
    .click(await screen.findByRole('button', { name: /Khung 08:00 - Khách An/ }));
  expect(await screen.findByText('SGTEST')).toBeInTheDocument();
  expect(requestedBooking).toBe('booking-1');
  expect(screen.getByRole('heading', { level: 1, name: 'Lịch sân' })).toBeInTheDocument();
});
