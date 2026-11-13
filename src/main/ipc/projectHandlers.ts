import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { projectSchema, projectPartySchema, parseInput, parseId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';

export function registerProjectHandlers(getDbService: () => DatabaseService): void {
  safeHandle('project:getAll', () => getDbService().projects.getAll());
  safeHandle('project:getWithSummary', () => getDbService().projects.getWithSummary());

  safeHandle('project:getById', (_: IpcMainInvokeEvent, id: unknown) =>
    getDbService().projects.getById(parseId(id))
  );

  safeHandle('project:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(projectSchema, data);
    return writeAndSave(getDbService, (db) => db.projects.create(input));
  });

  safeHandle('project:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const projectId = parseId(id);
    const input = parseInput(projectSchema, data);
    return writeAndSave(getDbService, (db) => db.projects.update(projectId, input));
  });

  safeHandle('project:getRelatedCounts', (_: IpcMainInvokeEvent, id: unknown) =>
    getDbService().projects.getRelatedCounts(parseId(id))
  );

  safeHandle('project:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const projectId = parseId(id);
    return writeAndSave(getDbService, (db) => db.projects.delete(projectId));
  });

  safeHandle('project:generateCode', () => getDbService().projects.generateCode());

  safeHandle('project:getParties', (_: IpcMainInvokeEvent, projectId: unknown) =>
    getDbService().projects.getParties(parseId(projectId))
  );

  safeHandle('project:addParty', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(projectPartySchema, data);
    return writeAndSave(getDbService, (db) => db.projects.addParty(input));
  });

  safeHandle('project:removeParty', (_: IpcMainInvokeEvent, id: unknown) => {
    const partyId = parseId(id);
    return writeAndSave(getDbService, (db) => db.projects.removeParty(partyId));
  });
}
