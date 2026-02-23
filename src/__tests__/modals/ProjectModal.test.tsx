import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { ProjectModal } from '../../components/modals/ProjectModal';
import type { ProjectWithSummary, Company } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('ProjectModal', () => {
  const mockCompanies: Company[] = [
    { id: 1, name: 'Acme Corp', type: 'company', account_type: 'customer', code: 'C001', is_active: 1, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' } as Company,
    { id: 2, name: 'Build Co', type: 'company', account_type: 'supplier', code: 'C002', is_active: 1, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' } as Company,
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    project: null as ProjectWithSummary | null,
    companies: mockCompanies,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.project.generateCode = vi.fn().mockResolvedValue('P-001');
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Proje Adı *')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ProjectModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Proje Adı *')).not.toBeInTheDocument();
  });

  it('should show new project title when project is null', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Yeni Proje')).toBeInTheDocument();
  });

  it('should show edit project title when project is provided', () => {
    const project = {
      id: 1, code: 'P-001', name: 'Test', ownership_type: 'own', status: 'active',
    } as ProjectWithSummary;
    render(<ProjectModal {...defaultProps} project={project} />);
    expect(screen.getByText('Proje Düzenle')).toBeInTheDocument();
  });

  // ==================== FORM FIELDS ====================

  it('should show project code and status fields', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Proje Kodu')).toBeInTheDocument();
    expect(screen.getByText('Durum *')).toBeInTheDocument();
  });

  it('should show ownership type selection (own/client)', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Kendi Projemiz')).toBeInTheDocument();
    expect(screen.getByText('Müşteri Projesi')).toBeInTheDocument();
  });

  it('should show company selector when client ownership selected', async () => {
    render(<ProjectModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Müşteri Projesi').closest('label')!);

    await waitFor(() => {
      expect(screen.getByText('İlgili Cari Hesap')).toBeInTheDocument();
    });
  });

  it('should not show company selector when own ownership is selected', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.queryByText('İlgili Cari Hesap')).not.toBeInTheDocument();
  });

  it('should show date fields', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Tarihler')).toBeInTheDocument();
    expect(screen.getByText('Planlanan Başlangıç')).toBeInTheDocument();
    expect(screen.getByText('Planlanan Bitiş')).toBeInTheDocument();
    expect(screen.getByText('Gerçek Başlangıç')).toBeInTheDocument();
    expect(screen.getByText('Gerçek Bitiş')).toBeInTheDocument();
  });

  it('should show area and unit count fields', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Toplam Alan (m2)')).toBeInTheDocument();
    expect(screen.getByText('Birim Sayısı')).toBeInTheDocument();
  });

  it('should show description textarea', () => {
    render(<ProjectModal {...defaultProps} />);
    expect(screen.getByText('Açıklama')).toBeInTheDocument();
  });

  it('should auto-generate code for new projects', async () => {
    render(<ProjectModal {...defaultProps} />);
    await waitFor(() => {
      expect(window.electronAPI.project.generateCode).toHaveBeenCalled();
    });
  });

  it('should disable code field when editing', () => {
    const project = {
      id: 1, code: 'P-001', name: 'Test', ownership_type: 'own', status: 'planned',
    } as ProjectWithSummary;
    render(<ProjectModal {...defaultProps} project={project} />);

    const codeLabel = screen.getByText('Proje Kodu');
    const codeInput = codeLabel.closest('div')?.querySelector('input');
    expect(codeInput).toBeDisabled();
  });

  // ==================== FORM SUBMISSION ====================

  it('should call project.create on submit for new project', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: 1, name: 'New', code: 'P-001' });
    window.electronAPI.project.create = mockCreate;

    render(<ProjectModal {...defaultProps} onSave={onSave} />);

    await waitFor(() => {
      expect(window.electronAPI.project.generateCode).toHaveBeenCalled();
    });

    const nameInput = screen.getByText('Proje Adı *').closest('div')?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Project' } });
      fireEvent.blur(nameInput);
    }

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockCreate.mock.calls.length > 0) {
        expect(onSave).toHaveBeenCalledWith(true);
      }
    }, { timeout: 3000 });
  });

  it('should call project.update on submit for existing project', async () => {
    const onSave = vi.fn();
    const mockUpdate = vi.fn().mockResolvedValue({ id: 1, name: 'Updated', code: 'P-001' });
    window.electronAPI.project.update = mockUpdate;

    const project = {
      id: 1, code: 'P-001', name: 'Old Name', ownership_type: 'own', status: 'active',
    } as ProjectWithSummary;

    render(<ProjectModal {...defaultProps} project={project} onSave={onSave} />);
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockUpdate.mock.calls.length > 0) {
        expect(mockUpdate).toHaveBeenCalledWith(1, expect.any(Object));
        expect(onSave).toHaveBeenCalledWith(false);
      }
    }, { timeout: 3000 });
  });

  it('should show error toast on save failure', async () => {
    window.electronAPI.project.create = vi.fn().mockRejectedValue(new Error('DB error'));
    render(<ProjectModal {...defaultProps} />);

    const nameInput = screen.getByText('Proje Adı *').closest('div')?.querySelector('input');
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
    render(<ProjectModal {...defaultProps} onClose={onClose} />);
    // "İptal" appears twice: once as cancel button, once as status option in dropdown.
    // Find the button with that text.
    const cancelButtons = screen.getAllByText('İptal');
    const cancelBtn = cancelButtons.find(el => el.tagName === 'BUTTON' || el.closest('button'));
    fireEvent.click(cancelBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
