import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from 'antd';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import OwnerReviewsPage from '../pages/OwnerReviewsPage';

describe('OwnerReviewsPage', () => {
  it('shows the saved server reply after clearing the draft', async () => {
    const user = userEvent.setup();
    let ownerReply: string | null = null;
    server.use(
      http.get('/api/owner/reviews', () => HttpResponse.json({ data: {
        page: 1, pageSize: 10, total: 1, totalPages: 1,
        items: [{ id: 'review-1', rating: 4, comment: 'Sân tốt', ownerReply, user: { fullName: 'Khách' }, court: { name: 'Sân 1' } }],
      } })),
      http.patch('/api/owner/reviews/review-1/reply', async ({ request }) => {
        const body = await request.json() as { reply: string };
        ownerReply = `${body.reply} (đã lưu)`;
        return HttpResponse.json({ data: { ownerReply } });
      }),
    );
    renderWithProviders(<App><OwnerReviewsPage /></App>);
    const input = await screen.findByPlaceholderText('Phản hồi khách hàng');
    await user.type(input, 'Cảm ơn bạn đã đánh giá');
    await user.click(screen.getByRole('button', { name: 'Phản hồi' }));
    await waitFor(() => expect(input).toHaveValue('Cảm ơn bạn đã đánh giá (đã lưu)'));
  });
});
