import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import {
  transactionSchema,
  transactionFiltersSchema,
  saveTransactionSchema,
  matchCandidatesSchema,
  validateInput,
  validateId,
} from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';
import { SaveProblemError, type SaveProblem } from '../../database/repositories/TransactionRepository';
import { isPaymentType } from '../../database/repositories/PaymentAllocationRepository';

const SAVE_PROBLEM_KEYS: Record<SaveProblem, string> = {
  not_found: 'main.transaction.allocationNotFound',
  type_mismatch: 'main.transaction.allocationTypeMismatch',
  duplicate: 'main.transaction.allocationDuplicate',
  exceeds_payment: 'main.transaction.allocationExceedsPayment',
  exceeds_invoice: 'main.transaction.allocationExceedsInvoice',
  counterparty_mismatch: 'main.transaction.allocationCounterpartyMismatch',
  needs_counterparty: 'main.transaction.needsCounterparty',
  invalid_category: 'main.transaction.invalidDocumentCategory',
};

function toUserError(error: unknown): unknown {
  return error instanceof SaveProblemError ? new Error(t(SAVE_PROBLEM_KEYS[error.problem])) : error;
}

export function registerTransactionHandlers(getDbService: () => DatabaseService): void {
  safeHandle('transaction:getAll', (_: IpcMainInvokeEvent, filters: unknown = {}) => {
    const validation = validateInput(transactionFiltersSchema, filters || {});
    if (!validation.success) throw new Error(validation.error);
    return getDbService().transactions.getAllFiltered(validation.data!);
  });

  safeHandle(
    'transaction:getByCompany',
    (_: IpcMainInvokeEvent, companyId: unknown, filters: unknown = {}) => {
      const idValidation = validateId(companyId);
      if (!idValidation.success) throw new Error(idValidation.error);
      const filtersValidation = validateInput(transactionFiltersSchema, filters || {});
      if (!filtersValidation.success) throw new Error(filtersValidation.error);
      return getDbService().transactions.getByCompany(
        idValidation.data!,
        filtersValidation.data!
      );
    }
  );

  safeHandle(
    'transaction:getByProject',
    (_: IpcMainInvokeEvent, projectId: unknown, filters: unknown = {}) => {
      const idValidation = validateId(projectId);
      if (!idValidation.success) throw new Error(idValidation.error);
      const filtersValidation = validateInput(transactionFiltersSchema, filters || {});
      if (!filtersValidation.success) throw new Error(filtersValidation.error);
      return getDbService().transactions.getByProject(
        idValidation.data!,
        filtersValidation.data!
      );
    }
  );

  safeHandle('transaction:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(transactionSchema, data);
    if (!validation.success) throw new Error(validation.error);
    const input = validation.data!;
    if (isPaymentType(input.type) && input.scope === 'project' && !input.company_id) {
      throw new Error(t(SAVE_PROBLEM_KEYS.needs_counterparty));
    }
    const db = getDbService();
    const result = db.transactions.create(input);
    db.save();
    return result;
  });

  safeHandle('transaction:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const idValidation = validateId(id);
    if (!idValidation.success) throw new Error(idValidation.error);
    const dataValidation = validateInput(transactionSchema, data);
    if (!dataValidation.success) throw new Error(dataValidation.error);
    const db = getDbService();
    try {
      const result = db.transactions.updateChecked(idValidation.data!, dataValidation.data!);
      db.save();
      return result;
    } catch (error) {
      throw toUserError(error);
    }
  });

  safeHandle('transaction:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.transactions.delete(validation.data!);
    db.save();
    return result;
  });

  safeHandle('transaction:getInvoicesForProject', (_: IpcMainInvokeEvent, projectId: unknown) => {
    const validation = validateId(projectId);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().transactions.getInvoicesForProject(validation.data!);
  });

  safeHandle('transaction:getInvoicesForCompany', (_: IpcMainInvokeEvent, companyId: unknown) => {
    const validation = validateId(companyId);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().transactions.getInvoicesForCompany(validation.data!);
  });

  safeHandle('transaction:save', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(saveTransactionSchema, request);
    if (!validation.success) throw new Error(validation.error);
    const { id, data, paymentAllocations, invoiceAllocations, remainderDocument } = validation.data!;
    const db = getDbService();
    try {
      const result = db.transactions.saveWithMatching({
        id,
        data,
        paymentAllocations,
        invoiceAllocations,
        remainderDocument: remainderDocument
          ? { categoryId: remainderDocument.categoryId, note: t('main.transaction.documentFromPaymentNote') }
          : undefined,
      });
      db.save();
      return result;
    } catch (error) {
      throw toUserError(error);
    }
  });

  safeHandle('transaction:getMatchCandidates', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(matchCandidatesSchema, request);
    if (!validation.success) throw new Error(validation.error);
    const { type, companyId, projectId, selfId } = validation.data!;
    const pool = { companyId, projectId };
    const repo = getDbService().paymentAllocations;
    return isPaymentType(type)
      ? repo.getInvoiceCandidates(type, pool, selfId)
      : repo.getPaymentCandidates(type, pool, selfId);
  });

  safeHandle(
    'transaction:setAllocations',
    (_: IpcMainInvokeEvent, paymentId: unknown, allocations: unknown) => {
      const idValidation = validateId(paymentId);
      if (!idValidation.success) throw new Error(idValidation.error);
      if (!Array.isArray(allocations)) throw new Error(t('main.transaction.allocationsMustBeArray'));
      const validAllocations = (allocations as { invoiceId: unknown; amount: unknown }[]).map(a => ({
        invoiceId: Number(a.invoiceId),
        amount: Number(a.amount),
      })).filter(a => a.invoiceId > 0 && a.amount > 0);
      const db = getDbService();
      const problem = db.paymentAllocations.findAllocationProblem(idValidation.data!, validAllocations);
      if (problem) throw new Error(t(SAVE_PROBLEM_KEYS[problem]));
      db.paymentAllocations.setForPayment(idValidation.data!, validAllocations);
      db.save();
      return { success: true };
    }
  );

  safeHandle('transaction:getAllocationsForPayment', (_: IpcMainInvokeEvent, paymentId: unknown) => {
    const validation = validateId(paymentId);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().paymentAllocations.getForPayment(validation.data!);
  });

  safeHandle('transaction:getAllocationsForInvoice', (_: IpcMainInvokeEvent, invoiceId: unknown) => {
    const validation = validateId(invoiceId);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().paymentAllocations.getForInvoice(validation.data!);
  });
}
