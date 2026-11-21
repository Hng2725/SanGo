import { baseApi } from '@/common/api/baseApi';
import type { VenueDetailDto } from '@sango/shared';

export const venueDetailApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVenueDetailBySlug: build.query<VenueDetailDto, string>({
      query: (slug) => `/venues/${slug}`,
      providesTags: (_res, _err, slug) => [{ type: 'Venue', id: slug }],
    }),
  }),
});

export const { useGetVenueDetailBySlugQuery } = venueDetailApi;
