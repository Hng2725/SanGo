import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { DashboardShell } from '../DashboardShell';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('expands on hover and keyboard focus, then collapses when leaving the navigation', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <DashboardShell
      title="Quản trị hệ thống"
      rootLabel="Quản trị"
      items={[{ key: 'overview', label: 'Tổng quan', href: '/admin', icon: <span /> }]}
    />,
    { path: '/admin' },
  );

  const navigation = await screen.findByRole('complementary', { name: 'Thanh điều hướng' });
  expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await user.hover(navigation);
  expect(screen.getByRole('button', { name: 'Thu gọn menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await user.unhover(navigation);
  expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  await user.tab();
  expect(screen.getByRole('button', { name: 'Thu gọn menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await user.click(document.body);
  expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
