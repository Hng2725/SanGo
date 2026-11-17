import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '@/common/hooks/useLocalStorage';
import type { ThemeMode } from '@/common/theme/tokens';
interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preferred: ThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  const [mode, setStoredMode] = useLocalStorage<ThemeMode>('sango.theme', preferred);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  const setMode = (next: ThemeMode) => {
    if (
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => setStoredMode(next));
    } else setStoredMode(next);
  };
  return (
    <ThemeContext.Provider
      value={{ mode, setMode, toggle: () => setMode(mode === 'light' ? 'dark' : 'light') }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is missing');
  return value;
}
