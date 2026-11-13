import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';

interface DocumentNoInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function DocumentNoInput({ value, onChange, placeholder, className }: DocumentNoInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      label={t('common.documentNo')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
