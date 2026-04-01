"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';

export default function ForgotPasswordClient({ initialEmail = '', initialToken = '' }) {
  const [token, setToken] = useState(String(initialToken || ''));
  const [email, setEmail] = useState(String(initialEmail || ''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isResetMode = Boolean(token);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || '';
    const urlEmail = params.get('email') || '';

    if (urlToken) {
      setToken(urlToken);
    }
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, []);

  const passwordRules = useMemo(
    () => [
      'At least 12 characters',
      'One uppercase letter',
      'One lowercase letter',
      'One number',
      'One symbol',
    ],
    []
  );

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to request password reset.');
        return;
      }
      setMessage(data.message || 'If the account is eligible, a password reset link has been sent.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        const policyErrors = Array.isArray(data.errors) ? data.errors.filter(Boolean) : [];
        if (policyErrors.length > 0) {
          setError(policyErrors.join(' '));
        } else {
          setError(data.message || 'Failed to reset password.');
        }
        return;
      }
      setMessage(data.message || 'Password reset successful. Please login again.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/20 via-slate-900 to-slate-900 z-0"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>

        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">
          {isResetMode ? 'Reset Password' : 'Forgot Password'}
        </h2>
        <p className="text-center text-slate-500 mb-8 pb-8 border-b border-slate-100">Admin account recovery</p>

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

        {isResetMode ? (
          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="mb-2 font-semibold">Strong password requirements:</p>
              <ul className="list-disc pl-5">
                {passwordRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center shadow-lg hover:shadow-primary/30"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
            </button>

            <div className="pt-2 text-center">
              <Link href="/admin/login" replace className="text-sm font-medium text-slate-500 hover:text-slate-700">
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={requestReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Admin Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-primary text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center shadow-lg hover:shadow-primary/30"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <div className="pt-2 text-center">
              <Link href="/admin/login" replace className="text-sm font-medium text-slate-500 hover:text-slate-700">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
