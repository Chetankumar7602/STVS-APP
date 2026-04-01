"use client";

import { useMemo, useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';

export default function AdminChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const requestChallenge = async () => {
    setChallengeLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/security/password/challenge', { method: 'POST' });
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to request 2FA challenge.');
        return;
      }
      setMethod(data.method || '');
      setChallengeId(data.challengeId || '');
      setMessage(data.message || '2FA challenge ready.');
    } catch {
      setError('Failed to request 2FA challenge.');
    } finally {
      setChallengeLoading(false);
    }
  };

  const submitChange = async (event) => {
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

      const res = await fetch('/api/admin/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          twoFactorCode,
          challengeId,
        }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update password.');
        return;
      }

      setMessage(data.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTwoFactorCode('');
      setChallengeId('');
    } catch {
      setError('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Change Password</h1>
        <p className="mt-1 text-slate-500">Password update requires your current password and a 2FA verification code.</p>
      </div>

      <div className="max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
        ) : null}

        <form onSubmit={submitChange} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
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

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Step 2: Verify with 2FA</p>
              <button
                type="button"
                onClick={requestChallenge}
                disabled={challengeLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {challengeLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                Request Code
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {method
                ? `2FA method: ${method.toUpperCase()}`
                : 'Request a 2FA challenge first (or use authenticator code if configured).'}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 2FA code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
