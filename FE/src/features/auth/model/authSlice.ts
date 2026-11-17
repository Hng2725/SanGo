import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthResponse, UserDto } from '@sango/shared';
import { authApi } from '../api/authApi';
import type { RootState } from '@/app/store';
interface AuthState { user: UserDto | null; accessToken: string | null; status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' }
const initialState: AuthState = { user: null, accessToken: null, status: 'idle' };
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { dispatch }) => {
  const token = localStorage.getItem('sango.token');
  if (!token) return null;
  try { return await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true })).unwrap(); } catch { return null; }
});
const slice = createSlice({ name: 'auth', initialState, reducers: {
  credentialsReceived(state, action: PayloadAction<AuthResponse>) { state.user = action.payload.user; state.accessToken = action.payload.accessToken; state.status = 'authenticated'; },
  loggedOut(state) { state.user = null; state.accessToken = null; state.status = 'unauthenticated'; },
  userUpdated(state, action: PayloadAction<UserDto>) { state.user = action.payload; },
}, extraReducers: builder => builder.addCase(bootstrapAuth.pending, state => { state.status = 'loading'; }).addCase(bootstrapAuth.fulfilled, (state, action) => { state.user = action.payload; state.accessToken = action.payload ? localStorage.getItem('sango.token') : null; state.status = action.payload ? 'authenticated' : 'unauthenticated'; }).addCase(bootstrapAuth.rejected, state => { state.status = 'unauthenticated'; }) });
export const { credentialsReceived, loggedOut, userUpdated } = slice.actions;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated';
export const selectAuthStatus = (state: RootState) => state.auth.status;
export default slice.reducer;
