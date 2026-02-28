'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface ClozeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ClozeInputHandle {
  focus: () => void;
  clear: () => void;
}

const ClozeInput = forwardRef<ClozeInputHandle, ClozeInputProps>(
  ({ value, onChange, onSubmit, disabled = false, placeholder = 'Type the missing word...' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      clear: () => {
        onChange('');
        inputRef.current?.focus();
      },
    }));

    useEffect(() => {
      // Auto-focus on mount
      inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !disabled && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`flex-1 rounded-xl border-2 px-4 py-3 text-lg font-medium transition-all outline-none
            ${disabled
              ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
              : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20'
            }`}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={`shrink-0 rounded-xl px-6 py-3 text-lg font-semibold transition-all
            ${disabled || !value.trim()
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
        >
          Check
        </button>
      </div>
    );
  }
);

ClozeInput.displayName = 'ClozeInput';

export default ClozeInput;
