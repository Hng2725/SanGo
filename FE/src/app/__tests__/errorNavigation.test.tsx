import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { App } from 'antd';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import type { Role, UserDto } from '@sango/shared';
import { makeStore } from '@/app/store';
import { router as browserRouter } from '@/app/router';
import { ThemeProvider } from '@/common/contexts/ThemeContext';
import { LanguageProvider } from '@/common/contexts/LanguageContext';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

beforeEach(() => {
  server.use(
    http.get('/api/owner/bookings', () => HttpResponse.json({ data: { items: [], total: 0 } })),
    http.get('/api/admin/users/counts', () => HttpResponse.json({ data: { pendingOwners: 0 } })),
    http.get('/api/admin/stats/overview', () => HttpResponse.json({ data: { openComplaints: 0 } })),
    http.get('/api/owner/venues', () => HttpResponse.json({ data: [] })),
    http.get('/api/admin/users', () => HttpResponse.json({ data: { items: [], total: 0 } })),
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
  browserRouter.dispose();
  vi.restoreAllMocks();
});

function renderRoute(path: string, role: Role, crash = false) {
  const user: UserDto = {
    id: 'navigation-test',
    email: 'navigation@test.local',
    fullName: 'Navigation test',
    phone: null,
    role,
    status: 'ACTIVE',
    ownerStatus: 'APPROVED',
    createdAt: '2026-11-28T00:00:00.000Z',
  };
  const store = makeStore({ auth: { user, accessToken: 'test-token', status: 'authenticated' } });
  // Exercise the application's actual layout/error-boundary hierarchy with a failed child loader.
  const failingPath = role === 'ADMIN' ? 'users' : 'bookings';
  const prepareRoutes = (routes: RouteObject[]): RouteObject[] =>
    routes.map((route) => {
      if (crash && route.path === failingPath) {
        return {
          ...route,
          loader: () => {
            throw new Error('Test page failure');
          },
        };
      }
      return route.children ? { ...route, children: prepareRoutes(route.children) } : route;
    });
  const routes = prepareRoutes(browserRouter.routes);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <App>
            <RouterProvider router={router} />
          </App>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>,
  );
  return router;
}

describe('error navigation', () => {
  it.each(['OWNER', 'ADMIN'] as const)('keeps the %s sidebar on an unknown URL', async (role) => {
    const router = renderRoute(`/${role.toLowerCase()}/unknown-page`, role);
    await screen.findByRole('heading', { name: 'Không tìm thấy trang', level: 1 });
    const navigation = screen.getByRole('complementary', { name: 'Thanh điều hướng' });
    expect(within(navigation).getByRole('menuitem', { name: /Tổng quan/ })).toBeInTheDocument();
    await userEvent.setup().click(
      within(navigation).getByRole('menuitem', {
        name: role === 'OWNER' ? /Cụm sân/ : /Người dùng/,
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        role === 'OWNER' ? '/owner/venues' : '/admin/users',
      ),
    );
    router.dispose();
  });

  it.each(['OWNER', 'ADMIN'] as const)(
    'keeps the %s sidebar after a child route fails',
    async (role) => {
      const router = renderRoute(role === 'OWNER' ? '/owner/bookings' : '/admin/users', role, true);
      await screen.findByRole('heading', { name: 'Không tải được trang này', level: 1 });
      expect(screen.getByRole('complementary', { name: 'Thanh điều hướng' })).toBeInTheDocument();
      router.dispose();
    },
  );

  it('keeps account navigation on an unknown customer URL', async () => {
    const router = renderRoute('/me/unknown-page', 'CUSTOMER');
    await screen.findByRole('heading', { name: 'Không tìm thấy trang', level: 1 });
    expect(screen.getByRole('menuitem', { name: /Lịch đặt sân/ })).toBeInTheDocument();
    router.dispose();
  });

  it('keeps account navigation after a customer page fails', async () => {
    const router = renderRoute('/me/bookings', 'CUSTOMER', true);
    await screen.findByRole('heading', { name: 'Không tải được trang này', level: 1 });
    expect(screen.getByRole('menuitem', { name: /Lịch đặt sân/ })).toBeInTheDocument();
    router.dispose();
  });

  it.each([
    ['/unknown-page', 'Không tìm thấy trang'],
    ['/403', 'Bạn không có quyền xem trang này'],
  ])('shows public navigation on %s', async (path, title) => {
    const router = renderRoute(path, 'CUSTOMER');
    await screen.findByRole('heading', { name: title, level: 1 });
    const navigation = screen.getByRole('complementary', { name: 'Thanh điều hướng' });
    expect(within(navigation).getByRole('link', { name: 'Tìm sân' })).toHaveAttribute('href', '/venues');
    expect(within(navigation).getByRole('link', { name: 'Lịch đặt sân' })).toHaveAttribute('href', '/me/bookings');
    router.dispose();
  });
});
