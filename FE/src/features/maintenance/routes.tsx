import type { RouteObject } from 'react-router';

export const maintenanceRoutes: RouteObject[] = [
  {
    path: 'courts/:courtId/maintenance',
    lazy: () =>
      import('./pages/CourtMaintenancePage').then((m) => ({ Component: m.default })),
  },
];
