import type { RouteObject } from 'react-router';
import { withAuthGuard } from '@/common/hoc/withAuthGuard';
export const authRoutes: RouteObject[] = [
  {
    path: 'login',
    lazy: () => import('./pages/LoginPage').then((m) => ({ Component: m.default })),
  },
  {
    path: 'register',
    lazy: () => import('./pages/RegisterPage').then((m) => ({ Component: m.default })),
  },
];

export const ownerPendingRoute: RouteObject = {
  path: 'owner/pending',
  lazy: () =>
    import('./pages/OwnerPendingPage').then((module) => ({
      Component: withAuthGuard(module.default, { roles: ['OWNER'], allowUnapprovedOwner: true }),
    })),
};
