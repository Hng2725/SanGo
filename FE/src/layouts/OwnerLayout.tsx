import {
  CalendarOutlined,
  EnvironmentOutlined,
  LineChartOutlined,
  ScheduleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { DashboardShell, type ShellMenuItem } from '@/components/layout/DashboardShell';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { withAuthGuard } from '@/common/hoc/withAuthGuard';
import { useLanguage } from '@/common/contexts/LanguageContext';

function OwnerLayoutBase() {
  const { t } = useLanguage();
  const items: ShellMenuItem[] = [
    { key: 'overview', label: t('dashboard'), href: '/owner', icon: <LineChartOutlined /> },
    { key: 'venues', label: t('venues'), href: '/owner/venues', icon: <EnvironmentOutlined /> },
    { key: 'schedule', label: t('schedule'), href: '/owner/schedule', icon: <CalendarOutlined /> },
    { key: 'bookings', label: t('bookings'), href: '/owner/bookings', icon: <ScheduleOutlined /> },
    { key: 'reviews', label: t('reviews'), href: '/owner/reviews', icon: <StarOutlined /> },
  ];
  return (
    <DashboardShell
      title={t('owner')}
      rootLabel="Chủ sân"
      items={items}
      actions={<HeaderActions dashboard />}
    />
  );
}
export default withAuthGuard(OwnerLayoutBase, { roles: ['OWNER'] });
