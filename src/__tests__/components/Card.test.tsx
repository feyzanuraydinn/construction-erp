import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply hover styles when hover prop is true', () => {
    const { container } = render(<Card hover>Hover card</Card>);
    expect(container.firstChild).toHaveClass('card-hover');
  });

  it('should add cursor-pointer when hover is true', () => {
    const { container } = render(<Card hover onClick={vi.fn()}>Clickable</Card>);
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable</Card>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledOnce();
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

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});

describe('Card composition', () => {
  it('should render full card with header, body, and footer', () => {
    render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardBody>Main content</CardBody>
        <CardFooter>Actions</CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
