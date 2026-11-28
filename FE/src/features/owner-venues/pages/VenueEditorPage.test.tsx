import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/test-utils';
import VenueEditorPage from './VenueEditorPage';

vi.mock('@/features/map', () => ({
  LocationPicker: ({ onChange }: { onChange: (value: { lat: number; lng: number }) => void }) => (
    <button onClick={() => onChange({ lat: 10, lng: 107 })}>Chọn vị trí mới</button>
  ),
}));

describe('VenueEditorPage integration', () => {
  it('keeps a newly saved map location when submitting the information form', async () => {
    const patches: unknown[] = [];
    const venue = {
      id: 'v1',
      name: 'Cụm Hoa Lư',
      slug: 'hoa-lu',
      address: '02 Đinh Tiên Hoàng',
      city: 'TP.HCM',
      district: 'Quận 1',
      phone: '0901234567',
      description: '',
      imageUrls: [],
      cancelBeforeHours: 2,
      latitude: 10.7,
      longitude: 106.7,
      courts: [],
      openingHours: [],
    };
    server.use(
      http.get('*/api/owner/venues/v1', () => HttpResponse.json({ data: venue })),
      http.patch('*/api/owner/venues/v1', async ({ request }) => {
        const body: unknown = await request.json();
        patches.push(body);
        Object.assign(venue, body);
        return HttpResponse.json({ data: venue });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <App>
        <VenueEditorPage />
      </App>,
      { path: '/owner/venues/:id', route: '/owner/venues/v1' },
    );
    await screen.findByDisplayValue('Cụm Hoa Lư');
    await user.click(screen.getByRole('tab', { name: 'Vị trí bản đồ' }));
    await user.click(await screen.findByRole('button', { name: 'Chọn vị trí mới' }));
    await user.click(screen.getByRole('button', { name: 'Lưu tọa độ vị trí' }));
    await waitFor(() => expect(patches).toHaveLength(1));
    await screen.findByText('Đã cập nhật tọa độ vị trí sân thành công');
    await user.click(screen.getByRole('tab', { name: 'Thông tin chung' }));
    const saveInfo = await screen.findByRole('button', { name: /Lưu thay đổi/ });
    await waitFor(() => expect(saveInfo).not.toHaveClass('ant-btn-loading'));
    await user.click(saveInfo);
    await waitFor(() => expect(patches).toHaveLength(2));
    expect(venue.latitude).toBe(10);
    expect(venue.longitude).toBe(107);
  });
});
