import { App } from 'antd';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { UserDto } from '@sango/shared';
import { makeStore } from '@/app/store';
import { server } from '@/test/msw/server';
import OwnerPendingPage from './OwnerPendingPage';
import { authApi } from '../api/authApi';

const owner: UserDto = {
  id: 'o1',
  email: 'owner@sango.vn',
  fullName: 'Chủ sân',
  phone: null,
  role: 'OWNER',
  status: 'ACTIVE',
  ownerStatus: 'PENDING',
  createdAt: '2026-11-20T00:00:00Z',
};
function renderPage() {
  const store = makeStore({ auth: { user: owner, accessToken: 'token', status: 'authenticated' } });
  render(
    <Provider store={store}>
      <App>
        <MemoryRouter initialEntries={['/owner/pending']}>
          <Routes>
            <Route path="/owner/pending" element={<OwnerPendingPage />} />
            <Route path="/owner" element={<div>Quản lý sân</div>} />
          </Routes>
        </MemoryRouter>
      </App>
    </Provider>,
  );
  return store;
}
describe('OwnerPendingPage', () => {
  it('enters owner management when the latest profile is approved', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ data: { ...owner, ownerStatus: 'APPROVED' } }),
      ),
    );
    const store = renderPage();
    expect(await screen.findByText('Quản lý sân')).toBeInTheDocument();
    expect(store.getState().auth.user?.ownerStatus).toBe('APPROVED');
  });
  it('shows a request failure when checking approval fails', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ data: owner })));
    const store = renderPage();
    const check = await screen.findByRole('button', { name: /Kiểm tra lại/ });
    await waitFor(() =>
      expect(authApi.endpoints.me.select()(store.getState()).isSuccess).toBe(true),
    );
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    );
    await userEvent.click(check);
    expect(await screen.findByText('Không kiểm tra được trạng thái')).toBeInTheDocument();
  });
});
