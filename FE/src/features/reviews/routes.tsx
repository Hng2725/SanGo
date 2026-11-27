import type { RouteObject } from 'react-router';
export const reviewsRoutes: RouteObject[] = [];
export const ownerReviewsRoutes: RouteObject[] = [
  { path: 'reviews', lazy: () => import('./pages/OwnerReviewsPage').then((module) => ({ Component: module.default })) },
];
