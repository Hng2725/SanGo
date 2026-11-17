import { App, Avatar, Button, Dropdown, Space, Tooltip, type MenuProps } from 'antd';
import {
  CheckOutlined,
  DownOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router';
import { ROLE_LABELS } from '@sango/shared';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useTheme } from '@/common/contexts/ThemeContext';
import { useLanguage } from '@/common/contexts/LanguageContext';
import { baseApi } from '@/common/api/baseApi';
import { loggedOut, selectCurrentUser } from '@/features/auth/model/authSlice';

export function HeaderActions({ dashboard = false }: { dashboard?: boolean }) {
  const { mode, toggle } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const logout = () => {
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    message.success('Đã đăng xuất');
    navigate('/', { viewTransition: true });
  };
  const rolePath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'OWNER' ? '/owner' : '/me/bookings';
  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Trang quản trị'
      : user?.role === 'OWNER'
        ? t('owner')
        : t('bookingHistory');
  const userItems: MenuProps['items'] = user
    ? [
        {
          key: 'identity',
          disabled: true,
          label: (
            <span
              className={`user-dropdown-identity user-dropdown-identity-${user.role.toLowerCase()}`}
            >
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
            </span>
          ),
        },
        {
          key: 'area',
          label: (
            <Link to={rolePath} viewTransition>
              {roleLabel}
            </Link>
          ),
        },
        {
          key: 'profile',
          label: (
            <Link to="/me/profile" viewTransition>
              {t('profile')}
            </Link>
          ),
        },
        { type: 'divider' },
        {
          key: 'logout',
          label: t('logout'),
          onClick: logout,
          danger: true,
          className: 'logout-menu-item',
        },
      ]
    : [];
  const languageItems: MenuProps['items'] = [
    {
      key: 'vi',
      label: 'Tiếng Việt',
      icon: language === 'vi' ? <CheckOutlined /> : <span className="menu-check-placeholder" />,
    },
    {
      key: 'en',
      label: 'English',
      icon: language === 'en' ? <CheckOutlined /> : <span className="menu-check-placeholder" />,
    },
  ];

  return (
    <Space className={`header-actions ${dashboard ? 'header-actions-dashboard' : ''}`} size={8}>
      <Dropdown
        menu={{
          items: languageItems,
          onClick: ({ key }) => setLanguage(key === 'en' ? 'en' : 'vi'),
        }}
        placement="bottomRight"
      >
        <Button type="text" shape="circle" icon={<GlobalOutlined />} aria-label={t('language')} />
      </Dropdown>
      <Tooltip
        title={mode === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
      >
        <Button
          type="text"
          shape="circle"
          icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          aria-label={t('theme')}
          onClick={toggle}
        />
      </Tooltip>
      {user ? (
        <Dropdown menu={{ items: userItems }} placement="bottomRight">
          <Button
            type="text"
            className="header-user-button"
            aria-label={`Tài khoản ${user.fullName}`}
          >
            <Avatar size={34} className={`role-avatar role-avatar-${user.role.toLowerCase()}`}>
              {user.fullName.trim().slice(0, 1)}
            </Avatar>
            <span className="header-user-meta">
              <span>{user.fullName}</span>
              {dashboard && <small>{ROLE_LABELS[user.role]}</small>}
            </span>
            <DownOutlined className="header-user-chevron" />
          </Button>
        </Dropdown>
      ) : (
        <>
          <Link to="/login" viewTransition>
            {t('login')}
          </Link>
          <Link to="/register" viewTransition>
            <Button type="primary">{t('register')}</Button>
          </Link>
        </>
      )}
    </Space>
  );
}
