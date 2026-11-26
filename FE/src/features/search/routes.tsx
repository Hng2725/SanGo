import type { RouteObject } from 'react-router';

export const searchRoutes: RouteObject[] = [
  {
    path: 'venues',
    lazy: () => import('./pages/SearchPage').then((m) => ({ Component: m.default })),
  },
];
