"use client";

import { useCallback, useEffect, useState } from 'react';
import { readJsonResponse } from '@/lib/response';

const DEFAULT_STATE = { success: false, data: {} };

export function useSiteSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await readJsonResponse(res).catch(() => DEFAULT_STATE);
      if (data?.success) {
        setSettings(data.data || {});
      } else {
        setSettings({});
        setError(data?.error || data?.message || 'Unable to load site settings.');
      }
    } catch (err) {
      setSettings({});
      setError(err?.message || 'Unable to load site settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { settings: settings || {}, loading, error, refresh };
}
