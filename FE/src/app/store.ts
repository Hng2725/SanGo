import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '@/common/api/baseApi';
import authReducer, { credentialsReceived, loggedOut } from '@/features/auth/model/authSlice';
const authListener = createListenerMiddleware();
authListener.startListening({ actionCreator: credentialsReceived, effect: action => { localStorage.setItem('sango.token', action.payload.accessToken); } });
authListener.startListening({ actionCreator: loggedOut, effect: () => { localStorage.removeItem('sango.token'); } });
const rootReducer = combineReducers({ auth: authReducer, [baseApi.reducerPath]: baseApi.reducer });
export type RootState = ReturnType<typeof rootReducer>;
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, middleware: getDefault => getDefault().prepend(authListener.middleware).concat(baseApi.middleware), preloadedState: preloadedState as RootState | undefined });
}
export const store = makeStore();
export type AppDispatch = typeof store.dispatch;
