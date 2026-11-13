import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { companySchema, parseInput, parseId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';

export function registerCompanyHandlers(getDbService: () => DatabaseService): void {
  safeHandle('company:getAll', () => getDbService().companies.getAll());
  safeHandle('company:getWithBalance', () => getDbService().companies.getWithBalance());

  safeHandle('company:getById', (_: IpcMainInvokeEvent, id: unknown) =>
    getDbService().companies.getById(parseId(id))
  );

  safeHandle('company:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(companySchema, data);
    return writeAndSave(getDbService, (db) => db.companies.create(input));
  });

  safeHandle('company:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const companyId = parseId(id);
    const input = parseInput(companySchema, data);
    return writeAndSave(getDbService, (db) => db.companies.update(companyId, input));
  });

  safeHandle('company:getRelatedCounts', (_: IpcMainInvokeEvent, id: unknown) =>
    getDbService().companies.getRelatedCounts(parseId(id))
  );

  safeHandle('company:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const companyId = parseId(id);
    return writeAndSave(getDbService, (db) => db.companies.delete(companyId));
  });
}
