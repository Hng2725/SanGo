import type { RouteObject } from 'react-router';

export const myBookingsRoutes: RouteObject[] = [
  {
    path: 'bookings',
    lazy: () => import('./pages/MyBookingsPage').then((module) => ({ Component: module.default })),
  },
  {
    path: 'bookings/:id',
    lazy: () => import('./pages/BookingDetailPage').then((module) => ({ Component: module.default })),
  },
];
