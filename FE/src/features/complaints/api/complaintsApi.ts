import type { AdminComplaintsQuery, AdminUpdateComplaintInput, ComplaintDto, CreateComplaintInput, MyComplaintsQuery, Paginated } from '@sango/shared';
import { baseApi } from '@/common/api/baseApi';

function queryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  return params.toString();
}

export const complaintsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyComplaints: build.query<Paginated<ComplaintDto>, MyComplaintsQuery>({ query: (query) => `/me/complaints?${queryString(query)}`, providesTags: ['Complaint'] }),
    createComplaint: build.mutation<ComplaintDto, CreateComplaintInput>({ query: (body) => ({ url: '/complaints', method: 'POST', body }), invalidatesTags: ['Complaint', 'AdminStats'] }),
    getAdminComplaints: build.query<Paginated<ComplaintDto>, AdminComplaintsQuery>({ query: (query) => `/admin/complaints?${queryString(query)}`, providesTags: ['Complaint'] }),
    updateComplaint: build.mutation<ComplaintDto, { id: string; input: AdminUpdateComplaintInput }>({ query: ({ id, input }) => ({ url: `/admin/complaints/${id}`, method: 'PATCH', body: input }), invalidatesTags: ['Complaint', 'AdminStats'] }),
  }),
});

export const { useGetMyComplaintsQuery, useCreateComplaintMutation, useGetAdminComplaintsQuery, useUpdateComplaintMutation } = complaintsApi;
