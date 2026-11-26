import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { VenueCardDto } from '@sango/shared';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import SearchPage from '../pages/SearchPage';

const venue: VenueCardDto = {
  id: 'search-venue',
  slug: 'san-an-binh',
  name: 'Sân An Bình',
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
let lastRequest: URL;
const result = { items: [venue], total: 25, page: 1, pageSize: 12, totalPages: 3 };

beforeEach(() => {
  server.use(
    http.get('/api/meta/locations', () =>
      HttpResponse.json({
        data: [
          { city: 'TP. Hồ Chí Minh', districts: ['Thủ Đức'] },
          { city: 'Hà Nội', districts: ['Cầu Giấy'] },
        ],
      }),
    ),
    http.get('/api/venues', ({ request }) => {
      lastRequest = new URL(request.url);
      return HttpResponse.json({
        data: {
          ...result,
          total: lastRequest.searchParams.has('q') ? 1 : result.total,
          page: Number(lastRequest.searchParams.get('page') ?? 1),
        },
      });
    }),
  );
});

it('clears dependent district, pagination and hours when their parent filter changes', async () => {
  const user = userEvent.setup();
  const params = new URLSearchParams({
    city: 'TP. Hồ Chí Minh',
    district: 'Thủ Đức',
    date: '2099-12-03',
    from: '18:00',
    to: '20:00',
    page: '2',
  });
  const { router } = renderWithProviders(<SearchPage />, {
    path: '/venues',
    route: `/venues?${params}`,
  });
  await screen.findByRole('heading', { name: 'Sân An Bình' });
  expect(screen.getByRole('heading', { name: 'Tìm sân thể thao', level: 1 })).toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Thành phố' }));
  await user.click(
    await screen.findByText('Hà Nội', { selector: '.ant-select-item-option-content' }),
  );
  await waitFor(() => expect(lastRequest.searchParams.get('city')).toBe('Hà Nội'));
  expect(new URLSearchParams(router.state.location.search).has('district')).toBe(false);
  expect(lastRequest.searchParams.get('page')).toBe('1');
  fireEvent.change(screen.getByLabelText('Ngày chơi'), { target: { value: '' } });
  await waitFor(() => expect(lastRequest.searchParams.has('date')).toBe(false));
  expect(lastRequest.searchParams.has('from')).toBe(false);
  expect(lastRequest.searchParams.has('to')).toBe(false);
  expect(screen.getByRole('combobox', { name: 'Từ giờ' })).toBeDisabled();
  await user.click(screen.getByRole('tab', { name: 'Bản đồ' }));
  expect(await screen.findByText(/Các sân này chưa có vị trí trên bản đồ/)).toBeInTheDocument();
});

it('keeps the keyword in sync with URL navigation and reset while debouncing API search', async () => {
  const user = userEvent.setup();
  const { router } = renderWithProviders(<SearchPage />, { path: '/venues', route: '/venues' });
  await screen.findByRole('heading', { name: 'Sân An Bình' });
  const keyword = screen.getByRole('textbox', { name: 'Tên sân hoặc địa chỉ' });
  await user.type(keyword, 'An Bình');
  await waitFor(() => expect(lastRequest.searchParams.get('q')).toBe('An Bình'));
  await act(() => router.navigate('/venues?q=Ph%C3%BA%20Th%E1%BB%8D'));
  expect(keyword).toHaveValue('Phú Thọ');
  await user.click(screen.getByRole('button', { name: 'Đặt lại' }));
  expect(keyword).toHaveValue('');
  expect(await screen.findByText('Tìm thấy 25 cụm sân')).toBeInTheDocument();
  expect(router.state.location.search).toBe('');
});

it('offers a retry instead of showing an empty result when the API fails', async () => {
  let attempts = 0;
  server.use(
    http.get('/api/venues', () => {
      attempts += 1;
      return attempts === 1
        ? HttpResponse.json({ message: 'Unavailable' }, { status: 503 })
        : HttpResponse.json({ data: result });
    }),
  );
  const user = userEvent.setup();
  renderWithProviders(<SearchPage />);
  await user.click(await screen.findByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('heading', { name: 'Sân An Bình' })).toBeInTheDocument();
  expect(attempts).toBe(2);
});
