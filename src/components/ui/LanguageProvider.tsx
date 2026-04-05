"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale, TranslationKey } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationKey;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "de",
  setLocale: () => {},
  t: getTranslations("de"),
});

export function useLanguage() {
  return useContext(LanguageContext);
}

const STORAGE_KEY = "away-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "en" || stored === "de") {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      // localStorage not available
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: getTranslations(locale) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
