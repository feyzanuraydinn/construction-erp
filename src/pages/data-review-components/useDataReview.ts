import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useSelection } from '../../hooks/useSelection';
import { ipcErrorMessage } from '../../utils/ipcError';
import type { DataReviewReport, ReviewStepResult } from '../../database/dataReview';
import {
  initialChoices,
  initialFirmChoices,
  unmatchedRequest,
  withRestForAll,
  type FirmChoice,
  type FirmChoices,
  type PaymentChoice,
  type PaymentChoices,
  type RestChoice,
} from './reviewChoices';

export type ReviewStep = 'repairs' | 'rates' | 'matches' | 'unmatched' | 'complete';

interface ReviewOutcome {
  report: DataReviewReport;
  message: string;
}

const orphanIdsOf = (report: DataReviewReport) => report.orphans.map((o) => o.id);
const issueKeysOf = (report: DataReviewReport) => report.allocationIssues.map((i) => i.key);

export function useDataReview(initialReport: DataReviewReport) {
  const { t } = useTranslation();
  const toast = useToast();
  const [report, setReport] = useState(initialReport);
  const [busy, setBusy] = useState<ReviewStep | null>(null);
  const orphans = useSelection<number>(orphanIdsOf(initialReport));
  const issues = useSelection<string>(issueKeysOf(initialReport));
  const [rates, setRates] = useState<Record<number, string>>({});
  const [choices, setChoices] = useState<PaymentChoices>(() => initialChoices(initialReport));
  const [firmChoices, setFirmChoices] = useState<FirmChoices>(() =>
    initialFirmChoices(initialReport)
  );

  const showReport = (next: DataReviewReport) => {
    setReport(next);
    orphans.handleSelectAll(orphanIdsOf(next), true);
    issues.handleSelectAll(issueKeysOf(next), true);
    setRates({});
    setChoices(initialChoices(next));
    setFirmChoices(initialFirmChoices(next));
  };

  const perform = async (step: ReviewStep, action: () => Promise<ReviewOutcome>) => {
    setBusy(step);
    try {
      const outcome = await action();
      showReport(outcome.report);
      toast.success(outcome.message);
    } catch (error) {
      toast.error(t('dataReview.applyError', { error: ipcErrorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const runStep = (step: ReviewStep, action: () => Promise<ReviewStepResult>) =>
    void perform(step, async () => {
      const { result, report: next } = await action();
      return { report: next, message: t('dataReview.applied', { changed: result.changed }) };
    });

  const complete = () =>
    void perform('complete', async () => ({
      report: await window.electronAPI.review.complete(),
      message: t('dataReview.completedToast'),
    }));

  const applyRepairs = () =>
    runStep('repairs', () =>
      window.electronAPI.review.applyRepairs({ orphanIds: [...orphans.selectedIds] })
    );

  const applyRates = () =>
    runStep('rates', () =>
      window.electronAPI.review.applyRates({
        rates: Object.entries(rates)
          .map(([id, rate]) => ({ id: Number(id), rate: parseFloat(rate) }))
          .filter((r) => r.rate > 1),
      })
    );

  const applyMatches = () =>
    runStep('matches', () =>
      window.electronAPI.review.applyAllocationFixes({ keys: [...issues.selectedIds] })
    );

  const applyUnmatched = () =>
    runStep('unmatched', () =>
      window.electronAPI.review.applyUnmatched(unmatchedRequest(report, choices, firmChoices))
    );

  const setRate = (id: number, value: string) => setRates((prev) => ({ ...prev, [id]: value }));

  const setChoice = (id: number, patch: Partial<PaymentChoice>) =>
    setChoices((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const setAllRests = (rest: RestChoice) =>
    setChoices((prev) => withRestForAll(prev, report.unmatchedPayments, rest));

  const setFirmChoice = (id: number, choice: FirmChoice) =>
    setFirmChoices((prev) => ({ ...prev, [id]: choice }));

  return {
    report,
    busy,
    rates,
    choices,
    firmChoices,
    orphanSelection: orphans.selectedIds,
    toggleOrphan: orphans.handleSelectOne,
    issueSelection: issues.selectedIds,
    toggleIssue: issues.handleSelectOne,
    setRate,
    setChoice,
    setAllRests,
    setFirmChoice,
    applyRepairs,
    applyRates,
    applyMatches,
    applyUnmatched,
    complete,
  };
}
