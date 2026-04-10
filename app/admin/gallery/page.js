"use client";

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, Image as ImageIcon, Video, X, Camera, AlertTriangle, Link2, Download, Copy, Check } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import PaginationControls from '@/components/admin/PaginationControls';
import { useLanguage } from '@/lib/useLanguage';

const initialFormData = {
  title: '',
  type: 'image',
  src: '',
  thumb: '',
  category: 'Community Service',
};

const PAGE_SIZE = 10;

const CopyButton = ({ text, tr }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
        copied 
          ? 'bg-emerald-500 text-white' 
          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-primary shadow-sm border border-slate-200'
      }`}
      title={tr('admin.gallery.copyUrl', 'Copy URL')}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied && <span className="text-[10px] font-bold">{tr('admin.gallery.copied', 'Copied!')}</span>}
    </button>
  );
};

export default function GalleryManager() {
  const { tr } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [mainFiles, setMainFiles] = useState([]);
  const [fileTitles, setFileTitles] = useState([]);
  const [thumbFile, setThumbFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: PAGE_SIZE });
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const mainFileInputRef = useRef(null);
  const thumbFileInputRef = useRef(null);

  const fetchItems = useCallback(async () => {
    try {
      const [sanityRes, dbRes] = await Promise.all([
        fetch('/api/admin/gallery/sanity'),
        fetch('/api/admin/gallery/db'),
      ]);

      const [sanityData, dbData] = await Promise.all([
        readJsonResponse(sanityRes),
        readJsonResponse(dbRes),
      ]);

      const sanityItems = sanityData?.success && Array.isArray(sanityData.data)
        ? sanityData.data.map((item) => ({ ...item, source: 'sanity' }))
        : [];

      const dbItems = dbData?.success && Array.isArray(dbData.data)
        ? dbData.data.map((item) => ({ ...item, source: 'db' }))
        : [];

      const list = [...sanityItems, ...dbItems].sort((a, b) => {
        const at = new Date(a.createdAt || a._createdAt || 0).getTime();
        const bt = new Date(b.createdAt || b._createdAt || 0).getTime();
        return bt - at;
      });

      setItems(list);

      if (sanityData?.success || dbData?.success) {
        const total = list.length;
        const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
        const safePage = Math.min(page, totalPages);
        setPage(safePage);
        setPagination({ page: safePage, total, totalPages, limit: PAGE_SIZE });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const keyForItem = (item) => `${item?.source || 'db'}:${item?._id || ''}`;

  const toggleSelection = (item) => {
    const key = keyForItem(item);
    if (!key.endsWith(':') && key.includes(':')) {
      setSelectedKeys((current) =>
        current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key]
      );
    }
  };

  const toggleSelectAllVisible = (visibleItems) => {
    const keys = visibleItems.map(keyForItem).filter(Boolean);
    if (keys.length === 0) return;

    setSelectedKeys((current) =>
      keys.every((k) => current.includes(k))
        ? current.filter((k) => !keys.includes(k))
        : Array.from(new Set([...current, ...keys]))
    );
  };

  const clearSelection = () => setSelectedKeys([]);

  const buildSelectionPayload = () =>
    selectedKeys
      .map((key) => {
        const [source, id] = String(key || '').split(':');
        if (!source || !id) return null;
        if (source !== 'db' && source !== 'sanity') return null;
        return { source, id };
      })
      .filter(Boolean);

  const handleExportSelected = async () => {
    try {
      clearFeedback();
      if (selectedKeys.length === 0) {
        setError(tr('admin.gallery.selectAtLeastOne', 'Select at least one gallery item.'));
        return;
      }

      setBulkExporting(true);
      const res = await fetch('/api/admin/gallery/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: buildSelectionPayload() }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!res.ok) {
        const data = await readJsonResponse(res);
        throw new Error(data.error || data.message || tr('admin.gallery.exportSelectedFailed', 'Unable to export selected gallery items.'));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gallery_selected.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(tr('admin.gallery.exportSelectedSuccess', 'Selected gallery items exported successfully.'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkExporting(false);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      clearFeedback();
      if (selectedKeys.length === 0) {
        setError(tr('admin.gallery.selectAtLeastOneDelete', 'Select at least one gallery item to delete.'));
        return;
      }

      setBulkDeleting(true);
      const res = await fetch('/api/admin/gallery/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: buildSelectionPayload() }),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || tr('admin.gallery.failedToDelete', 'Unable to delete media item.'));
      }

      await fetchItems();
      setSelectedKeys([]);
      setMessage(tr('admin.gallery.deleteSelectedSuccess', 'Selected gallery items deleted successfully.'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const requestBulkDelete = () => {
    clearFeedback();
    if (selectedKeys.length === 0) {
      setError(tr('admin.gallery.selectAtLeastOneDelete', 'Select at least one gallery item to delete.'));
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    await handleDeleteSelected();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();
    setSaving(true);

    try {
      const shouldUpload = mainFiles.length > 0;

      if (shouldUpload) {
        for (let index = 0; index < mainFiles.length; index += 1) {
          const file = mainFiles[index];
          const form = new FormData();
          form.append('type', formData.type);
          form.append('file', file);

          if (formData.type === 'video') {
            if (thumbFile) {
              form.append('thumb', thumbFile);
            } else if (formData.thumb?.trim()) {
              form.append('thumbUrl', formData.thumb.trim());
            }
          }

          const perFileTitle = String(fileTitles[index] || '').trim();
          form.append('title', perFileTitle || formData.title || file.name);
          form.append('category', formData.category || 'Community Service');

          const res = await fetch('/api/admin/gallery/sanity/upload', {
            method: 'POST',
            body: form,
          });

          const data = await readJsonResponse(res);
          if (!res.ok) {
            throw new Error(data.message || tr('admin.gallery.failedToAdd', 'Unable to add media item.'));
          }
        }
      } else {
        if (!formData.src?.trim()) {
          throw new Error(
            formData.type === 'video'
              ? tr('admin.gallery.videoUrlOrUploadRequired', 'Upload a video file or paste a public video URL.')
              : tr('admin.gallery.imageUrlOrUploadRequired', 'Upload an image file or paste a public image URL.'),
          );
        }

        const res = await fetch('/api/admin/gallery/sanity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            src: formData.src.trim(),
            thumb: formData.thumb?.trim() || '',
          }),
        });

        const data = await readJsonResponse(res);
        if (!res.ok) {
          throw new Error(data.error || tr('admin.gallery.failedToAdd', 'Unable to add media item.'));
        }
      }

      await fetchItems();
      setMessage(tr('admin.gallery.added', 'Gallery item added successfully.'));
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    clearFeedback();
    setDeletingId(deleteTarget._id);

    try {
      const isDb = deleteTarget.source === 'db';
      const res = isDb
        ? await fetch(`/api/admin/gallery/${encodeURIComponent(deleteTarget._id)}`, { method: 'DELETE' })
        : await fetch(`/api/admin/gallery/sanity?id=${encodeURIComponent(deleteTarget._id)}`, { method: 'DELETE' });
      const data = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || data.message || tr('admin.gallery.failedToDelete', 'Unable to delete media item.'));
      }

      await fetchItems();
      setMessage(tr('admin.gallery.deleted', 'Gallery item deleted successfully.'));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  };

  const openModal = () => {
    clearFeedback();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setMainFiles([]);
    setFileTitles([]);
    setThumbFile(null);
    if (mainFileInputRef.current) {
      mainFileInputRef.current.value = '';
    }
    if (thumbFileInputRef.current) {
      thumbFileInputRef.current.value = '';
    }
  };

  const acceptForType = formData.type === 'video' ? 'video/*' : 'image/*';
  const mainLabel = formData.type === 'video'
    ? tr('admin.gallery.videoFileLabel', 'Video file')
    : tr('admin.gallery.uploadLabel', 'Image file');
  const mainDropText = formData.type === 'video'
    ? tr('admin.gallery.dropVideoHere', 'Click to choose or drag & drop video(s)')
    : tr('admin.gallery.dropHere', 'Click to choose or drag & drop image(s)');
  const mainRequiredHint = formData.type === 'video'
    ? tr('admin.gallery.videoRequiredHint', 'Upload a video here, or paste a public video URL below.')
    : tr('admin.gallery.imageRequiredHint', 'Upload an image here, or paste a public image URL below.');

  const mainFilesHint = mainFiles.length === 0
    ? mainRequiredHint
    : mainFiles.length === 1
      ? mainFiles[0]?.name
      : tr('admin.gallery.filesSelected', '{count} files selected.').replace('{count}', String(mainFiles.length));

  const deleteDescriptionTemplate = tr(
    'admin.gallery.deleteDescription',
    'This will remove {title} from the live gallery.'
  );
  const deleteDescriptionParts = String(deleteDescriptionTemplate).split('{title}');
  const deleteDescriptionBefore = deleteDescriptionParts[0] || '';
  const deleteDescriptionAfter = deleteDescriptionParts.length > 1
    ? deleteDescriptionParts.slice(1).join('{title}')
    : '';

  const startIndex = (page - 1) * PAGE_SIZE;
  const pagedItems = items.slice(startIndex, startIndex + PAGE_SIZE);
  const allVisibleSelected = pagedItems.length > 0 && pagedItems.every((item) => selectedKeys.includes(keyForItem(item)));
  const selectedCount = selectedKeys.length;

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8">
      <div className="flex justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tr('admin.gallery.title', 'Gallery CMS')}</h1>
          <p className="text-slate-500 mt-1">{tr('admin.gallery.subtitle', 'Upload images to Sanity or import cloud-hosted media URLs, then manage the live gallery items here.')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {selectedKeys.length > 0 ? (
            <>
              <button
                onClick={() => toggleSelectAllVisible(pagedItems)}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-700 shadow-sm transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allVisibleSelected}
                  readOnly
                />
                {tr('admin.gallery.selectAllOnPage', 'Select All (Page)')}
              </button>
              <button
                onClick={handleExportSelected}
                disabled={bulkExporting}
                className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-bold text-emerald-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {bulkExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {tr('admin.gallery.exportSelected', 'Export Selected')}
              </button>
              <button
                onClick={requestBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 font-bold text-red-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {bulkDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {tr('admin.gallery.deleteSelected', 'Delete Selected')}
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-700 shadow-sm transition-colors cursor-pointer"
              >
                {tr('admin.gallery.clearSelection', 'Clear Selection')}
              </button>
            </>
          ) : null}

          <button
            onClick={openModal}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={20} />
            {tr('admin.gallery.addMedia', 'Add Media')}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-4/5 bg-slate-200/60 rounded-2xl animate-pulse border border-slate-100 shadow-sm" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          {tr('admin.gallery.noItems', 'No gallery items yet. Upload or add URLs to publish items to the live gallery.')}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {pagedItems.map((item) => (
            <div key={item._id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm relative">
              <div className="aspect-4/5 relative">
                <Image
                  src={item.type === 'video' ? (item.thumb || 'https://via.placeholder.com/400x500?text=Video') : item.src}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <label className="absolute top-2 left-2 flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedKeys.includes(keyForItem(item))}
                    onChange={() => toggleSelection(item)}
                    aria-label={tr('admin.common.select', 'Select')}
                  />
                  <span className="hidden sm:inline">{item.source === 'sanity' ? 'Sanity' : 'DB'}</span>
                </label>
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Video className="text-white" size={32} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs font-bold truncate">{item.title}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(item)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 size={14} />
              </button>

              {/* URL Display & Copy */}
              <div className="p-2 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-mono truncate bg-white border border-slate-100 px-1.5 py-0.5 rounded" title={item.src}>
                    {item.src}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <CopyButton text={item.src} tr={tr} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && pagination.total > 0 ? (
        <div className="mt-auto pt-6">
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Camera size={20} className="text-primary" />
                {tr('admin.gallery.addMediaItem', 'Add Media Item')}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 88px)' }}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 mb-4">
                <div className="flex items-start gap-3">
                  <Link2 size={16} className="mt-0.5 text-primary" />
                  <div>
                    {tr('admin.gallery.urlHelp', 'Upload is recommended (hosted in Sanity). You can also add a public URL instead.')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'image', thumb: '' });
                      setMainFiles([]);
                      setThumbFile(null);
                      if (mainFileInputRef.current) {
                        mainFileInputRef.current.value = '';
                      }
                      if (thumbFileInputRef.current) {
                        thumbFileInputRef.current.value = '';
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'image' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <ImageIcon size={18} /> {tr('admin.gallery.image', 'Image')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'video' });
                      setMainFiles([]);
                      setThumbFile(null);
                      if (mainFileInputRef.current) {
                        mainFileInputRef.current.value = '';
                      }
                      if (thumbFileInputRef.current) {
                        thumbFileInputRef.current.value = '';
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'video' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <Video size={18} /> {tr('admin.gallery.video', 'Video')}
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.gallery.categoryLabel', 'Category')}</label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Community Service">{tr('admin.gallery.categoryCommunityService', 'Community Service')}</option>
                    <option value="Recognition & Awards">{tr('admin.gallery.categoryRecognitionAwards', 'Recognition & Awards')}</option>
                  </select>
                </div>

                {mainFiles.length === 0 ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.gallery.titleCaption', 'Title / Caption')}</label>
                    <input
                      required
                      placeholder={tr('admin.gallery.titlePlaceholder', 'e.g. Free Education Drive 2024')}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">{tr('admin.gallery.titlesForFiles', 'Titles for selected files')}</label>
                    <div className="space-y-3">
                      {mainFiles.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                          <div className="mb-1 text-xs font-medium text-slate-500 truncate" title={file.name}>{file.name}</div>
                          <input
                            required
                            placeholder={tr('admin.gallery.fileTitlePlaceholder', 'Enter title')}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            value={fileTitles[index] ?? ''}
                            onChange={(e) => {
                              const next = [...fileTitles];
                              next[index] = e.target.value;
                              setFileTitles(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{mainLabel}</label>
                  <label
                    className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropped = Array.from(e.dataTransfer.files || []);
                      if (dropped.length > 0) {
                        setMainFiles(dropped);
                        setFileTitles(dropped.map((file) => file.name));
                        setFormData((prev) => ({ ...prev, src: '' }));
                        if (mainFileInputRef.current) {
                          mainFileInputRef.current.value = '';
                        }
                      }
                    }}
                  >
                    {formData.type === 'video' ? <Video size={20} className="text-primary" /> : <ImageIcon size={20} className="text-primary" />}
                    <p className="text-sm font-medium text-slate-700">{mainDropText}</p>
                    <p className="text-xs text-slate-500">{mainFilesHint}</p>
                    <input
                      ref={mainFileInputRef}
                      type="file"
                      accept={acceptForType}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files || []);
                        if (picked.length > 0) {
                          setMainFiles(picked);
                          setFileTitles(picked.map((file) => file.name));
                          setFormData((prev) => ({ ...prev, src: '' }));
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'image' ? tr('admin.gallery.imageUrlOptional', 'Public Image URL (optional)') : tr('admin.gallery.videoUrlOptional', 'Public Video URL (optional)')}</label>
                  <input
                    placeholder={tr('admin.gallery.urlPlaceholder', 'https://...')}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    value={formData.src}
                    onChange={(e) => setFormData({ ...formData, src: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-slate-500">{tr('admin.gallery.urlOptionalHint', 'If you do not upload a file, this URL will be used instead.')}</p>

                  {formData.type === 'video' ? (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.gallery.thumbnailUrlOptional', 'Thumbnail URL (optional)')}</label>
                      <input
                        placeholder={tr('admin.gallery.urlPlaceholder', 'https://...')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={formData.thumb}
                        onChange={(e) => setFormData({ ...formData, thumb: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-slate-500">{tr('admin.gallery.thumbOptionalHint', 'If you do not upload a thumbnail, this URL will be used instead.')}</p>
                    </div>
                  ) : null}
                </div>

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.gallery.thumbnailUpload', 'Thumbnail image (optional)')}</label>
                    <label
                      className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) {
                          setThumbFile(dropped);
                          setFormData((prev) => ({ ...prev, thumb: '' }));
                        }
                      }}
                    >
                      <ImageIcon size={20} className="text-primary" />
                      <p className="text-sm font-medium text-slate-700">{tr('admin.gallery.dropThumbHere', 'Click to choose or drag & drop a thumbnail')}</p>
                      <p className="text-xs text-slate-500">{thumbFile ? thumbFile.name : tr('admin.gallery.thumbHint', 'Optional, but recommended for videos.')}</p>
                      <input
                        ref={thumbFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const picked = e.target.files?.[0];
                          if (picked) {
                            setThumbFile(picked);
                            setFormData((prev) => ({ ...prev, thumb: '' }));
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="md:col-span-2 w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg mt-2 shadow-primary/25 hover:scale-[1.01] transition-all disabled:hover:scale-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                  {tr('admin.gallery.publish', 'Publish to Gallery')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.gallery.deletePrompt', 'Delete gallery item?')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {deleteDescriptionBefore}
                  <span className="font-semibold text-slate-700">{deleteTarget.title}</span>
                  {deleteDescriptionAfter}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget._id}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === deleteTarget._id}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {deletingId === deleteTarget._id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.common.delete', 'Delete')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {tr('admin.gallery.confirmDeleteSelected', 'Delete {count} selected gallery items? This cannot be undone.')
                    .replace('{count}', String(selectedCount))}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {bulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
