import React, { forwardRef } from 'react';
import { cn } from '@/lib/utilidades';

export interface CampoTextoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  ayuda?: string;
}

export const CampoTexto = forwardRef<HTMLInputElement, CampoTextoProps>(
  ({ label, error, ayuda, className, type, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        const allowedKeys = [
          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
        ];
        if (!allowedKeys.includes(e.key)) {
          e.preventDefault();
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        const pastedText = e.clipboardData.getData('text');
        if (!/^\d+$/.test(pastedText)) {
          e.preventDefault();
        }
      }
    };

    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-gray-700 ml-1">{label}</label>
        <input
          ref={ref}
          type={type}
          inputMode={type === 'number' ? 'numeric' : 'text'}
          pattern={type === 'number' ? '[0-9]*' : undefined}
          className={cn(
            "block w-full rounded-2xl border border-gray-200 px-4 py-4 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-unt-primary focus:ring-4 focus:ring-unt-primary/5 focus:outline-none bg-slate-50/50 hover:bg-white",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/5" : "hover:border-gray-300",
            className
          )}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-bold text-red-600 ml-1">{error}</p>}
        {ayuda && !error && <p className="mt-1 text-[10px] font-medium text-gray-400 ml-1 uppercase tracking-wider">{ayuda}</p>}
      </div>
    );
  }
);

CampoTexto.displayName = 'CampoTexto';
