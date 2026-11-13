import type { IconType } from 'react-icons';
import { MutedText } from '../../components/shared/DetailFields';
import { cn } from '../../utils/cn';

const TONES = {
  green: { box: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
  blue: { box: 'bg-blue-100 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
};

interface BackupFileInfoProps {
  icon: IconType;
  iconSize: number;
  tone: keyof typeof TONES;
  title: string;
  detail: string;
  className?: string;
}

export function BackupFileInfo({
  icon: Icon,
  iconSize,
  tone,
  title,
  detail,
  className,
}: BackupFileInfoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('p-2 rounded-lg', TONES[tone].box)}>
        <Icon size={iconSize} className={TONES[tone].icon} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
        <MutedText className="text-xs">{detail}</MutedText>
      </div>
    </div>
  );
}
