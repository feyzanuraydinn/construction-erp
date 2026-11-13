import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { BalanceBadge, StatusBadge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ListFilterBar } from '../../components/shared/ListFilterBar';
import { BulkDeleteAction } from '../../components/shared/PageActions';
import { AgingTab } from '../../pages/analytics-components/AgingTab';

describe('className forwarding', () => {
  it('lets a caller class win over a conflicting badge size class', () => {
    render(<BalanceBadge amount={10} size="sm" className="text-lg" />);
    const badge = screen.getByText(/10/).closest('span');
    expect(badge).toHaveClass('text-lg');
    expect(badge).not.toHaveClass('text-xs');
  });

  it('passes className through StatusBadge to the badge element', () => {
    const { container } = render(<StatusBadge status="active" className="ml-2" />);
    expect(container.firstChild).toHaveClass('ml-2');
  });

  it('adds className to table header and body', () => {
    const { container } = render(
      <Table>
        <TableHeader className="sticky">
          <TableRow>
            <TableCell>h</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          <TableRow>
            <TableCell>b</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(container.querySelector('thead')).toHaveClass('sticky');
    expect(container.querySelector('tbody')).toHaveClass('text-xs');
  });

  it('forwards className to the dialog panel', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="T"
        message="M"
        className="max-w-sm"
      />
    );
    expect(screen.getByRole('alertdialog')).toHaveClass('max-w-sm');
  });

  it('replaces the filter bar margin when the caller sets one', () => {
    const { container } = render(
      <ListFilterBar
        search=""
        onSearch={vi.fn()}
        searchPlaceholder="Ara"
        filters={[]}
        className="mb-2"
      />
    );
    const card = container.firstElementChild;
    expect(card).toHaveClass('mb-2');
    expect(card).not.toHaveClass('mb-6');
  });

  it('puts className on the bulk delete button', () => {
    render(
      <BulkDeleteAction count={2} label="Sil" onClick={vi.fn()} divider="before" className="ml-1" />
    );
    expect(screen.getByRole('button', { name: 'Sil' })).toHaveClass('ml-1');
  });

  it('wraps tab content in an element carrying className', () => {
    const { container } = render(<AgingTab agingData={[]} className="mt-4" />);
    expect(container.firstElementChild).toHaveClass('mt-4');
  });
});
