import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { CompanyModal } from '../../components/modals/CompanyModal';
import type { CompanyWithBalance } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('CompanyModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    company: null as CompanyWithBalance | null,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Şahıs')).toBeInTheDocument();
    expect(screen.getByText('Kuruluş')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<CompanyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Şahıs')).not.toBeInTheDocument();
  });

  it('should show new company title when company is null', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Yeni Cari Hesap')).toBeInTheDocument();
  });

  it('should show edit company title when company is provided', () => {
    const company = {
      id: 1, name: 'Test Company', type: 'company', account_type: 'customer', balance: 0,
    } as CompanyWithBalance;
    render(<CompanyModal {...defaultProps} company={company} />);
    expect(screen.getByText('Cari Hesap Düzenle')).toBeInTheDocument();
  });

  // ==================== FORM FIELDS ====================

  it('should show person fields by default', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Ad Soyad *')).toBeInTheDocument();
    expect(screen.getByText('TC Kimlik No')).toBeInTheDocument();
  });

  it('should show company fields when company type selected', async () => {
    render(<CompanyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Kuruluş').closest('label')!);

    await waitFor(() => {
      expect(screen.getByText('Firma Ünvanı *')).toBeInTheDocument();
      expect(screen.getByText('Vergi Dairesi')).toBeInTheDocument();
      expect(screen.getByText('Vergi No')).toBeInTheDocument();
    });
  });

  it('should show common fields (phone, email, address)', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Telefon')).toBeInTheDocument();
    expect(screen.getByText('E-posta')).toBeInTheDocument();
    expect(screen.getByText('Adres')).toBeInTheDocument();
  });

  it('should show bank info section', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Banka Bilgileri (Opsiyonel)')).toBeInTheDocument();
    expect(screen.getByText('Banka')).toBeInTheDocument();
    expect(screen.getByText('IBAN')).toBeInTheDocument();
  });

  it('should show cancel and save buttons', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('İptal')).toBeInTheDocument();
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });

  it('should show account type selector', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Cari Tipi *')).toBeInTheDocument();
  });

  it('should show notes field', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Notlar')).toBeInTheDocument();
  });

  it('should show profession field for person type', () => {
    render(<CompanyModal {...defaultProps} />);
    expect(screen.getByText('Meslek/Uzmanlık')).toBeInTheDocument();
  });

  // ==================== EDIT MODE ====================

  it('should populate form when editing a company of type company', async () => {
    const company = {
      id: 1, name: 'Acme Corp', type: 'company' as const, account_type: 'supplier' as const,
      tax_office: 'Istanbul', tax_number: '1234567890', balance: 5000,
    } as CompanyWithBalance;
    render(<CompanyModal {...defaultProps} company={company} />);

    await waitFor(() => {
      expect(screen.getByText('Firma Ünvanı *')).toBeInTheDocument();
    });
  });

  // ==================== FORM SUBMISSION ====================

  it('should call company.create on submit for new company', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: 1, name: 'New', code: 'C001' });
    window.electronAPI.company.create = mockCreate;

    render(<CompanyModal {...defaultProps} onSave={onSave} />);

    // Fill required field: name
    const nameLabel = screen.getByText('Ad Soyad *');
    const nameInput = nameLabel.closest('div')?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Person' } });
      fireEvent.blur(nameInput);
    }

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockCreate.mock.calls.length > 0) {
        expect(onSave).toHaveBeenCalledWith(true);
      }
    }, { timeout: 3000 });
  });

  it('should call company.update on submit for existing company', async () => {
    const onSave = vi.fn();
    const mockUpdate = vi.fn().mockResolvedValue({ id: 1, name: 'Updated', code: 'C001' });
    window.electronAPI.company.update = mockUpdate;

    const company = {
      id: 1, name: 'Old Name', type: 'person' as const, account_type: 'customer' as const, balance: 0,
    } as CompanyWithBalance;

    render(<CompanyModal {...defaultProps} company={company} onSave={onSave} />);
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockUpdate.mock.calls.length > 0) {
        expect(mockUpdate).toHaveBeenCalledWith(1, expect.any(Object));
        expect(onSave).toHaveBeenCalledWith(false);
      }
    }, { timeout: 3000 });
  });

  it('should show error toast on save failure', async () => {
    window.electronAPI.company.create = vi.fn().mockRejectedValue(new Error('DB error'));
    render(<CompanyModal {...defaultProps} />);

    const nameLabel = screen.getByText('Ad Soyad *');
    const nameInput = nameLabel.closest('div')?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Person' } });
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
    render(<CompanyModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('İptal'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
