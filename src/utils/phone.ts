export function formatPhoneDigits(digits: string): string {
  let formatted = '';
  if (digits.length >= 1) formatted += digits[0];
  if (digits.length >= 2) formatted += '(' + digits[1];
  if (digits.length >= 3) formatted += digits[2];
  if (digits.length >= 4) formatted += digits[3] + ') ';
  if (digits.length >= 5) formatted += digits[4];
  if (digits.length >= 6) formatted += digits[5];
  if (digits.length >= 7) formatted += digits[6] + ' ';
  if (digits.length >= 8) formatted += digits[7];
  if (digits.length >= 9) formatted += digits[8] + ' ';
  if (digits.length >= 10) formatted += digits[9];
  if (digits.length >= 11) formatted += digits[10];
  return formatted;
}

export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trimStart();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return '+' + digits.slice(0, 15);
  if (digits.length === 0) return '';
  const national = (digits.startsWith('0') ? digits : '0' + digits).slice(0, 11);
  return formatPhoneDigits(national);
}

export function removeLastPhoneDigit(value: string): string {
  if (value.startsWith('+')) {
    const shorter = value.slice(0, -1);
    return shorter === '+' ? '' : shorter;
  }
  const digits = value.replace(/\D/g, '').slice(0, -1);
  return digits.length === 0 ? '' : formatPhoneDigits(digits);
}
