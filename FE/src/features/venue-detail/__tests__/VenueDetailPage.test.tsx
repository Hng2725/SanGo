import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import type { VenueDetailDto } from '@sango/shared';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import { VenueDetailPage } from '../pages/VenueDetailPage';

const mockVenueDetail: VenueDetailDto = {
  id: 'v1',
  slug: 'san-bong-hoa-lu',
  name: 'CLB Bóng đá Hoa Lư',
  description: 'Sân cỏ nhân tạo chất lượng cao',
  address: '02 Đinh Tiên Hoàng',
  district: 'Quận 1',
  city: 'TP. Hồ Chí Minh',
  latitude: 10.7878,
  longitude: 106.6997,
  phone: '0901234567',
  imageUrls: ['https://picsum.photos/seed/hoa-lu/800/500'],
  cancelBeforeHours: 2,
  avgRating: 4.8,
  reviewCount: 15,
  createdAt: '2026-11-20T00:00:00.000Z',
  owner: {
    fullName: 'Chủ sân An',
  },
  courts: [
    {
      id: 'c1',
      name: 'Sân 5A',
      sport: 'FOOTBALL',
      basePricePerHour: 200_000,
      priceRules: [],
    },
  ],
  openingHours: [
    { dayOfWeek: 0, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 1, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 2, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 3, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 4, isClosed: false, openMinute: 360, closeMinute: 1320 },
    // Thứ 6 mở qua nửa đêm: 18:00 - 02:00 (+1)
    { dayOfWeek: 5, isClosed: false, openMinute: 1080, closeMinute: 1560 },
    { dayOfWeek: 6, isClosed: false, openMinute: 360, closeMinute: 1320 },
  ],
};

describe('VenueDetailPage', () => {
  it('hiển thị tên cụm sân và giờ mở cửa qua nửa đêm đúng định dạng', async () => {
    server.use(
      http.get('*/api/venues/san-bong-hoa-lu', () => {
        return HttpResponse.json({ data: mockVenueDetail });
      }),
    );

    renderWithProviders(<VenueDetailPage />, {
      route: '/venues/san-bong-hoa-lu',
      path: '/venues/:slug',
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /CLB Bóng đá Hoa Lư/i })).toBeInTheDocument();
    });

    // Giờ mở cửa qua nửa đêm hiển thị (+1)
    expect(screen.getByText(/18:00 – 02:00 \(\+1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hủy miễn phí trước giờ chơi 2 giờ/i)).toBeInTheDocument();
  });

  it('hiển thị trạng thái không tìm thấy khi slug không tồn tại', async () => {
    server.use(
      http.get('*/api/venues/san-khong-ton-tai', () => {
        return HttpResponse.json(
          {
            statusCode: 404,
            error: 'Not Found',
            code: 'NOT_FOUND',
            message: 'Không tìm thấy cụm sân',
            path: '/api/venues/san-khong-ton-tai',
            timestamp: new Date().toISOString(),
          },
          { status: 404 },
        );
      }),
    );

    renderWithProviders(<VenueDetailPage />, {
      route: '/venues/san-khong-ton-tai',
      path: '/venues/:slug',
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Cụm sân này không tồn tại hoặc đã tạm dừng hoạt động/i),
      ).toBeInTheDocument();
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Điều hướng chính' }));
    const navigation = await screen.findByRole('navigation', { name: 'Thanh điều hướng' });
    expect(within(navigation).getByRole('link', { name: 'Tìm sân' })).toHaveAttribute('href', '/venues');
    expect(within(navigation).getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });
});
