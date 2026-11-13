import { IpcMainInvokeEvent } from 'electron';
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
  type ReviewStepResult,
} from '../../database/dataReview';
import {
  reviewRepairsSchema,
  reviewRatesSchema,
  reviewAllocationFixesSchema,
  reviewUnmatchedSchema,
  parseInput,
} from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';
import { mainLogger } from '../logger';
import { backupDirectory } from '../appPaths';
import { writeAndSave } from './writeAndSave';

export function registerReviewHandlers(getDbService: () => DatabaseService): void {
  const runStep = (name: string, step: (db: DatabaseService) => ApplyResult): ReviewStepResult => {
    const result = writeAndSave(getDbService, (db) => {
      db.createSafetyCopy(backupDirectory(), 'before-data-review');
      return step(db);
    });
    mainLogger.info(
      `Data review step ${name}: ${result.changed} changed, ${result.skipped} skipped`,
      'DataReview'
    );
    return { result, report: analyzeData(getDbService().rawDb) };
  };

  safeHandle('review:getStatus', () => {
    const db = getDbService();
    const status = getReviewStatus(db.rawDb);
    if (!status.completed && status.pending === 0) {
      writeAndSave(getDbService, (current) => completeReview(current.rawDb));
      return { completed: true, pending: 0 };
    }
    return status;
  });

  safeHandle('review:getReport', () => analyzeData(getDbService().rawDb));

  safeHandle('review:applyRepairs', (_: IpcMainInvokeEvent, request: unknown) => {
    const { orphanIds } = parseInput(reviewRepairsSchema, request);
    return runStep('repairs', (db) => applyRepairs(db.rawDb, orphanIds));
  });

  safeHandle('review:applyRates', (_: IpcMainInvokeEvent, request: unknown) => {
    const { rates } = parseInput(reviewRatesSchema, request);
    return runStep('rates', (db) => applyRates(db.rawDb, rates));
  });

  safeHandle('review:applyAllocationFixes', (_: IpcMainInvokeEvent, request: unknown) => {
    const { keys } = parseInput(reviewAllocationFixesSchema, request);
    return runStep('allocations', (db) => applyAllocationFixes(db.rawDb, keys));
  });

  safeHandle('review:applyUnmatched', (_: IpcMainInvokeEvent, request: unknown) => {
    const { choices, firmChoices } = parseInput(reviewUnmatchedSchema, request);
    return runStep('unmatched', (db) =>
      applyUnmatched(db.rawDb, choices, firmChoices, t('main.dataReview.generatedNote'))
    );
  });

  safeHandle('review:complete', () => {
    writeAndSave(getDbService, (db) => completeReview(db.rawDb));
    mainLogger.info('Data review completed', 'DataReview');
    return analyzeData(getDbService().rawDb);
  });
}
