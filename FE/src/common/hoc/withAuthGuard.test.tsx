import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Provider } from 'react-redux';
import { makeStore } from '@/app/store';
import { credentialsReceived, loggedOut } from '@/features/auth/model/authSlice';
import { withAuthGuard } from './withAuthGuard';
const Protected = withAuthGuard(() => <div>Protected</div>, { roles: ['ADMIN'] });
const OwnerProtected = withAuthGuard(() => <div>Owner home</div>, { roles: ['OWNER'] });
describe('withAuthGuard', () => {
  it('redirects a customer away from an admin page', () => {
    const store = makeStore();
    store.dispatch(credentialsReceived({ user: { id: 'u', email: 'u@sango.vn', fullName: 'User', phone: null, role: 'CUSTOMER', status: 'ACTIVE', ownerStatus: 'NONE', createdAt: '2026-11-20T00:00:00Z' }, accessToken: 'token' }));
    render(<Provider store={store}><MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<Protected />} /><Route path="/403" element={<div>Forbidden</div>} /></Routes></MemoryRouter></Provider>);
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });
  it('sends a signed-out visitor to login', () => {
    const store = makeStore(); store.dispatch(loggedOut());
    render(<Provider store={store}><MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<Protected />} /><Route path="/login" element={<div>Login here</div>} /></Routes></MemoryRouter></Provider>);
    expect(screen.getByText('Login here')).toBeInTheDocument();
  });
  it('sends a pending owner to the approval page', () => {
    const store = makeStore(); store.dispatch(credentialsReceived({ user: { id: 'o', email: 'o@sango.vn', fullName: 'Owner', phone: null, role: 'OWNER', status: 'ACTIVE', ownerStatus: 'PENDING', createdAt: '2026-11-20T00:00:00Z' }, accessToken: 'token' }));
    render(<Provider store={store}><MemoryRouter initialEntries={['/owner']}><Routes><Route path="/owner" element={<OwnerProtected />} /><Route path="/owner/pending" element={<div>Pending approval</div>} /></Routes></MemoryRouter></Provider>);
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
  });
  it('allows an approved owner into the owner area', () => {
    const store = makeStore(); store.dispatch(credentialsReceived({ user: { id: 'o', email: 'o@sango.vn', fullName: 'Owner', phone: null, role: 'OWNER', status: 'ACTIVE', ownerStatus: 'APPROVED', createdAt: '2026-11-20T00:00:00Z' }, accessToken: 'token' }));
    render(<Provider store={store}><MemoryRouter initialEntries={['/owner']}><Routes><Route path="/owner" element={<OwnerProtected />} /></Routes></MemoryRouter></Provider>);
    expect(screen.getByText('Owner home')).toBeInTheDocument();
  });
});
