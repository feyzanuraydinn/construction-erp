import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<CardHeader className="header-class">Header</CardHeader>);
    expect(container.firstChild).toHaveClass('header-class');
  });
});

describe('CardBody', () => {
  it('should render children', () => {
    render(<CardBody>Body content</CardBody>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

describe('Card composition', () => {
  it('should render full card with header and body', () => {
    render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardBody>Main content</CardBody>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });
});
