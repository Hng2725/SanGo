import type { RouteObject } from 'react-router';

export const ownerVenueRoutes: RouteObject[] = [
  {
    path: 'venues',
    lazy: () =>
      import('./pages/OwnerVenuesPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'venues/new',
    lazy: () =>
      import('./pages/VenueEditorPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'venues/:id',
    lazy: () =>
      import('./pages/VenueEditorPage').then((m) => ({ Component: m.default })),
  },
];
