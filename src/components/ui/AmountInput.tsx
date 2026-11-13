import React, { InputHTMLAttributes, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './Input';
import {
  canonicalToNumber,
  caretForSignificant,
  countSignificant,
  formatGrouped,
  normalizePasted,
  numberFormatFor,
  parseTyped,
  toCanonical,
} from '../../utils/numberInput';

interface AmountInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  value: string | number | null | undefined;
  onValueChange: (value: string) => void;
  decimals?: number;
  label?: string;
  error?: string;
  bare?: boolean;
}

export function AmountInput({
  value,
  onValueChange,
  decimals = 2,
  label,
  error,
  bare = false,
  className = '',
  onBlur,
  ...rest
}: AmountInputProps) {
  const { i18n } = useTranslation();
  const format = numberFormatFor(i18n.language);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [canonical, setCanonical] = useState(() => toCanonical(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const incoming = toCanonical(value);
  const differsFromValue = canonicalToNumber(canonical) !== canonicalToNumber(incoming);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (differsFromValue) setCanonical(incoming);
  }

  const text = formatGrouped(canonical, format);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current === null || !input || document.activeElement !== input) return;
    const position = caretForSignificant(text, pendingCaret.current, format);
    pendingCaret.current = null;
    input.setSelectionRange(position, position);
  });

  const apply = (raw: string, significantBeforeCaret: number) => {
    const next = parseTyped(raw, format, decimals);
    pendingCaret.current = significantBeforeCaret;
    if (next === canonical) {
      const input = inputRef.current;
      if (input) {
        input.value = text;
        const position = caretForSignificant(text, significantBeforeCaret, format);
        input.setSelectionRange(position, position);
      }
      return;
    }
    setCanonical(next);
    onValueChange(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    apply(raw, countSignificant(raw, caret, format));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    rest.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    if (start !== (input.selectionEnd ?? 0)) return;
    if (e.key === 'Backspace' && start >= 2 && text[start - 1] === format.group) {
      e.preventDefault();
      const raw = text.slice(0, start - 2) + text.slice(start - 1);
      apply(raw, countSignificant(text, start - 2, format));
    } else if (e.key === 'Delete' && text[start] === format.group) {
      e.preventDefault();
      const raw = text.slice(0, start + 1) + text.slice(start + 2);
      apply(raw, countSignificant(text, start, format));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = normalizePasted(e.clipboardData.getData('text'), format);
    if (pasted === '') return;
    e.preventDefault();
    const input = e.currentTarget;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const raw = text.slice(0, start) + pasted + text.slice(end);
    apply(
      raw,
      countSignificant(text, start, format) + countSignificant(pasted, pasted.length, format)
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (canonical === '' && differsFromValue) {
      setCanonical(incoming);
    } else if (canonical.endsWith('.')) {
      const trimmed = canonical.slice(0, -1);
      setCanonical(trimmed);
      onValueChange(trimmed);
    }
    onBlur?.(e);
  };

  const inputMode: 'decimal' | 'numeric' = decimals > 0 ? 'decimal' : 'numeric';
  const inputProps = {
    ...rest,
    ref: inputRef,
    type: 'text',
    inputMode,
    autoComplete: 'off',
    value: text,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
    onBlur: handleBlur,
  };

  if (bare) return <input {...inputProps} className={className} />;
  return <Input {...inputProps} label={label} error={error} className={className} />;
}
