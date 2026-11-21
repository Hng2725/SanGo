import { baseApi } from '@/common/api/baseApi';
import type { CreateMaintenanceInput, MaintenanceDto } from '@sango/shared';

export const maintenanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCourtMaintenance: build.query<MaintenanceDto[], string>({
      query: (courtId) => `/owner/courts/${courtId}/maintenance`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Maintenance' as const, id })),
              { type: 'Maintenance', id: 'LIST' },
            ]
          : [{ type: 'Maintenance', id: 'LIST' }],
    }),
    createCourtMaintenance: build.mutation<
      MaintenanceDto,
      { courtId: string; body: CreateMaintenanceInput }
    >({
      query: ({ courtId, body }) => ({
        url: `/owner/courts/${courtId}/maintenance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Maintenance', id: 'LIST' }, 'Availability'],
    }),
    deleteCourtMaintenance: build.mutation<void, string>({
      query: (id) => ({
        url: `/owner/maintenance/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Maintenance', id: 'LIST' }, 'Availability'],
    }),
  }),
});

export const {
  useListCourtMaintenanceQuery,
  useCreateCourtMaintenanceMutation,
  useDeleteCourtMaintenanceMutation,
} = maintenanceApi;
