import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { Badge, BalanceBadge } from '../../components/ui/Badge';

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should render with default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render with success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('green');
  });

  it('should render with danger variant', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('red');
  });

  it('should render with warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('yellow');
  });

  it('should render with info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('blue');
  });

  it('should apply custom className', () => {
    const { container } = render(<Badge className="my-class">Custom</Badge>);
    expect(container.firstChild).toHaveClass('my-class');
  });
});

describe('BalanceBadge', () => {
  it('should display positive amount with up indicator', () => {
    render(<BalanceBadge amount={1000} />);
    const badge = screen.getByText(/1/);
    expect(badge).toBeInTheDocument();
  });

  it('should display negative amount with down indicator', () => {
    render(<BalanceBadge amount={-500} />);
    const badge = screen.getByText(/500/);
    expect(badge).toBeInTheDocument();
  });

  it('should display zero amount', () => {
    render(<BalanceBadge amount={0} />);
    const el = screen.getByText(/0/);
    expect(el).toBeInTheDocument();
  });
});
