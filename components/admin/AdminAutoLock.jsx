"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminAutoLock({ children }) {
  const { tr } = useLanguage();
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');

  const lastActiveRef = useRef(Date.now());
  const timerRef = useRef(null);

  const checkIdleTime = useCallback(() => {
    if (isLocked) return;
    try {
      const savedPref = localStorage.getItem('stvs_idle_timeout') || 'never';
      if (savedPref === 'never') return;
      const timeoutMinutes = parseInt(savedPref, 10);
      if (isNaN(timeoutMinutes)) return;
      const idleTimeMs = Date.now() - lastActiveRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      if (idleTimeMs >= timeoutMs) {
        setIsLocked(true);
      }
    } catch {}
  }, [isLocked]);

  useEffect(() => {
    timerRef.current = setInterval(checkIdleTime, 10000);
    checkIdleTime();
    return () => clearInterval(timerRef.current);
  }, [checkIdleTime]);

  useEffect(() => {
    const handleActivity = () => {
      if (!isLocked) {
        lastActiveRef.current = Date.now();
      }
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
    };
  }, [isLocked]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsLocked(false);
        setPassword('');
        lastActiveRef.current = Date.now();
      } else {
        setError(data.message || tr('admin.security.autoLock.connectionError', 'Connection error'));
      }
    } catch {
      setError(tr('admin.security.autoLock.connectionError', 'Connection error'));
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <div
        aria-hidden={isLocked}
        inert={isLocked ? "true" : undefined}
        className={`w-full h-full transition-all duration-700 ${isLocked ? 'blur-md scale-[0.99] opacity-40 pointer-events-none' : ''}`}
      >
        {children}
      </div>

      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring' }}
              className="w-full max-w-sm rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                <Lock size={32} />
              </div>

              <h2 className="text-center text-2xl font-bold tracking-tight text-white">
                {tr('admin.security.autoLock.lockedTitle', 'App Locked')}
              </h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-200">
                {tr('admin.security.autoLock.lockedSubtitle', "You have been idle. Enter your master password to resume.")}
              </p>

              <form onSubmit={handleUnlock} className="mt-8 space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder={tr('admin.security.autoLock.passwordPlaceholder', 'Enter password...')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-white/20 px-5 py-3.5 text-white placeholder-slate-300 shadow-inner outline-none ring-1 ring-white/30 focus:bg-white/30 focus:ring-2 focus:ring-white transition-all"
                    autoFocus
                  />
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 pl-2 text-sm font-semibold text-rose-300">
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={unlocking || !password}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-bold text-slate-900 transition-all hover:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                >
                  {unlocking
                    ? <Loader2 size={20} className="animate-spin text-slate-500" />
                    : tr('admin.security.autoLock.unlockButton', 'Unlock')}
                </button>

                <div className="pt-4 text-center">
                  <span className="text-xs text-slate-300">
                    {tr('admin.security.autoLock.orText', 'Or')}{' '}
                    <a href="/admin/login" className="text-white underline hover:text-slate-200 transition-colors">
                      {tr('admin.security.autoLock.returnToLogin', 'return to login')}
                    </a>
                  </span>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
