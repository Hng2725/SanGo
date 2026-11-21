import { baseApi } from '@/common/api/baseApi';
import type {
  CourtDto,
  CreateCourtInput,
  CreateVenueInput,
  LocationDto,
  OpeningHourDto,
  OpeningHoursInput,
  OwnerVenueDetailDto,
  UpdateCourtInput,
  UpdateVenueInput,
  VenueDto,
} from '@sango/shared';

export const ownerVenueApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listOwnerVenues: build.query<VenueDto[], void>({
      query: () => '/owner/venues',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OwnerVenue' as const, id })),
              { type: 'OwnerVenue', id: 'LIST' },
            ]
          : [{ type: 'OwnerVenue', id: 'LIST' }],
    }),
    getOwnerVenue: build.query<OwnerVenueDetailDto, string>({
      query: (id) => `/owner/venues/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'OwnerVenue', id }],
    }),
    createOwnerVenue: build.mutation<OwnerVenueDetailDto, CreateVenueInput>({
      query: (body) => ({
        url: '/owner/venues',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OwnerVenue', id: 'LIST' }, 'Location'],
    }),
    updateOwnerVenue: build.mutation<
      OwnerVenueDetailDto,
      { id: string; body: UpdateVenueInput }
    >({
      query: ({ id, body }) => ({
        url: `/owner/venues/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'OwnerVenue', id },
        'Location',
      ],
    }),
    hideOwnerVenue: build.mutation<void, string>({
      query: (id) => ({
        url: `/owner/venues/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OwnerVenue', 'Location', 'Availability'],
    }),
    replaceOpeningHours: build.mutation<
      OpeningHourDto[],
      { venueId: string; body: OpeningHoursInput }
    >({
      query: ({ venueId, body }) => ({
        url: `/owner/venues/${venueId}/opening-hours`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { venueId }) => [
        { type: 'OwnerVenue', id: venueId },
        'Availability',
      ],
    }),
    createCourt: build.mutation<CourtDto, { venueId: string; body: CreateCourtInput }>({
      query: ({ venueId, body }) => ({
        url: `/owner/venues/${venueId}/courts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { venueId }) => [
        { type: 'OwnerVenue', id: venueId },
        'Court',
        'Availability',
      ],
    }),
    updateCourt: build.mutation<
      CourtDto,
      { courtId: string; venueId: string; body: UpdateCourtInput }
    >({
      query: ({ courtId, body }) => ({
        url: `/owner/courts/${courtId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { venueId }) => [
        { type: 'OwnerVenue', id: venueId },
        'Court',
        'Availability',
      ],
    }),
    deleteCourt: build.mutation<void, { courtId: string; venueId: string }>({
      query: ({ courtId }) => ({
        url: `/owner/courts/${courtId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { venueId }) => [
        { type: 'OwnerVenue', id: venueId },
        'Court',
        'Availability',
      ],
    }),
    getLocations: build.query<LocationDto[], void>({
      query: () => '/meta/locations',
      providesTags: ['Location'],
    }),
  }),
});

export const {
  useListOwnerVenuesQuery,
  useGetOwnerVenueQuery,
  useCreateOwnerVenueMutation,
  useUpdateOwnerVenueMutation,
  useHideOwnerVenueMutation,
  useReplaceOpeningHoursMutation,
  useCreateCourtMutation,
  useUpdateCourtMutation,
  useDeleteCourtMutation,
  useGetLocationsQuery,
} = ownerVenueApi;

export const useLocationsQuery = ownerVenueApi.useGetLocationsQuery;
export const useOwnerVenuesQuery = ownerVenueApi.useListOwnerVenuesQuery;
