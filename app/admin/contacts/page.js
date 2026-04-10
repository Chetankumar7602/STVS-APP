"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import PaginationControls from '@/components/admin/PaginationControls';
import { useLanguage } from '@/lib/useLanguage';

const PAGE_SIZE = 10;

export default function ContactsTable() {
  const { tr } = useLanguage();
  const trRef = useRef(tr);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: PAGE_SIZE });
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);

  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const fetchContacts = useCallback(async (targetPage, searchValue, sortValue) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PAGE_SIZE),
        sort: sortValue,
      });
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }

      const res = await fetch(`/api/admin/contacts?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (data.success) {
        setContacts(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || trRef.current('admin.contacts.failedToLoad', 'Unable to load messages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchContacts(page, search, sort);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [page, search, sort, fetchContacts]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [search, sort]);

  const handleExport = async () => {
    const params = new URLSearchParams({ format: 'csv', sort });
    if (search.trim()) {
      params.set('search', search.trim());
    }

    const res = await fetch(`/api/admin/contacts?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'messages.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const toggleSelection = (contactId) => {
    setSelectedIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = contacts.map((item) => item._id);
    if (visibleIds.length === 0) {
      return;
    }

    setSelectedIds((current) =>
      visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleExportSelected = async () => {
    try {
      setActionMessage('');
      if (selectedIds.length === 0) {
        setActionMessage(tr('admin.contacts.selectAtLeastOne', 'Select at least one message.'));
        return;
      }

      setBulkExporting(true);
      const res = await fetch('/api/admin/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!res.ok) {
        const data = await readJsonResponse(res);
        throw new Error(data.error || data.message || tr('admin.contacts.exportSelectedFailed', 'Failed to export selected messages.'));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'messages_selected.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActionMessage(tr('admin.contacts.exportSelectedSuccess', 'Selected messages exported successfully.'));
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.contacts.exportSelectedFailed', 'Failed to export selected messages.'));
    } finally {
      setBulkExporting(false);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      setActionMessage('');
      if (selectedIds.length === 0) {
        setActionMessage(tr('admin.contacts.selectAtLeastOneDelete', 'Select at least one message to delete.'));
        return;
      }

      setDeleteSelectedModalOpen(true);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.contacts.deleteSelectedFailed', 'Failed to delete selected messages.'));
    }
  };

  const confirmDeleteSelected = async () => {
    try {
      setActionMessage('');
      if (selectedIds.length === 0) {
        setDeleteSelectedModalOpen(false);
        return;
      }
      setBulkDeleting(true);
      const res = await fetch('/api/admin/contacts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.contacts.deleteSelectedFailed', 'Failed to delete selected messages.'));
      }

      setActionMessage(tr('admin.contacts.deleteSelectedSuccess', 'Selected messages deleted successfully.'));
      setSelectedIds([]);
      setDeleteSelectedModalOpen(false);
      await fetchContacts(page, search, sort);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.contacts.deleteSelectedFailed', 'Failed to delete selected messages.'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteOne = async (contactId) => {
    try {
      setActionMessage('');
      setDeletingId(contactId);
      const res = await fetch('/api/admin/contacts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [contactId] }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.contacts.deleteOneFailed', 'Failed to delete message.'));
      }

      setActionMessage(tr('admin.contacts.deleteOneSuccess', 'Message deleted successfully.'));
      setSelectedIds((current) => current.filter((id) => id !== contactId));
      await fetchContacts(page, search, sort);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.contacts.deleteOneFailed', 'Failed to delete message.'));
    } finally {
      setDeletingId('');
    }
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTargetId) return;
    const target = deleteTargetId;
    setDeleteTargetId('');
    await handleDeleteOne(target);
  };

  const allVisibleSelected = contacts.length > 0 && contacts.every((item) => selectedIds.includes(item._id));

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tr('admin.contacts.title', 'Messages')}</h1>
          <p className="text-slate-500 mt-1">{tr('admin.contacts.subtitle', 'Inquiries and messages from the public.')}</p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end">
          {selectedIds.length > 0 ? (
            <>
              <button
                onClick={handleExportSelected}
                disabled={bulkExporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-medium text-emerald-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {bulkExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {tr('admin.contacts.exportSelected', 'Export Selected')}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 font-medium text-red-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {bulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {tr('admin.contacts.deleteSelected', 'Delete Selected')}
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-700 shadow-sm transition-colors cursor-pointer"
              >
                {tr('admin.contacts.clearSelection', 'Clear Selection')}
              </button>
            </>
          ) : null}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-700 shadow-sm transition-colors cursor-pointer"
          >
            <Download size={18} />
            {tr('admin.common.exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {actionMessage ? (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${/success/i.test(actionMessage) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {actionMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={tr('admin.contacts.searchPlaceholder', 'Search by name, email, or phone...')}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white rounded-lg border border-slate-200 text-sm font-medium text-slate-500 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="latest">{tr('admin.common.latestFirst', 'Latest First')}</option>
              <option value="oldest">{tr('admin.common.oldestFirst', 'Oldest First')}</option>
              <option value="name_az">{tr('admin.contacts.sortSenderAz', 'Sender: A to Z')}</option>
              <option value="name_za">{tr('admin.contacts.sortSenderZa', 'Sender: Z to A')}</option>
              <option value="contact_az">{tr('admin.contacts.sortContactAz', 'Contact: A to Z')}</option>
              <option value="contact_za">{tr('admin.contacts.sortContactZa', 'Contact: Z to A')}</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <table className="w-full text-left border-collapse animate-pulse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                 <th className="p-4 w-14"><div className="h-4 bg-slate-200/60 rounded" /></th>
                 <th className="p-4 px-6 w-32"><div className="h-4 bg-slate-200/60 rounded" /></th>
                 <th className="p-4 w-48"><div className="h-4 bg-slate-200/60 rounded" /></th>
                 <th className="p-4 w-64"><div className="h-4 bg-slate-200/60 rounded" /></th>
                 <th className="p-4"><div className="h-4 bg-slate-200/60 rounded" /></th>
                 <th className="p-4 w-20"><div className="h-4 bg-slate-200/60 rounded" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="p-4 px-6"><div className="h-4 bg-slate-200/60 rounded w-full" /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">{tr('admin.contacts.noMessages', 'No messages found.')}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold w-14 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label={tr('admin.common.selectAll', 'Select all')}
                    />
                  </th>
                  <th className="p-4 font-semibold px-6 w-32">{tr('admin.common.date', 'Date')}</th>
                  <th className="p-4 font-semibold w-48">{tr('admin.contacts.sender', 'Sender')}</th>
                  <th className="p-4 font-semibold w-64">{tr('admin.contacts.contactInfo', 'Contact Info')}</th>
                  <th className="p-4 font-semibold">{tr('admin.contacts.message', 'Message')}</th>
                  <th className="p-4 font-semibold w-20 text-center">{tr('admin.common.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {error ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-red-600 text-sm">{error}</td>
                  </tr>
                ) : null}
                {contacts.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => toggleSelection(item._id)}
                        aria-label={tr('admin.common.select', 'Select')}
                      />
                    </td>
                    <td className="p-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                    </td>
                    <td className="p-4 text-primary text-sm font-medium cursor-pointer">
                      {item.contact}
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      <div className="line-clamp-2" title={item.message}>{item.message}</div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(item._id)}
                        disabled={deletingId === item._id}
                        className="p-2 inline-flex bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60 cursor-pointer"
                        title={tr('admin.common.delete', 'Delete')}
                      >
                        {deletingId === item._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && pagination.total > 0 && (
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {deleteTargetId ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.common.delete', 'Delete')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {tr('admin.contacts.confirmDeleteOne', 'Delete this message? This cannot be undone.')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId('')}
                disabled={deletingId === deleteTargetId}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteTarget}
                disabled={deletingId === deleteTargetId}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {deletingId === deleteTargetId ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteSelectedModalOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.common.delete', 'Delete')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {tr('admin.contacts.confirmDeleteSelected', 'Delete selected messages? This cannot be undone.')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteSelectedModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteSelected}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {bulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
