import { baseApi } from '@/common/api/baseApi';
import type { CourtWeekAvailabilityDto, VenueDayAvailabilityDto } from '@sango/shared';

export interface GetCourtWeekArgs {
  courtId: string;
  weekStart: string;
}

export interface GetVenueDayArgs {
  venueId: string;
  date: string;
}

export const availabilityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCourtWeek: build.query<CourtWeekAvailabilityDto, GetCourtWeekArgs>({
      query: ({ courtId, weekStart }) => ({
        url: `/courts/${courtId}/availability`,
        params: { weekStart },
      }),
      providesTags: (_result, _error, { courtId }) => [
        { type: 'Availability', id: courtId },
      ],
      keepUnusedDataFor: 30,
      // pollingInterval: 30000 (hoặc bật khi sử dụng hook useGetCourtWeekQuery)
    }),
    getVenueDay: build.query<VenueDayAvailabilityDto, GetVenueDayArgs>({
      query: ({ venueId, date }) => ({
        url: `/venues/${venueId}/availability`,
        params: { date },
      }),
      providesTags: (_result, _error, { venueId }) => [
        { type: 'Availability', id: `VENUE_${venueId}` },
      ],
      keepUnusedDataFor: 30,
    }),
  }),
});

export const {
  useGetCourtWeekQuery,
  useGetVenueDayQuery,
} = availabilityApi;
