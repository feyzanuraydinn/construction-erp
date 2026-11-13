import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';
import { BudgetBar } from '../../components/ui/BudgetBar';
import { SidebarLink } from '../../components/SidebarLink';

function fillOf(container: HTMLElement): HTMLElement {
  const fill = container.firstElementChild?.firstElementChild;
  if (!(fill instanceof HTMLElement)) throw new Error('fill not found');
  return fill;
}

describe('BudgetBar', () => {
  it('turns from green to yellow to red as the budget is used up', () => {
    expect(fillOf(render(<BudgetBar percent={50} />).container).className).toContain(
      'bg-green-500'
    );
    expect(fillOf(render(<BudgetBar percent={80} />).container).className).toContain(
      'bg-green-500'
    );
    expect(fillOf(render(<BudgetBar percent={95} />).container).className).toContain(
      'bg-yellow-500'
    );
    expect(fillOf(render(<BudgetBar percent={101} />).container).className).toContain('bg-red-500');
  });

  it('never draws past the end of the bar', () => {
    expect(fillOf(render(<BudgetBar percent={140} />).container).style.width).toBe('100%');
  });
});

describe('SidebarLink', () => {
  it('shows the label when open and only a tooltip when collapsed', () => {
    const { rerender } = render(
      <MemoryRouter>
        <SidebarLink to="/" icon={FiHome} label="Dashboard" collapsed={false} />
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <SidebarLink to="/" icon={FiHome} label="Dashboard" collapsed />
      </MemoryRouter>
    );
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('title', 'Dashboard');
  });
});
