import type { AdminOverviewDto } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';
export const adminDashboardApi = baseApi.injectEndpoints({ endpoints: build => ({ overview: build.query<AdminOverviewDto, void>({ query: () => '/admin/stats/overview', providesTags: ['AdminStats'] }) }) });
export const { useOverviewQuery } = adminDashboardApi;
