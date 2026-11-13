import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { AmountInput } from '../../components/ui/AmountInput';
import {
  formatGrouped,
  normalizePasted,
  numberFormatFor,
  parseTyped,
} from '../../utils/numberInput';

const tr = numberFormatFor('tr');
const en = numberFormatFor('en');

describe('number input helpers', () => {
  it('groups thousands with dots and uses a decimal comma in Turkish', () => {
    expect(formatGrouped('400000', tr)).toBe('400.000');
    expect(formatGrouped('1234567.5', tr)).toBe('1.234.567,5');
    expect(formatGrouped('400000.', tr)).toBe('400.000,');
    expect(formatGrouped('1234567.5', en)).toBe('1,234,567.5');
  });

  it('reads what was typed, ignoring the grouping dots', () => {
    expect(parseTyped('400.0000', tr, 2)).toBe('4000000');
    expect(parseTyped('1.234,567', tr, 2)).toBe('1234.56');
    expect(parseTyped('007', tr, 2)).toBe('7');
    expect(parseTyped(',5', tr, 2)).toBe('0.5');
    expect(parseTyped('12a3', tr, 2)).toBe('123');
    expect(parseTyped('34,56789', tr, 4)).toBe('34.5678');
    expect(parseTyped('', tr, 2)).toBe('');
  });

  it('understands pasted amounts in either style', () => {
    expect(normalizePasted('1.234.567,89', tr)).toBe('1234567,89');
    expect(normalizePasted('1,234,567.89', tr)).toBe('1234567,89');
    expect(normalizePasted('1234567.89', tr)).toBe('1234567,89');
    expect(normalizePasted('400.000', tr)).toBe('400000');
    expect(normalizePasted('₺ 12.500,00', tr)).toBe('12500,00');
  });
});

function Harness({ initial = '', decimals = 2 }: { initial?: string; decimals?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <AmountInput label="Tutar" value={value} onValueChange={setValue} decimals={decimals} />
      <span data-testid="value">{value}</span>
    </>
  );
}

const input = () => {
  const element = screen.getByLabelText('Tutar');
  if (!(element instanceof HTMLInputElement)) throw new Error('amount input not found');
  return element;
};
const typeAt = (text: string, caret: number) => {
  fireEvent.change(input(), {
    target: { value: text, selectionStart: caret, selectionEnd: caret },
  });
};

describe('AmountInput', () => {
  it('shows thousands separated while keeping a plain value for the form', () => {
    render(<Harness />);
    typeAt('400000', 6);
    expect(input().value).toBe('400.000');
    expect(screen.getByTestId('value').textContent).toBe('400000');
    typeAt('400.000,5', 9);
    expect(input().value).toBe('400.000,5');
    expect(screen.getByTestId('value').textContent).toBe('400000.5');
  });

  it('shows a saved amount grouped', () => {
    render(<Harness initial="1234567.89" />);
    expect(input().value).toBe('1.234.567,89');
  });

  it('keeps the caret next to the digit typed in the middle', () => {
    render(<Harness initial="999" />);
    input().focus();
    typeAt('9199', 2);
    expect(input().value).toBe('9.199');
    expect(input().selectionStart).toBe(3);
  });

  it('deletes the digit before a dot instead of getting stuck on the dot', () => {
    render(<Harness initial="1234" />);
    input().focus();
    input().setSelectionRange(2, 2);
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(input().value).toBe('234');
    expect(screen.getByTestId('value').textContent).toBe('234');
  });

  it('deletes the digit after a dot with the Delete key', () => {
    render(<Harness initial="1234" />);
    input().focus();
    input().setSelectionRange(1, 1);
    fireEvent.keyDown(input(), { key: 'Delete' });
    expect(input().value).toBe('134');
    expect(input().selectionStart).toBe(1);
  });

  it('takes a pasted amount', () => {
    render(<Harness />);
    input().focus();
    fireEvent.paste(input(), { clipboardData: { getData: () => '12.500,75' } });
    expect(input().value).toBe('12.500,75');
    expect(screen.getByTestId('value').textContent).toBe('12500.75');
  });

  it('drops a trailing decimal comma when leaving the field', () => {
    const onValueChange = vi.fn();
    render(<AmountInput label="Tutar" value="" onValueChange={onValueChange} />);
    typeAt('15,', 3);
    expect(input().value).toBe('15,');
    fireEvent.blur(input());
    expect(onValueChange).toHaveBeenLastCalledWith('15');
  });

  it('shows the value in use again when a cleared field loses focus', () => {
    render(<AmountInput label="Tutar" value="38.5" decimals={4} onValueChange={vi.fn()} />);
    typeAt('', 0);
    expect(input().value).toBe('');
    fireEvent.blur(input());
    expect(input().value).toBe('38,5');
  });

  it('follows a value changed from outside (e.g. capped by the form)', () => {
    function Capped() {
      const [value, setValue] = useState('');
      return (
        <AmountInput
          label="Tutar"
          value={value}
          onValueChange={(v) => setValue(String(Math.min(parseFloat(v) || 0, 2000)))}
        />
      );
    }
    render(<Capped />);
    typeAt('5000', 4);
    expect(input().value).toBe('2.000');
  });
});
