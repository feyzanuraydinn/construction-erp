// @vitest-environment node
import { describe, it, expect, vi, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = vi.hoisted(() => ({ value: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => dir.value },
}));

vi.mock('../../utils/constants', () => ({
  LIMITS: { MAX_LOG_FILE_SIZE: 2000, MAX_LOG_FILES: 3 },
}));

dir.value = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-log-'));

const { mainLogger } = await import('../../main/logger');

afterAll(() => {
  fs.rmSync(dir.value, { recursive: true, force: true });
});

const waitForFlush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('mainLogger file rotation', () => {
  it('keeps writing to a fresh app.log after the file is rotated', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mainLogger.init();
    for (let i = 0; i < 60; i++) {
      mainLogger.info(`line ${i} ${'x'.repeat(60)}`, 'Test');
      await waitForFlush();
    }
    mainLogger.info('after rotation marker', 'Test');
    await waitForFlush();

    const logDir = path.join(dir.value, 'logs');
    expect(fs.existsSync(path.join(logDir, 'app.1.log'))).toBe(true);
    expect(fs.readFileSync(path.join(logDir, 'app.log'), 'utf8')).toContain(
      'after rotation marker'
    );
  });
});
