import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { makeStore } from '@/app/store';
import { server } from '@/test/msw/server';
import LoginPage from './LoginPage';
describe('LoginPage', () => {
  it('shows validation errors for empty fields', async () => {
    render(<Provider store={makeStore()}><MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /></Routes></MemoryRouter></Provider>);
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findAllByText(/Required|Invalid|không hợp lệ|String must contain/i)).not.toHaveLength(0);
  });
  it('navigates an admin to the dashboard after successful login', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json({ data: { user: { id: 'a1', email: 'admin@sango.vn', fullName: 'Admin', phone: null, role: 'ADMIN', status: 'ACTIVE', ownerStatus: 'NONE', createdAt: '2026-11-20T00:00:00Z' }, accessToken: 'demo' } })));
    render(<Provider store={makeStore()}><MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/admin" element={<div>Admin dashboard</div>} /></Routes></MemoryRouter></Provider>);
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'admin@sango.vn');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Admin@123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Admin dashboard')).toBeInTheDocument();
  });
});
