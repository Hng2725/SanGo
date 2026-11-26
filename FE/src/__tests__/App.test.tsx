import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import App from '@/App';

describe('App', () => {
  it('shows the home search on the root route', async () => {
    server.use(
      http.get('/api/meta/locations', () => HttpResponse.json({ data: [] })),
      http.get('/api/venues', () =>
        HttpResponse.json({
          data: {
            items: [],
            total: 0,
            page: 1,
            pageSize: 6,
            totalPages: 0,
          },
        }),
      ),
    );
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Tìm sân trống, đặt giờ chơi.' }),
    ).toBeInTheDocument();
  });
});
