import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { PrintPreviewModal } from '../../components/modals/PrintPreviewModal';

// Mock usePrint hook
const mockExecutePrint = vi.fn();
vi.mock('../../hooks/usePrint', () => ({
  usePrint: () => ({ executePrint: mockExecutePrint }),
}));

describe('PrintPreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div data-testid="print-content">Invoice #123</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    expect(screen.getByText('Yazdırma Önizleme')).toBeInTheDocument();
  });

  it('should not render modal content when isOpen is false', () => {
    render(<PrintPreviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Yazdırma Önizleme')).not.toBeInTheDocument();
  });

  it('should render children content', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    // Children rendered both in modal and hidden print-view; use getAllByText
    const els = screen.getAllByText('Invoice #123');
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it('should render close and print buttons', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    expect(screen.getByText('Kapat')).toBeInTheDocument();
    expect(screen.getByText('Yazdır')).toBeInTheDocument();
  });

  // ==================== ACTIONS ====================

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<PrintPreviewModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Kapat'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should call executePrint when print button is clicked', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Yazdır'));
    expect(mockExecutePrint).toHaveBeenCalledOnce();
  });

  // ==================== PRINT STYLES ====================

  it('should render hidden print view', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    const printView = document.querySelector('.print-view');
    expect(printView).toBeInTheDocument();
  });

  it('should include print CSS styles', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    const styleElements = document.querySelectorAll('style');
    const printStyle = Array.from(styleElements).find(s =>
      s.textContent?.includes('@media print')
    );
    expect(printStyle).toBeTruthy();
  });

  // ==================== A4 LAYOUT ====================

  it('should have A4 width container', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    const a4Container = document.querySelector('[style*="max-width: 210mm"]');
    expect(a4Container).toBeInTheDocument();
  });

  it('should render with xl size modal', () => {
    render(<PrintPreviewModal {...defaultProps} />);
    const modal = document.querySelector('.max-w-4xl');
    expect(modal).toBeInTheDocument();
  });
});
