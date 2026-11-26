import { baseApi } from '@/common/api/baseApi';
import type { Paginated, SearchVenuesQuery, VenueCardDto } from '@sango/shared';

export const searchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVenues: build.query<Paginated<VenueCardDto>, Partial<SearchVenuesQuery> | void>({
      query: (params) => {
        const cleanParams: Record<string, string | number> = {};
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== '') {
              cleanParams[key] = value as string | number;
            }
          }
        }
        return {
          url: '/venues',
          params: cleanParams,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Venue' as const, id })),
              { type: 'Venue', id: 'LIST' },
            ]
          : [{ type: 'Venue', id: 'LIST' }],
    }),
  }),
});

export const { useGetVenuesQuery } = searchApi;
