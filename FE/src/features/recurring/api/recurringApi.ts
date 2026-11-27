import type { CreateRecurringInput, CreateRecurringResultDto, RecurringPreviewDto, RecurringSeriesDto } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

export const recurringApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    previewRecurring: build.mutation<RecurringPreviewDto, Omit<CreateRecurringInput, 'contactPhone' | 'note' | 'skipConflicts'>>({ query: (body) => ({ url: '/recurring/preview', method: 'POST', body }) }),
    createRecurring: build.mutation<CreateRecurringResultDto, CreateRecurringInput>({ query: (body) => ({ url: '/recurring', method: 'POST', body }), invalidatesTags: ['Recurring', 'Booking', 'Availability'] }),
    getMyRecurring: build.query<RecurringSeriesDto[], void>({ query: () => '/me/recurring', providesTags: ['Recurring'] }),
    cancelRecurring: build.mutation<unknown, string>({ query: (id) => ({ url: `/me/recurring/${id}/cancel`, method: 'PATCH' }), invalidatesTags: ['Recurring', 'Booking', 'Availability'] }),
  }),
});

export const { usePreviewRecurringMutation, useCreateRecurringMutation, useGetMyRecurringQuery, useCancelRecurringMutation } = recurringApi;
