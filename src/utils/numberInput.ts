export interface NumberFormat {
  group: string;
  decimal: string;
}

const MAX_INTEGER_DIGITS = 13;

export function numberFormatFor(language: string): NumberFormat {
  return language.startsWith('tr') ? { group: '.', decimal: ',' } : { group: ',', decimal: '.' };
}

export function toCanonical(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return value.trim();
}

export function canonicalToNumber(canonical: string): number {
  const parsed = parseFloat(canonical);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatGrouped(canonical: string, format: NumberFormat): string {
  if (canonical === '') return '';
  const [integerPart, decimalPart] = canonical.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.group);
  return decimalPart === undefined ? grouped : `${grouped}${format.decimal}${decimalPart}`;
}

export function parseTyped(text: string, format: NumberFormat, decimals: number): string {
  let integerDigits = '';
  let decimalDigits = '';
  let seenDecimal = false;
  for (const char of text) {
    if (char >= '0' && char <= '9') {
      if (seenDecimal) {
        if (decimalDigits.length < decimals) decimalDigits += char;
      } else if (integerDigits.length < MAX_INTEGER_DIGITS) {
        integerDigits += char;
      }
    } else if (char === format.decimal && decimals > 0 && !seenDecimal) {
      seenDecimal = true;
    }
  }
  if (integerDigits === '' && !seenDecimal) return '';
  const integer = integerDigits.replace(/^0+(?=\d)/, '') || '0';
  return seenDecimal ? `${integer}.${decimalDigits}` : integer;
}

function isSignificant(char: string, format: NumberFormat): boolean {
  return (char >= '0' && char <= '9') || char === format.decimal;
}

export function countSignificant(text: string, caret: number, format: NumberFormat): number {
  let count = 0;
  for (let i = 0; i < caret && i < text.length; i += 1) {
    if (isSignificant(text[i], format)) count += 1;
  }
  return count;
}

export function caretForSignificant(text: string, count: number, format: NumberFormat): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (isSignificant(text[i], format)) seen += 1;
    if (seen === count) return i + 1;
  }
  return text.length;
}

export function normalizePasted(text: string, format: NumberFormat): string {
  const cleaned = text.replace(/[^\d.,]/g, '');
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalIndex = -1;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else if (lastDot !== -1 || lastComma !== -1) {
    const index = Math.max(lastDot, lastComma);
    const separator = cleaned[index];
    const occurrences = cleaned.split(separator).length - 1;
    const digitsAfter = cleaned.length - index - 1;
    if (occurrences === 1 && digitsAfter !== 3) decimalIndex = index;
    if (occurrences === 1 && digitsAfter === 3 && separator === format.decimal)
      decimalIndex = index;
  }
  let result = '';
  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    if (char >= '0' && char <= '9') result += char;
    else if (i === decimalIndex) result += format.decimal;
  }
  return result;
}
