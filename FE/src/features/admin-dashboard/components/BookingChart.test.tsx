import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { BookingChart } from './BookingChart';

it('shows date, bookings and comparison when hovering a day', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <BookingChart
      days={[
        { date: '2026-11-16', bookings: 20 },
        { date: '2026-11-17', bookings: 30 },
      ]}
    />,
  );
  await user.hover(screen.getByLabelText('17/11/2026: 30 lượt đặt'));
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip).toHaveTextContent('17/11/2026');
  expect(tooltip).toHaveTextContent('30 lượt đặt');
  expect(tooltip).toHaveTextContent('Tăng 10 lượt (50%) so với ngày trước');
});

it('supports keyboard focus and does not invent a comparison for the first day', async () => {
  const user = userEvent.setup();
  renderWithProviders(<BookingChart days={[{ date: '2026-11-17', bookings: 0 }]} />);
  await user.tab();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Chưa có dữ liệu ngày trước');
});

it('compares with a zero-booking day without displaying an infinite percentage', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <BookingChart
      days={[
        { date: '2026-11-16', bookings: 0 },
        { date: '2026-11-17', bookings: 8 },
      ]}
    />,
  );
  await user.hover(screen.getByLabelText('17/11/2026: 8 lượt đặt'));
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip).toHaveTextContent('Tăng 8 lượt so với ngày trước');
  expect(tooltip).not.toHaveTextContent('%');
});

it('hides the tooltip when leaving a bar, including after clicking it', async () => {
  const user = userEvent.setup();
  renderWithProviders(<BookingChart days={[{ date: '2026-11-17', bookings: 8 }]} />);
  const bar = screen.getByLabelText('17/11/2026: 8 lượt đặt');
  await user.hover(bar);
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  await user.click(bar);
  await user.unhover(bar);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  await user.hover(screen.getByRole('group', { name: 'Lượt đặt trong 7 ngày qua' }));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

it('dismisses the keyboard tooltip with Escape', async () => {
  const user = userEvent.setup();
  renderWithProviders(<BookingChart days={[{ date: '2026-11-17', bookings: 8 }]} />);
  await user.tab();
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

it('hides the tooltip when the page scrolls', async () => {
  const user = userEvent.setup();
  renderWithProviders(<BookingChart days={[{ date: '2026-11-17', bookings: 8 }]} />);
  await user.hover(screen.getByLabelText('17/11/2026: 8 lượt đặt'));
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  fireEvent.scroll(window);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
