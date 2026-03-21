"use client";

import { useLayoutEffect, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { siteData } from '@/lib/data';
import { useLanguage } from '@/lib/useLanguage';

export default function DocumentMetaSync() {
  const { tr, language } = useLanguage();
  const pathname = usePathname();
  const trRef = useRef(tr);

  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const applyTitle = () => {
    document.title = trRef.current('site.tabTitle', siteData.head.title);
  };

  useLayoutEffect(() => {
    applyTitle();
    const rafId = window.requestAnimationFrame(() => {
      applyTitle();
    });
    return () => window.cancelAnimationFrame(rafId);
    // language/pathname changes are what should trigger a re-apply.
    // tr itself is intentionally not a dependency (it's not stable).
  }, [language, pathname]);

  return null;
}