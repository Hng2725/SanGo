import type { RouteObject } from 'react-router';

export const ownerScheduleRoutes: RouteObject[] = [
  {
    path: 'schedule',
    lazy: () =>
      import('./pages/OwnerSchedulePage').then((m) => ({
        Component: m.default,
      })),
  },
];
