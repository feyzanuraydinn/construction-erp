import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { CommandPalette } from '../../components/ui/CommandPalette';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => mockToast }));

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.company.getAll = vi
      .fn()
      .mockResolvedValue([{ id: 3, name: 'Şahin Yapı', phone: '0532' }]);
    window.electronAPI.project.getAll = vi
      .fn()
      .mockResolvedValue([{ id: 4, name: 'Konut', code: 'PRJ-001' }]);
    window.electronAPI.material.getAll = vi
      .fn()
      .mockResolvedValue([{ id: 5, name: 'Çimento', code: 'MLZ-001' }]);
  });

  it('finds records in every list and opens the chosen one', async () => {
    render(<CommandPalette isOpen onClose={vi.fn()} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'yapı' } });
    const hit = await screen.findByText('Şahin Yapı');
    fireEvent.click(hit);
    expect(mockNavigate).toHaveBeenCalledWith('/companies/3');

    fireEvent.change(input, { target: { value: 'mlz' } });
    expect(await screen.findByText('Çimento')).toBeInTheDocument();
  });

  it('loads the lists only while open', async () => {
    const { rerender } = render(<CommandPalette isOpen={false} onClose={vi.fn()} />);
    expect(window.electronAPI.company.getAll).not.toHaveBeenCalled();
    rerender(<CommandPalette isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(window.electronAPI.company.getAll).toHaveBeenCalledOnce());
  });
});
