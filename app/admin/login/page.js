"use client";

import { useEffect, useState } from 'react';
import { Lock, Loader2, ShieldCheck, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminLogin() {
  const { tr } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [autoPasskeyAttempted, setAutoPasskeyAttempted] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    const supported = Boolean(window.PublicKeyCredential);
    setSupportsPasskey(supported);
    return () => media.removeEventListener('change', apply);
  }, []);

  // Auto-trigger fingerprint on page load (app-lock experience)
  useEffect(() => {
    if (!supportsPasskey || autoPasskeyAttempted) return;
    // Small delay so the page renders first
    const timer = setTimeout(() => {
      setAutoPasskeyAttempted(true);
      handleMobileFingerprintLogin({ silent: true });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsPasskey]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = { username, password };
      if (twoFactorMethod === 'authenticator' && otpCode) {
        payload.twoFactorCode = otpCode;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse(res);
      if (res.ok && data.success) {
        if (isMobile && supportsPasskey) {
          // Only offer fingerprint registration if no passkey is registered yet
          try {
            const existingRes = await fetch('/api/admin/security/passkey/list');
            const existingData = await readJsonResponse(existingRes);
            const hasPasskey = existingData.success && existingData.data && existingData.data.length > 0;

            if (!hasPasskey) {
              const wantsFingerprint = window.confirm('Enable fingerprint login on this mobile device?');
              if (wantsFingerprint) {
                try {
                  const optionsRes = await fetch('/api/admin/security/passkey/register/options', { method: 'POST' });
                  const optionsData = await readJsonResponse(optionsRes);
                  if (optionsRes.ok && optionsData.success) {
                    const { startRegistration } = await import('@simplewebauthn/browser');
                    const registrationResponse = await startRegistration({ optionsJSON: optionsData.options });
                    const verifyRes = await fetch('/api/admin/security/passkey/register/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ response: registrationResponse }),
                    });
                    const verifyData = await readJsonResponse(verifyRes);
                    if (!verifyRes.ok || !verifyData.success) {
                      setMessage(verifyData.message || 'Fingerprint setup skipped.');
                    }
                  } else {
                    setMessage(optionsData.message || 'Fingerprint setup skipped.');
                  }
                } catch {
                  setMessage('Fingerprint setup skipped.');
                }
              }
            }
          } catch {
            // Ignore — proceed to dashboard even if passkey check fails
          }
        }
        window.location.href = '/admin';
        return;
      }

      if (res.status === 202 && data.requiresTwoFactor) {
        setTwoFactorMethod(data.method);
        setChallengeId(data.challengeId || '');
        setMessage(data.message || 'Two-factor verification required.');
        return;
      }

      setError(data.message || tr('admin.login.invalidCredentials', 'Invalid credentials'));
    } catch {
      setError(tr('admin.common.networkError', 'Network error. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: otpCode }),
      });
      const data = await readJsonResponse(res);
      if (res.ok && data.success) {
        window.location.href = '/admin';
        return;
      }
      setError(data.message || 'Invalid verification code.');
    } catch {
      setError(tr('admin.common.networkError', 'Network error. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMobileFingerprintLogin = async ({ silent = false } = {}) => {
    setPasskeyLoading(true);
    if (!silent) {
      setError('');
      setMessage('');
    }

    try {
      const optionsRes = await fetch('/api/admin/login/passkey/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const optionsData = await readJsonResponse(optionsRes);
      if (!optionsRes.ok || !optionsData.success) {
        if (!silent) setError(optionsData.message || 'Fingerprint login is not available.');
        return;
      }

      const { startAuthentication } = await import('@simplewebauthn/browser');
      const authResponse = await startAuthentication({ optionsJSON: optionsData.options });
      const verifyRes = await fetch('/api/admin/login/passkey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          response: authResponse,
          expectedChallenge: optionsData.expectedChallenge 
        }),
      });
      const verifyData = await readJsonResponse(verifyRes);
      if (!verifyRes.ok || !verifyData.success) {
        if (!silent) setError(verifyData.message || 'Fingerprint verification failed.');
        return;
      }

      window.location.href = '/admin';
    } catch (err) {
      // NotAllowedError = user cancelled or no credential — suppress silently on auto-trigger
      const isCancelled = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
      if (!silent || !isCancelled) {
        setError(err?.message || 'Fingerprint authentication cancelled or unavailable.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/20 via-slate-900 to-slate-900 z-0"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          {twoFactorMethod ? <ShieldCheck size={32} /> : <Lock size={32} />}
        </div>

        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">{tr('admin.login.title', 'Admin Login')}</h2>
        <p className="text-center text-slate-500 mb-8 pb-8 border-b border-slate-100">{tr('admin.login.subtitle', 'STVS Charity Trust Portal')}</p>

        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 mb-6 text-center">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 mb-6 text-center">
            {message}
          </div>
        ) : null}

        {!challengeId ? (
          <>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{tr('admin.login.username', 'Username')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{tr('admin.login.password', 'Password')}</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {twoFactorMethod === 'authenticator' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Authenticator Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-4 bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center shadow-lg hover:shadow-primary/30"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : tr('admin.login.secureLogin', 'Secure Login')}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/admin/forgot-password"
                  replace
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Forgot password?
                </Link>
              </div>
            </form>

            {/* Mobile-only fingerprint login that skips password after passkey setup */}
            {isMobile && supportsPasskey ? (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200"></span>
                  <span>OR</span>
                  <span className="h-px flex-1 bg-slate-200"></span>
                </div>
                <button
                  type="button"
                  onClick={handleMobileFingerprintLogin}
                  disabled={passkeyLoading}
                  className="md:hidden w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {passkeyLoading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                  Use Fingerprint Login
                </button>
                <p className="md:hidden mt-2 text-center text-xs text-slate-500">
                  Works on mobile devices with a registered passkey.
                </p>
              </>
            ) : null}
          </>
        ) : (
          <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
            <p className="text-sm text-slate-600">
              Enter the verification code sent via <strong>{twoFactorMethod.toUpperCase()}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center shadow-lg hover:shadow-primary/30"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
