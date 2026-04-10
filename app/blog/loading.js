export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-28 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 text-center md:mb-20">
          <div className="mx-auto mb-4 h-10 w-48 rounded-lg bg-slate-200/60" />
          <div className="mx-auto h-4 w-96 rounded bg-slate-200/60" />
        </div>

        <div className="mb-12 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-24 rounded-full bg-slate-200/60" />
            ))}
          </div>
          <div className="h-10 w-64 rounded-xl bg-slate-200/60" />
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group overflow-hidden rounded-[2rem] bg-white shadow-xs border border-slate-100 flex flex-col">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200/60" />
              <div className="flex flex-1 flex-col p-8">
                <div className="mb-4 flex items-center gap-4">
                  <div className="h-6 w-20 rounded-full bg-slate-200/60" />
                  <div className="h-4 w-24 rounded bg-slate-200/60" />
                </div>
                <div className="mb-4 h-6 w-3/4 rounded bg-slate-200/60" />
                <div className="mb-2 h-4 w-full rounded bg-slate-200/60" />
                <div className="mb-6 h-4 w-5/6 rounded bg-slate-200/60" />
                <div className="mt-auto h-8 w-24 rounded-lg bg-slate-200/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
