"use client";

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, Trash2, ShieldCheck, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';

export default function SecuritySettingsPage() {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  useEffect(() => {
    setSupportsPasskey(Boolean(window.PublicKeyCredential));
  }, []);

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/passkey/list');
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await readJsonResponse(res);
      if (data.success) setPasskeys(data.data || []);
    } catch {
      setError('Failed to load passkeys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPasskeys(); }, [fetchPasskeys]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/security/passkey/${id}`, { method: 'DELETE' });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to remove passkey.');
      setMessage('Fingerprint passkey removed successfully.');
      setConfirmDeleteId('');
      await fetchPasskeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    setError('');
    setMessage('');
    try {
      const optionsRes = await fetch('/api/admin/security/passkey/register/options', { method: 'POST' });
      const optionsData = await readJsonResponse(optionsRes);
      if (!optionsRes.ok || !optionsData.success) throw new Error(optionsData.message || 'Could not start fingerprint registration.');

      const { startRegistration } = await import('@simplewebauthn/browser');
      const registrationResponse = await startRegistration({ optionsJSON: optionsData.options });

      const verifyRes = await fetch('/api/admin/security/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const verifyData = await readJsonResponse(verifyRes);
      if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || 'Fingerprint registration failed.');

      setMessage('Fingerprint registered successfully! You can now use it to log in.');
      await fetchPasskeys();
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('Fingerprint registration was cancelled or timed out.');
      } else {
        setError(err.message || 'Fingerprint registration failed.');
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck size={30} className="text-primary" />
            Security Settings
          </h1>
          <p className="text-slate-500 mt-1">Manage your fingerprint passkeys and account security.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {/* Fingerprint Passkeys Card */}
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Fingerprint size={20} className="text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">Fingerprint Passkeys</h2>
            </div>
            {supportsPasskey && (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-60"
              >
                {registering ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {registering ? 'Registering...' : 'Add Fingerprint'}
              </button>
            )}
          </div>

          <div className="px-6 py-4">
            {!supportsPasskey && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your browser does not support fingerprint / passkey authentication.
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : passkeys.length === 0 ? (
              <div className="py-8 text-center">
                <Fingerprint size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No fingerprint passkeys registered yet.</p>
                <p className="mt-1 text-xs text-slate-400">Click "Add Fingerprint" to register your device's biometric.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Fingerprint size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{passkey.label}</p>
                        <p className="text-xs text-slate-500">
                          {passkey.lastUsedAt
                            ? `Last used: ${new Date(passkey.lastUsedAt).toLocaleString('en-IN')}`
                            : `Registered: ${new Date(passkey.createdAt).toLocaleString('en-IN')}`}
                        </p>
                      </div>
                    </div>

                    {confirmDeleteId === passkey.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Remove?</span>
                        <button
                          onClick={() => handleDelete(passkey.id)}
                          disabled={deletingId === passkey.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1"
                        >
                          {deletingId === passkey.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          Yes, Remove
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId('')}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(passkey.id)}
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        title="Remove passkey"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {passkeys.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
              <button
                onClick={fetchPasskeys}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Re-register hint box */}
        <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-sky-600" />
            <div>
              <p className="font-semibold">Fingerprint not working after deployment?</p>
              <p className="mt-1 text-sky-700">
                Delete all existing passkeys above, then click <strong>"Add Fingerprint"</strong> to register fresh on this device. Each domain (production, local) needs its own registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
