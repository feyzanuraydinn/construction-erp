import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// Initialize i18n before importing components that use useTranslation()
import '../../i18n';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { FiSearch, FiMail } from 'react-icons/fi';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      render(<Input placeholder="No label" />);
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<Input error="Bu alan zorunludur" />);
      expect(screen.getByText('Bu alan zorunludur')).toBeInTheDocument();
    });

    it('should apply error styles when error prop is provided', () => {
      render(<Input error="Error" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('border-red-500');
    });

    it('should not show error message when no error', () => {
      render(<Input placeholder="No error" />);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      render(<Input icon={FiSearch} data-testid="input" />);
      const container = screen.getByTestId('input').parentElement;
      expect(container?.querySelector('svg')).toBeInTheDocument();
    });

    it('should add padding for icon', () => {
      render(<Input icon={FiMail} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('pl-10');
    });
  });

  describe('Events', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} data-testid="input" />);
      fireEvent.change(screen.getByTestId('input'), {
        target: { value: 'test' },
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onBlur when input loses focus', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} data-testid="input" />);
      fireEvent.blur(screen.getByTestId('input'));
      expect(handleBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} data-testid="input" />);
      fireEvent.focus(screen.getByTestId('input'));
      expect(handleFocus).toHaveBeenCalled();
    });
  });

  describe('Forwarded Ref', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Input
          type="email"
          required
          maxLength={100}
          data-testid="email-input"
        />
      );
      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('maxLength', '100');
    });
  });
});

describe('Select Component', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ];

  describe('Rendering', () => {
    it('should render select element', () => {
      render(<Select options={options} data-testid="select" />);
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('should render default placeholder', () => {
      render(<Select options={options} />);
      expect(screen.getByText('Seçiniz...')).toBeInTheDocument();
    });

    it('should render custom placeholder', () => {
      render(<Select options={options} placeholder="Select an option" />);
      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={options} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Select options={options} label="Category" />);
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Select options={options} error="Please select an option" />);
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    it('should apply error styles', () => {
      render(<Select options={options} error="Error" data-testid="select" />);
      const select = screen.getByTestId('select');
      expect(select.className).toContain('border-red-500');
    });
  });

  describe('Events', () => {
    it('should call onChange when selection changes', () => {
      const handleChange = vi.fn();
      render(
        <Select options={options} onChange={handleChange} data-testid="select" />
      );
      fireEvent.change(screen.getByTestId('select'), {
        target: { value: '2' },
      });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Value', () => {
    it('should display selected value', () => {
      render(<Select options={options} value="2" data-testid="select" />);
      const select = screen.getByTestId('select') as HTMLSelectElement;
      expect(select.value).toBe('2');
    });
  });
});

describe('Textarea Component', () => {
  describe('Rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea placeholder="Enter description" />);
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should have default rows of 3', () => {
      render(<Textarea data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('rows', '3');
    });

    it('should accept custom rows', () => {
      render(<Textarea rows={5} data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toHaveAttribute('rows', '5');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Textarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styles', () => {
      render(<Textarea error="Error" data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      expect(textarea.className).toContain('border-red-500');
    });
  });

  describe('Events', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Textarea onChange={handleChange} data-testid="textarea" />);
      fireEvent.change(screen.getByTestId('textarea'), {
        target: { value: 'test content' },
      });
      expect(handleChange).toHaveBeenCalled();
    });
  });
});
