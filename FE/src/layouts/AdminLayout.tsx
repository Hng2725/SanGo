import type { ReactNode } from 'react';
import { AppstoreOutlined, MessageOutlined, TeamOutlined } from '@ant-design/icons';
import { DashboardShell, type ShellMenuItem } from '@/components/layout/DashboardShell';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { withAuthGuard } from '@/common/hoc/withAuthGuard';
import { useLanguage } from '@/common/contexts/LanguageContext';
import { useCountsQuery } from '@/features/admin-users/api/adminUsersApi';
import { useOverviewQuery } from '@/features/admin-dashboard/api/adminDashboardApi';

function AdminLayoutBase({ children }: { children?: ReactNode }) {
  const { t } = useLanguage();
  const { data: counts } = useCountsQuery();
  const { data: overview } = useOverviewQuery();
  const items: ShellMenuItem[] = [
    { key: 'overview', label: t('dashboard'), href: '/admin', icon: <AppstoreOutlined /> },
    {
      key: 'users',
      label: t('users'),
      href: '/admin/users',
      icon: <TeamOutlined />,
      badge: { count: counts?.pendingOwners ?? 0, tone: 'warning' },
    },
    {
      key: 'complaints',
      label: t('complaints'),
      href: '/admin/complaints',
      icon: <MessageOutlined />,
      badge: { count: overview?.openComplaints ?? 0, tone: 'neutral' },
    },
  ];
  return (
    <DashboardShell
      title={t('adminTitle')}
      rootLabel="Quản trị"
      items={items}
      actions={<HeaderActions dashboard />}
    >
      {children}
    </DashboardShell>
  );
}
export default withAuthGuard(AdminLayoutBase, { roles: ['ADMIN'] });
