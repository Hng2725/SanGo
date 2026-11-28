import type { RouteObject } from 'react-router';
export const recurringRoutes: RouteObject[] = [
  { path: 'recurring', lazy: () => import('./pages/MyRecurringPage').then((module) => ({ Component: module.default })) },
  { path: 'recurring/new', lazy: () => import('./pages/NewRecurringPage').then((module) => ({ Component: module.default })) },
];
