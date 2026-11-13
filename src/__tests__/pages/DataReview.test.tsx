import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '../../i18n';
import DataReview from '../../pages/DataReview';
import type { DataReviewReport } from '../../database/dataReview';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const emptyDangling = {
  categories: 0,
  linkedInvoices: 0,
  clientCompanies: 0,
  stockLinks: 0,
  allocations: 0,
  parties: 0,
  projectTags: 0,
};

function report(overrides: Partial<DataReviewReport> = {}): DataReviewReport {
  return {
    completed: false,
    completedAt: null,
    amountFixes: [],
    dangling: emptyDangling,
    orphans: [],
    rateIssues: [],
    allocationIssues: [],
    unmatchedPayments: [],
    legacyFirmPayments: [],
    baseline: null,
    totalsNow: { income: 0, expense: 0, collected: 0, paid: 0 },
    projectEffects: [],
    ...overrides,
  };
}

const wages = {
  id: 3,
  type: 'payment_out' as const,
  scope: 'project' as const,
  description: 'Usta yevmiye',
  date: '2026-01-12',
  currency: 'TRY' as const,
  amount: 3000,
  amountTry: 3000,
  unmatched: 3000,
  companyId: 2,
  companyName: 'Usta Ali',
  companyType: 'person',
  projectId: 10,
  projectName: 'Merkez',
  matchable: 0,
  rest: 3000,
  countedByOldProjectPage: true,
  advanceAllowed: true,
  suggestedCategoryId: 31,
};

describe('DataReview page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.category.getAll = vi.fn().mockResolvedValue([
      {
        id: 31,
        name: 'Diğer Gider',
        type: 'invoice_in',
        color: '#000',
        is_default: 1,
        created_at: '',
      },
      { id: 32, name: 'İşçilik', type: 'invoice_in', color: '#000', is_default: 1, created_at: '' },
    ]);
  });

  it('moves the selected orphans to the trash in the repairs step', async () => {
    window.electronAPI.review.getReport = vi.fn().mockResolvedValue(
      report({
        orphans: [
          {
            id: 10,
            type: 'invoice_in',
            scope: 'cari',
            description: 'Silinen carinin faturası',
            date: '2026-01-08',
            currency: 'TRY',
            amount: 900,
            amountTry: 900,
            missing: 'company',
            missingId: 4,
          },
          {
            id: 15,
            type: 'invoice_in',
            scope: 'project',
            description: 'Silinen projenin gideri',
            date: '2026-01-09',
            currency: 'TRY',
            amount: 300,
            amountTry: 300,
            missing: 'project',
            missingId: 11,
          },
        ],
      })
    );
    window.electronAPI.review.applyRepairs = vi
      .fn()
      .mockResolvedValue({ result: { changed: 1, skipped: 1 }, report: report() });
    render(<DataReview />);

    fireEvent.click(await screen.findByLabelText('Silinen projenin gideri çöp kutusuna taşınsın'));
    fireEvent.click(screen.getByText('Onarımları uygula'));

    await waitFor(() =>
      expect(window.electronAPI.review.applyRepairs).toHaveBeenCalledWith({ orphanIds: [10] })
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('needs a choice for a project payment with a company before applying', async () => {
    window.electronAPI.review.getReport = vi
      .fn()
      .mockResolvedValue(report({ unmatchedPayments: [wages] }));
    window.electronAPI.review.applyUnmatched = vi
      .fn()
      .mockResolvedValue({ result: { changed: 1, skipped: 0 }, report: report() });
    render(<DataReview />);

    const apply = await screen.findByText('Seçimleri uygula');
    expect(apply.closest('button')).toBeDisabled();
    expect(screen.getByText('1 ödeme için kalan tutarın ne olacağını seçin.')).toBeInTheDocument();
    expect(screen.getByText('Eski proje sayfasında gider sayılıyordu')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Usta yevmiye için kalan tutar'), {
      target: { value: 'document' },
    });
    fireEvent.change(screen.getByLabelText('Usta yevmiye için kategori'), {
      target: { value: '32' },
    });
    fireEvent.click(screen.getByText('Seçimleri uygula'));

    await waitFor(() =>
      expect(window.electronAPI.review.applyUnmatched).toHaveBeenCalledWith({
        choices: [{ id: 3, match: false, rest: 'document', categoryId: 32 }],
        firmChoices: [],
      })
    );
  });

  it('completes the review after confirmation', async () => {
    window.electronAPI.review.getReport = vi.fn().mockResolvedValue(report());
    window.electronAPI.review.complete = vi
      .fn()
      .mockResolvedValue(report({ completed: true, completedAt: '2026-11-11T10:00:00.000Z' }));
    render(<DataReview />);

    fireEvent.click(await screen.findByText('Geçişi tamamla'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByText('Geçişi tamamla'));

    await waitFor(() => expect(window.electronAPI.review.complete).toHaveBeenCalled());
    expect(await screen.findByText(/Geçiş .* tarihinde tamamlandı/)).toBeInTheDocument();
  });
});
