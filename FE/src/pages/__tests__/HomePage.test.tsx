import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { VenueCardDto } from '@sango/shared';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import HomePage from '../HomePage';

const venue: VenueCardDto = {
  id: 'venue-home',
  slug: 'san-cau-long',
  name: 'Sân cầu lông An Bình',
  address: '12 Đường số 1',
  district: 'Thủ Đức',
  city: 'TP. Hồ Chí Minh',
  imageUrl: null,
  sports: ['BADMINTON'],
  minPricePerHour: 100000,
  avgRating: 4.8,
  reviewCount: 12,
  latitude: null,
  longitude: null,
};

beforeEach(() => {
  server.use(
    http.get('/api/meta/locations', () =>
      HttpResponse.json({ data: [{ city: 'TP. Hồ Chí Minh', districts: ['Thủ Đức'] }] }),
    ),
    http.get('/api/venues', () =>
      HttpResponse.json({
        data: {
          items: [venue],
          total: 1,
          page: 1,
          pageSize: 6,
          totalPages: 1,
        },
      }),
    ),
  );
});

describe('HomePage', () => {
  it('searches with the selected sport, city and date and preserves the date on venue links', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HomePage />, { path: '*', route: '/' });
    const venueLink = await screen.findByRole('link', { name: /Sân cầu lông An Bình/ });
    const form = screen.getByRole('form', { name: 'Tìm sân' });

    await user.click(within(form).getByRole('combobox', { name: 'Môn thể thao' }));
    await user.click(
      await screen.findByText('Cầu lông', { selector: '.ant-select-item-option-content' }),
    );
    await user.click(within(form).getByRole('combobox', { name: 'Khu vực' }));
    await user.click(
      await screen.findByText('TP. Hồ Chí Minh', { selector: '.ant-select-item-option-content' }),
    );
    const playDate = '2099-12-03';
    fireEvent.change(within(form).getByLabelText('Ngày chơi'), { target: { value: playDate } });
    expect(venueLink).toHaveAttribute('href', `/venues/san-cau-long?date=${playDate}`);

    await user.click(within(form).getByRole('button', { name: 'Tìm sân' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/venues'));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('sport')).toBe('BADMINTON');
    expect(params.get('city')).toBe('TP. Hồ Chí Minh');
    expect(params.get('date')).toBe(playDate);
  });

  it('lets visitors retry when featured venues cannot be loaded', async () => {
    let attempts = 0;
    server.use(
      http.get('/api/venues', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Unavailable' }, { status: 503 })
          : HttpResponse.json({
              data: { items: [venue], total: 1, page: 1, pageSize: 6, totalPages: 1 },
            });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await user.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('link', { name: /Sân cầu lông An Bình/ })).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
