import { FiSearch } from 'react-icons/fi';
import { Card, CardBody } from '../ui/Card';
import { Input, Select } from '../ui/Input';
import { cn } from '../../utils/cn';

interface ListFilter {
  value: string;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder: string;
  className?: string;
}

interface ListFilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  filters: ListFilter[];
  className?: string;
}

export function ListFilterBar({
  search,
  onSearch,
  searchPlaceholder,
  filters,
  className,
}: ListFilterBarProps) {
  return (
    <Card className={cn('mb-6', className)}>
      <CardBody>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={searchPlaceholder}
              icon={FiSearch}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          {filters.map((filter) => (
            <div key={filter.placeholder} className={filter.className ?? 'w-40'}>
              <Select
                options={filter.options}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                placeholder={filter.placeholder}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
