"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type Language = "en" | "fa";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: string | null;
  refreshCurrency: () => Promise<void>;
  t: (en: string, fa?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);


export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathLocale = pathname?.match(/^\/(fa|en)(?=\/|$)/)?.[1] as Language | undefined;
  const [language, setLanguageState] = useState<Language>(pathLocale || "fa");
  const [currency, setCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load currency from API
  const loadCurrency = async () => {
    try {
      const response = await fetch("/api/site-settings");
      if (response.ok) {
        const data = await response.json();
        setCurrency(data.settings?.currency || "toman");
      } else {
        setCurrency("toman"); // Default fallback to toman
      }
    } catch (error) {
      console.error("Error loading currency:", error);
      setCurrency("toman"); // Default fallback to toman
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrency();
  }, []);

  useEffect(() => {
    if (pathLocale) {
      setLanguageState(pathLocale);
      localStorage.setItem("language", pathLocale);
      return;
    }
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang) {
      setLanguageState(savedLang);
    }
  }, [pathLocale]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);

    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const pathWithoutLocale = currentPath.replace(/^\/(fa|en)(?=\/|$)/, "") || "/";
      router.push(`/${lang}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`);
    }

    const html = document.documentElement;
    if (lang === "fa") {
      html.setAttribute("dir", "rtl");
      html.setAttribute("lang", "fa");
    } else {
      html.setAttribute("dir", "ltr");
      html.setAttribute("lang", "en");
    }
  };

  const t = (en: string, fa?: string) => {
    return language === "fa" && fa ? fa : en;
  };

  useEffect(() => {
    const html = document.documentElement;
    if (language === "fa") {
      html.setAttribute("dir", "rtl");
      html.setAttribute("lang", "fa");
    } else {
      html.setAttribute("dir", "ltr");
      html.setAttribute("lang", "en");
    }
  }, [language]);

  const refreshCurrency = async () => {
    await loadCurrency();
  };

  if (loading) {
    return <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
      Loading...
    </div>;
  }
  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, refreshCurrency, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

