import { baseApi } from '@/common/api/baseApi';
import type {
  CourtPricingDto,
  PriceQuote,
  PricingConfigInput,
  QuotePriceInput,
} from '@sango/shared';

export const pricingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPricing: build.query<CourtPricingDto, string>({
      query: (courtId) => `/owner/courts/${courtId}/pricing`,
      providesTags: (_res, _err, id) => [{ type: 'Pricing', id }],
    }),
    updatePricing: build.mutation<
      CourtPricingDto,
      { courtId: string; body: PricingConfigInput }
    >({
      query: ({ courtId, body }) => ({
        url: `/owner/courts/${courtId}/pricing`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { courtId }) => [
        { type: 'Pricing', id: courtId },
        'Availability',
        'Venue',
        'OwnerVenue',
        'Court',
      ],
    }),
    copyPricing: build.mutation<
      void,
      { courtId: string; targetCourtIds: string[] }
    >({
      query: ({ courtId, targetCourtIds }) => ({
        url: `/owner/courts/${courtId}/pricing/copy`,
        method: 'POST',
        body: { targetCourtIds },
      }),
      invalidatesTags: ['Pricing', 'Availability', 'Venue', 'OwnerVenue', 'Court'],
    }),
    quotePrice: build.mutation<PriceQuote, QuotePriceInput>({
      query: (body) => ({
        url: '/pricing/quote',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetPricingQuery,
  useUpdatePricingMutation,
  useCopyPricingMutation,
  useQuotePriceMutation,
} = pricingApi;
