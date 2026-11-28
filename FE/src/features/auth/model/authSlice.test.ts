import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { makeStore } from '@/app/store';
import { server } from '@/test/msw/server';
import reducer, { bootstrapAuth, credentialsReceived, loggedOut, userUpdated } from './authSlice';
import type { UserDto } from '@sango/shared';
import { authApi } from '../api/authApi';
import { draftStarted, holdAttached } from '@/features/booking/model/bookingDraftSlice';
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
  it('removes an invalid persisted token after bootstrap fails', async () => {
    localStorage.setItem('sango.token', 'expired-token');
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })),
    );
    const store = makeStore();
    await store.dispatch(bootstrapAuth());
    expect(store.getState().auth).toMatchObject({
      user: null,
      accessToken: null,
      status: 'unauthenticated',
    });
    expect(localStorage.getItem('sango.token')).toBeNull();
  });
  it('uses the Redux token and synchronizes refreshed owner approval with route guards', async () => {
    const store = makeStore({
      auth: { user, accessToken: 'redux-token', status: 'authenticated' },
    });
    localStorage.setItem('sango.token', 'stale-token');
    server.use(
      http.get('/api/auth/me', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer redux-token');
        return HttpResponse.json({ data: { ...user, ownerStatus: 'APPROVED' } });
      }),
    );
    await store.dispatch(authApi.endpoints.me.initiate(undefined, { subscribe: false })).unwrap();
    expect(store.getState().auth.user?.ownerStatus).toBe('APPROVED');
  });
  it('clears cached user data and the booking hold on logout', async () => {
    const store = makeStore();
    store.dispatch(credentialsReceived({ user, accessToken: 'token' }));
    await store.dispatch(authApi.util.upsertQueryData('me', undefined, user));
    store.dispatch(
      draftStarted({
        venue: { id: 'v1', slug: 'venue', name: 'Venue' },
        court: { id: 'c1', name: 'Court', sport: 'FOOTBALL' },
        slots: [
          {
            startAt: '2026-12-01T01:00:00Z',
            endAt: '2026-12-01T02:00:00Z',
            price: 100000,
            label: null,
          },
        ],
      }),
    );
    store.dispatch(holdAttached({ holdId: 'private-hold', holdExpiresAt: '2026-12-01T00:00:00Z' }));
    store.dispatch(loggedOut());
    expect(store.getState().api.queries).toEqual({});
    expect(store.getState().bookingDraft).toMatchObject({ slots: [], holdId: null, court: null });
    expect(sessionStorage.getItem('sango.bookingDraft')).toBeNull();
  });
  it('does not restore a session when logout happens during bootstrap', async () => {
    localStorage.setItem('sango.token', 'saved-token');
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: (() => void) | undefined;
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    server.use(
      http.get('/api/auth/me', async () => {
        started?.();
        await gate;
        return HttpResponse.json({ data: user });
      }),
    );
    const store = makeStore();
    const bootstrap = store.dispatch(bootstrapAuth());
    await requested;
    store.dispatch(loggedOut());
    release?.();
    await bootstrap;
    expect(store.getState().auth).toMatchObject({
      user: null,
      accessToken: null,
      status: 'unauthenticated',
    });
  });
  it('ignores profile updates that arrive after logout', () => {
    const signedIn = reducer(undefined, credentialsReceived({ user, accessToken: 'token' }));
    const signedOut = reducer(signedIn, loggedOut());
    expect(reducer(signedOut, userUpdated(user)).user).toBeNull();
  });
  it('preserves selected guest slots through login', () => {
    const store = makeStore();
    store.dispatch(
      draftStarted({
        venue: { id: 'v1', slug: 'venue', name: 'Venue' },
        court: { id: 'c1', name: 'Court', sport: 'FOOTBALL' },
        slots: [
          {
            startAt: '2026-12-01T01:00:00Z',
            endAt: '2026-12-01T02:00:00Z',
            price: 100000,
            label: null,
          },
        ],
      }),
    );
    store.dispatch(credentialsReceived({ user, accessToken: 'token' }));
    expect(store.getState().bookingDraft.slots).toHaveLength(1);
    store.dispatch(loggedOut());
  });
  it('clears the previous account draft when switching accounts directly', () => {
    const store = makeStore({ auth: { user, accessToken: 'old-token', status: 'authenticated' } });
    store.dispatch(holdAttached({ holdId: 'old-hold', holdExpiresAt: '2026-12-01T00:00:00Z' }));
    store.dispatch(
      credentialsReceived({ user: { ...user, id: 'another-user' }, accessToken: 'new-token' }),
    );
    expect(store.getState().bookingDraft.holdId).toBeNull();
    store.dispatch(loggedOut());
  });
});
