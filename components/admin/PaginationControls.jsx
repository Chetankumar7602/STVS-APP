"use client";

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/useLanguage';

export default function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}) {
  const { tr } = useLanguage();
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  if (!total || totalPages <= 0) {
    return null;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const formatTemplate = (template, vars) => {
    let out = String(template ?? '');
    Object.entries(vars || {}).forEach(([key, value]) => {
      out = out.replaceAll(`{${key}}`, String(value));
    });
    return out;
  };

  const rangeText = formatTemplate(
    tr('admin.pagination.range', 'Showing {start}-{end} of {total} entries'),
    { start, end, total }
  );

  const pageOfText = formatTemplate(
    tr('admin.pagination.pageOf', 'of {totalPages}'),
    { totalPages }
  );

  const submitPageInput = () => {
    const nextPage = Number(pageInput);
    if (Number.isNaN(nextPage) || nextPage < 1 || nextPage > totalPages) {
      setPageInput(String(page));
      return;
    }

    onPageChange(nextPage);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
      <div>
        {rangeText}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          className="cursor-pointer rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
          disabled={page <= 1}
        >
          {tr('admin.pagination.previous', 'Previous')}
        </button>
        <span className="rounded border border-primary bg-primary px-3 py-1 text-white">
          {page}
        </span>
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          className="cursor-pointer rounded border border-slate-200 bg-white px-3 py-1 transition-colors hover:bg-slate-50 disabled:opacity-50"
          disabled={page >= totalPages}
        >
          {tr('admin.pagination.next', 'Next')}
        </button>
        <div className="flex items-center gap-2 text-slate-600">
          <span>{tr('admin.pagination.goTo', 'Go to')}</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={submitPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitPageInput();
              }
            }}
            className="w-20 rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={submitPageInput}
            className="cursor-pointer rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            {tr('admin.pagination.go', 'Go')}
          </button>
          <span>{pageOfText}</span>
        </div>
      </div>
    </div>
  );
}
