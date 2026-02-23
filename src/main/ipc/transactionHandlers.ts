import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { transactionSchema, transactionFiltersSchema, validateInput, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';

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
    const db = getDbService();
    const result = db.transactions.create(validation.data!);
    db.save();
    return result;
  });

  safeHandle('transaction:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const idValidation = validateId(id);
    if (!idValidation.success) throw new Error(idValidation.error);
    const dataValidation = validateInput(transactionSchema, data);
    if (!dataValidation.success) throw new Error(dataValidation.error);
    const db = getDbService();
    const result = db.transactions.update(idValidation.data!, dataValidation.data!);
    db.save();
    return result;
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

  // Payment allocation handlers
  safeHandle(
    'transaction:getInvoicesWithBalance',
    (_: IpcMainInvokeEvent, entityId: unknown, entityType: unknown, invoiceType: unknown) => {
      const idValidation = validateId(entityId);
      if (!idValidation.success) throw new Error(idValidation.error);
      if (entityType !== 'project' && entityType !== 'company') throw new Error(t('main.transaction.invalidEntityType'));
      if (invoiceType !== 'invoice_out' && invoiceType !== 'invoice_in') throw new Error(t('main.transaction.invalidInvoiceType'));
      return getDbService().paymentAllocations.getInvoicesWithBalance(
        idValidation.data!,
        entityType as 'project' | 'company',
        invoiceType as 'invoice_out' | 'invoice_in'
      );
    }
  );

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
}
