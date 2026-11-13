import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  memo,
  useId,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import type { SelectOption } from '../../types';
import { cn } from '../../utils/cn';

const FIELD_CLASS =
  'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200';
const PLACEHOLDER_CLASS = 'placeholder-gray-400 dark:placeholder-gray-500';

function fieldBorderClass(error?: string): string {
  return error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600';
}

function errorAria(error: string | undefined, errorId: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  };
}

export function FieldLabel({
  htmlFor,
  label,
  className,
}: {
  htmlFor?: string;
  label?: string;
  className?: string;
}) {
  if (!label) return null;
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1', className)}
    >
      {label}
    </label>
  );
}

function FieldError({ id, error, className }: { id: string; error?: string; className?: string }) {
  if (!error) return null;
  return (
    <p
      id={id}
      className={cn('mt-1 text-sm text-red-500 dark:text-red-400', className)}
      role="alert"
    >
      {error}
    </p>
  );
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
      <FieldLabel htmlFor={inputId} label={label} />
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          {...errorAria(error, errorId)}
          className={`${FIELD_CLASS} ${PLACEHOLDER_CLASS} ${Icon ? 'pl-10' : ''} ${fieldBorderClass(error)}`}
          {...props}
        />
      </div>
      <FieldError id={errorId} error={error} />
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
      <FieldLabel htmlFor={selectId} label={label} />
      <select
        id={selectId}
        {...errorAria(error, errorId)}
        className={`${FIELD_CLASS} ${fieldBorderClass(error)}`}
        {...props}
      >
        <option value="">{displayPlaceholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} error={error} />
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
      <FieldLabel htmlFor={textareaId} label={label} />
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        {...errorAria(error, errorId)}
        className={`${FIELD_CLASS} ${PLACEHOLDER_CLASS} resize-none ${fieldBorderClass(error)}`}
        {...props}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
});
