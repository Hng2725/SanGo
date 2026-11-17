import type { ChangePasswordInput, UpdateProfileInput, UserDto } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';
export const profileApi = baseApi.injectEndpoints({ endpoints: build => ({
  updateProfile: build.mutation<UserDto, UpdateProfileInput>({ query: body => ({ url: '/users/me', method: 'PATCH', body }), invalidatesTags: ['Me'] }),
  changePassword: build.mutation<{ changed: true }, ChangePasswordInput>({ query: body => ({ url: '/users/me/password', method: 'PATCH', body }) }),
}) });
export const { useUpdateProfileMutation, useChangePasswordMutation } = profileApi;
