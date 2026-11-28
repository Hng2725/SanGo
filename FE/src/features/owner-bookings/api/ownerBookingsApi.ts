import type {
  BookingDetailDto,
  BookingListItemDto,
  ConfirmRecurringResultDto,
  OwnerBookingsQuery,
  Paginated,
  RejectBookingInput,
} from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

function toQuery(query: OwnerBookingsQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

const bookingInvalidations = ['Booking', 'Availability', 'Recurring', 'Stats', 'AdminStats'] as const;

export const ownerBookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOwnerBookings: build.query<Paginated<BookingListItemDto>, OwnerBookingsQuery>({
      query: (query) => `/owner/bookings?${toQuery({ ...query, pageSize: 100 })}`,
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const withoutPage = Object.fromEntries(Object.entries(queryArgs).filter(([key]) => key !== 'page'));
        return `${endpointName}(${JSON.stringify(withoutPage)})`;
      },
      merge: (currentCache, nextPage, { arg }) => {
        if (arg.page === 1) return nextPage;
        const ids = new Set(currentCache.items.map((item) => item.id));
        currentCache.items.push(...nextPage.items.filter((item) => !ids.has(item.id)));
        currentCache.page = nextPage.page;
        currentCache.total = nextPage.total;
        currentCache.totalPages = nextPage.totalPages;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
      providesTags: [{ type: 'Booking', id: 'OWNER_LIST' }],
    }),
    getOwnerBookingsPage: build.query<Paginated<BookingListItemDto>, OwnerBookingsQuery>({
      query: (query) => `/owner/bookings?${toQuery(query)}`,
      providesTags: [{ type: 'Booking', id: 'OWNER_LIST' }],
    }),
    getOwnerBooking: build.query<BookingDetailDto, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
    }),
    confirmBooking: build.mutation<BookingDetailDto, string>({
      query: (id) => ({ url: `/owner/bookings/${id}/confirm`, method: 'PATCH' }),
      invalidatesTags: bookingInvalidations,
    }),
    rejectBooking: build.mutation<BookingDetailDto, { id: string; input: RejectBookingInput }>({
      query: ({ id, input }) => ({ url: `/owner/bookings/${id}/reject`, method: 'PATCH', body: input }),
      invalidatesTags: bookingInvalidations,
    }),
    completeBooking: build.mutation<BookingDetailDto, string>({
      query: (id) => ({ url: `/owner/bookings/${id}/complete`, method: 'PATCH' }),
      invalidatesTags: bookingInvalidations,
    }),
    confirmSeries: build.mutation<ConfirmRecurringResultDto, string>({
      query: (id) => ({ url: `/owner/recurring/${id}/confirm`, method: 'PATCH' }),
      invalidatesTags: bookingInvalidations,
    }),
  }),
});

export const {
  useGetOwnerBookingsQuery,
  useGetOwnerBookingsPageQuery,
  useGetOwnerBookingQuery,
  useConfirmBookingMutation,
  useRejectBookingMutation,
  useCompleteBookingMutation,
  useConfirmSeriesMutation,
} = ownerBookingsApi;
