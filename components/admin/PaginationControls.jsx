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
  const compactPageOfText = `/${totalPages}`;

  const submitPageInput = () => {
    const nextPage = Number(pageInput);
    if (Number.isNaN(nextPage) || nextPage < 1 || nextPage > totalPages) {
      setPageInput(String(page));
      return;
    }

    onPageChange(nextPage);
  };

  // Mobile-only size adjustments for compact single-row pagination; md+ remains unchanged.
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:gap-3 md:p-4 md:text-sm">
      <div className="leading-5 md:leading-normal">
        {rangeText}
      </div>
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-hidden md:w-auto md:flex-wrap md:gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1.5 text-xs transition-colors hover:bg-slate-50 disabled:opacity-50 md:px-3 md:py-1 md:text-sm"
          disabled={page <= 1}
        >
          <span className="md:hidden">{tr('admin.pagination.previousShort', 'Prev')}</span>
          <span className="hidden md:inline">{tr('admin.pagination.previous', 'Previous')}</span>
        </button>
        <span className="rounded border border-primary bg-primary px-2 py-1.5 text-xs text-white md:px-3 md:py-1 md:text-sm">
          {page}
        </span>
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1.5 text-xs transition-colors hover:bg-slate-50 disabled:opacity-50 md:px-3 md:py-1 md:text-sm"
          disabled={page >= totalPages}
        >
          <span className="md:hidden">{tr('admin.pagination.nextShort', 'Next')}</span>
          <span className="hidden md:inline">{tr('admin.pagination.next', 'Next')}</span>
        </button>
        <div className="ml-auto flex items-center gap-1 text-xs text-slate-600 md:ml-0 md:gap-2 md:text-sm">
          <span className="hidden md:inline">{tr('admin.pagination.goTo', 'Go to')}</span>
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
            className="w-12 rounded border border-slate-200 bg-white px-1.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 md:w-20 md:px-3 md:py-1 md:text-sm"
          />
          <button
            onClick={submitPageInput}
            className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50 md:px-3 md:py-1 md:text-sm"
          >
            {tr('admin.pagination.go', 'Go')}
          </button>
          <span className="md:hidden">{compactPageOfText}</span>
          <span className="hidden md:inline">{pageOfText}</span>
        </div>
      </div>
    </div>
  );
}
