import { createBrowserRouter, type RouteObject } from 'react-router';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import OwnerLayout from '@/layouts/OwnerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ErrorPage from '@/pages/ErrorPage';
import { ErrorNavigation } from '@/components/layout/ErrorNavigation';
import { authRoutes, ownerPendingRoute } from '@/features/auth/routes';
import { profileRoutes } from '@/features/profile/routes';
import { adminDashboardRoutes } from '@/features/admin-dashboard/routes';
import { adminUserRoutes } from '@/features/admin-users/routes';
import { venueDetailRoutes } from '@/features/venue-detail/routes';
import { searchRoutes } from '@/features/search/routes';
import { ownerVenueRoutes } from '@/features/owner-venues/routes';
import { ownerScheduleRoutes } from '@/features/owner-schedule/routes';
import { pricingRoutes } from '@/features/pricing/routes';
import { maintenanceRoutes } from '@/features/maintenance/routes';
import { bookingRoutes } from '@/features/booking/routes';
import { myBookingsRoutes } from '@/features/my-bookings/routes';
import { ownerBookingsRoutes } from '@/features/owner-bookings/routes';
import { complaintRoutes, adminComplaintRoutes } from '@/features/complaints/routes';
import { recurringRoutes } from '@/features/recurring/routes';
import { ownerReviewsRoutes } from '@/features/reviews/routes';

function notFoundRoute(publicNavigation = false): RouteObject {
  return {
    path: '*',
    lazy: async () => {
      const { default: NotFoundPage } = await import('@/pages/NotFoundPage');
      return {
        Component: publicNavigation
          ? () => (
              <ErrorNavigation>
                <NotFoundPage />
              </ErrorNavigation>
            )
          : NotFoundPage,
      };
    },
  };
}

const publicError = (
  <MainLayout>
    <ErrorNavigation>
      <ErrorPage />
    </ErrorNavigation>
  </MainLayout>
);

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: publicError,
    children: [
      {
        index: true,
        lazy: () => import('@/pages/HomePage').then((module) => ({ Component: module.default })),
      },
      {
        path: '403',
        lazy: () =>
          import('@/pages/ForbiddenPage').then(({ default: ForbiddenPage }) => ({
            Component: () => (
              <ErrorNavigation>
                <ForbiddenPage />
              </ErrorNavigation>
            ),
          })),
      },
      ownerPendingRoute,
      ...searchRoutes,
      ...venueDetailRoutes,
      ...bookingRoutes,
      {
        path: 'me',
        element: <CustomerLayout />,
        errorElement: (
          <CustomerLayout>
            <ErrorPage />
          </CustomerLayout>
        ),
        children: [
          ...profileRoutes,
          ...myBookingsRoutes,
          ...complaintRoutes,
          ...recurringRoutes,
          notFoundRoute(),
        ],
      },
      notFoundRoute(true),
    ],
  },
  { element: <AuthLayout />, errorElement: publicError, children: [...authRoutes] },
  {
    path: 'owner',
    element: <OwnerLayout />,
    errorElement: (
      <OwnerLayout>
        <ErrorPage />
      </OwnerLayout>
    ),
    children: [
      {
        index: true,
        lazy: () =>
          import('@/features/stats/pages/OwnerDashboardPage').then((module) => ({
            Component: module.default,
          })),
      },
      ...ownerVenueRoutes,
      ...ownerScheduleRoutes,
      ...pricingRoutes,
      ...maintenanceRoutes,
      ...ownerBookingsRoutes,
      ...ownerReviewsRoutes,
      notFoundRoute(),
    ],
  },
  {
    path: 'admin',
    element: <AdminLayout />,
    errorElement: (
      <AdminLayout>
        <ErrorPage />
      </AdminLayout>
    ),
    children: [
      ...adminDashboardRoutes,
      ...adminUserRoutes,
      ...adminComplaintRoutes,
      notFoundRoute(),
    ],
  },
]);
