import { useTranslation } from 'react-i18next';
import { categoryLabel } from '../../utils/categories';
import { cn } from '../../utils/cn';

interface CategoryChipProps {
  name: string | null | undefined;
  color: string | null | undefined;
  className?: string;
}

export function CategoryChip({ name, color, className }: CategoryChipProps) {
  const { t } = useTranslation();
  if (!name) return <span className={className}>-</span>;
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs', className)}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      {categoryLabel(t, name)}
    </span>
  );
}
