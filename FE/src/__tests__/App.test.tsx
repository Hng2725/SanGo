import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('shows the home search on the root route', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Tìm sân trống, đặt giờ chơi.' })).toBeInTheDocument();
  });
});
