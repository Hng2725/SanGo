import { useState } from 'react';
import { App, Avatar, Button, Drawer, Layout, Segmented, Switch } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { BrandLogo } from '@/common/ui/BrandLogo';
import { HeaderActions } from '@/common/ui/HeaderActions';
import { useLanguage } from '@/common/contexts/LanguageContext';
import { useTheme } from '@/common/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { baseApi } from '@/common/api/baseApi';
import { loggedOut, selectCurrentUser } from '@/features/auth/model/authSlice';

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode } = useTheme();
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const closeMenu = () => setMenuOpen(false);
  const logout = () => {
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    closeMenu();
    message.success('Đã đăng xuất');
    navigate('/', { viewTransition: true });
  };
  const accountPath =
    user?.role === 'ADMIN' ? '/admin' : user?.role === 'OWNER' ? '/owner' : '/me/bookings';
  const accountLabel =
    user?.role === 'ADMIN'
      ? t('adminTitle')
      : user?.role === 'OWNER'
        ? t('owner')
        : t('bookingHistory');

  return (
    <Layout className="main-layout">
      <Layout.Header className="main-header app-header">
        <div className="main-header-inner">
          <BrandLogo />
          <nav className="main-nav" aria-label={t('mainNavigation')}>
            <NavLink to="/venues" viewTransition>
              {t('search')}
            </NavLink>
          </nav>
          <div className="main-desktop-actions">
            <HeaderActions />
          </div>
          <div className="main-mobile-actions">
            {user && (
              <Avatar size={32} className={`role-avatar role-avatar-${user.role.toLowerCase()}`}>
                {user.fullName.trim().slice(0, 1)}
              </Avatar>
            )}
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label={t('openMenu')}
              onClick={() => setMenuOpen(true)}
            />
          </div>
        </div>
      </Layout.Header>
      <Layout.Content className="main-content">
        <Outlet />
      </Layout.Content>
      <Layout.Footer className="main-footer">
        <span>© 2026 SanGo</span>
        <div>
          <Link to="/venues" viewTransition>
            {t('search')}
          </Link>
          <Link to="/register?role=OWNER" viewTransition>
            {t('registerOwner')}
          </Link>
        </div>
      </Layout.Footer>
      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        placement="right"
        size={280}
        title={<BrandLogo />}
        className="main-mobile-drawer"
      >
        <nav className="mobile-menu-links" aria-label={t('mainNavigation')}>
          <Link to="/venues" viewTransition onClick={closeMenu}>
            {t('search')}
          </Link>
          {user ? (
            <>
              <Link to={accountPath} viewTransition onClick={closeMenu}>
                {accountLabel}
              </Link>
              <Link to="/me/profile" viewTransition onClick={closeMenu}>
                {t('profile')}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" viewTransition onClick={closeMenu}>
                {t('login')}
              </Link>
              <Link to="/register" viewTransition onClick={closeMenu}>
                {t('register')}
              </Link>
            </>
          )}
        </nav>
        <div className="mobile-menu-setting">
          <span>{t('darkMode')}</span>
          <Switch
            checked={mode === 'dark'}
            onChange={(checked) => setMode(checked ? 'dark' : 'light')}
          />
        </div>
        <div className="mobile-menu-language">
          <span>{t('language')}</span>
          <Segmented
            block
            value={language}
            onChange={(value) => setLanguage(value === 'en' ? 'en' : 'vi')}
            options={[
              { label: 'Tiếng Việt', value: 'vi' },
              { label: 'English', value: 'en' },
            ]}
          />
        </div>
        {user && (
          <Button type="text" block className="mobile-logout logout-action" onClick={logout}>
            {t('logout')}
          </Button>
        )}
      </Drawer>
    </Layout>
  );
}
