import { App } from 'antd';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/msw/server';
import AdminUsersPage from '../pages/AdminUsersPage';

// jsdom does not implement the layout observer used by Ant Design tabs/selects.
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

it('filters roles through tabs, ignores the removed dropdown filter, and keeps search and sort', async () => {
  const requests: URL[] = [];
  server.use(
    http.get('/api/admin/users', ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 10 });
    }),
    http.get('/api/admin/users/counts', () =>
      HttpResponse.json({ all: 10, customers: 6, owners: 3, pendingOwners: 1, locked: 4 }),
    ),
  );
  const user = userEvent.setup();
  const { router } = renderWithProviders(
    <App>
      <AdminUsersPage />
    </App>,
    {
      path: '/admin/users',
      route: '/admin/users?tab=locked&role=ADMIN&page=3&pageSize=10&q=an&sort=name',
    },
  );
  await waitFor(() => expect(requests.length).toBeGreaterThan(0));
  expect(screen.queryByRole('combobox', { name: 'Lọc theo vai trò' })).not.toBeInTheDocument();
  expect(requests.at(-1)!.searchParams.has('role')).toBe(false);
  expect(requests.at(-1)!.searchParams.get('status')).toBe('LOCKED');
  await user.click(screen.getByRole('tab', { name: /^Khách đặt sân/ }));
  await waitFor(() => {
    const query = requests.at(-1)!.searchParams;
    expect(query.get('role')).toBe('CUSTOMER');
    expect(query.has('status')).toBe(false);
    expect(query.get('page')).toBe('1');
    expect(query.get('q')).toBe('an');
    expect(query.get('sort')).toBe('name');
  });
  expect(new URLSearchParams(router.state.location.search).has('role')).toBe(false);

  await user.click(screen.getByRole('tab', { name: /^Chủ sân/ }));
  await waitFor(() => {
    const query = requests.at(-1)!.searchParams;
    expect(query.get('role')).toBe('OWNER');
    expect(query.has('status')).toBe(false);
  });
  expect(new URLSearchParams(router.state.location.search).has('role')).toBe(false);

  await user.click(screen.getByRole('tab', { name: /^Chờ duyệt/ }));
  await waitFor(() => {
    expect(requests.at(-1)!.searchParams.get('role')).toBe('OWNER');
    expect(requests.at(-1)!.searchParams.get('ownerStatus')).toBe('PENDING');
  });
});
