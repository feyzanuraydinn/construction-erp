import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { AmountInput } from './AmountInput';

interface AmountFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
}

function amountValue(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

export function AmountField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  required,
  className,
}: AmountFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <AmountInput
          label={label}
          name={field.name}
          value={amountValue(field.value)}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          error={error}
          required={required}
          className={className}
        />
      )}
    />
  );
}
