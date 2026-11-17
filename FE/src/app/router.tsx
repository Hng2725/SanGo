import { createBrowserRouter } from 'react-router';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import OwnerLayout from '@/layouts/OwnerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ErrorPage from '@/pages/ErrorPage';
import { authRoutes, ownerPendingRoute } from '@/features/auth/routes';
import { profileRoutes } from '@/features/profile/routes';
import { adminDashboardRoutes } from '@/features/admin-dashboard/routes';
import { adminUserRoutes } from '@/features/admin-users/routes';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/HomePage').then((module) => ({ Component: module.default })),
      },
      {
        path: '403',
        lazy: () =>
          import('@/pages/ForbiddenPage').then((module) => ({ Component: module.default })),
      },
      ownerPendingRoute,
      { path: 'me', element: <CustomerLayout />, children: [...profileRoutes] },
      {
        path: '*',
        lazy: () =>
          import('@/pages/NotFoundPage').then((module) => ({ Component: module.default })),
      },
    ],
  },
  { element: <AuthLayout />, errorElement: <ErrorPage />, children: [...authRoutes] },
  {
    path: 'owner',
    element: <OwnerLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: () =>
          import('@/pages/ComingSoonPage').then((module) => ({ Component: module.default })),
      },
    ],
  },
  {
    path: 'admin',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [...adminDashboardRoutes, ...adminUserRoutes],
  },
]);
