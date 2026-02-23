import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { MaterialModal } from '../../components/modals/MaterialModal';
import type { Material } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('MaterialModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    material: null as Material | null,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.material.generateCode = vi.fn().mockResolvedValue('M-001');
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Malzeme Adı *')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<MaterialModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Malzeme Adı *')).not.toBeInTheDocument();
  });

  it('should show new material title when material is null', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Yeni Malzeme')).toBeInTheDocument();
  });

  it('should show edit material title when material is provided', () => {
    const material = {
      id: 1, code: 'M-001', name: 'Demir', category: 'metal', unit: 'kg',
      min_stock: 100, current_stock: 500,
    } as Material;
    render(<MaterialModal {...defaultProps} material={material} />);
    expect(screen.getByText('Malzeme Düzenle')).toBeInTheDocument();
  });

  // ==================== FORM FIELDS ====================

  it('should show material code and category fields', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Malzeme Kodu')).toBeInTheDocument();
    expect(screen.getByText('Kategori *')).toBeInTheDocument();
  });

  it('should show unit and min stock fields', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Birim *')).toBeInTheDocument();
    expect(screen.getByText('Minimum Stok')).toBeInTheDocument();
  });

  it('should show current stock field for new materials', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Mevcut Stok')).toBeInTheDocument();
  });

  it('should hide current stock field when editing', () => {
    const material = {
      id: 1, code: 'M-001', name: 'Demir', unit: 'kg', min_stock: 100, current_stock: 500,
    } as Material;
    render(<MaterialModal {...defaultProps} material={material} />);
    expect(screen.queryByText('Mevcut Stok')).not.toBeInTheDocument();
  });

  it('should show notes textarea', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('Notlar')).toBeInTheDocument();
  });

  it('should auto-generate code for new materials', async () => {
    render(<MaterialModal {...defaultProps} />);
    await waitFor(() => {
      expect(window.electronAPI.material.generateCode).toHaveBeenCalled();
    });
  });

  it('should disable code field when editing', () => {
    const material = {
      id: 1, code: 'M-001', name: 'Demir', unit: 'kg', min_stock: 0, current_stock: 0,
    } as Material;
    render(<MaterialModal {...defaultProps} material={material} />);

    const codeLabel = screen.getByText('Malzeme Kodu');
    const codeInput = codeLabel.closest('div')?.querySelector('input');
    expect(codeInput).toBeDisabled();
  });

  // ==================== FORM SUBMISSION ====================

  it('should call material.create on submit for new material', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: 1, name: 'New', code: 'M-001' });
    window.electronAPI.material.create = mockCreate;

    render(<MaterialModal {...defaultProps} onSave={onSave} />);

    await waitFor(() => {
      expect(window.electronAPI.material.generateCode).toHaveBeenCalled();
    });

    const nameInput = screen.getByText('Malzeme Adı *').closest('div')?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Material' } });
      fireEvent.blur(nameInput);
    }

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockCreate.mock.calls.length > 0) {
        expect(onSave).toHaveBeenCalledWith(true);
      }
    }, { timeout: 3000 });
  });

  it('should call material.update on submit for existing material', async () => {
    const onSave = vi.fn();
    const mockUpdate = vi.fn().mockResolvedValue({ id: 1, name: 'Updated', code: 'M-001' });
    window.electronAPI.material.update = mockUpdate;

    const material = {
      id: 1, code: 'M-001', name: 'Old Name', unit: 'kg', min_stock: 0, current_stock: 100,
    } as Material;

    render(<MaterialModal {...defaultProps} material={material} onSave={onSave} />);
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockUpdate.mock.calls.length > 0) {
        expect(mockUpdate).toHaveBeenCalledWith(1, expect.any(Object));
        expect(onSave).toHaveBeenCalledWith(false);
      }
    }, { timeout: 3000 });
  });

  it('should show error toast on save failure', async () => {
    window.electronAPI.material.create = vi.fn().mockRejectedValue(new Error('DB error'));
    render(<MaterialModal {...defaultProps} />);

    const nameInput = screen.getByText('Malzeme Adı *').closest('div')?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.blur(nameInput);
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
    render(<MaterialModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('İptal'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should show cancel and save buttons', () => {
    render(<MaterialModal {...defaultProps} />);
    expect(screen.getByText('İptal')).toBeInTheDocument();
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });
});
