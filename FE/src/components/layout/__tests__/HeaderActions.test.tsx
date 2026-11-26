import { App } from 'antd';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { UserDto } from '@sango/shared';
import { renderWithProviders } from '@/test/test-utils';
import { HeaderActions } from '../HeaderActions';

beforeAll(() =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());

const admin: UserDto = {
  id: 'admin',
  email: 'admin@sango.vn',
  fullName: 'Quản trị SanGo',
  phone: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  ownerStatus: 'NONE',
  createdAt: '2026-11-19T00:00:00.000Z',
};
function renderHeader() {
  return renderWithProviders(
    <App>
      <HeaderActions dashboard />
    </App>,
    {
      path: '*',
      route: '/',
      preloadedState: { auth: { user: admin, accessToken: 'test-token', status: 'authenticated' } },
    },
  );
}

it('opens the account menu by click without requiring hover', async () => {
  const user = userEvent.setup({ skipHover: true });
  const { router } = renderHeader();
  await user.click(screen.getByRole('button', { name: 'Tài khoản Quản trị SanGo' }));
  expect(await screen.findByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Hồ sơ' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/me/profile'));
});

it('opens the account menu with the keyboard', async () => {
  const user = userEvent.setup();
  renderHeader();
  await user.tab();
  await user.tab();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Tài khoản Quản trị SanGo' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('menuitem', { name: 'Hồ sơ' })).toBeInTheDocument();
});

it('opens the language menu by click and changes the language', async () => {
  const user = userEvent.setup({ skipHover: true });
  renderHeader();
  await user.click(screen.getByRole('button', { name: 'Đổi ngôn ngữ' }));
  await user.click(await screen.findByRole('menuitem', { name: 'English' }));
  await waitFor(() => expect(document.documentElement.lang).toBe('en'));
});
