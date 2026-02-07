import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-warmGray-800">{title}</h2>
        {subtitle && <p className="text-sm text-warmGray-500">{subtitle}</p>}
      </div>
      {action && <div className="mt-2 sm:mt-0">{action}</div>}
    </div>
  );
}
