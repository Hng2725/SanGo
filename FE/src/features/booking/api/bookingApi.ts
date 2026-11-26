import { baseApi } from '@/common/api/baseApi';
import type { BookingDto, CreateBookingInput } from '@sango/shared';

export const bookingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createBooking: build.mutation<BookingDto, CreateBookingInput>({
      query: (body) => ({
        url: '/bookings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Booking', 'Availability'],
    }),
  }),
});

export const { useCreateBookingMutation } = bookingApi;
