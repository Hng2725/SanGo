import { useState, type ReactNode } from 'react';
import { Breadcrumb, Button, Drawer, Grid, Layout, Menu, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { useLanguage } from '@/common/contexts/LanguageContext';

export interface ShellMenuItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: { count: number; tone: 'warning' | 'neutral' };
}
interface DashboardShellProps {
  title: string;
  rootLabel: string;
  items: ShellMenuItem[];
  actions?: ReactNode;
  children?: ReactNode;
}

export function DashboardShell({ title, rootLabel, items, actions, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const selected = items.find((item) => item.href === location.pathname) ?? items[0];
  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selected?.key ?? '']}
      onClick={({ key }) => {
        const destination = items.find((item) => item.key === key)?.href;
        if (destination) navigate(destination, { viewTransition: true });
        setOpen(false);
      }}
      items={items.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: (
          <span className="shell-menu-label">
            {item.label}
            {item.badge && item.badge.count > 0 && (
              <span className={`shell-menu-badge shell-menu-badge-${item.badge.tone}`}>
                {item.badge.count}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );

  return (
    <Layout className="dashboard-shell">
      {screens.lg ? (
        <Layout.Sider
          aria-label="Thanh điều hướng"
          width={240}
          collapsedWidth={72}
          collapsed={collapsed}
          collapsible
          trigger={null}
          theme="dark"
          className={`app-sider ${collapsed ? 'app-sider-collapsed' : ''}`}
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          onFocusCapture={() => setCollapsed(false)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setCollapsed(true);
          }}
        >
          <div className="dashboard-logo">
            <BrandLogo inverted />
          </div>
          {!collapsed && <p className="dashboard-caption">{title}</p>}
          {menu}
          <div className="dashboard-sider-bottom">
            {!collapsed && (
              <svg viewBox="0 0 240 150" className="dashboard-sider-court" aria-hidden="true">
                <rect x="10" y="10" width="220" height="130" rx="4" />
                <path d="M120 10v130M10 75h220" />
                <circle cx="120" cy="75" r="22" />
              </svg>
            )}
            <Tooltip title={collapsed ? 'Mở rộng menu' : undefined} placement="right">
              <Button
                type="text"
                block
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                aria-expanded={!collapsed}
              >
                {!collapsed && 'Thu gọn menu'}
              </Button>
            </Tooltip>
          </div>
        </Layout.Sider>
      ) : (
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="left"
          size={264}
          title={<BrandLogo inverted />}
          className="dashboard-drawer"
        >
          <p className="dashboard-caption">{title}</p>
          {menu}
        </Drawer>
      )}
      <Layout>
        <Layout.Header className="dashboard-header app-header">
          {!screens.lg && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label={t('openMenu')}
              onClick={() => setOpen(true)}
            />
          )}
          <Breadcrumb items={[{ title: rootLabel }, { title: selected?.label ?? rootLabel }]} />
          <div className="dashboard-actions">{actions}</div>
        </Layout.Header>
        <Layout.Content className="dashboard-content">
          <div className="dashboard-inner">
          {children ?? <Outlet />}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
