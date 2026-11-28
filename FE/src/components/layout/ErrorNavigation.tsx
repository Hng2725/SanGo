import { useState, type ReactNode } from 'react';
import { Button, Drawer, Menu } from 'antd';
import {
  LoginOutlined,
  MenuOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/features/auth/model/authSlice';
import { useLanguage } from '@/common/contexts/LanguageContext';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import styles from './ErrorNavigation.module.css';

interface ErrorNavigationProps {
  children: ReactNode;
}

/** Public error pages keep navigation available even when their data cannot load. */
export function ErrorNavigation({ children }: ErrorNavigationProps) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery('(min-width: 992px)');
  const user = useAppSelector(selectCurrentUser);
  const { t } = useLanguage();
  const accountPath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'OWNER' ? '/owner' : '/me/bookings';
  const accountLabel =
    user?.role === 'ADMIN'
      ? t('adminTitle')
      : user?.role === 'OWNER'
        ? t('owner')
        : t('bookingHistory');
  const destinations = [
    { href: '/venues', label: t('search'), icon: <SearchOutlined /> },
    ...(user
      ? [
          { href: accountPath, label: accountLabel, icon: <UserOutlined /> },
          { href: '/me/profile', label: t('profile'), icon: <UserOutlined /> },
        ]
      : [
          { href: '/login', label: t('login'), icon: <LoginOutlined /> },
          { href: '/register', label: t('register'), icon: <UserAddOutlined /> },
        ]),
  ];
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[]}
      items={destinations.map((item) => ({
        key: item.href,
        icon: item.icon,
        label: (
          <Link to={item.href} viewTransition onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ),
      }))}
    />
  );
  return (
    <div className={styles.layout}>
      {desktop ? (
        <aside className={styles.sidebar} aria-label="Thanh điều hướng">
          {menu}
        </aside>
      ) : (
        <>
          <Button
            className={styles.menuButton}
            icon={<MenuOutlined />}
            aria-label={t('mainNavigation')}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            {t('mainNavigation')}
          </Button>
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            placement="left"
            size={264}
            title={t('mainNavigation')}
          >
            <nav aria-label="Thanh điều hướng">{menu}</nav>
          </Drawer>
        </>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
