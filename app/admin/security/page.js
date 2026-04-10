"use client";

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, Trash2, ShieldCheck, Plus, Lock, LogOut, AlertTriangle } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

function getDeviceIcon(userAgent) {
  if (!userAgent) return <LogOut size={20} />;
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function parseDeviceName(userAgent) {
  if (!userAgent) return 'Unknown Device';
  const ua = userAgent.toLowerCase();
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (ua.includes('mac')) os = 'Mac';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';

  return `${os} · ${browser}`;
}

export default function SecuritySettingsPage() {
  const { tr } = useLanguage();
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  // SESSIONS
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeLoadingId, setRevokeLoadingId] = useState('');
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

  // AUTO LOCK
  const [idleTimeout, setIdleTimeout] = useState('never');

  useEffect(() => {
    setSupportsPasskey(Boolean(window.PublicKeyCredential));
    const saved = localStorage.getItem('stvs_idle_timeout') || 'never';
    setIdleTimeout(saved);
  }, []);

  const handleTimeoutChange = (val) => {
    setIdleTimeout(val);
    localStorage.setItem('stvs_idle_timeout', val);
    const label = val === 'never' ? tr('admin.security.autoLock.never', 'Never')
      : val === '5' ? tr('admin.security.autoLock.fiveMin', '5 Minutes')
      : val === '15' ? tr('admin.security.autoLock.fifteenMin', '15 Minutes')
      : tr('admin.security.autoLock.thirtyMin', '30 Minutes');
    setMessage(`Idle timeout updated to ${label}.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/passkey/list');
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await readJsonResponse(res);
      if (data.success) setPasskeys(data.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/admin/sessions');
      const data = await readJsonResponse(res);
      if (data.success) setSessions(data.data || []);
    } catch {
      // fail silently
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
    fetchSessions();
  }, [fetchPasskeys, fetchSessions]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/security/passkey/${id}`, { method: 'DELETE' });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || tr('admin.security.passkeys.removeButton', 'Remove'));
      setMessage(tr('admin.security.passkeys.removed', 'Fingerprint passkey removed successfully.'));
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
      if (!optionsRes.ok || !optionsData.success) throw new Error(optionsData.message || tr('admin.security.passkeys.registrationError', 'Could not start fingerprint registration.'));

      const { startRegistration } = await import('@simplewebauthn/browser');
      const registrationResponse = await startRegistration({ optionsJSON: optionsData.options });

      const verifyRes = await fetch('/api/admin/security/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const verifyData = await readJsonResponse(verifyRes);
      if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || tr('admin.security.passkeys.registerFailed', 'Fingerprint registration failed.'));

      setMessage(tr('admin.security.passkeys.registered', 'Fingerprint registered successfully! You can now use it to log in.'));
      await fetchPasskeys();
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError(tr('admin.security.passkeys.registerCancelled', 'Fingerprint registration was cancelled or timed out.'));
      } else {
        setError(err.message || tr('admin.security.passkeys.registerFailed', 'Fingerprint registration failed.'));
      }
    } finally {
      setRegistering(false);
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      setRevokeLoadingId(sessionId);
      const res = await fetch(`/api/admin/sessions/${sessionId}/revoke`, { method: 'POST' });
      const data = await readJsonResponse(res);
      if (res.ok && data.success) {
        await fetchSessions();
        setMessage(tr('admin.security.devices.revokeSuccess', 'Device revoked successfully.'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message || tr('admin.security.devices.revokeFailed', 'Failed to revoke device.'));
      }
    } catch {
      setError(tr('admin.security.devices.revokeFailed', 'Failed to revoke device.'));
    } finally {
      setRevokeLoadingId('');
    }
  };

  const revokeAllOtherSessions = async () => {
    setShowRevokeAllModal(false);
    try {
      setRevokeAllLoading(true);
      const res = await fetch('/api/admin/sessions', { method: 'DELETE' });
      const data = await readJsonResponse(res);
      if (res.ok && data.success) {
        await fetchSessions();
        setMessage(tr('admin.security.devices.revokeAllSuccess', 'Signed out of all other devices.'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message || tr('admin.security.devices.revokeAllFailed', 'Failed to revoke sessions.'));
      }
    } catch {
      setError(tr('admin.security.devices.revokeAllFailed', 'Failed to revoke sessions.'));
    } finally {
      setRevokeAllLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck size={30} className="text-primary" />
            {tr('admin.security.title', 'Security Settings')}
          </h1>
          <p className="text-slate-500 mt-1">{tr('admin.security.subtitle', 'Manage your fingerprint passkeys and account security.')}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Fingerprint Passkeys Card */}
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Fingerprint size={20} className="text-slate-600" />
                <h2 className="text-lg font-bold text-slate-800">{tr('admin.security.passkeys.title', 'Fingerprint Passkeys')}</h2>
              </div>
            </div>

            <div className="px-6 py-4 flex-1">
              {!supportsPasskey && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                  {tr('admin.security.passkeys.noBrowserSupport', 'Your browser does not support passkey authentication.')}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                </div>
              ) : passkeys.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Fingerprint size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500 px-4">{tr('admin.security.passkeys.noPasskeys', 'No fingerprint passkeys registered yet.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {passkeys.map((passkey) => (
                    <div key={passkey.id} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Fingerprint size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{passkey.label}</p>
                          <p className="text-xs text-slate-500">
                            {passkey.lastUsedAt
                              ? `${tr('admin.security.passkeys.lastUsed', 'Last used:')} ${new Date(passkey.lastUsedAt).toLocaleDateString()}`
                              : `${tr('admin.security.passkeys.addedOn', 'Added:')} ${new Date(passkey.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-slate-200 pt-3 mt-3">
                        {confirmDeleteId === passkey.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{tr('admin.security.passkeys.confirmRemove', 'Remove?')}</span>
                            <button
                              onClick={() => handleDelete(passkey.id)}
                              disabled={deletingId === passkey.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1"
                            >
                              {deletingId === passkey.id ? <Loader2 size={12} className="animate-spin" /> : null}
                              {tr('admin.security.passkeys.yes', 'Yes')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId('')}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              {tr('admin.common.cancel', 'Cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(passkey.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <Trash2 size={14} /> {tr('admin.security.passkeys.removeButton', 'Remove')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {supportsPasskey && (
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-primary/95 transition-all disabled:opacity-60"
                >
                  {registering ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {registering
                    ? tr('admin.security.passkeys.adding', 'Registering...')
                    : tr('admin.security.passkeys.addButton', 'Add Fingerprint')}
                </button>
              </div>
            )}
          </div>

          {/* Auto Lock & Timeout Card */}
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <Lock size={20} className="text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">{tr('admin.security.autoLock.title', 'Auto-Lock')}</h2>
            </div>
            <div className="px-6 py-6 flex-1 flex flex-col justify-center">
              <p className="text-sm text-slate-500 mb-6">
                {tr('admin.security.autoLock.description', 'Protect your dashboard when you step away. If you are idle for this amount of time, the screen will lock automatically.')}
              </p>

              <div className="space-y-4">
                {[
                  { value: 'never', label: tr('admin.security.autoLock.never', 'Never') },
                  { value: '5', label: tr('admin.security.autoLock.fiveMin', '5 Minutes') },
                  { value: '15', label: tr('admin.security.autoLock.fifteenMin', '15 Minutes') },
                  { value: '30', label: tr('admin.security.autoLock.thirtyMin', '30 Minutes') },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="font-semibold text-slate-700">{label}</span>
                    <input
                      type="radio"
                      name="timeout"
                      value={value}
                      checked={idleTimeout === value}
                      onChange={() => handleTimeoutChange(value)}
                      className="w-5 h-5 accent-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Devices Card */}
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{tr('admin.security.devices.title', 'Your Active Devices')}</h2>
              <p className="text-xs text-slate-500 mt-1">{tr('admin.security.devices.subtitle', 'Currently signed-in browsers')}</p>
            </div>
            {sessions.filter(s => !s.revokedAt && !s.isCurrent).length > 0 && (
              <button
                onClick={() => setShowRevokeAllModal(true)}
                disabled={revokeAllLoading}
                className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                {revokeAllLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                {tr('admin.security.devices.signOutAll', 'Sign out all other devices')}
              </button>
            )}
          </div>

          <div className="px-6 py-2 h-80 overflow-y-auto">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-slate-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                {tr('admin.security.devices.noSessions', 'No sessions found.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {[...sessions]
                  .sort((a, b) => {
                    if (a.isCurrent) return -1;
                    if (b.isCurrent) return 1;
                    const aActive = !a.revokedAt;
                    const bActive = !b.revokedAt;
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return 0;
                  })
                  .slice(0, 10)
                  .map(session => {
                    const isRevoked = Boolean(session.revokedAt);
                    return (
                      <div key={session.id} className={`py-4 flex items-center justify-between gap-4 ${isRevoked ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${session.isCurrent ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                            {getDeviceIcon(session.userAgent)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-2">
                              {parseDeviceName(session.userAgent)}
                              {session.isCurrent && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase font-bold text-emerald-700 tracking-wide">
                                  {tr('admin.security.devices.thisDevice', 'This Device')}
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-semibold text-primary mt-0.5">@{session.username}</p>
                            <p className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:gap-4 gap-1">
                              <span>
                                <span className="font-medium text-slate-400">{tr('admin.security.devices.ipLabel', 'IP:')}</span>{' '}
                                {session.ip || tr('admin.security.devices.unknown', 'Unknown')}
                              </span>
                              <span>
                                <span className="font-medium text-slate-400">{tr('admin.security.devices.lastActiveLabel', 'Last active:')}</span>{' '}
                                {session.lastActivityAt ? new Date(session.lastActivityAt).toLocaleString('en-IN') : 'N/A'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {!session.isCurrent && (
                          <div>
                            {isRevoked ? (
                              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                {tr('admin.security.devices.revokedLabel', 'Revoked')}
                              </span>
                            ) : (
                              <button
                                onClick={() => revokeSession(session.id)}
                                disabled={revokeLoadingId === session.id}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                              >
                                {revokeLoadingId === session.id
                                  ? tr('admin.security.devices.revoking', 'Revoking...')
                                  : tr('admin.security.devices.revoke', 'Revoke')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Sign Out All Modal */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">
                  {tr('admin.security.devices.confirmTitle', 'Sign out of all devices?')}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {tr('admin.security.devices.confirmBody', 'This will immediately end all other active sessions. You will remain signed in on this device.')}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRevokeAllModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={revokeAllOtherSessions}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 flex items-center gap-2"
              >
                <LogOut size={16} />
                {tr('admin.security.devices.confirmButton', 'Yes, sign out all')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
