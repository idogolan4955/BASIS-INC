import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { HE } from './i18n.he';

// The portal speaks English and Hebrew; the rest of the site is English.
// Strings are keyed by their English text, as in the platform; codes,
// numbers and amounts stay left to right inside Hebrew.

export type Locale = 'en' | 'he';
const KEY = 'basis.portal.locale';

interface LocaleValue {
  readonly locale: Locale;
  readonly dir: 'ltr' | 'rtl';
  readonly setLocale: (locale: Locale) => void;
  readonly t: (text: string, vars?: Record<string, string | number>) => string;
}

const fill = (text: string, vars?: Record<string, string | number>) => (vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text);

const Context = createContext<LocaleValue>({ locale: 'en', dir: 'ltr', setLocale: () => undefined, t: fill });

function initial(): Locale {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'he' || stored === 'en') return stored;
  } catch {
    // Storage may be blocked; the browser's language decides.
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('he') ? 'he' : 'en';
}

export function PortalLocale({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>('en');
  useEffect(() => setState(initial()), []);
  const setLocale = useCallback((next: Locale) => {
    setState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not remembered; it still applies now.
    }
  }, []);
  const value = useMemo<LocaleValue>(() => ({ locale, dir: locale === 'he' ? 'rtl' : 'ltr', setLocale, t: (text, vars) => fill(locale === 'he' ? (HE[text] ?? text) : text, vars) }), [locale, setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useLocale = () => useContext(Context);
export const useT = () => useContext(Context).t;

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={className} role="group" aria-label="Language">
      {(['en', 'he'] as const).map((option) => (
        <button key={option} type="button" onClick={() => setLocale(option)} aria-pressed={locale === option} className={`code h-9 px-2 uppercase tracking-[0.14em] ${locale === option ? 'text-ink underline decoration-nude-deep underline-offset-[6px]' : 'text-ink-muted hover:text-ink'}`}>
          {option === 'en' ? 'EN' : 'עב'}
        </button>
      ))}
    </div>
  );
}
