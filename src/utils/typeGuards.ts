export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function pickOption<T extends string>(
  options: readonly { value: T }[],
  value: string
): T | undefined {
  return options.find((option) => option.value === value)?.value;
}

export function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  return value === null || value === undefined ? '' : String(value);
}
