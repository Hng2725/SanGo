import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { makeStore } from '@/app/store';
import { server } from '@/test/msw/server';
import reducer, { bootstrapAuth, credentialsReceived, loggedOut, userUpdated } from './authSlice';
import type { UserDto } from '@sango/shared';
const user: UserDto = {
  id: '1',
  email: 'a@sango.vn',
  fullName: 'Nguyen An',
  phone: null,
  role: 'OWNER',
  status: 'ACTIVE',
  ownerStatus: 'PENDING',
  createdAt: '2026-11-20T00:00:00.000Z',
};
describe('auth state', () => {
  it('stores credentials and updates the current user', () => {
    const signedIn = reducer(undefined, credentialsReceived({ user, accessToken: 'abc' }));
    expect(signedIn.status).toBe('authenticated');
    expect(reducer(signedIn, userUpdated({ ...user, fullName: 'New name' })).user?.fullName).toBe(
      'New name',
    );
    expect(reducer(signedIn, loggedOut()).accessToken).toBeNull();
  });
  it('restores the signed-in user from the API using a stored token', async () => {
    localStorage.setItem('sango.token', 'saved-token');
    server.use(
      http.get('/api/auth/me', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer saved-token');
        return HttpResponse.json({ data: user });
      }),
    );
    const store = makeStore();
    await store.dispatch(bootstrapAuth());
    expect(store.getState().auth).toMatchObject({
      user,
      accessToken: 'saved-token',
      status: 'authenticated',
    });
    localStorage.removeItem('sango.token');
  });
});
