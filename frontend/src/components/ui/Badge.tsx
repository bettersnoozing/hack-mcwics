import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-warmGray-100 text-warmGray-600',
  success: 'bg-calm-100 text-calm-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-cozy-100 text-cozy-700',
  info: 'bg-brand-100 text-brand-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
