import type { RouteObject } from 'react-router';

export const ownerBookingsRoutes: RouteObject[] = [
  { path: 'bookings', lazy: () => import('./pages/OwnerBookingsPage').then((module) => ({ Component: module.default })) },
];
