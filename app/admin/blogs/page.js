"use client";

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, RefreshCw, Pencil, X, AlertTriangle } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import { getBlogCategories } from '@/lib/blogs';
import PaginationControls from '@/components/admin/PaginationControls';
import { useLanguage } from '@/lib/useLanguage';

const initialForm = {
  title: '',
  category: 'General',
  author: '',
  image: '',
  excerpt: '',
  content: '',
};

const defaultCategories = ['General', 'School Updates', 'Success Stories', 'Community Events', 'Impact Reports'];
const BLOGS_PAGE_SIZE = 5;

export default function AdminBlogsPage() {
  const { tr } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ source: 'local', sanityConfigured: false, writeConfigured: false });
  const [blogsPage, setBlogsPage] = useState(1);
  const categoryOptions = Array.from(
    new Set([...defaultCategories, ...getBlogCategories(blogs).filter((item) => item !== 'All')])
  );
  const stagedTotalPages = Math.max(Math.ceil(blogs.length / BLOGS_PAGE_SIZE), 1);
  const paginatedBlogs = blogs.slice((blogsPage - 1) * BLOGS_PAGE_SIZE, blogsPage * BLOGS_PAGE_SIZE);

  const categoryKeyMap = {
    All: 'all',
    'Impact Reports': 'impactReports',
    'School Updates': 'schoolUpdates',
    'Success Stories': 'successStories',
    'Community Events': 'communityEvents',
    General: 'general',
  };

  const getCategoryLabel = (category) => {
    const key = categoryKeyMap[category] || category.toLowerCase().replace(/\s+/g, '');
    return tr(`blogs.categories.${key}`, category);
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/blogs', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!data.success) {
        throw new Error(data.message || tr('admin.blogs.failedToLoad', 'Failed to load blogs.'));
      }

      setBlogs(data.data || []);
      setBlogsPage(1);
      setMeta({
        source: data.source || 'local',
        sanityConfigured: Boolean(data.sanityConfigured),
        writeConfigured: Boolean(data.writeConfigured),
      });
    } catch (err) {
      setError(err.message || tr('admin.blogs.failedToLoad', 'Failed to load blogs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    setBlogsPage((current) => Math.min(current, stagedTotalPages));
  }, [stagedTotalPages]);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');

      const isEditing = Boolean(editingId);

      const res = await fetch(isEditing ? `/api/admin/blogs/${encodeURIComponent(editingId)}` : '/api/admin/blogs', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            (isEditing
              ? tr('admin.blogs.failedToUpdate', 'Failed to update blog.')
              : tr('admin.blogs.failedToAdd', 'Failed to add blog.'))
        );
      }

      setMessage(
        data.message ||
          (isEditing ? tr('admin.blogs.updated', 'Blog updated.') : tr('admin.blogs.added', 'Blog added.'))
      );
      setForm(initialForm);
      setEditingId('');
      await fetchBlogs();
    } catch (err) {
      setError(
        err.message ||
          (editingId
            ? tr('admin.blogs.failedToUpdate', 'Failed to update blog.')
            : tr('admin.blogs.failedToAdd', 'Failed to add blog.'))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (blog) => {
    setMessage('');
    setError('');
    setEditingId(blog._id);
    setForm({
      title: blog.title || '',
      category: blog.category || 'General',
      author: blog.author || '',
      image: blog.image || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId('');
    setForm(initialForm);
    setMessage('');
    setError('');
  };

  const handleDelete = async (blogId) => {
    try {
      setDeletingId(blogId);
      setMessage('');
      setError('');

      const res = await fetch(`/api/admin/blogs/${blogId}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || tr('admin.blogs.failedToDelete', 'Failed to delete blog.'));
      }

      setMessage(data.message || tr('admin.blogs.deleted', 'Blog deleted.'));
      await fetchBlogs();
    } catch (err) {
      setError(err.message || tr('admin.blogs.failedToDelete', 'Failed to delete blog.'));
    } finally {
      setDeletingId('');
    }
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTarget?._id) return;
    const blogId = deleteTarget._id;
    setDeleteTarget(null);
    await handleDelete(blogId);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tr('admin.blogs.title', 'Blogs')}</h1>
          <p className="mt-1 text-slate-500">
            {tr('admin.blogs.subtitle', 'Publish blog posts directly to Sanity. The public blog pages read from Sanity and do not use MongoDB storage.')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchBlogs}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={16} />
            {tr('admin.common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-semibold">{tr('admin.blogs.sanityWorkflow', 'Sanity workflow')}</p>
        <p className="mt-1">
          {tr('admin.blogs.sanityWorkflowDesc1', 'When Sanity is configured, blogs are stored in Sanity and appear on the public site immediately. Until then, the site falls back to')} <code>data/blogs.json</code>.
        </p>
        <p className="mt-2 text-amber-800">
          {tr('admin.blogs.currentSource', 'Current source')}: <strong>{meta.source}</strong>. {tr('admin.blogs.sanityConfigured', 'Sanity configured')}: <strong>{meta.sanityConfigured ? tr('admin.common.yes', 'Yes') : tr('admin.common.no', 'No')}</strong>. {tr('admin.blogs.writeAccess', 'Write access')}: <strong>{meta.writeConfigured ? tr('admin.common.yes', 'Yes') : tr('admin.common.no', 'No')}</strong>.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1.3fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? tr('admin.blogs.editBlog', 'Edit Blog') : tr('admin.blogs.addBlog', 'Add Blog')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{tr('admin.blogs.addBlogHint', 'Title, content, and image URL are required.')}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.title', 'Title')}</label>
              <input
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={tr('admin.blogs.form.titlePlaceholder', 'Enter blog title')}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.category', 'Category')}</label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.author', 'Author')}</label>
                <input
                  value={form.author}
                  onChange={(e) => handleChange('author', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={tr('admin.blogs.form.authorPlaceholder', 'Admin Team')}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.imageUrl', 'Image URL')}</label>
              <input
                value={form.image}
                onChange={(e) => handleChange('image', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={tr('admin.blogs.form.imagePlaceholder', 'https://...')}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.excerpt', 'Excerpt')}</label>
              <textarea
                rows="3"
                value={form.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={tr('admin.blogs.form.excerptPlaceholder', 'Short summary for cards')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{tr('admin.blogs.form.content', 'Content')}</label>
              <textarea
                rows="12"
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={tr('admin.blogs.form.contentPlaceholder', 'Write the full story here...')}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Pencil size={18} /> : <Plus size={18} />}
            {editingId ? tr('admin.blogs.update', 'Update Blog') : tr('admin.blogs.publish', 'Publish Blog to Sanity')}
          </button>

          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <X size={18} />
              {tr('admin.blogs.cancelEdit', 'Cancel Edit')}
            </button>
          ) : null}
        </form>

        <div className="flex min-h-[78vh] flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{tr('admin.blogs.listTitle', 'Sanity Blogs')}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {tr('admin.blogs.listSubtitle', 'These are the blog entries currently available from the active blog source.')}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {blogs.length} {tr('admin.blogs.total', 'total')}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-500">
              {tr('admin.blogs.noBlogs', 'No blogs found.')}
            </div>
          ) : (
            <>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
              {paginatedBlogs.map((blog) => (
                <div key={blog._id} className="rounded-2xl border border-slate-100 p-5 transition-colors hover:border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {getCategoryLabel(blog.category)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(blog.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{blog.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{blog.excerpt}</p>
                      <div className="mt-3 text-xs text-slate-400">
                        <span>{blog.author}</span>
                        <span className="mx-2">•</span>
                        <span className="break-all">{blog.image}</span>
                      </div>
                    </div>

                    {blog.source === 'sanity' ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => handleEdit(blog)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                        >
                          <Pencil size={16} />
                          {tr('admin.common.edit', 'Edit')}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(blog)}
                          disabled={deletingId === blog._id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 cursor-pointer"
                        >
                          {deletingId === blog._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          {tr('admin.common.delete', 'Delete')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <PaginationControls
                page={blogsPage}
                totalPages={stagedTotalPages}
                total={blogs.length}
                limit={BLOGS_PAGE_SIZE}
                onPageChange={setBlogsPage}
              />
            </div>
            </>
          )}
        </div>
      </div>

      {deleteTarget?._id ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{tr('admin.common.delete', 'Delete')}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {tr('admin.blogs.confirmDelete', 'Delete this blog from Sanity?')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget._id}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {tr('admin.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteTarget}
                disabled={deletingId === deleteTarget._id}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
              >
                {deletingId === deleteTarget._id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {tr('admin.common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
