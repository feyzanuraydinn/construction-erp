import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiAlertTriangle, FiShield } from 'react-icons/fi';
import { Card, CardHeader, CardBody, Button, Badge, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ipcErrorMessage } from '../utils/ipcError';
import { TRANSACTION_TYPE_LABELS } from '../utils/constants';
import type { Category } from '../types';
import type { AllocationIssue, DataReviewReport, UnmatchedPayment } from '../database/dataReview';

type RestChoice = 'document' | 'advance';

interface PaymentChoice {
  match: boolean;
  rest: RestChoice | null;
  categoryId: string;
}

interface FirmChoice {
  convert: boolean;
  categoryId: string;
}

const MONEY_TOLERANCE = 0.005;

function defaultChoice(payment: UnmatchedPayment): PaymentChoice {
  let rest: RestChoice | null = 'advance';
  if (payment.rest > MONEY_TOLERANCE) {
    if (!payment.advanceAllowed) rest = 'document';
    else if (payment.projectId !== null) rest = null;
  }
  return {
    match: payment.matchable > MONEY_TOLERANCE,
    rest,
    categoryId: payment.suggestedCategoryId ? String(payment.suggestedCategoryId) : '',
  };
}

function StepCard({
  number,
  title,
  description,
  done,
  children,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            {number}. {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        {done ? (
          <Badge variant="success">
            <FiCheckCircle className="mr-1" /> {t('dataReview.noIssues')}
          </Badge>
        ) : (
          <Badge variant="warning">{t('dataReview.needsReview')}</Badge>
        )}
      </CardHeader>
      {!done && <CardBody className="space-y-4">{children}</CardBody>}
    </Card>
  );
}

const thClass = 'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400';
const tdClass = 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300 align-top';

function SimpleTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {head.map((h) => (
              <th key={h} className={thClass}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{children}</tbody>
      </table>
    </div>
  );
}

const selectClass =
  'px-2 py-1 text-sm bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

export default function DataReview() {
  const { t } = useTranslation();
  const toast = useToast();
  const [report, setReport] = useState<DataReviewReport | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [orphanSelection, setOrphanSelection] = useState<Set<number>>(new Set());
  const [rates, setRates] = useState<Record<number, string>>({});
  const [issueSelection, setIssueSelection] = useState<Set<string>>(new Set());
  const [choices, setChoices] = useState<Record<number, PaymentChoice>>({});
  const [firmChoices, setFirmChoices] = useState<Record<number, FirmChoice>>({});
  const [confirmComplete, setConfirmComplete] = useState(false);

  const showReport = useCallback((next: DataReviewReport) => {
    setReport(next);
    setOrphanSelection(new Set(next.orphans.map((o) => o.id)));
    setIssueSelection(new Set(next.allocationIssues.map((i) => i.key)));
    setRates({});
    setChoices(Object.fromEntries(next.unmatchedPayments.map((p) => [p.id, defaultChoice(p)])));
    setFirmChoices(
      Object.fromEntries(
        next.legacyFirmPayments.map((p) => [
          p.id,
          { convert: true, categoryId: p.suggestedCategoryId ? String(p.suggestedCategoryId) : '' },
        ])
      )
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, cats] = await Promise.all([window.electronAPI.review.getReport(), window.electronAPI.category.getAll()]);
        if (cancelled) return;
        setCategories(cats || []);
        showReport(data);
      } catch (error) {
        toast.error(t('dataReview.loadError', { error: ipcErrorMessage(error) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showReport, toast, t]);

  const runStep = async (name: string, action: () => Promise<{ result: { changed: number; skipped: number }; report: DataReviewReport }>) => {
    setBusy(name);
    try {
      const { result, report: next } = await action();
      showReport(next);
      toast.success(t('dataReview.applied', { changed: result.changed }));
    } catch (error) {
      toast.error(t('dataReview.applyError', { error: ipcErrorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const categoriesOf = (type: 'invoice_in' | 'invoice_out') => categories.filter((c) => c.type === type);
  const categoryOptions = (type: 'invoice_in' | 'invoice_out') =>
    categoriesOf(type).map((c) => (
      <option key={c.id} value={c.id}>
        {t(`categories.${c.name}`, c.name)}
      </option>
    ));

  const danglingEntries = useMemo(
    () =>
      report ? Object.entries(report.dangling).filter(([, count]) => count > 0) : [],
    [report]
  );

  if (!report) {
    return (
      <div className="page-container">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  const repairsDone = report.amountFixes.length === 0 && danglingEntries.length === 0 && report.orphans.length === 0;
  const ratesDone = report.rateIssues.length === 0;
  const issuesDone = report.allocationIssues.length === 0;
  const unmatchedDone = report.unmatchedPayments.length === 0 && report.legacyFirmPayments.length === 0;
  const missingChoices = report.unmatchedPayments.filter((p) => {
    const choice = choices[p.id];
    if (!choice) return true;
    const rest = choice.match ? p.rest : p.unmatched;
    if (rest <= MONEY_TOLERANCE) return false;
    if (choice.rest === null || (choice.rest === 'advance' && !p.advanceAllowed)) return true;
    return choice.rest === 'document' && !choice.categoryId;
  }).length;
  const openItems =
    report.amountFixes.length +
    danglingEntries.length +
    report.orphans.length +
    report.rateIssues.length +
    report.allocationIssues.length;

  const setChoice = (id: number, patch: Partial<PaymentChoice>) =>
    setChoices((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const setAllRests = (rest: RestChoice) =>
    setChoices((prev) => {
      const next = { ...prev };
      for (const payment of report.unmatchedPayments) {
        if (rest === 'advance' && !payment.advanceAllowed) continue;
        next[payment.id] = { ...next[payment.id], rest };
      }
      return next;
    });

  const applyUnmatched = () => {
    const payload = report.unmatchedPayments
      .map((p) => {
        const choice = choices[p.id] ?? defaultChoice(p);
        return {
          id: p.id,
          match: choice.match && p.matchable > MONEY_TOLERANCE,
          rest: choice.rest ?? 'advance',
          categoryId: choice.categoryId ? Number(choice.categoryId) : null,
        };
      })
      .filter((c) => c.match || c.rest === 'document');
    const firm = report.legacyFirmPayments
      .filter((p) => firmChoices[p.id]?.convert && firmChoices[p.id]?.categoryId)
      .map((p) => ({ id: p.id, categoryId: Number(firmChoices[p.id].categoryId) }));
    void runStep('unmatched', () => window.electronAPI.review.applyUnmatched({ choices: payload, firmChoices: firm }));
  };

  const complete = async () => {
    setConfirmComplete(false);
    setBusy('complete');
    try {
      showReport(await window.electronAPI.review.complete());
      toast.success(t('dataReview.completedToast'));
    } catch (error) {
      toast.error(t('dataReview.applyError', { error: ipcErrorMessage(error) }));
    } finally {
      setBusy(null);
    }
  };

  const issueText = (issue: AllocationIssue): string => {
    const params = {
      payment: issue.paymentDescription,
      invoice: issue.invoiceDescription ?? '',
      company: issue.companyName ?? '',
      amount: formatCurrency(issue.kind === 'invoice_over' ? issue.invoiceTry ?? 0 : issue.paymentTry),
    };
    return t(`dataReview.issues.${issue.kind}`, params);
  };

  const baseline = report.baseline;
  const totalsRows: { key: keyof DataReviewReport['totalsNow']; label: string }[] = [
    { key: 'income', label: t('dataReview.summary.income') },
    { key: 'expense', label: t('dataReview.summary.expense') },
    { key: 'collected', label: t('dataReview.summary.collected') },
    { key: 'paid', label: t('dataReview.summary.paid') },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="flex items-center gap-2 page-title">
            <FiShield /> {t('dataReview.title')}
          </h1>
          <p className="max-w-3xl mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dataReview.subtitle')}</p>
        </div>
      </div>

      {report.completed ? (
        <div role="status" className="flex items-start gap-3 p-4 mb-6 text-sm text-green-800 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          <FiCheckCircle className="mt-0.5 flex-shrink-0" />
          <p>{t('dataReview.completedInfo', { date: report.completedAt ? formatDate(report.completedAt) : '' })}</p>
        </div>
      ) : (
        <div role="note" className="flex items-start gap-3 p-4 mb-6 text-sm border rounded-lg text-amber-800 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p>{t('dataReview.intro1')}</p>
            <p>{t('dataReview.intro2')}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <StepCard number={1} title={t('dataReview.repairs.title')} description={t('dataReview.repairs.description')} done={repairsDone}>
          {report.amountFixes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('dataReview.repairs.amountFixes', { count: report.amountFixes.length })}</h4>
              <SimpleTable head={[t('common.date'), t('common.description'), t('common.amount'), t('dataReview.repairs.storedTry'), t('dataReview.repairs.correctTry')]}>
                {report.amountFixes.map((fix) => (
                  <tr key={fix.id}>
                    <td className={tdClass}>{formatDate(fix.date)}</td>
                    <td className={tdClass}>{fix.description}</td>
                    <td className={tdClass}>{formatCurrency(fix.amount, fix.currency)}</td>
                    <td className={`${tdClass} text-red-600 dark:text-red-400`}>
                      {fix.storedTry === null ? '-' : formatCurrency(fix.storedTry)}
                    </td>
                    <td className={`${tdClass} font-medium text-green-700 dark:text-green-400`}>{formatCurrency(fix.correctTry)}</td>
                  </tr>
                ))}
              </SimpleTable>
            </div>
          )}

          {danglingEntries.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{t('dataReview.repairs.brokenLinks')}</h4>
              <ul className="pl-5 space-y-1 text-sm text-gray-700 list-disc dark:text-gray-300">
                {danglingEntries.map(([key, count]) => (
                  <li key={key}>{t(`dataReview.dangling.${key}`, { count })}</li>
                ))}
              </ul>
            </div>
          )}

          {report.orphans.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('dataReview.repairs.orphans', { count: report.orphans.length })}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dataReview.repairs.orphansHint')}</p>
              <SimpleTable head={['', t('common.date'), t('common.description'), t('common.type'), t('common.amount'), t('dataReview.repairs.deleted')]}>
                {report.orphans.map((orphan) => (
                  <tr key={orphan.id}>
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        aria-label={t('dataReview.repairs.moveToTrash', { name: orphan.description })}
                        checked={orphanSelection.has(orphan.id)}
                        onChange={(e) =>
                          setOrphanSelection((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(orphan.id);
                            else next.delete(orphan.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className={tdClass}>{formatDate(orphan.date)}</td>
                    <td className={tdClass}>{orphan.description}</td>
                    <td className={tdClass}>{t(TRANSACTION_TYPE_LABELS[orphan.type])}</td>
                    <td className={tdClass}>{formatCurrency(orphan.amount, orphan.currency)}</td>
                    <td className={tdClass}>
                      {orphan.missing === 'company' ? t('dataReview.repairs.deletedCompany') : t('dataReview.repairs.deletedProject')}
                    </td>
                  </tr>
                ))}
              </SimpleTable>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              loading={busy === 'repairs'}
              disabled={busy !== null}
              onClick={() =>
                void runStep('repairs', () => window.electronAPI.review.applyRepairs({ orphanIds: [...orphanSelection] }))
              }
            >
              {t('dataReview.repairs.apply')}
            </Button>
          </div>
        </StepCard>

        <StepCard number={2} title={t('dataReview.rates.title')} description={t('dataReview.rates.description')} done={ratesDone}>
          <SimpleTable head={[t('common.date'), t('common.description'), t('dataReview.rates.account'), t('common.amount'), t('dataReview.rates.storedRate'), t('dataReview.rates.newRate')]}>
            {report.rateIssues.map((issue) => {
              const rate = parseFloat(rates[issue.id] ?? '');
              return (
                <tr key={issue.id}>
                  <td className={tdClass}>{formatDate(issue.date)}</td>
                  <td className={tdClass}>
                    {issue.description}
                    <span className="block text-xs text-gray-500">{t(TRANSACTION_TYPE_LABELS[issue.type])}</span>
                  </td>
                  <td className={tdClass}>{[issue.companyName, issue.projectName].filter(Boolean).join(' · ') || '-'}</td>
                  <td className={tdClass}>{formatCurrency(issue.amount, issue.currency)}</td>
                  <td className={`${tdClass} text-red-600 dark:text-red-400`}>{issue.exchangeRate ?? '-'}</td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={rates[issue.id] ?? ''}
                      onChange={(e) => setRates((prev) => ({ ...prev, [issue.id]: e.target.value }))}
                      aria-label={t('dataReview.rates.rateFor', { name: issue.description, currency: issue.currency })}
                      placeholder={`1 ${issue.currency} = ? TL`}
                      className={`w-28 ${selectClass}`}
                    />
                    {rate > 1 && (
                      <span className="block mt-1 text-xs text-gray-500">= {formatCurrency(Math.round(issue.amount * rate * 100) / 100)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </SimpleTable>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('dataReview.rates.hint')}</p>
            <Button
              loading={busy === 'rates'}
              disabled={busy !== null || !Object.values(rates).some((r) => parseFloat(r) > 1)}
              onClick={() =>
                void runStep('rates', () =>
                  window.electronAPI.review.applyRates({
                    rates: Object.entries(rates)
                      .map(([id, rate]) => ({ id: Number(id), rate: parseFloat(rate) }))
                      .filter((r) => r.rate > 1),
                  })
                )
              }
            >
              {t('dataReview.rates.apply')}
            </Button>
          </div>
        </StepCard>

        <StepCard number={3} title={t('dataReview.matches.title')} description={t('dataReview.matches.description')} done={issuesDone}>
          <ul className="space-y-2">
            {report.allocationIssues.map((issue) => (
              <li key={issue.key} className="flex items-start gap-3 p-3 text-sm border border-gray-200 rounded-lg dark:border-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  aria-label={t('dataReview.matches.fixThis')}
                  checked={issueSelection.has(issue.key)}
                  onChange={(e) =>
                    setIssueSelection((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(issue.key);
                      else next.delete(issue.key);
                      return next;
                    })
                  }
                />
                <div className="space-y-1">
                  <p className="text-gray-800 dark:text-gray-200">{issueText(issue)}</p>
                  {issue.changes.length > 0 && (issue.kind === 'payment_over' || issue.kind === 'invoice_over') && (
                    <ul className="text-xs text-gray-500 dark:text-gray-400">
                      {issue.changes.map((change) => (
                        <li key={change.allocationId}>
                          {change.invoiceDescription}: {formatCurrency(change.from)} → {formatCurrency(change.to)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button
              loading={busy === 'matches'}
              disabled={busy !== null || issueSelection.size === 0}
              onClick={() =>
                void runStep('matches', () => window.electronAPI.review.applyAllocationFixes({ keys: [...issueSelection] }))
              }
            >
              {t('dataReview.matches.apply')}
            </Button>
          </div>
        </StepCard>

        {!report.completed && (
          <StepCard number={4} title={t('dataReview.unmatched.title')} description={t('dataReview.unmatched.description')} done={unmatchedDone}>
            {report.unmatchedPayments.length > 0 && (
              <>
                <div className="p-3 space-y-1 text-sm text-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
                  <p>{t('dataReview.unmatched.explainDocument')}</p>
                  <p>{t('dataReview.unmatched.explainAdvance')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('dataReview.unmatched.setAll')}</span>
                  <Button size="sm" variant="secondary" onClick={() => setAllRests('document')}>
                    {t('dataReview.unmatched.allDocument')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAllRests('advance')}>
                    {t('dataReview.unmatched.allAdvance')}
                  </Button>
                </div>
                <SimpleTable
                  head={[
                    t('common.date'),
                    t('common.description'),
                    t('dataReview.unmatched.accountProject'),
                    t('dataReview.unmatched.unmatchedAmount'),
                    t('dataReview.unmatched.matchWithInvoices'),
                    t('dataReview.unmatched.restChoice'),
                  ]}
                >
                  {report.unmatchedPayments.map((payment) => {
                    const choice = choices[payment.id] ?? defaultChoice(payment);
                    const rest = choice.match ? payment.rest : payment.unmatched;
                    const documentType = payment.type === 'payment_out' ? 'invoice_in' : 'invoice_out';
                    const missing =
                      rest > MONEY_TOLERANCE && (choice.rest === null || (choice.rest === 'document' && !choice.categoryId));
                    return (
                      <tr key={payment.id} className={missing ? 'bg-amber-50/60 dark:bg-amber-900/10' : undefined}>
                        <td className={tdClass}>{formatDate(payment.date)}</td>
                        <td className={tdClass}>
                          {payment.description}
                          <span className="block text-xs text-gray-500">
                            {t(TRANSACTION_TYPE_LABELS[payment.type])} · {formatCurrency(payment.amount, payment.currency)}
                          </span>
                          {payment.countedByOldProjectPage && (
                            <span className="block text-xs text-amber-700 dark:text-amber-400">
                              {payment.type === 'payment_out' ? t('dataReview.unmatched.oldCountedExpense') : t('dataReview.unmatched.oldCountedIncome')}
                            </span>
                          )}
                        </td>
                        <td className={tdClass}>
                          {payment.companyName ?? <span className="text-gray-400">{t('dataReview.unmatched.noCompany')}</span>}
                          {payment.companyType === 'person' && (
                            <span className="block text-xs text-gray-500">{t('dataReview.unmatched.person')}</span>
                          )}
                          {payment.projectName && <span className="block text-xs text-gray-500">{payment.projectName}</span>}
                        </td>
                        <td className={`${tdClass} font-medium`}>{formatCurrency(payment.unmatched)}</td>
                        <td className={tdClass}>
                          {payment.matchable > MONEY_TOLERANCE ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={choice.match}
                                onChange={(e) => setChoice(payment.id, { match: e.target.checked })}
                              />
                              <span>{formatCurrency(payment.matchable)}</span>
                            </label>
                          ) : (
                            <span className="text-xs text-gray-400">{t('dataReview.unmatched.noOpenInvoice')}</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          {rest <= MONEY_TOLERANCE ? (
                            <span className="text-xs text-green-700 dark:text-green-400">{t('dataReview.unmatched.fullyMatched')}</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="block text-xs text-gray-500">{t('dataReview.unmatched.rest', { amount: formatCurrency(rest) })}</span>
                              <select
                                className={selectClass}
                                aria-label={t('dataReview.unmatched.restChoiceFor', { name: payment.description })}
                                value={choice.rest ?? ''}
                                onChange={(e) =>
                                  setChoice(payment.id, { rest: e.target.value === '' ? null : e.target.value === 'document' ? 'document' : 'advance' })
                                }
                              >
                                <option value="">{t('dataReview.unmatched.choose')}</option>
                                <option value="document">
                                  {payment.type === 'payment_out' ? t('transactionModal.restExpense') : t('transactionModal.restIncome')}
                                </option>
                                {payment.advanceAllowed && <option value="advance">{t('transactionModal.restAdvance')}</option>}
                              </select>
                              {choice.rest === 'document' && (
                                <select
                                  className={`block ${selectClass}`}
                                  aria-label={t('dataReview.unmatched.categoryFor', { name: payment.description })}
                                  value={choice.categoryId}
                                  onChange={(e) => setChoice(payment.id, { categoryId: e.target.value })}
                                >
                                  <option value="">{t('dataReview.unmatched.chooseCategory')}</option>
                                  {categoryOptions(documentType)}
                                </select>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </SimpleTable>
              </>
            )}

            {report.legacyFirmPayments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('dataReview.unmatched.firmTitle', { count: report.legacyFirmPayments.length })}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dataReview.unmatched.firmHint')}</p>
                <SimpleTable head={['', t('common.date'), t('common.description'), t('common.amount'), t('dataReview.unmatched.becomes'), t('common.category')]}>
                  {report.legacyFirmPayments.map((payment) => {
                    const choice = firmChoices[payment.id] ?? { convert: true, categoryId: '' };
                    return (
                      <tr key={payment.id}>
                        <td className={tdClass}>
                          <input
                            type="checkbox"
                            aria-label={t('dataReview.unmatched.convertThis', { name: payment.description })}
                            checked={choice.convert}
                            onChange={(e) => setFirmChoices((prev) => ({ ...prev, [payment.id]: { ...choice, convert: e.target.checked } }))}
                          />
                        </td>
                        <td className={tdClass}>{formatDate(payment.date)}</td>
                        <td className={tdClass}>{payment.description}</td>
                        <td className={tdClass}>{formatCurrency(payment.amountTry)}</td>
                        <td className={tdClass}>
                          {payment.becomes === 'invoice_out' ? t('companyAccount.types.income') : t('companyAccount.types.expense')}
                        </td>
                        <td className={tdClass}>
                          <select
                            className={selectClass}
                            value={choice.categoryId}
                            aria-label={t('dataReview.unmatched.categoryFor', { name: payment.description })}
                            onChange={(e) => setFirmChoices((prev) => ({ ...prev, [payment.id]: { ...choice, categoryId: e.target.value } }))}
                          >
                            <option value="">{t('dataReview.unmatched.chooseCategory')}</option>
                            {categoryOptions(payment.becomes)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </SimpleTable>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {missingChoices > 0 ? t('dataReview.unmatched.missingChoices', { count: missingChoices }) : t('dataReview.unmatched.applyHint')}
              </p>
              <Button loading={busy === 'unmatched'} disabled={busy !== null || missingChoices > 0} onClick={applyUnmatched}>
                {t('dataReview.unmatched.apply')}
              </Button>
            </div>
          </StepCard>
        )}

        <Card>
          <CardHeader>
            <h3 className="font-semibold">
              {report.completed ? '' : '5. '}
              {t('dataReview.summary.title')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {baseline
                ? t('dataReview.summary.description', { date: formatDate(baseline.recordedAt) })
                : t('dataReview.summary.noBaseline')}
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <SimpleTable head={['', t('dataReview.summary.before'), t('dataReview.summary.now')]}>
              {totalsRows.map((row) => (
                <tr key={row.key}>
                  <td className={`${tdClass} font-medium`}>{row.label}</td>
                  <td className={tdClass}>{baseline ? formatCurrency(baseline.totals[row.key]) : '-'}</td>
                  <td className={tdClass}>{formatCurrency(report.totalsNow[row.key])}</td>
                </tr>
              ))}
            </SimpleTable>

            {report.projectEffects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('dataReview.summary.projects')}</h4>
                <SimpleTable
                  head={[
                    t('dataReview.summary.project'),
                    t('dataReview.summary.beforeIncomeExpense'),
                    t('dataReview.summary.beforeProfit'),
                    t('dataReview.summary.nowIncomeExpense'),
                    t('dataReview.summary.nowProfit'),
                  ]}
                >
                  {report.projectEffects.map((effect) => (
                    <tr key={effect.projectId}>
                      <td className={tdClass}>
                        {effect.code} · {effect.name}
                      </td>
                      <td className={tdClass}>
                        {effect.before ? `${formatCurrency(effect.before.income)} / ${formatCurrency(effect.before.expense)}` : '-'}
                      </td>
                      <td className={tdClass}>{effect.before ? formatCurrency(effect.before.profit) : '-'}</td>
                      <td className={tdClass}>
                        {formatCurrency(effect.now.income)} / {formatCurrency(effect.now.expense)}
                      </td>
                      <td className={`${tdClass} font-medium`}>{formatCurrency(effect.now.profit)}</td>
                    </tr>
                  ))}
                </SimpleTable>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dataReview.summary.projectsHint')}</p>
              </div>
            )}

            {!report.completed && (
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('dataReview.summary.completeHint')}</p>
                <Button loading={busy === 'complete'} disabled={busy !== null} onClick={() => setConfirmComplete(true)}>
                  {t('dataReview.summary.complete')}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        onConfirm={() => void complete()}
        title={t('dataReview.summary.confirmTitle')}
        message={
          openItems + report.unmatchedPayments.length > 0
            ? t('dataReview.summary.confirmWithOpen', { open: openItems, unmatched: report.unmatchedPayments.length })
            : t('dataReview.summary.confirmClean')
        }
        type="warning"
        confirmText={t('dataReview.summary.complete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
}
