import { describe, it, expect } from 'vitest';
import { isRecord, pickOption, toText } from '../../utils/typeGuards';
import { cn } from '../../utils/cn';
import { CURRENCIES } from '../../utils/constants';

describe('isRecord', () => {
  it('accepts objects and rejects everything else', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('text')).toBe(false);
    expect(isRecord(3)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe('pickOption', () => {
  it('returns the matching option value and nothing for unknown values', () => {
    expect(pickOption(CURRENCIES, 'USD')).toBe('USD');
    expect(pickOption(CURRENCIES, 'GBP')).toBeUndefined();
    expect(pickOption(CURRENCIES, '')).toBeUndefined();
  });
});

describe('toText', () => {
  it('keeps strings and turns empty values into an empty string', () => {
    expect(toText('2026-01-05')).toBe('2026-01-05');
    expect(toText(12)).toBe('12');
    expect(toText(null)).toBe('');
    expect(toText(undefined)).toBe('');
  });
});

describe('cn', () => {
  it('joins conditional classes and lets the later conflicting class win', () => {
    const disabled = false;
    expect(cn('px-2 py-1', disabled && 'opacity-50', 'text-sm')).toBe('px-2 py-1 text-sm');
    expect(cn('p-6', 'p-2')).toBe('p-2');
    expect(cn('text-gray-700', undefined, 'text-red-600')).toBe('text-red-600');
  });
});
