import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthResponse, UserDto } from '@sango/shared';
import { authApi } from '../api/authApi';
import type { RootState } from '@/app/store';
interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}
const initialState: AuthState = { user: null, accessToken: null, status: 'idle' };
export const bootstrapAuth = createAsyncThunk<AuthResponse | null, void, { state: { auth: AuthState } }>(
  'auth/bootstrap',
  async (_, { dispatch }) => {
    const accessToken = localStorage.getItem('sango.token');
    if (!accessToken) return null;
    dispatch(tokenRestored(accessToken));
    try {
      const user = await dispatch(
        authApi.endpoints.me.initiate(undefined, { forceRefetch: true, subscribe: false }),
      ).unwrap();
      return { user, accessToken };
    } catch {
      return null;
    }
  },
  { condition: (_, { getState }) => getState().auth.status === 'idle' },
);
const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    tokenRestored(state, action: PayloadAction<string>) {
      if (state.status === 'loading') state.accessToken = action.payload;
    },
    credentialsReceived(state, action: PayloadAction<AuthResponse>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
    userUpdated(state, action: PayloadAction<UserDto>) {
      if (state.status === 'authenticated' && state.user?.id === action.payload.id) {
        state.user = action.payload;
      }
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        // A late bootstrap response must not replace a newer login or logout.
        if (state.status !== 'loading') return;
        state.user = action.payload?.user ?? null;
        state.accessToken = action.payload?.accessToken ?? null;
        state.status = action.payload ? 'authenticated' : 'unauthenticated';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        if (state.status !== 'loading') return;
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
      })
      .addMatcher(authApi.endpoints.me.matchFulfilled, (state, action) => {
        if (state.status === 'authenticated' && state.user?.id === action.payload.id) {
          state.user = action.payload;
        }
      }),
});
const { tokenRestored } = slice.actions;
export const { credentialsReceived, loggedOut, userUpdated } = slice.actions;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated';
export const selectAuthStatus = (state: RootState) => state.auth.status;
export default slice.reducer;
