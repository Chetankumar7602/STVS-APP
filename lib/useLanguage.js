import { createContext, useContext, useState, useEffect } from 'react';
import en from '@/lib/locales/en.json';
import kn from '@/lib/locales/kn.json';
import hi from '@/lib/locales/hi.json';

const LanguageContext = createContext();

const translations = {
  en,
  kn,
  hi,
};

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) {
    return override;
  }

  const result = { ...base };
  Object.keys(override || {}).forEach((key) => {
    if (isObject(base[key]) && isObject(override[key])) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  });
  return result;
}

function getNestedValue(obj, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

const resolvedTranslations = {
  en,
  kn: deepMerge(en, kn),
  hi: deepMerge(en, hi),
};

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Load language from localStorage on client side
    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('preferred_lang') : null;
    if (savedLanguage) {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
    setIsMounted(true);
  }, []);

  const changeLanguage = (lang) => {
    if (resolvedTranslations[lang]) {
      setLanguage(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred_lang', lang);
        document.documentElement.lang = lang;
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, translations, languages, isMounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  const { language } = context;
  const localeTree = resolvedTranslations[language] || en;

  const tr = (keyPath, fallback = '') => {
    const localValue = getNestedValue(localeTree, keyPath);
    if (localValue !== undefined && localValue !== null && localValue !== '') {
      return localValue;
    }

    const englishValue = getNestedValue(en, keyPath);
    if (englishValue !== undefined && englishValue !== null && englishValue !== '') {
      return englishValue;
    }

    return fallback || keyPath;
  };

  return {
    ...context,
    t: localeTree,
    tr,
    language,
    translations: resolvedTranslations,
  };
}
