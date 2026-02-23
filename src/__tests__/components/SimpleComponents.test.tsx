import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Divider } from '../../components/ui/Divider';
import { TabGroup } from '../../components/ui/TabGroup';
import { StatCard } from '../../components/ui/StatCard';
import { SelectAllCheckbox, RowCheckbox } from '../../components/ui/SelectAllCheckbox';

// ==================== LoadingSpinner ====================
describe('LoadingSpinner', () => {
  it('should render with role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have aria-label for accessibility', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label');
  });

  it('should apply custom className', () => {
    const { container } = render(<LoadingSpinner className="py-20" />);
    expect(container.firstChild).toHaveClass('py-20');
  });
});

// ==================== EmptyState ====================
describe('EmptyState', () => {
  it('should render default title', () => {
    render(<EmptyState />);
    // Default uses i18n key emptyState.noData
    const el = screen.getByText(/./); // some text should exist
    expect(el).toBeInTheDocument();
  });

  it('should render custom title and description', () => {
    render(<EmptyState title="No items" description="Try adding one" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Try adding one')).toBeInTheDocument();
  });

  it('should render action button when action and actionLabel provided', () => {
    const handleAction = vi.fn();
    render(<EmptyState action={handleAction} actionLabel="Add Item" />);
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it('should not render action button when no action provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ==================== Divider ====================
describe('Divider', () => {
  it('should render vertical divider by default', () => {
    const { container } = render(<Divider />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('w-px');
  });

  it('should render horizontal divider', () => {
    const { container } = render(<Divider direction="horizontal" />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('h-px');
  });

  it('should apply custom className', () => {
    const { container } = render(<Divider className="my-4" />);
    expect(container.firstChild).toHaveClass('my-4');
  });
});

// ==================== TabGroup ====================
describe('TabGroup', () => {
  const tabs = [
    { key: 'tab1', label: 'Tab 1' },
    { key: 'tab2', label: 'Tab 2' },
    { key: 'tab3', label: 'Tab 3' },
  ];

  it('should render all tabs', () => {
    render(<TabGroup tabs={tabs} activeTab="tab1" onChange={vi.fn()} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('should mark active tab with aria-selected', () => {
    render(<TabGroup tabs={tabs} activeTab="tab2" onChange={vi.fn()} />);
    const activeTab = screen.getByText('Tab 2').closest('button');
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onChange when tab is clicked', () => {
    const onChange = vi.fn();
    render(<TabGroup tabs={tabs} activeTab="tab1" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tab 3'));
    expect(onChange).toHaveBeenCalledWith('tab3');
  });

  it('should set tabIndex=-1 for inactive tabs', () => {
    render(<TabGroup tabs={tabs} activeTab="tab1" onChange={vi.fn()} />);
    const inactiveTab = screen.getByText('Tab 2').closest('button');
    expect(inactiveTab).toHaveAttribute('tabIndex', '-1');
  });
});

// ==================== StatCard ====================
describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Revenue" value="₺100,000" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('₺100,000')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(<StatCard title="Revenue" value="₺100,000" subtitle="Last month" />);
    expect(screen.getByText('Last month')).toBeInTheDocument();
  });

  it('should render trend indicator when provided', () => {
    render(<StatCard title="Revenue" value="₺100,000" trend="up" trendValue="+15%" />);
    // trend arrow and value are in the same span: "↑ +15%"
    expect(screen.getByText(/\+15%/)).toBeInTheDocument();
  });
});

// ==================== SelectAllCheckbox ====================
describe('SelectAllCheckbox', () => {
  it('should render unchecked when no items selected', () => {
    const onSelectAll = vi.fn();
    render(
      <SelectAllCheckbox
        itemIds={[1, 2, 3]}
        selectedIds={new Set()}
        onSelectAll={onSelectAll}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render checked when all items selected', () => {
    const onSelectAll = vi.fn();
    render(
      <SelectAllCheckbox
        itemIds={[1, 2, 3]}
        selectedIds={new Set([1, 2, 3])}
        onSelectAll={onSelectAll}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onSelectAll with true when clicked while unchecked', () => {
    const onSelectAll = vi.fn();
    render(
      <SelectAllCheckbox
        itemIds={[1, 2, 3]}
        selectedIds={new Set()}
        onSelectAll={onSelectAll}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onSelectAll).toHaveBeenCalledWith([1, 2, 3], true);
  });
});

describe('RowCheckbox', () => {
  it('should render unchecked when id not in selectedIds', () => {
    render(
      <RowCheckbox
        id={1}
        selectedIds={new Set()}
        onSelectOne={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('should render checked when id in selectedIds', () => {
    render(
      <RowCheckbox
        id={1}
        selectedIds={new Set([1])}
        onSelectOne={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should call onSelectOne when clicked', () => {
    const onSelectOne = vi.fn();
    render(
      <RowCheckbox
        id={1}
        selectedIds={new Set()}
        onSelectOne={onSelectOne}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onSelectOne).toHaveBeenCalledWith(1, true);
  });
});
