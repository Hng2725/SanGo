import type { ReactNode } from 'react';
import {
  CalendarOutlined,
  MessageOutlined,
  RedoOutlined,
  ScheduleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Grid, Menu, Tabs } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { withAuthGuard } from '@/common/hoc/withAuthGuard';
import { useLanguage } from '@/common/contexts/LanguageContext';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/features/auth/model/authSlice';

function CustomerLayoutBase({ children }: { children?: ReactNode }) {
  const { t } = useLanguage();
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const accountNavItems =
    user?.role === 'CUSTOMER'
      ? [
          { key: '/me/bookings', label: t('bookingHistory'), icon: <ScheduleOutlined /> },
          { key: '/me/recurring', label: t('recurring'), icon: <RedoOutlined /> },
          { key: '/me/complaints', label: t('complaints'), icon: <MessageOutlined /> },
          { key: '/me/profile', label: t('profile'), icon: <UserOutlined /> },
        ]
      : [
          { key: '/me/profile', label: t('profile'), icon: <UserOutlined /> },
          {
            key: user?.role === 'ADMIN' ? '/admin' : '/owner',
            label: t('backManagement'),
            icon: <CalendarOutlined />,
          },
        ];
  const goTo = (path: string) => navigate(path, { viewTransition: true });
  return (
    <div className="account-layout">
      {screens.lg ? (
        <aside className="account-nav">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={accountNavItems.map((item) => ({ ...item, onClick: () => goTo(item.key) }))}
          />
        </aside>
      ) : (
        <Tabs
          className="account-tabs"
          activeKey={location.pathname}
          onChange={goTo}
          items={accountNavItems.map((item) => ({ key: item.key, label: item.label }))}
        />
      )}
      <div className="account-content">
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
export default withAuthGuard(CustomerLayoutBase);
