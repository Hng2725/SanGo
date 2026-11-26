import { fireEvent, screen } from '@testing-library/react';
import type { VenueCardDto } from '@sango/shared';
import { renderWithProviders } from '@/test/test-utils';
import { VenueCard } from '../VenueCard';

const venue: VenueCardDto = {
  id: 'venue-card',
  slug: 'san-an-binh',
  name: 'Sân An Bình',
  address: '12 Đường số 1',
  district: 'Thủ Đức',
  city: 'TP. Hồ Chí Minh',
  imageUrl: '/missing-venue.webp',
  sports: ['BADMINTON'],
  minPricePerHour: 100000,
  avgRating: 4.8,
  reviewCount: 12,
  latitude: null,
  longitude: null,
};

it('replaces a failed venue image with a local accessible placeholder', () => {
  renderWithProviders(<VenueCard venue={venue} date="2099-12-03" />);
  fireEvent.error(screen.getByRole('img', { name: 'Sân An Bình' }));
  expect(screen.queryByRole('img', { name: 'Sân An Bình' })).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Chưa có ảnh sân' })).toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('href', '/venues/san-an-binh?date=2099-12-03');
});
