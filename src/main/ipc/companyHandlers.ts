import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { companySchema, validateInput, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerCompanyHandlers(getDbService: () => DatabaseService): void {
  safeHandle('company:getAll', () => getDbService().companies.getAll());
  safeHandle('company:getWithBalance', () => getDbService().companies.getWithBalance());

  safeHandle('company:getById', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().companies.getById(validation.data!);
  });

  safeHandle('company:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(companySchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.companies.create(validation.data!);
    db.save();
    return result;
  });

  safeHandle('company:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const idValidation = validateId(id);
    if (!idValidation.success) throw new Error(idValidation.error);
    const dataValidation = validateInput(companySchema, data);
    if (!dataValidation.success) throw new Error(dataValidation.error);
    const db = getDbService();
    const result = db.companies.update(idValidation.data!, dataValidation.data!);
    db.save();
    return result;
  });

  safeHandle('company:getRelatedCounts', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().companies.getRelatedCounts(validation.data!);
  });

  safeHandle('company:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.companies.delete(validation.data!);
    db.save();
    return result;
  });
}
