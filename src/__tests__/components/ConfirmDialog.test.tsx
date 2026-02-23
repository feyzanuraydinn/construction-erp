import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
  };

  it('should render when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

    const cancelButtons = screen.getAllByRole('button');
    const cancelButton = cancelButtons.find(btn => btn.textContent !== defaultProps.title);
    if (cancelButton) fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} confirmText="Delete" />);

    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('should display custom confirm text', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Yes, delete" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
  });

  it('should display custom cancel text', () => {
    render(<ConfirmDialog {...defaultProps} cancelText="No, keep" />);
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('should render with danger type', () => {
    render(<ConfirmDialog {...defaultProps} type="danger" />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should render with warning type', () => {
    render(<ConfirmDialog {...defaultProps} type="warning" />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });
});
