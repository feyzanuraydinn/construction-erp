import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import {
  transactionSchema,
  transactionFiltersSchema,
  saveTransactionSchema,
  matchCandidatesSchema,
  parseInput,
  parseId,
} from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';
import { t } from '../i18n';
import {
  SaveProblemError,
  type SaveProblem,
} from '../../database/repositories/TransactionRepository';
import { isPaymentType } from '../../utils/transactionKinds';
import { UserFacingError } from '../../utils/userFacingError';

const SAVE_PROBLEM_KEYS: Record<SaveProblem, string> = {
  not_found: 'main.transaction.allocationNotFound',
  type_mismatch: 'main.transaction.allocationTypeMismatch',
  duplicate: 'main.transaction.allocationDuplicate',
  exceeds_payment: 'main.transaction.allocationExceedsPayment',
  exceeds_invoice: 'main.transaction.allocationExceedsInvoice',
  counterparty_mismatch: 'main.transaction.allocationCounterpartyMismatch',
  needs_counterparty: 'main.transaction.needsCounterparty',
  invalid_category: 'main.transaction.invalidDocumentCategory',
  amount_not_positive: 'validation.amountPositive',
  rate_not_positive: 'validation.exchangeRateRequired',
};

function withSaveProblems<T>(save: () => T): T {
  try {
    return save();
  } catch (error) {
    throw error instanceof SaveProblemError
      ? new UserFacingError(t(SAVE_PROBLEM_KEYS[error.problem]), { cause: error })
      : error;
  }
}

export function registerTransactionHandlers(getDbService: () => DatabaseService): void {
  safeHandle('transaction:getAll', (_: IpcMainInvokeEvent, filters: unknown = {}) =>
    getDbService().transactions.getAllFiltered(parseInput(transactionFiltersSchema, filters || {}))
  );

  safeHandle(
    'transaction:getByCompany',
    (_: IpcMainInvokeEvent, companyId: unknown, filters: unknown = {}) => {
      const id = parseId(companyId);
      return getDbService().transactions.getByCompany(
        id,
        parseInput(transactionFiltersSchema, filters || {})
      );
    }
  );

  safeHandle(
    'transaction:getByProject',
    (_: IpcMainInvokeEvent, projectId: unknown, filters: unknown = {}) => {
      const id = parseId(projectId);
      return getDbService().transactions.getByProject(
        id,
        parseInput(transactionFiltersSchema, filters || {})
      );
    }
  );

  safeHandle('transaction:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(transactionSchema, data);
    if (isPaymentType(input.type) && input.scope === 'project' && !input.company_id) {
      throw new UserFacingError(t(SAVE_PROBLEM_KEYS.needs_counterparty));
    }
    return withSaveProblems(() =>
      writeAndSave(getDbService, (db) => db.transactions.create(input))
    );
  });

  safeHandle('transaction:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const transactionId = parseId(id);
    const input = parseInput(transactionSchema, data);
    return withSaveProblems(() =>
      writeAndSave(getDbService, (db) => db.transactions.updateChecked(transactionId, input))
    );
  });

  safeHandle('transaction:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const transactionId = parseId(id);
    return writeAndSave(getDbService, (db) => db.transactions.delete(transactionId));
  });

  safeHandle('transaction:save', (_: IpcMainInvokeEvent, request: unknown) => {
    const { id, data, paymentAllocations, invoiceAllocations, remainderDocument } = parseInput(
      saveTransactionSchema,
      request
    );
    return withSaveProblems(() =>
      writeAndSave(getDbService, (db) =>
        db.transactions.saveWithMatching({
          id,
          data,
          paymentAllocations,
          invoiceAllocations,
          remainderDocument: remainderDocument
            ? {
                categoryId: remainderDocument.categoryId,
                note: t('main.transaction.documentFromPaymentNote'),
              }
            : undefined,
        })
      )
    );
  });

  safeHandle('transaction:getMatchCandidates', (_: IpcMainInvokeEvent, request: unknown) => {
    const { type, companyId, projectId, selfId } = parseInput(matchCandidatesSchema, request);
    const pool = { companyId, projectId };
    const repo = getDbService().paymentAllocations;
    return isPaymentType(type)
      ? repo.getInvoiceCandidates(type, pool, selfId)
      : repo.getPaymentCandidates(type, pool, selfId);
  });

  safeHandle('transaction:getAllocationsForPayment', (_: IpcMainInvokeEvent, paymentId: unknown) =>
    getDbService().paymentAllocations.getForPayment(parseId(paymentId))
  );

  safeHandle('transaction:getAllocationsForInvoice', (_: IpcMainInvokeEvent, invoiceId: unknown) =>
    getDbService().paymentAllocations.getForInvoice(parseId(invoiceId))
  );
}
