import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-warmGray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-warmGray-200 bg-white px-4 py-2.5 text-sm text-warmGray-800 placeholder:text-warmGray-400 transition-colors focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30 ${error ? 'border-cozy-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-cozy-500">{error}</p>}
    </div>
  );
}
