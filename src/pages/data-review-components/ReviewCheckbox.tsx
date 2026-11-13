interface ReviewCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function ReviewCheckbox({ checked, onChange, label, className }: ReviewCheckboxProps) {
  return (
    <input
      type="checkbox"
      className={className}
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
