import type { RouteObject } from 'react-router';

export const venueDetailRoutes: RouteObject[] = [
  {
    path: 'venues/:slug',
    lazy: () =>
      import('./pages/VenueDetailPage').then((m) => ({ Component: m.default })),
  },
];
