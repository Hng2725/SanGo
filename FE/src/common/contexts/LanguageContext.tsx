import { createContext, useContext, useEffect, type ReactNode } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import { useLocalStorage } from '@/common/hooks/useLocalStorage';
import { vi, type TranslationKey } from '@/common/i18n/vi';
import { en } from '@/common/i18n/en';
type Language = 'vi' | 'en';
interface LanguageValue { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string }
const LanguageContext = createContext<LanguageValue | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useLocalStorage<Language>('sango.language', 'vi');
  useEffect(() => { dayjs.locale(language); document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: key => language === 'vi' ? vi[key] : en[key] }}>{children}</LanguageContext.Provider>;
}
export function useLanguage(): LanguageValue { const value = useContext(LanguageContext); if (!value) throw new Error('LanguageProvider is missing'); return value; }
