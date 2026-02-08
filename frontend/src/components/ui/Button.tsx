import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'cozyGradient';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-mui-primary text-white hover:bg-mui-primary-dark shadow-mui',
  outline:
    'border border-mui-border bg-white text-mui-primary hover:bg-mui-surface',
  ghost:
    'text-mui-primary hover:bg-mui-surface',
  cozyGradient:
    'bg-mui-primary text-white shadow-mui hover:bg-mui-primary-dark active:bg-mui-primary',
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
      className={`inline-flex items-center justify-center gap-2 rounded-mui px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mui-primary/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
