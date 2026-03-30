"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Download, Mail, Loader2, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import PaginationControls from '@/components/admin/PaginationControls';
import { useLanguage } from '@/lib/useLanguage';

const PAGE_SIZE = 10;

export default function DonationsTable() {
  const { tr } = useLanguage();
  const trRef = useRef(tr);

  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('latest');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: PAGE_SIZE });
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [sendingReceiptId, setSendingReceiptId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [reviewingDonationId, setReviewingDonationId] = useState('');
  const [reviewDraft, setReviewDraft] = useState({ outcome: 'successful', confirmedAmount: '', reason: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState('');
  const [selectingByFilter, setSelectingByFilter] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [editDraft, setEditDraft] = useState({
    name: '',
    phone: '',
    email: '',
    amount: '',
    message: '',
    upiReference: '',
    outcome: 'successful',
    confirmedAmount: '',
    reason: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const buildDonationParams = useCallback((targetPage, searchValue, sortValue, options = {}) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(PAGE_SIZE),
    });

    const statusFilters = ['successful', 'unsuccessful', 'wrong_amount', 'pending'];
    if (statusFilters.includes(sortValue)) {
      params.set('status', sortValue);
      params.set('sort', 'latest');
    } else {
      params.set('sort', sortValue);
    }

    if (searchValue.trim()) {
      params.set('search', searchValue.trim());
    }

    Object.entries(options).forEach(([key, value]) => {
      if (value !== '' && value !== null && typeof value !== 'undefined') {
        params.set(key, String(value));
      }
    });

    return params;
  }, []);

  const fetchDonations = useCallback(async (targetPage, searchValue, sortValue) => {
    try {
      setLoading(true);
      setError('');
      const params = buildDonationParams(targetPage, searchValue, sortValue);

      const res = await fetch(`/api/admin/donations?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (data.success) {
        setDonations(data.data);
        setPagination(data.pagination);
        if (data.pagination?.totalPages > 0 && targetPage > data.pagination.totalPages) {
          setPage(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || trRef.current('admin.donations.failedToLoad', 'Unable to load donations.'));
    } finally {
      setLoading(false);
    }
  }, [buildDonationParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDonations(page, search, sort);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [page, search, sort, fetchDonations]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
    setSelectionMode('');
  }, [search, sort]);

  const handleExport = async () => {
    const params = buildDonationParams(page, search, sort, { format: 'csv' });

    const res = await fetch(`/api/admin/donations?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'donations.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleResendReceipt = async (donationId) => {
    try {
      setActionMessage('');
      setSendingReceiptId(donationId);
      const res = await fetch(`/api/admin/donations/${donationId}/receipt`, {
        method: 'POST',
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.donations.failedResendReceipt', 'Failed to resend receipt.'));
      }

      setActionMessage(tr('admin.donations.receiptSentSuccess', 'Receipt email sent successfully.'));
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.donations.failedResendReceipt', 'Failed to resend receipt.'));
    } finally {
      setSendingReceiptId('');
    }
  };

  const openReview = (item) => {
    setEditingDonation(item);
    setEditDraft({
      name: item.name || '',
      phone: item.phone || '',
      email: item.email || '',
      amount: String(item.amount || ''),
      message: item.message || '',
      upiReference: item.upiReference || '',
      outcome: item.manualReviewStatus && item.manualReviewStatus !== 'pending' ? item.manualReviewStatus : 'successful',
      confirmedAmount: item.confirmedAmount ? String(item.confirmedAmount) : String(item.amount || ''),
      reason: item.manualReviewReason || '',
    });
  };

  const openBulkReview = () => {
    setReviewingDonationId('bulk');
    setReviewDraft({ outcome: 'successful', confirmedAmount: '', reason: '' });
  };

  const closeReview = () => {
    setReviewingDonationId('');
    setEditingDonation(null);
    setReviewDraft({ outcome: 'successful', confirmedAmount: '', reason: '' });
    setEditDraft({
      name: '',
      phone: '',
      email: '',
      amount: '',
      message: '',
      upiReference: '',
      outcome: 'successful',
      confirmedAmount: '',
      reason: '',
    });
  };

  const toggleSelection = (donationId) => {
    setSelectedIds((current) =>
      current.includes(donationId)
        ? current.filter((id) => id !== donationId)
        : [...current, donationId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = donations.map((item) => item._id);
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
    setSelectionMode('');
  };

  const requestSelectionIds = async (method, status = '') => {
    const params = buildDonationParams(page, search, sort, {
      selection: 'ids',
      paymentMethod: method,
      status: status || undefined,
    });

    const res = await fetch(`/api/admin/donations?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return [];
    }

    const data = await readJsonResponse(res);
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || tr('admin.donations.failedSelectDonations', 'Failed to select donations.'));
    }

    return data.data || [];
  };

  const handleSelectQrOnly = async () => {
    try {
      setActionMessage('');
      closeReview();
      setSelectionMode('qr');
      setSelectingByFilter(true);
      const ids = await requestSelectionIds('upi_qr');
      setSelectedIds(ids);
      setActionMessage(ids.length ? `${tr('admin.donations.selected', 'Selected')} ${ids.length} ${tr('admin.donations.qrEntries', 'QR payment entries')} ${tr('admin.donations.successfully', 'successfully')}.` : tr('admin.donations.noQrEntries', 'No QR payment entries found for the current search.'));
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.donations.failedSelectQr', 'Failed to select QR entries.'));
    } finally {
      setSelectingByFilter(false);
    }
  };



  const handleBulkReview = async () => {
    try {
      setActionMessage('');
      if (selectedIds.length === 0) {
        setActionMessage(tr('admin.donations.selectAtLeastOneEdit', 'Select at least one entry to edit.'));
        return;
      }

      const selectedDonations = donations.filter((item) => selectedIds.includes(item._id));
      if (selectedDonations.some((item) => item.paymentMethod !== 'upi_qr')) {
        setActionMessage(tr('admin.donations.bulkOnlyQr', 'Bulk edit is only available for QR payment entries.'));
        return;
      }

      if (reviewDraft.outcome === 'wrong_amount' && (!reviewDraft.confirmedAmount || Number(reviewDraft.confirmedAmount) < 1)) {
        setActionMessage(tr('admin.donations.enterActualAmount', 'Enter the actual paid amount before saving a wrong amount review.'));
        return;
      }

      setBulkUpdating(true);
      const res = await fetch('/api/admin/donations/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          outcome: reviewDraft.outcome,
          confirmedAmount: reviewDraft.outcome === 'wrong_amount' ? reviewDraft.confirmedAmount : '',
          reason: reviewDraft.reason,
        }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.donations.failedUpdateSelected', 'Failed to update selected donations.'));
      }

      setActionMessage(`${tr('admin.donations.updated', 'Updated')} ${data.updatedCount || selectedIds.length} ${tr('admin.donations.selectedDonationEntries', 'selected donation entries')} ${tr('admin.donations.successfully', 'successfully')}.`);
      closeReview();
      await fetchDonations(page, search, sort);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.donations.failedUpdateSelected', 'Failed to update selected donations.'));
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleDelete = async (ids, isBulk = false) => {
    try {
      setActionMessage('');

      if (ids.length === 0) {
        setActionMessage(tr('admin.donations.selectAtLeastOneDelete', 'Select at least one entry to delete.'));
        return;
      }

      if (isBulk) {
        setBulkDeleting(true);
      } else {
        setDeletingId(ids[0]);
      }

      const res = await fetch(isBulk ? '/api/admin/donations/bulk' : `/api/admin/donations/${ids[0]}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: isBulk ? JSON.stringify({ ids }) : undefined,
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.donations.failedDeleteEntry', 'Failed to delete donation entry.'));
      }

      setActionMessage(isBulk ? tr('admin.donations.selectedDeletedSuccess', 'Selected donation entries deleted successfully.') : tr('admin.donations.deletedSuccess', 'Donation entry deleted successfully.'));
      await fetchDonations(page, search, sort);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || tr('admin.donations.failedDeleteEntry', 'Failed to delete donation entry.'));
    } finally {
      if (isBulk) {
        setBulkDeleting(false);
      } else {
        setDeletingId('');
      }
    }
  };

  const requestDelete = (ids, isBulk = false) => {
    const safeIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (safeIds.length === 0) {
      setActionMessage(tr('admin.donations.selectAtLeastOneDelete', 'Select at least one entry to delete.'));
      return;
    }
    setDeleteTarget({ ids: [...safeIds], isBulk: Boolean(isBulk) });
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTarget?.ids?.length) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await handleDelete(target.ids, target.isBulk);
  };

  const getStatusBadgeClass = (item) => {
    if (item.paymentMethod === 'upi_qr' && item.manualReviewStatus === 'wrong_amount') {
      return 'border-sky-200 bg-sky-50 text-sky-700';
    }
    if (item.status === 'successful') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (item.status === 'pending_verification') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (item.status === 'failed') return 'border-red-200 bg-red-50 text-red-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
  };

  const getStatusLabel = (item) => {
    if (item.paymentMethod === 'upi_qr') {
      if (item.status === 'pending_verification') return tr('admin.donations.pendingVerification', 'Pending Verification');
      if (item.manualReviewStatus === 'wrong_amount') return tr('admin.donations.wrongAmountSelected', 'Wrong Amount Selected');
      if (item.manualReviewStatus === 'unsuccessful') return tr('admin.common.unsuccessful', 'Unsuccessful');
    }
    return item.status;
  };

  const getAmountColorClass = (item) => {
    if (item.paymentMethod === 'upi_qr' && item.manualReviewStatus === 'wrong_amount') {
      return 'text-yellow-500';
    }
    if (item.status === 'successful') {
      return 'text-emerald-600';
    }
    if (item.status === 'pending' || item.status === 'pending_verification') {
      return 'text-yellow-500';
    }
    if (item.status === 'failed') {
      return 'text-red-600';
    }
    return 'text-slate-600';
  };

  const allVisibleSelected = donations.length > 0 && donations.every((item) => selectedIds.includes(item._id));
  const selectedDonations = donations.filter((item) => selectedIds.includes(item._id));
  const selectedQrCount = selectedDonations.filter((item) => item.paymentMethod === 'upi_qr').length;
  const canBulkReviewQr = selectedIds.length > 0 && selectedQrCount === selectedIds.length;

  const handleSaveEdit = async () => {
    try {
      setActionMessage('');

      if (!editingDonation) {
        return;
      }

      if (!editDraft.name.trim() || !editDraft.email.trim() || !editDraft.amount || Number(editDraft.amount) < 1) {
        setActionMessage(tr('admin.donations.nameEmailAmountRequired', 'Name, email, and amount are required.'));
        return;
      }

      if (editingDonation.paymentMethod === 'upi_qr' && editDraft.outcome === 'wrong_amount' && (!editDraft.confirmedAmount || Number(editDraft.confirmedAmount) < 1)) {
        setActionMessage(tr('admin.donations.enterActualAmount', 'Enter the actual paid amount before saving a wrong amount review.'));
        return;
      }

      setSavingEdit(true);
      const res = await fetch(`/api/admin/donations/${editingDonation._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          phone: editDraft.phone,
          email: editDraft.email,
          amount: editDraft.amount,
          message: editDraft.message,
          upiReference: editDraft.upiReference,
          outcome: editingDonation.paymentMethod === 'upi_qr' ? editDraft.outcome : undefined,
          confirmedAmount: editingDonation.paymentMethod === 'upi_qr' && editDraft.outcome === 'wrong_amount' ? editDraft.confirmedAmount : '',
          reason: editingDonation.paymentMethod === 'upi_qr' ? editDraft.reason : '',
        }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to update donation.');
      }

      setActionMessage(tr('admin.donations.updated', 'Donation updated successfully.'));
      closeReview();
      await fetchDonations(page, search, sort);
    } catch (err) {
      console.error(err);
      setActionMessage(err.message || 'Failed to update donation.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tr('admin.donations.title', 'Donations')}</h1>
          <p className="mt-1 text-slate-500">{tr('admin.donations.subtitle', 'Manage UPI QR donation records and verify payments.')}</p>
        </div>
        <div className="w-full overflow-x-auto lg:w-auto">
          <div className="flex min-w-max items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
              <button
                onClick={handleSelectQrOnly}
                disabled={selectingByFilter}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 font-medium text-amber-900 transition-colors hover:bg-amber-200 disabled:opacity-60"
              >
                {selectingByFilter && selectionMode === 'qr' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {tr('admin.donations.selectQrOnly', 'Select QR Only')}
              </button>
              {selectionMode === 'qr' && canBulkReviewQr && selectedIds.length > 0 ? (
                <button
                  onClick={openBulkReview}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <CheckCircle2 size={16} />
                  {tr('admin.donations.editSelectedQr', 'Edit Selected QR')}
                </button>
              ) : null}
            </div>



            {selectedIds.length > 0 ? (
              <>
                <button
                  onClick={() => requestDelete(selectedIds, true)}
                  disabled={bulkDeleting}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
                >
                  {bulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {tr('admin.donations.deleteSelected', 'Delete Selected')}
                </button>
                <button
                  onClick={clearSelection}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  {tr('admin.donations.clearSelection', 'Clear Selection')}
                </button>
              </>
            ) : null}
            <button
              onClick={handleExport}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Download size={18} />
              {tr('admin.common.exportCsv', 'Export CSV')}
            </button>
          </div>
        </div>
      </div>

      {actionMessage ? (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${/successfully|sent/i.test(actionMessage) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {actionMessage}
        </div>
      ) : null}

      {reviewingDonationId === 'bulk' ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">{tr('admin.donations.editSelectedQrReviews', 'Edit Selected QR Reviews')}</h2>
              <p className="text-sm text-slate-600">{tr('admin.donations.applySameReview', 'Apply the same review status to')} {selectedIds.length} {tr('admin.donations.selectedEntries', 'selected entries')}.</p>
            </div>
            <button
              onClick={closeReview}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              {tr('admin.common.cancel', 'Cancel')}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={reviewDraft.outcome}
              onChange={(e) => setReviewDraft((current) => ({ ...current, outcome: e.target.value }))}
              className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="successful">{tr('admin.common.successful', 'Successful')}</option>
              <option value="unsuccessful">{tr('admin.common.unsuccessful', 'Unsuccessful')}</option>
              <option value="wrong_amount">{tr('admin.common.wrongAmount', 'Wrong Amount')}</option>
            </select>
            {reviewDraft.outcome === 'wrong_amount' ? (
              <input
                type="number"
                min="1"
                value={reviewDraft.confirmedAmount}
                onChange={(e) => setReviewDraft((current) => ({ ...current, confirmedAmount: e.target.value }))}
                placeholder={tr('admin.donations.actualAmountPaid', 'Actual amount paid')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : <div />}
            <input
              type="text"
              value={reviewDraft.reason}
              onChange={(e) => setReviewDraft((current) => ({ ...current, reason: e.target.value }))}
              placeholder={tr('admin.donations.reasonOptional', 'Reason / note (optional)')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mt-3">
            <button
              onClick={handleBulkReview}
              disabled={bulkUpdating}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 disabled:opacity-60"
            >
              {bulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {tr('admin.donations.saveSelectedReviews', 'Save Selected Reviews')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={tr('admin.donations.searchPlaceholder', 'Search by name or phone...')}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-500 outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="latest">{tr('admin.common.latestFirst', 'Latest First')}</option>
              <option value="oldest">{tr('admin.common.oldestFirst', 'Oldest First')}</option>
              <option value="amount_high">{tr('admin.donations.amountHighToLow', 'Amount: High to Low')}</option>
              <option value="amount_low">{tr('admin.donations.amountLowToHigh', 'Amount: Low to High')}</option>
              <option value="successful">{tr('admin.common.successful', 'Successful')}</option>
              <option value="unsuccessful">{tr('admin.common.unsuccessful', 'Unsuccessful')}</option>
              <option value="wrong_amount">{tr('admin.common.wrongAmount', 'Wrong Amount')}</option>
              <option value="pending">{tr('admin.common.pending', 'Pending')}</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">{tr('admin.common.loadingData', 'Loading data...')}</div>
          ) : donations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">{tr('admin.donations.noDonations', 'No donations found.')}</div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-sm uppercase tracking-wider text-slate-500">
                  <th className="p-4 px-6 font-semibold">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300"
                    />
                  </th>
                  <th className="p-4 px-6 font-semibold">{tr('admin.common.date', 'Date')}</th>
                  <th className="p-4 font-semibold">{tr('admin.donations.donorName', 'Donor Name')}</th>
                  <th className="p-4 font-semibold">{tr('admin.common.status', 'Status')}</th>
                  <th className="p-4 font-semibold">{tr('admin.donations.method', 'Method')}</th>
                  <th className="p-4 font-semibold">{tr('admin.common.phone', 'Phone')}</th>
                  <th className="p-4 font-semibold">{tr('admin.common.email', 'Email')}</th>
                  <th className="p-4 font-semibold text-right">{tr('admin.donations.amountInr', 'Amount (INR)')}</th>
                  <th className="p-4 font-semibold">{tr('admin.donations.reference', 'Reference')}</th>
                  <th className="p-4 px-6 font-semibold">{tr('admin.common.message', 'Message')}</th>
                  <th className="p-4 px-6 font-semibold">{tr('admin.common.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {error ? (
                  <tr>
                    <td colSpan="11" className="p-6 text-center text-sm text-red-600">{error}</td>
                  </tr>
                ) : null}
                {donations.map((item) => (
                  <tr key={item._id} className="transition-colors hover:bg-slate-50/80">
                    <td className="p-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => toggleSelection(item._id)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300"
                      />
                    </td>
                    <td className="whitespace-nowrap p-4 px-6 text-sm text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(item)}`}>
                        {getStatusLabel(item)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'UPI QR'}</td>
                    <td className="p-4 text-sm text-slate-600">{item.phone || '-'}</td>
                    <td className="p-4 text-sm text-slate-600">{item.email || '-'}</td>
                    <td className={`whitespace-nowrap p-4 text-right font-bold ${getAmountColorClass(item)}`}>
                      <div>{item.amount.toLocaleString('en-IN')}</div>
                      {item.paymentMethod === 'upi_qr' && item.manualReviewStatus === 'wrong_amount' && item.confirmedAmount ? (
                        <div className="text-xs font-medium text-emerald-600">
                          {tr('admin.donations.paid', 'Paid')}: {Number(item.confirmedAmount).toLocaleString('en-IN')}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-sm text-slate-600">{item.upiReference || '-'}</td>
                    <td className="max-w-xs truncate p-4 px-6 text-sm text-slate-500" title={item.message}>
                      {item.message || '-'}
                    </td>
                    <td className="p-4 px-6">
                      {item.status === 'pending_verification' ? (
                        <div className="min-w-[240px] space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openReview(item)}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              <CheckCircle2 size={14} />
                              {tr('admin.donations.reviewPayment', 'Review Payment')}
                            </button>
                            <button
                              onClick={() => requestDelete([item._id], false)}
                              disabled={deletingId === item._id}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId === item._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              {tr('admin.common.delete', 'Delete')}
                            </button>
                          </div>
                        </div>
                      ) : item.email && (
                        (item.paymentMethod === 'upi_qr' && (item.manualReviewStatus === 'successful' || item.manualReviewStatus === 'wrong_amount')) ||
                        (item.paymentMethod === 'bank_transfer' && (item.manualReviewStatus === 'successful' || item.manualReviewStatus === 'wrong_amount'))
                      ) ? (
                        <div className="flex flex-wrap gap-2">
                          {item.paymentMethod === 'upi_qr' ? (
                            <button
                              onClick={() => openReview(item)}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              <CheckCircle2 size={14} />
                              {tr('admin.donations.editReview', 'Edit Review')}
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleResendReceipt(item._id)}
                            disabled={sendingReceiptId === item._id}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-primary hover:text-white disabled:opacity-60"
                          >
                            {sendingReceiptId === item._id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            {item.paymentMethod === 'upi_qr'
                              ? (item.receiptSentAt ? tr('admin.donations.resendReceipt', 'Resend Receipt') : tr('admin.donations.sendReceipt', 'Send Receipt'))
                              : tr('admin.donations.resendReceipt', 'Resend Receipt')}
                          </button>
                          <button
                            onClick={() => requestDelete([item._id], false)}
                            disabled={deletingId === item._id}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === item._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {tr('admin.common.delete', 'Delete')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {item.paymentMethod === 'upi_qr' ? (
                            <button
                              onClick={() => openReview(item)}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              <CheckCircle2 size={14} />
                              {tr('admin.donations.editReview', 'Edit Review')}
                            </button>
                          ) : null}
                          <button
                            onClick={() => requestDelete([item._id], false)}
                            disabled={deletingId === item._id}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === item._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {tr('admin.common.delete', 'Delete')}
                          </button>
                        </div>
                      )}
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

      {editingDonation ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{editingDonation.paymentMethod === 'upi_qr' ? tr('admin.donations.editQrReview', 'Edit QR Review') : tr('admin.donations.editDonation', 'Edit Donation')}</h2>
                <p className="mt-1 text-sm text-slate-500">{tr('admin.donations.editDonationHelp', 'Update donor details, payment details, and review status from one place.')}</p>
              </div>
              <button
                onClick={closeReview}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {tr('admin.common.close', 'Close')}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.donations.name', 'Name')}</label>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((current) => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.common.phone', 'Phone')}</label>
                <input
                  type="text"
                  value={editDraft.phone}
                  onChange={(e) => setEditDraft((current) => ({ ...current, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.common.email', 'Email')}</label>
                <input
                  type="email"
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((current) => ({ ...current, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.donations.selectedAmount', 'Selected Amount')}</label>
                <input
                  type="number"
                  min="1"
                  value={editDraft.amount}
                  onChange={(e) => setEditDraft((current) => ({ ...current, amount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {editingDonation.paymentMethod === 'upi_qr' ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.donations.upiReference', 'UPI Reference')}</label>
                  <input
                    type="text"
                    value={editDraft.upiReference}
                    onChange={(e) => setEditDraft((current) => ({ ...current, upiReference: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.common.message', 'Message')}</label>
                <textarea
                  rows="3"
                  value={editDraft.message}
                  onChange={(e) => setEditDraft((current) => ({ ...current, message: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {editingDonation.paymentMethod === 'upi_qr' ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-slate-800">{tr('admin.donations.manualReview', 'Manual Review')}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <select
                    value={editDraft.outcome}
                    onChange={(e) => setEditDraft((current) => ({ ...current, outcome: e.target.value }))}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="successful">{tr('admin.common.successful', 'Successful')}</option>
                    <option value="unsuccessful">{tr('admin.common.unsuccessful', 'Unsuccessful')}</option>
                    <option value="wrong_amount">{tr('admin.common.wrongAmount', 'Wrong Amount')}</option>
                  </select>
                  {editDraft.outcome === 'wrong_amount' ? (
                    <input
                      type="number"
                      min="1"
                      value={editDraft.confirmedAmount}
                      onChange={(e) => setEditDraft((current) => ({ ...current, confirmedAmount: e.target.value }))}
                      placeholder={tr('admin.donations.actualAmountPaid', 'Actual amount paid')}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  ) : <div />}
                  <input
                    type="text"
                    value={editDraft.reason}
                    onChange={(e) => setEditDraft((current) => ({ ...current, reason: e.target.value }))}
                    placeholder={tr('admin.donations.reasonOptional', 'Reason / note (optional)')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={closeReview}
                className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {tr('admin.donations.saveChanges', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget?.ids?.length ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.common.delete', 'Delete')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {deleteTarget.isBulk
                    ? tr('admin.donations.confirmDeleteBulk', 'Delete {count} selected donation entries? This cannot be undone.').replace('{count}', String(deleteTarget.ids.length))
                    : tr('admin.donations.confirmDeleteOne', 'Delete this donation entry? This cannot be undone.')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={bulkDeleting || (deletingId && !deleteTarget.isBulk)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteTarget}
                disabled={bulkDeleting || (deletingId && !deleteTarget.isBulk)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {bulkDeleting || (deletingId && !deleteTarget.isBulk) ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
