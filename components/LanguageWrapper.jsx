"use client";

import { LanguageProvider } from '@/lib/useLanguage';

export default function RootLayoutClient({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
