import type { RouteObject } from 'react-router';

export const pricingRoutes: RouteObject[] = [
  {
    path: 'courts/:courtId/pricing',
    lazy: () =>
      import('./pages/CourtPricingPage').then((m) => ({ Component: m.default })),
  },
];
