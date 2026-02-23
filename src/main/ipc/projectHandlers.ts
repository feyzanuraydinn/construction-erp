import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { projectSchema, projectPartySchema, validateInput, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerProjectHandlers(getDbService: () => DatabaseService): void {
  safeHandle('project:getAll', () => getDbService().projects.getAll());
  safeHandle('project:getWithSummary', () => getDbService().projects.getWithSummary());

  safeHandle('project:getById', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().projects.getById(validation.data!);
  });

  safeHandle('project:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(projectSchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.projects.create(validation.data!);
    db.save();
    return result;
  });

  safeHandle('project:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const idValidation = validateId(id);
    if (!idValidation.success) throw new Error(idValidation.error);
    const dataValidation = validateInput(projectSchema, data);
    if (!dataValidation.success) throw new Error(dataValidation.error);
    const db = getDbService();
    const result = db.projects.update(idValidation.data!, dataValidation.data!);
    db.save();
    return result;
  });

  safeHandle('project:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.projects.delete(validation.data!);
    db.save();
    return result;
  });

  safeHandle('project:generateCode', () => getDbService().projects.generateCode());

  safeHandle('project:getParties', (_: IpcMainInvokeEvent, projectId: unknown) => {
    const validation = validateId(projectId);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().projects.getParties(validation.data!);
  });

  safeHandle('project:addParty', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(projectPartySchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.projects.addParty(validation.data!);
    db.save();
    return result;
  });

  safeHandle('project:removeParty', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.projects.removeParty(validation.data!);
    db.save();
    return result;
  });
}
