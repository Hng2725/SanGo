import type { AuthResponse, LoginInput, RegisterInput, UserDto } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';
export const authApi = baseApi.injectEndpoints({ endpoints: build => ({
  register: build.mutation<AuthResponse, RegisterInput>({ query: body => ({ url: '/auth/register', method: 'POST', body }) }),
  login: build.mutation<AuthResponse, LoginInput>({ query: body => ({ url: '/auth/login', method: 'POST', body }) }),
  me: build.query<UserDto, void>({ query: () => '/auth/me', providesTags: ['Me'] }),
}) });
export const { useRegisterMutation, useLoginMutation, useMeQuery } = authApi;
