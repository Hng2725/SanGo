import { baseApi } from '@/common/api/baseApi';
import type { CreateHoldInput, HoldDto } from '@sango/shared';

export const holdApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createHold: build.mutation<HoldDto, CreateHoldInput>({
      query: (body) => ({
        url: '/holds',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Hold', 'Availability'],
    }),
    deleteHold: build.mutation<void, string>({
      query: (id) => ({
        url: `/holds/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Hold', 'Availability'],
    }),
  }),
});

export const { useCreateHoldMutation, useDeleteHoldMutation } = holdApi;
