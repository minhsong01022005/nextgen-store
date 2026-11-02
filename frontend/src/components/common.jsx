import { Star, ChevronLeft, ChevronRight } from "lucide-react";

export function Stars({ value = 0, size = 14, onChange }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          onClick={onChange ? () => onChange(n) : undefined}
          className={`${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"} ${onChange ? "cursor-pointer" : ""}`}
        />
      ))}
    </span>
  );
}

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`} />
);

export function ProductSkeletonGrid({ n = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="h-44 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button className="btn-ghost !px-2.5 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
        <ChevronLeft size={16} />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`d${i}`} className="px-1 muted">…</span>
        ) : (
          <button key={n} onClick={() => onChange(n)} className={`${n === page ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}>
            {n}
          </button>
        )
      )}
      <button className="btn-ghost !px-2.5 !py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Trang sau">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export const EmptyState = ({ children }) => (
  <div className="card py-14 text-center muted text-sm">{children}</div>
);

export const PageTitle = ({ icon: Icon, children, right }) => (
  <div className="flex items-center justify-between gap-3 mb-5">
    <h2 className="text-xl font-extrabold flex items-center gap-2">
      {Icon && <Icon size={22} className="text-indigo-600 dark:text-indigo-400" />}
      {children}
    </h2>
    {right}
  </div>
);
