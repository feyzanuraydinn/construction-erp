import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../components/ui/Button';
import { FiPlus, FiTrash } from 'react-icons/fi';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click Me');
    });

    it('should render with default variant (primary)', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-blue-600');
    });

    it('should render with default size (md)', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4 py-2');
    });
  });

  describe('Variants', () => {
    it('should apply primary variant styles', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-blue-600');
      expect(button.className).toContain('text-white');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gray-200');
      expect(button.className).toContain('text-gray-700');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-600');
    });

    it('should apply success variant styles', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-green-600');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('border-gray-300');
    });
  });

  describe('Sizes', () => {
    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3 py-1.5');
      expect(button.className).toContain('text-sm');
    });

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6 py-3');
      expect(button.className).toContain('text-lg');
    });
  });

  describe('Icons', () => {
    it('should render icon on the left by default', () => {
      render(<Button icon={FiPlus}>Add Item</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should render icon on the right when specified', () => {
      render(
        <Button icon={FiTrash} iconPosition="right">
          Delete
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should hide children text when loading', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveTextContent('Submit');
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
    });
  });

  describe('Click Handler', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Click
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Click
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Button type="submit" data-testid="submit-btn">
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('data-testid', 'submit-btn');
    });
  });
});
