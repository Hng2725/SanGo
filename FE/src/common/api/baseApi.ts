import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { isApiErrorBody, isApiResponse, type ApiErrorBody } from '@sango/shared';
const rawQuery = fetchBaseQuery({ baseUrl: new URL(import.meta.env.VITE_API_URL ?? '/api', window.location.origin).toString(), prepareHeaders: headers => { const token = localStorage.getItem('sango.token'); if (token) headers.set('Authorization', `Bearer ${token}`); return headers; } });
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError | { status: number; data: ApiErrorBody }> = async (args, api, extra) => {
  const result = await rawQuery(args, api, extra);
  if (result.error) {
    if (result.error.status === 401) api.dispatch({ type: 'auth/loggedOut' });
    if (isApiErrorBody(result.error.data)) return { error: { status: result.error.status as number, data: result.error.data } };
    return { error: { status: 0, data: { statusCode: 0, error: 'Network Error', code: 'INTERNAL_ERROR', message: 'Không kết nối được máy chủ', path: '', timestamp: new Date().toISOString() } } };
  }
  return { data: isApiResponse<unknown>(result.data) ? result.data.data : result.data };
};
export const baseApi = createApi({ reducerPath: 'api', baseQuery, tagTypes: ['Me', 'User', 'AdminStats', 'Venue', 'OwnerVenue', 'Court', 'Pricing', 'Maintenance', 'Location', 'Availability', 'Hold', 'Booking', 'Recurring', 'Review', 'Complaint', 'Stats'], endpoints: () => ({}) });
