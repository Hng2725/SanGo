import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { App } from 'antd';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import CourtPricingPage from './CourtPricingPage';

describe('CourtPricingPage integration', () => {
  it('loads owner courts and submits selected copy targets', async () => {
    const copied = vi.fn();
    server.use(
      http.get('*/api/owner/courts/c1/pricing', () =>
        HttpResponse.json({ data: { courtId: 'c1', basePricePerHour: 100_000, rules: [] } }),
      ),
      http.get('*/api/owner/venues', () =>
        HttpResponse.json({ data: [{ id: 'v1', name: 'Cụm Hoa Lư' }] }),
      ),
      http.get('*/api/owner/venues/v1', () =>
        HttpResponse.json({
          data: {
            id: 'v1',
            courts: [
              { id: 'c1', name: 'Sân nguồn' },
              { id: 'c2', name: 'Sân đích' },
            ],
          },
        }),
      ),
      http.post('*/api/owner/courts/c1/pricing/copy', async ({ request }) => {
        copied(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <App>
        <CourtPricingPage />
      </App>,
      { path: '/owner/courts/:courtId/pricing', route: '/owner/courts/c1/pricing?venueId=v1' },
    );
    await user.click(await screen.findByRole('button', { name: /Sao chép sang sân khác/ }));
    const target = await screen.findByRole('checkbox', { name: 'Sân đích' });
    expect(screen.queryByRole('checkbox', { name: 'Sân nguồn' })).not.toBeInTheDocument();
    await user.click(target);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sao chép' }));
    await vi.waitFor(() => expect(copied).toHaveBeenCalledWith({ targetCourtIds: ['c2'] }));
  });

  it('renders server validation errors on the pricing field', async () => {
    server.use(
      http.get('*/api/owner/courts/c1/pricing', () =>
        HttpResponse.json({ data: { courtId: 'c1', basePricePerHour: 100_000, rules: [] } }),
      ),
      http.put('*/api/owner/courts/c1/pricing', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            error: 'Bad Request',
            code: 'VALIDATION_ERROR',
            message: 'Kiểm tra lại bảng giá',
            path: '/pricing',
            timestamp: '2026-11-28T00:00:00Z',
            details: [{ path: 'basePricePerHour', message: 'Giá này không được chấp nhận' }],
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(
      <App>
        <CourtPricingPage />
      </App>,
      { path: '/owner/courts/:courtId/pricing', route: '/owner/courts/c1/pricing' },
    );
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Lưu bảng giá' }));
    expect(await screen.findByText('Giá này không được chấp nhận')).toBeInTheDocument();
  });
});
