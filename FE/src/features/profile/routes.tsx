import type { RouteObject } from 'react-router';

export const profileRoutes: RouteObject[] = [
  {
    path: 'profile',
    lazy: () => import('./pages/ProfilePage').then((module) => ({ Component: module.default })),
  },
];
