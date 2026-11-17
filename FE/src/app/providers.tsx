import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { store } from './store';
import { useAppDispatch } from './hooks';
import { ThemeProvider, useTheme } from '@/common/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from '@/common/contexts/LanguageContext';
import { getAntdTheme } from '@/common/theme/antdTheme';
import { bootstrapAuth } from '@/features/auth/model/authSlice';
function Inner({ children }: { children: ReactNode }) {
  const { mode } = useTheme(); const { language } = useLanguage(); const dispatch = useAppDispatch();
  useEffect(() => { void dispatch(bootstrapAuth()); }, [dispatch]);
  return <ConfigProvider locale={language === 'vi' ? viVN : enUS} wave={{ disabled: true }} theme={getAntdTheme(mode, window.matchMedia('(prefers-reduced-motion: reduce)').matches)}><AntApp>{children}</AntApp></ConfigProvider>;
}
export function AppProviders({ children }: { children: ReactNode }) { return <Provider store={store}><ThemeProvider><LanguageProvider><Inner>{children}</Inner></LanguageProvider></ThemeProvider></Provider>; }
