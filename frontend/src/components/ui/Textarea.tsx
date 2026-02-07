import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-warmGray-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full rounded-xl border border-warmGray-200 bg-white px-4 py-3 text-sm text-warmGray-800 placeholder:text-warmGray-400 transition-colors focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30 resize-y min-h-[100px] ${error ? 'border-cozy-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-cozy-500">{error}</p>}
    </div>
  );
}
