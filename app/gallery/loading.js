export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-28 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 text-center md:mb-16">
          <div className="mx-auto mb-4 h-10 w-48 rounded-lg bg-slate-200/60" />
          <div className="mx-auto h-4 w-96 rounded bg-slate-200/60" />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-24 rounded-full bg-slate-200/60" />
            ))}
          </div>
          <div className="h-10 w-48 rounded-xl bg-slate-200/60" />
        </div>

        <div className="columns-1 gap-6 sm:columns-2 md:columns-3 lg:columns-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="mb-6 overflow-hidden rounded-3xl bg-slate-200/60" style={{ height: `${Math.floor(Math.random() * (400 - 200 + 1)) + 200}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
