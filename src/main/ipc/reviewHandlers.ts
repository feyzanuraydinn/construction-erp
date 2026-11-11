import { app, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import type { DatabaseService } from '../../database/DatabaseService';
import {
  analyzeData,
  getReviewStatus,
  applyRepairs,
  applyRates,
  applyAllocationFixes,
  applyUnmatched,
  completeReview,
  type ApplyResult,
  type DataReviewReport,
} from '../../database/dataReview';
import {
  reviewRepairsSchema,
  reviewRatesSchema,
  reviewAllocationFixesSchema,
  reviewUnmatchedSchema,
  validateInput,
} from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';
import { mainLogger } from '../logger';

export function registerReviewHandlers(getDbService: () => DatabaseService): void {
  const backupDir = () => path.join(app.getPath('userData'), 'backups');

  const runStep = (name: string, step: (db: DatabaseService) => ApplyResult): { result: ApplyResult; report: DataReviewReport } => {
    const db = getDbService();
    db.createSafetyCopy(backupDir(), 'before-data-review');
    const result = step(db);
    db.save();
    mainLogger.info(`Data review step ${name}: ${result.changed} changed, ${result.skipped} skipped`, 'DataReview');
    return { result, report: analyzeData(db.rawDb) };
  };

  safeHandle('review:getStatus', () => {
    const db = getDbService();
    const status = getReviewStatus(db.rawDb);
    if (!status.completed && status.pending === 0) {
      completeReview(db.rawDb);
      db.save();
      return { completed: true, pending: 0 };
    }
    return status;
  });

  safeHandle('review:getReport', () => analyzeData(getDbService().rawDb));

  safeHandle('review:applyRepairs', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(reviewRepairsSchema, request);
    if (!validation.success) throw new Error(validation.error);
    return runStep('repairs', (db) => applyRepairs(db.rawDb, validation.data!.orphanIds));
  });

  safeHandle('review:applyRates', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(reviewRatesSchema, request);
    if (!validation.success) throw new Error(validation.error);
    return runStep('rates', (db) => applyRates(db.rawDb, validation.data!.rates));
  });

  safeHandle('review:applyAllocationFixes', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(reviewAllocationFixesSchema, request);
    if (!validation.success) throw new Error(validation.error);
    return runStep('allocations', (db) => applyAllocationFixes(db.rawDb, validation.data!.keys));
  });

  safeHandle('review:applyUnmatched', (_: IpcMainInvokeEvent, request: unknown) => {
    const validation = validateInput(reviewUnmatchedSchema, request);
    if (!validation.success) throw new Error(validation.error);
    const { choices, firmChoices } = validation.data!;
    return runStep('unmatched', (db) =>
      applyUnmatched(db.rawDb, choices, firmChoices, t('main.dataReview.generatedNote'))
    );
  });

  safeHandle('review:complete', () => {
    const db = getDbService();
    completeReview(db.rawDb);
    db.save();
    mainLogger.info('Data review completed', 'DataReview');
    return analyzeData(db.rawDb);
  });
}
