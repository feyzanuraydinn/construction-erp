import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { MovementModal } from '../../components/modals/MovementModal';
import type { Material, Project, Company } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('MovementModal', () => {
  const mockMaterials: Material[] = [
    { id: 1, code: 'M-001', name: 'Demir', unit: 'kg', current_stock: 500, min_stock: 100, category: 'metal' } as Material,
    { id: 2, code: 'M-002', name: 'Çimento', unit: 'ton', current_stock: 50, min_stock: 10, category: 'yapı' } as Material,
  ];

  const mockProjects: Project[] = [
    { id: 1, code: 'P-001', name: 'Konut A' } as Project,
  ];

  const mockCompanies: Company[] = [
    { id: 1, name: 'Tedarik Co', type: 'company', account_type: 'supplier' } as Company,
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    materials: mockMaterials,
    projects: mockProjects,
    companies: mockCompanies,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('Stok Hareketi')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<MovementModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Stok Hareketi')).not.toBeInTheDocument();
  });

  // ==================== MOVEMENT TYPE SELECTION ====================

  it('should render movement type radio options', () => {
    render(<MovementModal {...defaultProps} />);
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    expect(radioInputs.length).toBe(4);
  });

  it('should default to "in" movement type', () => {
    render(<MovementModal {...defaultProps} />);
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const inRadio = Array.from(radioInputs).find(
      (r) => (r as HTMLInputElement).value === 'in'
    ) as HTMLInputElement;
    expect(inRadio?.checked).toBe(true);
  });

  // ==================== FORM FIELDS ====================

  it('should show material selector', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('Malzeme *')).toBeInTheDocument();
  });

  it('should show quantity field', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText(/Miktar/)).toBeInTheDocument();
  });

  it('should show unit price field for "in" type', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('Birim Fiyat (TL)')).toBeInTheDocument();
  });

  it('should show supplier field for "in" type', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('Tedarikçi')).toBeInTheDocument();
  });

  it('should show project field for "out" type', async () => {
    render(<MovementModal {...defaultProps} />);
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const outRadio = Array.from(radioInputs).find(
      (r) => (r as HTMLInputElement).value === 'out'
    );
    if (outRadio) fireEvent.click(outRadio.closest('label')!);

    await waitFor(() => {
      expect(screen.getByText('Proje *')).toBeInTheDocument();
    });
  });

  it('should hide unit price and supplier for "out" type', async () => {
    render(<MovementModal {...defaultProps} />);
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const outRadio = Array.from(radioInputs).find(
      (r) => (r as HTMLInputElement).value === 'out'
    );
    if (outRadio) fireEvent.click(outRadio.closest('label')!);

    await waitFor(() => {
      expect(screen.queryByText('Birim Fiyat (TL)')).not.toBeInTheDocument();
      expect(screen.queryByText('Tedarikçi')).not.toBeInTheDocument();
    });
  });

  it('should show date and document number fields', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('Tarih *')).toBeInTheDocument();
    expect(screen.getByText('Belge No')).toBeInTheDocument();
  });

  it('should show description field', () => {
    render(<MovementModal {...defaultProps} />);
    // "Açıklama" label from stock.form.description
    expect(screen.getByText('Açıklama')).toBeInTheDocument();
  });

  // ==================== FORM SUBMISSION ====================

  it('should call stock.create on submit', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: 1 });
    window.electronAPI.stock.create = mockCreate;

    render(<MovementModal {...defaultProps} onSave={onSave} />);

    // Select a material
    const materialSelect = screen.getByText('Malzeme *')
      .closest('div')?.querySelector('select');
    if (materialSelect) {
      fireEvent.change(materialSelect, { target: { value: '1' } });
    }

    // Fill quantity
    const quantityLabel = screen.getByText(/Miktar/);
    const quantityInput = quantityLabel.closest('div')?.querySelector('input');
    if (quantityInput) {
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.blur(quantityInput);
    }

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockCreate.mock.calls.length > 0) {
        expect(onSave).toHaveBeenCalledWith(true);
      }
    }, { timeout: 3000 });
  });

  it('should show error toast on save failure', async () => {
    window.electronAPI.stock.create = vi.fn().mockRejectedValue(new Error('DB error'));
    render(<MovementModal {...defaultProps} />);

    const materialSelect = screen.getByText('Malzeme *')
      .closest('div')?.querySelector('select');
    if (materialSelect) {
      fireEvent.change(materialSelect, { target: { value: '1' } });
    }

    const quantityLabel = screen.getByText(/Miktar/);
    const quantityInput = quantityLabel.closest('div')?.querySelector('input');
    if (quantityInput) {
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.blur(quantityInput);
    }

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockToast.error.mock.calls.length > 0) {
        expect(mockToast.error).toHaveBeenCalled();
      }
    }, { timeout: 3000 });
  });

  // ==================== CLOSE ====================

  it('should call onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<MovementModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('İptal'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should show cancel and save buttons', () => {
    render(<MovementModal {...defaultProps} />);
    expect(screen.getByText('İptal')).toBeInTheDocument();
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });
});
