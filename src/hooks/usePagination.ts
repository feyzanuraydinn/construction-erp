/**
 * Pagination Hook
 *
 * Provides client-side pagination functionality for lists and tables.
 * Manages current page, page size, and calculates derived values.
 *
 * @module usePagination
 *
 * @example
 * ```tsx
 * const pagination = usePagination({ totalItems: 100 });
 *
 * // Slice your data
 * const paginatedData = data.slice(pagination.startIndex, pagination.endIndex);
 *
 * // Render pagination controls
 * <Pagination {...pagination} onPageChange={pagination.setPage} />
 * ```
 */

import { useState, useMemo, useCallback } from 'react';

/** Current pagination state */
export interface PaginationState {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
}

/** Options for initializing the usePagination hook */
export interface UsePaginationOptions {
  /** Starting page number (default: 1) */
  initialPage?: number;
  /** Initial items per page (default: 25) */
  initialPageSize?: number;
  /** Total count of items to paginate */
  totalItems: number;
}

/** Return value of the usePagination hook */
export interface UsePaginationReturn extends PaginationState {
  /** Navigate to a specific page */
  setPage: (page: number) => void;
  /** Change the number of items per page (resets to page 1) */
  setPageSize: (size: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  prevPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Whether there is a next page available */
  canNextPage: boolean;
  /** Whether there is a previous page available */
  canPrevPage: boolean;
  /** Array of page numbers to display in pagination UI */
  pageNumbers: number[];
  /** Starting index for current page slice (0-indexed) */
  startIndex: number;
  /** Ending index for current page slice (exclusive) */
  endIndex: number;
  /** Alias for setPage */
  goToPage: (page: number) => void;
  /** Alias for nextPage */
  goToNextPage: () => void;
  /** Alias for prevPage */
  goToPrevPage: () => void;
  /** Alias for firstPage */
  goToFirstPage: () => void;
  /** Alias for lastPage */
  goToLastPage: () => void;
}

/**
 * Custom hook for managing pagination state
 *
 * @param options - Pagination configuration options
 * @returns Pagination state and control methods
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = 25,
  totalItems,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  // Adjust current page if it exceeds total pages
  const validCurrentPage = useMemo(
    () => Math.min(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const canNextPage = validCurrentPage < totalPages;
  const canPrevPage = validCurrentPage > 1;

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const setPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  const nextPage = useCallback(() => {
    if (canNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [canNextPage]);

  const prevPage = useCallback(() => {
    if (canPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [canPrevPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Generate page numbers to display (max 5 pages around current)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, validCurrentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [validCurrentPage, totalPages]);

  return {
    currentPage: validCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    canNextPage,
    canPrevPage,
    pageNumbers,
    startIndex,
    endIndex,
    // Aliases
    goToPage: setPage,
    goToNextPage: nextPage,
    goToPrevPage: prevPage,
    goToFirstPage: firstPage,
    goToLastPage: lastPage,
  };
}

/**
 * Converts a usePagination return value into props for the <Pagination> component.
 * Eliminates the 16-line prop spreading pattern repeated across every listing page.
 */
export function getPaginationProps(p: UsePaginationReturn) {
  return {
    currentPage: p.currentPage,
    totalPages: p.totalPages,
    totalItems: p.totalItems,
    pageSize: p.pageSize,
    startIndex: p.startIndex,
    endIndex: p.endIndex,
    pageNumbers: p.pageNumbers,
    canPrevPage: p.canPrevPage,
    canNextPage: p.canNextPage,
    onPageChange: p.goToPage,
    onPageSizeChange: p.setPageSize,
    onFirstPage: p.goToFirstPage,
    onLastPage: p.goToLastPage,
    onPrevPage: p.goToPrevPage,
    onNextPage: p.goToNextPage,
  };
}

/**
 * Utility function to paginate an array client-side
 *
 * @param items - Array of items to paginate
 * @param page - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Sliced array for the specified page
 *
 * @example
 * ```ts
 * const allItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const page2 = paginateArray(allItems, 2, 3); // [4, 5, 6]
 * ```
 */
export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
