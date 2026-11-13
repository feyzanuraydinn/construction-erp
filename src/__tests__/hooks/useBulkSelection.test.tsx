import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { i18n } from '../../i18n';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { Table, TableHeader, TableBody, TableRow } from '../../components/ui/Table';
import { SelectAllHeadCell, RowCheckboxCell } from '../../components/ui/SelectAllCheckbox';
import { OwnershipBadge } from '../../components/ui/Badge';

const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('useBulkSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops selected rows that are no longer visible', () => {
    const { result, rerender } = renderHook(
      ({ visibleItems }) =>
        useBulkSelection({
          visibleItems,
          deleteFn: vi.fn(),
          entityKey: 'stock',
          onDeleted: vi.fn(),
        }),
      { initialProps: { visibleItems: rows } }
    );
    act(() => result.current.handleSelectAll([1, 2, 3], true));
    rerender({ visibleItems: [rows[1]] });
    expect([...result.current.selectedIds]).toEqual([2]);
  });

  it('deletes the selection, uses the given success message and reloads', async () => {
    const deleteFn = vi.fn().mockResolvedValue({ success: true });
    const onDeleted = vi.fn();
    const { result } = renderHook(() =>
      useBulkSelection({
        visibleItems: rows,
        deleteFn,
        entityKey: 'stock',
        successKey: 'stock.bulkDeleteMaterialSuccess',
        onDeleted,
      })
    );
    act(() => {
      result.current.handleSelectOne(1, true);
      result.current.handleSelectOne(3, true);
      result.current.setBulkDeleteConfirm(true);
    });
    await act(async () => {
      await result.current.handleBulkDelete();
    });

    expect(deleteFn.mock.calls.map(([id]) => id)).toEqual([1, 3]);
    expect(mockToast.success).toHaveBeenCalledWith(
      i18n.t('stock.bulkDeleteMaterialSuccess', { count: 2 })
    );
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.bulkDeleteConfirm).toBe(false);
  });
});

describe('selection cells', () => {
  it('select the page and single rows without triggering the row click', () => {
    const onSelectAll = vi.fn();
    const onSelectOne = vi.fn();
    const onRowClick = vi.fn();
    render(
      <Table>
        <TableHeader>
          <TableRow hover={false}>
            <SelectAllHeadCell
              itemIds={[4, 5]}
              selectedIds={new Set([4])}
              onSelectAll={onSelectAll}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow onClick={onRowClick}>
            <RowCheckboxCell id={5} selectedIds={new Set([4])} onSelectOne={onSelectOne} />
          </TableRow>
        </TableBody>
      </Table>
    );

    const [all, row] = screen.getAllByRole('checkbox');
    expect(all).not.toBeChecked();
    fireEvent.click(all);
    expect(onSelectAll).toHaveBeenCalledWith([4, 5], true);
    fireEvent.click(row);
    expect(onSelectOne).toHaveBeenCalledWith(5, true);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('OwnershipBadge', () => {
  it('shows the long label by default and the short one with an icon on lists', () => {
    const { rerender } = render(<OwnershipBadge ownership="own" />);
    expect(screen.getByText(i18n.t('enums.ownershipType.own'))).toBeInTheDocument();

    rerender(<OwnershipBadge ownership="client" short withIcon />);
    const badge = screen.getByText(i18n.t('enums.ownershipTypeShort.client'));
    expect(badge.querySelector('svg')).not.toBeNull();
  });
});
