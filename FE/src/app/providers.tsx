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
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
function Inner({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { mode } = useTheme();
  const { language } = useLanguage();
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(bootstrapAuth());
  }, [dispatch]);
  return (
    <ConfigProvider
      locale={language === 'vi' ? viVN : enUS}
      wave={{ disabled: true }}
      theme={getAntdTheme(mode, reducedMotion)}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <Inner>{children}</Inner>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
}
