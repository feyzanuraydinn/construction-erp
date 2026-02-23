import React, {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  memo,
  useId,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';

interface SelectOption {
  value: string | number;
  label: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: IconType;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon: Icon, className = '', id: externalId, ...props },
  ref
) {
  const autoId = useId();
  const inputId = externalId || autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full px-3 py-2 border rounded-lg
            bg-white dark:bg-gray-800 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:focus:ring-blue-400 dark:focus:border-blue-400
            placeholder-gray-400 dark:placeholder-gray-500
            transition-all duration-200
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
          {...props}
        />
      </div>
      {error && <p id={errorId} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
});

export const Select = memo(function Select({
  label,
  error,
  options = [],
  placeholder,
  className = '',
  id: externalId,
  ...props
}: SelectProps) {
  const { t } = useTranslation();
  const autoId = useId();
  const selectId = externalId || autoId;
  const errorId = `${selectId}-error`;
  const displayPlaceholder = placeholder ?? t('common.select');
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`
          w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:focus:ring-blue-400 dark:focus:border-blue-400
          transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        {...props}
      >
        <option value="">{displayPlaceholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = '', rows = 3, id: externalId, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = externalId || autoId;
  const errorId = `${textareaId}-error`;
  return (
    <div className={className}>
      {label && <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`
          w-full px-3 py-2 border rounded-lg
          bg-white dark:bg-gray-800 dark:text-gray-100
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:focus:ring-blue-400 dark:focus:border-blue-400
          placeholder-gray-400 dark:placeholder-gray-500
          transition-all duration-200 resize-none
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
});
