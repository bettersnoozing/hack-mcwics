interface EmptyStateCardProps {
  emoji?: string;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyStateCard({
  emoji = '📭',
  title,
  description,
  className = '',
}: EmptyStateCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warmGray-200 bg-warmGray-50/50 px-8 py-12 text-center ${className}`}>
      <span className="mb-3 text-4xl">{emoji}</span>
      <h3 className="text-base font-semibold text-warmGray-700">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-warmGray-500 max-w-sm">{description}</p>
      )}
    </div>
  );
}
