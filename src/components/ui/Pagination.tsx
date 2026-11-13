import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { cn } from '../../utils/cn';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  pageNumbers: number[];
  canPrevPage: boolean;
  canNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  className?: string;
}

export const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  startIndex,
  endIndex,
  pageNumbers,
  canPrevPage,
  canNextPage,
  onPageChange,
  onPageSizeChange,
  onFirstPage,
  onLastPage,
  onPrevPage,
  onNextPage,
  className,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalItems === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t('pagination.navigation')}
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="hidden sm:flex sm:items-center sm:gap-4 sm:invisible">
        <span className="text-sm">0 - 0 / 0 {t('pagination.records')}</span>
        <select className="px-2 py-1 border rounded-md text-sm">
          <option>10</option>
        </select>
      </div>

      <div className="flex items-center gap-1">
        <NavButton
          icon={FiChevronsLeft}
          label={t('pagination.firstPage')}
          enabled={canPrevPage}
          onClick={onFirstPage}
        />
        <NavButton
          icon={FiChevronLeft}
          label={t('pagination.prevPage')}
          enabled={canPrevPage}
          onClick={onPrevPage}
        />

        <div className="flex items-center gap-1 mx-2">
          {pageNumbers[0] > 1 && (
            <>
              <PageButton page={1} currentPage={currentPage} onClick={onPageChange} />
              {pageNumbers[0] > 2 && (
                <span className="px-2 text-gray-400 dark:text-gray-500">...</span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <PageButton key={page} page={page} currentPage={currentPage} onClick={onPageChange} />
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-2 text-gray-400 dark:text-gray-500">...</span>
              )}
              <PageButton page={totalPages} currentPage={currentPage} onClick={onPageChange} />
            </>
          )}
        </div>

        <NavButton
          icon={FiChevronRight}
          label={t('pagination.nextPage')}
          enabled={canNextPage}
          onClick={onNextPage}
        />
        <NavButton
          icon={FiChevronsRight}
          label={t('pagination.lastPage')}
          enabled={canNextPage}
          onClick={onLastPage}
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          <span className="font-medium">{startIndex + 1}</span>
          {' - '}
          <span className="font-medium">{endIndex}</span>
          {' / '}
          <span className="font-medium">{totalItems}</span> {t('pagination.records')}
        </span>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={t('pagination.pageSize')}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        )}
      </div>
    </nav>
  );
});

interface NavButtonProps {
  icon: IconType;
  label: string;
  enabled: boolean;
  onClick: () => void;
  className?: string;
}

function NavButton({ icon: Icon, label, enabled, onClick, className }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      aria-label={label}
      title={label}
      className={cn(
        'p-2 rounded-md transition-colors',
        enabled
          ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
        className
      )}
    >
      <Icon size={18} />
    </button>
  );
}

interface PageButtonProps {
  page: number;
  currentPage: number;
  onClick: (page: number) => void;
  className?: string;
}

const PageButton = memo(function PageButton({
  page,
  currentPage,
  onClick,
  className,
}: PageButtonProps) {
  const isActive = page === currentPage;

  return (
    <button
      onClick={() => onClick(page)}
      aria-label={`${page}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-600 text-white dark:bg-blue-500'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
        className
      )}
    >
      {page}
    </button>
  );
});
