import type { RouteObject } from 'react-router';

export const adminDashboardRoutes: RouteObject[] = [
  {
    index: true,
    lazy: () =>
      import('./pages/AdminDashboardPage').then((module) => ({ Component: module.default })),
  },
];
