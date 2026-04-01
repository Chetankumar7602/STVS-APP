"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
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

const LANGUAGE_STORAGE_KEY = 'preferred_lang';
const LANGUAGE_EVENT = 'preferred_lang_change';

function normalizeLanguageCode(code) {
  const candidate = String(code || '').trim();
  return resolvedTranslations[candidate] ? candidate : 'en';
}

function subscribeToLanguage(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(LANGUAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function getLanguageSnapshot() {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return normalizeLanguageCode(saved);
}

function getLanguageServerSnapshot() {
  return 'en';
}

export function LanguageProvider({ children }) {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getLanguageServerSnapshot);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const changeLanguage = (lang) => {
    const normalized = normalizeLanguageCode(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      window.dispatchEvent(new Event(LANGUAGE_EVENT));
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, translations, languages }}>
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
