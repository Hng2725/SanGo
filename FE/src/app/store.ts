import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '@/common/api/baseApi';
import authReducer, { credentialsReceived, loggedOut } from '@/features/auth/model/authSlice';
import bookingDraftReducer, { draftCleared } from '@/features/booking/model/bookingDraftSlice';

const SESSION_KEY = 'sango.bookingDraft';

const authListener = createListenerMiddleware();
authListener.startListening({ actionCreator: credentialsReceived, effect: action => { localStorage.setItem('sango.token', action.payload.accessToken); } });
authListener.startListening({ actionCreator: loggedOut, effect: () => { localStorage.removeItem('sango.token'); } });

const rootReducer = combineReducers({
  auth: authReducer,
  bookingDraft: bookingDraftReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});
export type RootState = ReturnType<typeof rootReducer>;
export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: getDefault => getDefault().prepend(authListener.middleware).concat(baseApi.middleware),
    preloadedState: preloadedState as RootState | undefined,
  });

  // Persist bookingDraft to sessionStorage on every state change
  store.subscribe(() => {
    const draft = store.getState().bookingDraft;
    try {
      if (draft.slots.length === 0 && !draft.holdId) {
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
      }
    } catch {
      // ignore storage errors
    }
  });

  // Clear sessionStorage on draftCleared
  authListener.startListening({
    actionCreator: draftCleared,
    effect: () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } },
  });

  return store;
}
export const store = makeStore();
export type AppDispatch = typeof store.dispatch;
