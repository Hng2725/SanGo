import type { CreateReviewInput, OwnerReviewsQuery, Paginated, ReplyReviewInput, ReviewDto, ReviewListDto, VenueReviewsQuery } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVenueReviews: build.query<ReviewListDto, { venueId: string; query: VenueReviewsQuery }>({
      query: ({ venueId, query }) => `/venues/${venueId}/reviews?page=${query.page}&pageSize=${query.pageSize}`,
      providesTags: (_result, _error, { venueId }) => [{ type: 'Review', id: venueId }],
    }),
    createReview: build.mutation<ReviewDto, CreateReviewInput>({
      query: (body) => ({ url: '/reviews', method: 'POST', body }),
      invalidatesTags: ['Review', 'Booking', 'Venue', 'OwnerVenue', 'Stats', 'AdminStats'],
    }),
    getOwnerReviews: build.query<Paginated<ReviewDto>, OwnerReviewsQuery>({
      query: (query) => `/owner/reviews?${new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`,
      providesTags: ['Review'],
    }),
    replyReview: build.mutation<ReviewDto, { id: string; input: ReplyReviewInput }>({
      query: ({ id, input }) => ({ url: `/owner/reviews/${id}/reply`, method: 'PATCH', body: input }),
      invalidatesTags: ['Review', 'Booking'],
    }),
  }),
});

export const { useGetVenueReviewsQuery, useCreateReviewMutation, useGetOwnerReviewsQuery, useReplyReviewMutation } = reviewsApi;
