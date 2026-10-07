import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { HE } from './i18n.he';

// The interface speaks English or Hebrew. Strings are written in English in
// the components and looked up by that English text; a missing Hebrew entry
// falls back to the English, so nothing ever goes blank. Hebrew sets the
// document to right-to-left; layout uses logical properties throughout.

export type Locale = 'en' | 'he';
export const LOCALES: readonly { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
];

const STORAGE_KEY = 'basis.locale';

function stored(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'he' ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

interface LocaleContextValue {
  readonly locale: Locale;
  readonly dir: 'ltr' | 'rtl';
  readonly setLocale: (locale: Locale) => void;
  readonly t: (text: string, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', dir: 'ltr', setLocale: () => undefined, t: (text) => text });

function interpolate(text: string, values?: Record<string, string | number>): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(stored);
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts the session.
    }
  }, []);
  const t = useCallback((text: string, values?: Record<string, string | number>) => interpolate(locale === 'he' ? (HE[text] ?? text) : text, values), [locale]);
  const value = useMemo<LocaleContextValue>(() => ({ locale, dir, setLocale, t }), [locale, dir, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** The translator alone, for components that only render text. */
export function useT(): LocaleContextValue['t'] {
  return useContext(LocaleContext).t;
}
