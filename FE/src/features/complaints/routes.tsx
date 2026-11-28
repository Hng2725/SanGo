import type { RouteObject } from 'react-router';
export const complaintRoutes: RouteObject[] = [
  { path: 'complaints', lazy: () => import('./pages/MyComplaintsPage').then((module) => ({ Component: module.default })) },
];
export const adminComplaintRoutes: RouteObject[] = [
  { path: 'complaints', lazy: () => import('./pages/AdminComplaintsPage').then((module) => ({ Component: module.default })) },
];
