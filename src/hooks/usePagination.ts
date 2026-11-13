import { useState, useMemo, useCallback, useEffect } from 'react';

export const DEFAULT_PAGE_SIZE = 25;
const VISIBLE_PAGE_NUMBERS = 5;

interface UsePaginationOptions {
  totalItems: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  canNextPage: boolean;
  canPrevPage: boolean;
  pageNumbers: number[];
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

export function usePagination({
  totalItems,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UsePaginationOptions): UsePaginationReturn {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const canNextPage = currentPage < totalPages;
  const canPrevPage = currentPage > 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback(
    (page: number) => setRequestedPage(Math.max(1, Math.min(page, totalPages))),
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setRequestedPage(1);
  }, []);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const firstPage = useCallback(() => setRequestedPage(1), []);
  const lastPage = useCallback(() => setRequestedPage(totalPages), [totalPages]);

  const pageNumbers = useMemo(() => {
    let start = Math.max(1, currentPage - Math.floor(VISIBLE_PAGE_NUMBERS / 2));
    const end = Math.min(totalPages, start + VISIBLE_PAGE_NUMBERS - 1);
    start = Math.max(1, Math.min(start, end - VISIBLE_PAGE_NUMBERS + 1));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    canNextPage,
    canPrevPage,
    pageNumbers,
    startIndex,
    endIndex,
    goToPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
  };
}

export function paginateArray<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function usePaginatedItems<T>(
  items: readonly T[],
  resetKey: string,
  pageSize = DEFAULT_PAGE_SIZE
) {
  const pagination = usePagination({ totalItems: items.length, initialPageSize: pageSize });
  const { firstPage, currentPage, pageSize: size } = pagination;

  useEffect(() => {
    firstPage();
  }, [resetKey, firstPage]);

  const pageItems = useMemo(
    () => paginateArray(items, currentPage, size),
    [items, currentPage, size]
  );

  return { pagination, pageItems };
}

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
    onFirstPage: p.firstPage,
    onLastPage: p.lastPage,
    onPrevPage: p.prevPage,
    onNextPage: p.nextPage,
  };
}
