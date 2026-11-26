import type { RouteObject } from 'react-router';

export const bookingRoutes: RouteObject[] = [
  {
    path: 'booking/checkout',
    lazy: () =>
      import('./pages/CheckoutPage').then((m) => ({ Component: m.default })),
  },
];
