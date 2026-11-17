import type { AdminUserQuery, OwnerApprovalInput, Paginated, UpdateUserStatusInput, UserDto } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';
export interface UserCounts { all: number; customers: number; owners: number; pendingOwners: number; locked: number }
export const adminUsersApi = baseApi.injectEndpoints({ endpoints: build => ({
  users: build.query<Paginated<UserDto>, AdminUserQuery>({ query: params => ({ url: '/admin/users', params }), providesTags: ['User'] }),
  counts: build.query<UserCounts, void>({ query: () => '/admin/users/counts', providesTags: ['User'] }),
  setStatus: build.mutation<UserDto, { id: string; body: UpdateUserStatusInput }>({ query: ({ id, body }) => ({ url: `/admin/users/${id}/status`, method: 'PATCH', body }), invalidatesTags: ['User'] }),
  approveOwner: build.mutation<UserDto, { id: string; body: OwnerApprovalInput }>({ query: ({ id, body }) => ({ url: `/admin/users/${id}/owner-approval`, method: 'PATCH', body }), invalidatesTags: ['User', 'AdminStats'] }),
}) });
export const { useUsersQuery, useCountsQuery, useSetStatusMutation, useApproveOwnerMutation } = adminUsersApi;
