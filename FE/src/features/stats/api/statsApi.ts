import type { OwnerSummaryDto, RevenueReportDto, RevenueGroupBy } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

export const statsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOwnerSummary: build.query<OwnerSummaryDto, void>({ query: () => '/owner/stats/summary', providesTags: ['Stats'] }),
    getRevenue: build.query<RevenueReportDto, { from: string; to: string; groupBy: RevenueGroupBy; venueId?: string }>({
      query: (query) => ({ url: '/owner/stats/revenue', params: query }),
      providesTags: ['Stats'],
    }),
  }),
});

export const { useGetOwnerSummaryQuery, useGetRevenueQuery } = statsApi;
