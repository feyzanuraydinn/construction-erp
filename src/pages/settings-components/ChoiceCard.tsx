import type { IconType } from 'react-icons';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MutedText } from '../../components/shared/DetailFields';

const SELECTED_CHOICE_CLASS =
  '!bg-blue-50 dark:!bg-blue-900/20 !border-blue-500 !text-blue-700 dark:!text-blue-400';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: IconType;
}

interface ChoiceCardProps<T extends string> {
  title: string;
  description: string;
  options: readonly ChoiceOption<T>[];
  selected: string;
  onSelect: (value: T) => void;
  className?: string;
}

export function ChoiceCard<T extends string>({
  title,
  description,
  options,
  selected,
  onSelect,
  className,
}: ChoiceCardProps<T>) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <MutedText className="text-sm mt-1">{description}</MutedText>
      </CardHeader>
      <CardBody>
        <div className="flex gap-3">
          {options.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              icon={option.icon}
              onClick={() => onSelect(option.value)}
              aria-pressed={selected === option.value}
              className={selected === option.value ? SELECTED_CHOICE_CLASS : undefined}
            >
              {t(option.label)}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
