import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import { baseApi } from '@/common/api/baseApi';
import { VenueReviews } from '../components/VenueReviews';

describe('VenueReviews', () => {
  it('refreshes reviews on all loaded pages after an owner reply', async () => {
    const user = userEvent.setup();
    let replied = false;
    server.use(http.get('/api/venues/venue-1/reviews', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json({ data: {
        page, pageSize: 10, total: 11, totalPages: 2,
        items: [{ id: `review-${page}`, rating: 4, comment: `Nhận xét trang ${page}`, ownerReply: replied ? `Phản hồi trang ${page}` : null, user: { fullName: 'Khách' } }],
        summary: { avgRating: 4, count: 11, distribution: { 1: 0, 2: 0, 3: 0, 4: 11, 5: 0 } },
      } });
    }));
    const { store } = renderWithProviders(<VenueReviews venueId="venue-1" />);
    expect(await screen.findByText('Nhận xét trang 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));
    expect(await screen.findByText('Nhận xét trang 2')).toBeInTheDocument();
    replied = true;
    store.dispatch(baseApi.util.invalidateTags(['Review']));
    await waitFor(() => expect(screen.getByText('Phản hồi chủ sân: Phản hồi trang 1')).toBeInTheDocument());
    expect(await screen.findByText('Phản hồi chủ sân: Phản hồi trang 2')).toBeInTheDocument();
  });
});
