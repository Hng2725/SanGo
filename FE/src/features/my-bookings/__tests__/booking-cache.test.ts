import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeStore } from '@/app/store';
import { baseApi } from '@/common/api/baseApi';
import { server } from '@/test/msw/server';
import { statsApi } from '@/features/stats/api/statsApi';
import { recurringApi } from '@/features/recurring/api/recurringApi';
import { ownerBookingsApi } from '@/features/owner-bookings/api/ownerBookingsApi';
import { reviewsApi } from '@/features/reviews/api/reviewsApi';
import { myBookingsApi } from '../api/myBookingsApi';

describe('booking integration cache', () => {
  it('refreshes owner bookings, recurring counts and revenue after customer cancellation', async () => {
    const reads = { owner: 0, recurring: 0, stats: 0 };
    server.use(
      http.get('/api/owner/bookings', () => { reads.owner += 1; return HttpResponse.json({ data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 } }); }),
      http.get('/api/me/recurring', () => { reads.recurring += 1; return HttpResponse.json({ data: [] }); }),
      http.get('/api/owner/stats/summary', () => { reads.stats += 1; return HttpResponse.json({ data: {} }); }),
      http.patch('/api/bookings/booking-1/cancel', () => HttpResponse.json({ data: {} })),
    );
    const store = makeStore();
    try {
      await Promise.all([
        store.dispatch(ownerBookingsApi.endpoints.getOwnerBookingsPage.initiate({ page: 1, pageSize: 10 })),
        store.dispatch(recurringApi.endpoints.getMyRecurring.initiate()),
        store.dispatch(statsApi.endpoints.getOwnerSummary.initiate()),
      ]);
      expect(reads).toEqual({ owner: 1, recurring: 1, stats: 1 });
      await store.dispatch(myBookingsApi.endpoints.cancelBooking.initiate({ id: 'booking-1', input: {} })).unwrap();
      await waitFor(() => expect(reads).toEqual({ owner: 2, recurring: 2, stats: 2 }));
    } finally {
      store.dispatch(baseApi.util.resetApiState());
    }
  });

  it('refreshes recurring counts after owner confirmation and owner rating after a review', async () => {
    let recurringReads = 0;
    let summaryReads = 0;
    server.use(
      http.get('/api/me/recurring', () => { recurringReads += 1; return HttpResponse.json({ data: [] }); }),
      http.get('/api/owner/stats/summary', () => { summaryReads += 1; return HttpResponse.json({ data: {} }); }),
      http.patch('/api/owner/bookings/booking-1/confirm', () => HttpResponse.json({ data: {} })),
      http.post('/api/reviews', () => HttpResponse.json({ data: {} })),
    );
    const store = makeStore();
    try {
      await Promise.all([
        store.dispatch(recurringApi.endpoints.getMyRecurring.initiate()),
        store.dispatch(statsApi.endpoints.getOwnerSummary.initiate()),
      ]);
      await store.dispatch(ownerBookingsApi.endpoints.confirmBooking.initiate('booking-1')).unwrap();
      await waitFor(() => expect(recurringReads).toBe(2));
      const previousReads = summaryReads;
      await store.dispatch(reviewsApi.endpoints.createReview.initiate({ bookingId: 'booking-1', rating: 4 })).unwrap();
      await waitFor(() => expect(summaryReads).toBe(previousReads + 1));
    } finally {
      store.dispatch(baseApi.util.resetApiState());
    }
  });

  it('refreshes the embedded review in booking detail after the owner replies', async () => {
    let detailReads = 0;
    server.use(
      http.get('/api/bookings/booking-1', () => { detailReads += 1; return HttpResponse.json({ data: {} }); }),
      http.patch('/api/owner/reviews/review-1/reply', () => HttpResponse.json({ data: {} })),
    );
    const store = makeStore();
    try {
      await store.dispatch(myBookingsApi.endpoints.getBooking.initiate('booking-1'));
      expect(detailReads).toBe(1);
      await store.dispatch(reviewsApi.endpoints.replyReview.initiate({ id: 'review-1', input: { reply: 'Cảm ơn bạn' } })).unwrap();
      await waitFor(() => expect(detailReads).toBe(2));
    } finally {
      store.dispatch(baseApi.util.resetApiState());
    }
  });
});
