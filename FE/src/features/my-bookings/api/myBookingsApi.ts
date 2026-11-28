import type {
  BookingDetailDto,
  BookingListItemDto,
  CancelBookingInput,
  MyBookingsQuery,
  Paginated,
} from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

function queryString(query: MyBookingsQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.upcoming !== undefined) params.set('upcoming', String(query.upcoming));
  return params.toString();
}

export const myBookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyBookings: build.query<Paginated<BookingListItemDto>, MyBookingsQuery>({
      query: (query) => `/me/bookings?${queryString(query)}`,
      providesTags: (result) =>
        result
          ? [
              { type: 'Booking', id: 'LIST' },
              ...result.items.map((booking) => ({ type: 'Booking' as const, id: booking.id })),
            ]
          : [{ type: 'Booking', id: 'LIST' }],
    }),
    getBooking: build.query<BookingDetailDto, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
    }),
    cancelBooking: build.mutation<BookingDetailDto, { id: string; input: CancelBookingInput }>({
      query: ({ id, input }) => ({ url: `/bookings/${id}/cancel`, method: 'PATCH', body: input }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Booking', id },
        { type: 'Booking', id: 'LIST' },
        'Availability',
      ],
    }),
  }),
});

export const { useGetMyBookingsQuery, useGetBookingQuery, useCancelBookingMutation } = myBookingsApi;
