import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'cozyGradient';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  outline:
    'border border-warmGray-200 bg-white text-warmGray-700 hover:bg-warmGray-50',
  ghost:
    'text-warmGray-600 hover:bg-warmGray-100',
  cozyGradient:
    'bg-gradient-to-r from-cozy-400 to-brand-400 text-white shadow-md hover:shadow-lg hover:brightness-105',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'default',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-calm-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
