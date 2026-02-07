export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-warmGray-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="h-4 w-2/3 rounded-lg bg-warmGray-200 mb-3" />
      <div className="h-3 w-full rounded-lg bg-warmGray-100 mb-2" />
      <div className="h-3 w-4/5 rounded-lg bg-warmGray-100 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-lg bg-warmGray-100" />
        <div className="h-6 w-20 rounded-lg bg-warmGray-100" />
      </div>
    </div>
  );
}
