"use client";

import { useEffect, useRef, useState } from 'react';
import { IndianRupee, MessageSquare, HandHeart, ArrowUpRight, Download, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminDashboard() {
  const { tr } = useLanguage();
  const trRef = useRef(tr);

  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveMode, setArchiveMode] = useState('export'); // 'export' | 'exportClear'
  const [sessions, setSessions] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeLoadingId, setRevokeLoadingId] = useState('');
  const [archiveSections, setArchiveSections] = useState({
    donations: true,
    contacts: true,
    volunteers: true,
    gallery: false,
    settings: false,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        const data = await readJsonResponse(res);
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.message || trRef.current('admin.dashboard.failedToLoadStats', 'Failed to load stats'));
        }
      } catch {
        setError(trRef.current('admin.common.networkError', 'Network error. Please try again later.'));
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSecurityData() {
      try {
        if (cancelled) return;

        setSessionsLoading(true);

        const [sessionsRes, eventsRes] = await Promise.all([
          fetch('/api/admin/sessions?all=1'),
          fetch('/api/admin/security/events?all=1'),
        ]);

        if (sessionsRes.status === 401 || eventsRes.status === 401) {
          window.location.href = '/admin/login';
          return;
        }

        const [sessionsData, eventsData] = await Promise.all([
          readJsonResponse(sessionsRes),
          readJsonResponse(eventsRes),
        ]);

        if (sessionsData.success) {
          setSessions(sessionsData.data || []);
        }
        if (eventsData.success) {
          setSecurityEvents(eventsData.data || []);
        }
      } catch {
        // Optional security panel; fail silently to avoid blocking dashboard.
      } finally {
        setSessionsLoading(false);
      }
    }

    fetchSecurityData();

    return () => {
      cancelled = true;
    };
  }, []);

  const revokeSession = async (sessionId) => {
    try {
      setRevokeLoadingId(sessionId);
      const res = await fetch(`/api/admin/sessions/${sessionId}/revoke`, { method: 'POST' });
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        setExportMsg(data.message || 'Failed to revoke session.');
        return;
      }

      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? { ...session, revokedAt: new Date().toISOString() }
            : session
        )
      );
      setExportMsg('Session revoked successfully.');
    } catch {
      setExportMsg('Failed to revoke session.');
    } finally {
      setRevokeLoadingId('');
    }
  };

  const downloadExport = async (sections) => {
    setExporting(true);
    setExportMsg('');
    setShowArchiveDialog(false);
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) {
        setExportMsg(tr('admin.dashboard.exportFailed', 'Export failed. Please try again.'));
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STVS_Archive_${new Date().toISOString().slice(0, 7)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportMsg(tr('admin.dashboard.exportSuccess', 'Excel file downloaded successfully.'));
    } catch {
      setExportMsg(tr('admin.dashboard.exportFailed', 'Export failed. Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  const exportAndClear = async (sections) => {
    setClearing(true);
    setExportMsg('');
    setShowArchiveDialog(false);
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) {
        setExportMsg(tr('admin.dashboard.exportFailedDbNotCleared', 'Export failed. DB not cleared.'));
        setClearing(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STVS_Archive_${new Date().toISOString().slice(0, 7)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const clearRes = await fetch('/api/admin/clear-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const clearData = await readJsonResponse(clearRes);
      if (clearData.success) {
        setExportMsg(tr('admin.dashboard.exportedAndCleared', 'Exported and DB cleared. Reloading stats...'));
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setExportMsg(`${tr('admin.dashboard.exportedButClearFailed', 'Excel downloaded but DB clear failed')}: ${clearData.message}`);
      }
    } catch {
      setExportMsg(tr('admin.dashboard.operationFailed', 'Operation failed.'));
    } finally {
      setClearing(false);
    }
  };

  const openArchiveDialog = (mode) => {
    setArchiveMode(mode);
    setShowArchiveDialog(true);
  };

  const selectedSectionCount = Object.values(archiveSections).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-600">
          <h3 className="mb-2 text-lg font-bold">{tr('admin.dashboard.errorLoading', 'Error Loading Dashboard')}</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-200"
          >
            {tr('admin.common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  const totalDonationsDisplay = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(stats.totalDonationAmount || 0));

  const statCards = [
    {
      title: tr('admin.dashboard.totalDonations', 'Total Donations'),
      value: totalDonationsDisplay,
      subtitle: `${stats.totalDonationsCount || 0} ${tr('admin.dashboard.totalContributions', 'total contributions')}`,
      icon: <IndianRupee size={24} />,
      color: 'bg-emerald-100 text-emerald-600',
      link: '/admin/donations',
    },
    {
      title: tr('admin.dashboard.volunteers', 'Volunteers'),
      value: stats.totalVolunteersCount || 0,
      subtitle: tr('admin.dashboard.registeredMembers', 'Registered community members'),
      icon: <HandHeart size={24} />,
      color: 'bg-blue-100 text-blue-600',
      link: '/admin/volunteers',
    },
    {
      title: tr('admin.dashboard.messages', 'Messages'),
      value: stats.totalContactsCount || 0,
      subtitle: tr('admin.dashboard.unreadInquiries', 'Unread inquiries'),
      icon: <MessageSquare size={24} />,
      color: 'bg-purple-100 text-purple-600',
      link: '/admin/contacts',
    },
  ];

  const isSuccessMessage = exportMsg && !/failed|error/i.test(exportMsg);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">{tr('admin.dashboard.overview', 'Overview')}</h1>
        <p className="mt-1 text-slate-500">{tr('admin.dashboard.welcomeBack', 'Welcome back to the STVS administration panel.')}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, i) => (
          <div key={i} className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm group">
            <div className="mb-4 flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.color}`}>{card.icon}</div>
              <Link
                href={card.link}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary"
              >
                <ArrowUpRight size={20} />
              </Link>
            </div>
            <h3 className="mb-1 font-medium text-slate-500">{card.title}</h3>
            <p className="mb-2 text-4xl font-black text-slate-800">{card.value}</p>
            <p className="mt-auto border-t border-slate-50 pt-4 text-sm text-slate-500">{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{tr('admin.dashboard.quickActions', 'Quick Actions')}</h2>
        </div>

        {exportMsg ? (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm font-medium ${
              isSuccessMessage ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {exportMsg}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link
            href="/"
            target="_blank"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 p-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <ArrowUpRight size={18} />
            </div>
            <span className="text-sm font-medium text-slate-700">{tr('admin.dashboard.viewPublicSite', 'View Public Site')}</span>
          </Link>

          <button
            onClick={() => openArchiveDialog('export')}
            disabled={exporting}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </div>
            <span className="text-sm font-medium text-emerald-700">{exporting ? tr('admin.common.downloading', 'Downloading...') : tr('admin.dashboard.exportToExcel', 'Export to Excel')}</span>
          </button>

          <button
            onClick={() => openArchiveDialog('exportClear')}
            disabled={clearing}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-center transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              {clearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </div>
            <span className="text-sm font-medium text-red-700">{clearing ? tr('admin.common.processing', 'Processing...') : tr('admin.dashboard.exportAndClearDb', 'Export & Clear DB')}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 p-4 text-center transition-colors hover:border-slate-200 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-700">{tr('admin.dashboard.printReport', 'Print Report')}</span>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="mb-1 font-semibold">{tr('admin.dashboard.autoArchiveTitle', 'Annual Auto-Archive (Fully Automatic)')}</p>
          <p>
            {tr('admin.dashboard.autoArchiveLine1', 'Set up a FREE cron job at')} <strong>cron-job.org</strong> {tr('admin.dashboard.autoArchiveLine2', 'to hit:')}
            <br />
            <code className="break-all rounded bg-amber-100 px-2 py-0.5 text-xs">GET /api/admin/auto-archive?secret=YOUR_CRON_SECRET</code>
            <br />
            {tr('admin.dashboard.autoArchiveLine3', 'Schedule it for')} <strong>{tr('admin.dashboard.autoArchiveDate', '1st January every year')}</strong> (cron: <code className="rounded bg-amber-100 px-1 text-xs">0 0 1 1 *</code>).
            {tr('admin.dashboard.autoArchiveLine4', 'It will auto-export all data to Excel, email it to you, and clear the DB once a year.')}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Security sign-in records (sessions, login attempts, and activity logs) are retained for 7 days and auto-deleted.
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-4">
            <ShieldAlert size={18} className="text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800">Active Sessions</h3>
          </div>
          <div className="overflow-y-auto px-6 py-3 h-[23.5rem]">
            {sessionsLoading ? (
              <p className="text-sm text-slate-500">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-slate-500">No active sessions found.</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 30).map((session) => (
                  <div key={session.id} className="h-16 rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 truncate">{session.username}</p>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {(session.ip || 'Unknown IP')}   Last active:{' '}
                          {session.lastActivityAt ? new Date(session.lastActivityAt).toLocaleString('en-IN') : 'N/A'}
                        </p>
                      </div>
                      {!session.revokedAt && !session.isCurrent ? (
                        <button
                          onClick={() => revokeSession(session.id)}
                          disabled={revokeLoadingId === session.id}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          {revokeLoadingId === session.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          {session.isCurrent ? 'Current' : 'Revoked'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-4">
            <ShieldAlert size={18} className="text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800">Security Activity</h3>
          </div>
          <div className="overflow-y-auto px-6 py-3 h-[23.5rem]">
            {securityEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No security events yet.</p>
            ) : (
              <div className="space-y-2">
                {securityEvents.slice(0, 30).map((event) => (
                  <div key={event.id} className="h-16 rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700 truncate">{event.type}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{event.severity}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {event.username || 'Unknown user'} - {event.ip || 'Unknown IP'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showArchiveDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800">
              {archiveMode === 'export'
                ? tr('admin.dashboard.confirmExport', 'Confirm Export')
                : tr('admin.dashboard.confirmExportClear', 'Confirm Export & Clear')}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {archiveMode === 'export'
                ? tr('admin.dashboard.confirmExportBody', 'Choose what to export to Excel.')
                : tr('admin.dashboard.confirmExportClearBodySelected', 'This will EXPORT the selected sections to Excel then DELETE them from the database. Continue?')}
            </p>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                {tr('admin.dashboard.selectSections', 'Select sections')}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {[{
                  key: 'donations',
                  label: tr('admin.dashboard.sectionDonations', 'Donations'),
                }, {
                  key: 'contacts',
                  label: tr('admin.dashboard.sectionMessages', 'Messages'),
                }, {
                  key: 'volunteers',
                  label: tr('admin.dashboard.sectionVolunteers', 'Volunteers'),
                }, {
                  key: 'gallery',
                  label: tr('admin.dashboard.sectionGallery', 'Gallery'),
                }, {
                  key: 'settings',
                  label: tr('admin.dashboard.sectionCmsSettings', 'CMS Settings'),
                }].map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 text-sm text-slate-700 hover:bg-white">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(archiveSections[key])}
                      onChange={() =>
                        setArchiveSections((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {selectedSectionCount === 0 ? (
                <p className="mt-3 text-xs font-medium text-red-600">
                  {tr('admin.dashboard.selectAtLeastOne', 'Select at least one section.')}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowArchiveDialog(false)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() =>
                  archiveMode === 'export'
                    ? downloadExport(archiveSections)
                    : exportAndClear(archiveSections)
                }
                disabled={selectedSectionCount === 0 || exporting || clearing}
                className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
                  archiveMode === 'export'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {exporting || clearing
                  ? tr('admin.common.processing', 'Processing...')
                  : archiveMode === 'export'
                    ? tr('admin.common.download', 'Download')
                    : tr('admin.common.yesContinue', 'Yes, Continue')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}









