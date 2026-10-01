import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { STR } from './lib/i18n.js';
import { getUser, saveUser } from './lib/store.js';

const ThemeCtx = createContext('light');
const LangCtx = createContext({ lang: 'EN', t: (k) => k, setLang: () => {} });

function initialTheme() {
  try {
    const s = localStorage.getItem('mrcv.theme');
    if (s === 'dark' || s === 'light') return s;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch (e) { /* ignore */ }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    try { localStorage.setItem('mrcv.theme', theme); } catch (e) { /* ignore */ }
  }, [theme]);
  const toggle = useCallback(() => setThemeState((m) => (m === 'dark' ? 'light' : 'dark')), []);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return (getUser().lang || 'EN').toUpperCase() === 'SW' ? 'sw' : 'en'; }
    catch (e) { return 'en'; }
  });
  const t = useCallback((key) => (STR[lang] && STR[lang][key]) || STR.en[key] || key, [lang]);
  const setLang = useCallback((code) => {
    const L = String(code).toUpperCase() === 'SW' ? 'sw' : 'en';
    try { saveUser({ ...getUser(), lang: code }); } catch (e) { /* ignore */ }
    setLangState(L);
  }, []);
  return <LangCtx.Provider value={{ lang, t, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
