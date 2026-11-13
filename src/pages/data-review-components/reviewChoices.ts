import type {
  DataReviewReport,
  LegacyFirmChoice,
  UnmatchedChoice,
  UnmatchedPayment,
} from '../../database/dataReview';
import { MONEY_TOLERANCE } from '../../utils/money';

export type RestChoice = 'document' | 'advance';

export interface PaymentChoice {
  match: boolean;
  rest: RestChoice | null;
  categoryId: string;
}

export interface FirmChoice {
  convert: boolean;
  categoryId: string;
}

export type PaymentChoices = Record<number, PaymentChoice>;
export type FirmChoices = Record<number, FirmChoice>;

function categoryIdText(id: number | null): string {
  return id ? String(id) : '';
}

function defaultChoice(payment: UnmatchedPayment): PaymentChoice {
  let rest: RestChoice | null = 'advance';
  if (payment.rest > MONEY_TOLERANCE) {
    if (!payment.advanceAllowed) rest = 'document';
    else if (payment.projectId !== null) rest = null;
  }
  return {
    match: payment.matchable > MONEY_TOLERANCE,
    rest,
    categoryId: categoryIdText(payment.suggestedCategoryId),
  };
}

export function initialChoices(report: DataReviewReport): PaymentChoices {
  return Object.fromEntries(
    report.unmatchedPayments.map((p): [number, PaymentChoice] => [p.id, defaultChoice(p)])
  );
}

export function initialFirmChoices(report: DataReviewReport): FirmChoices {
  return Object.fromEntries(
    report.legacyFirmPayments.map((p): [number, FirmChoice] => [
      p.id,
      { convert: true, categoryId: categoryIdText(p.suggestedCategoryId) },
    ])
  );
}

export function choiceFor(choices: PaymentChoices, payment: UnmatchedPayment): PaymentChoice {
  return choices[payment.id] ?? defaultChoice(payment);
}

export function restOf(payment: UnmatchedPayment, choice: PaymentChoice): number {
  return choice.match ? payment.rest : payment.unmatched;
}

export function countMissingChoices(payments: UnmatchedPayment[], choices: PaymentChoices): number {
  return payments.filter((p) => {
    const choice = choices[p.id];
    if (!choice) return true;
    if (restOf(p, choice) <= MONEY_TOLERANCE) return false;
    if (choice.rest === null || (choice.rest === 'advance' && !p.advanceAllowed)) return true;
    return choice.rest === 'document' && !choice.categoryId;
  }).length;
}

export function withRestForAll(
  choices: PaymentChoices,
  payments: UnmatchedPayment[],
  rest: RestChoice
): PaymentChoices {
  const next = { ...choices };
  for (const payment of payments) {
    if (rest === 'advance' && !payment.advanceAllowed) continue;
    next[payment.id] = { ...next[payment.id], rest };
  }
  return next;
}

export function unmatchedRequest(
  report: DataReviewReport,
  choices: PaymentChoices,
  firmChoices: FirmChoices
): { choices: UnmatchedChoice[]; firmChoices: LegacyFirmChoice[] } {
  const payload = report.unmatchedPayments
    .map((p) => {
      const choice = choiceFor(choices, p);
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
  return { choices: payload, firmChoices: firm };
}
