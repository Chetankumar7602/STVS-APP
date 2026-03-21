"use client";

import { LanguageProvider } from '@/lib/useLanguage';
import DocumentMetaSync from '@/components/DocumentMetaSync';

export default function RootLayoutClient({ children }) {
  return (
    <LanguageProvider>
      <DocumentMetaSync />
      {children}
    </LanguageProvider>
  );
}
