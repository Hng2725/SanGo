import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Role } from '@sango/shared';
import { useAppSelector } from '@/app/hooks';
import { selectAuthStatus, selectCurrentUser } from '@/features/auth/model/authSlice';
import { FullPageSpinner } from '@/common/ui/FullPageSpinner';
interface AuthGuardOptions { roles?: readonly Role[]; allowUnapprovedOwner?: boolean }
export function withAuthGuard<P extends object>(Component: ComponentType<P>, options: AuthGuardOptions = {}) {
  return function Guarded(props: P) {
    const user = useAppSelector(selectCurrentUser); const status = useAppSelector(selectAuthStatus); const location = useLocation();
    if (status === 'idle' || status === 'loading') return <FullPageSpinner />;
    if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    if (options.roles && !options.roles.includes(user.role)) return <Navigate to="/403" replace />;
    if (user.role === 'OWNER' && user.ownerStatus !== 'APPROVED' && !options.allowUnapprovedOwner) return <Navigate to="/owner/pending" replace />;
    return <Component {...props} />;
  };
}
