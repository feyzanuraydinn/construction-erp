import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { Pagination } from '../../components/ui/Pagination';

function createPaginationProps(overrides = {}) {
  return {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    startIndex: 1,
    endIndex: 10,
    pageNumbers: [1, 2, 3, 4, 5],
    canPrevPage: false,
    canNextPage: true,
    onPageChange: vi.fn(),
    onFirstPage: vi.fn(),
    onLastPage: vi.fn(),
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    ...overrides,
  };
}

describe('Pagination', () => {
  it('should render pagination navigation', () => {
    render(<Pagination {...createPaginationProps()} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render page buttons', () => {
    render(<Pagination {...createPaginationProps()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onPageChange when page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...createPaginationProps({ onPageChange })} />);
    fireEvent.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onNextPage when next button is clicked', () => {
    const onNextPage = vi.fn();
    render(<Pagination {...createPaginationProps({ onNextPage })} />);
    // Find the next page button by aria-label
    const nextBtn = screen.getByLabelText(/next|sonraki|ileri/i);
    fireEvent.click(nextBtn);
    expect(onNextPage).toHaveBeenCalledOnce();
  });

  it('should disable prev button on first page', () => {
    render(<Pagination {...createPaginationProps({ canPrevPage: false })} />);
    const prevBtn = screen.getByLabelText(/prev|önceki|geri|first|ilk/i);
    expect(prevBtn).toBeDisabled();
  });

  it('should disable last page button on last page', () => {
    render(
      <Pagination
        {...createPaginationProps({
          currentPage: 5,
          canNextPage: false,
          canPrevPage: true,
        })}
      />
    );
    // Find all disabled buttons
    const allButtons = screen.getAllByRole('button');
    const disabledButtons = allButtons.filter((btn) => btn.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should not render when totalItems is 0', () => {
    const { container } = render(
      <Pagination {...createPaginationProps({ totalItems: 0 })} />
    );
    expect(container.querySelector('nav')).not.toBeInTheDocument();
  });

  it('should show record count', () => {
    render(<Pagination {...createPaginationProps()} />);
    // Should show something like "1-10 / 50"
    expect(screen.getByText(/1.*10.*50|50/)).toBeInTheDocument();
  });
});
