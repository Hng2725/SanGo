import type { RouteObject } from 'react-router';

export const adminUserRoutes: RouteObject[] = [
  {
    path: 'users',
    lazy: () => import('./pages/AdminUsersPage').then((module) => ({ Component: module.default })),
  },
];
