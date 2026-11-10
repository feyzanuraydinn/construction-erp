// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  writeFileAtomic,
  fileTimestamp,
  localDateStamp,
  pruneBackupFiles,
} from '../../database/fileUtils';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-fileutils-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeFileAtomic', () => {
  it('writes the file and leaves no temp file behind', () => {
    const target = path.join(dir, 'a.db');
    writeFileAtomic(target, Buffer.from('hello'));
    expect(fs.readFileSync(target, 'utf-8')).toBe('hello');
    expect(fs.readdirSync(dir)).toEqual(['a.db']);
  });

  it('replaces an existing file', () => {
    const target = path.join(dir, 'a.db');
    fs.writeFileSync(target, 'old content that is longer');
    writeFileAtomic(target, Buffer.from('new'));
    expect(fs.readFileSync(target, 'utf-8')).toBe('new');
  });
});

describe('fileTimestamp / localDateStamp', () => {
  it('formats local time so names sort chronologically', () => {
    const date = new Date(2026, 0, 5, 7, 8, 9, 42);
    expect(fileTimestamp(date)).toBe('2026-01-05_07-08-09-042');
    expect(localDateStamp(date)).toBe('2026-01-05');
    expect(fileTimestamp(new Date(2026, 0, 5, 10)) > fileTimestamp(date)).toBe(true);
  });
});

describe('pruneBackupFiles', () => {
  it('keeps only the newest files with the given prefix', () => {
    for (const name of ['daily-2026-01-01.db', 'daily-2026-01-03.db', 'daily-2026-01-02.db']) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    fs.writeFileSync(path.join(dir, 'other-2026-01-01.db'), 'x');
    fs.writeFileSync(path.join(dir, 'daily-notes.txt'), 'x');

    pruneBackupFiles(dir, 'daily-', 2);

    expect(fs.readdirSync(dir).sort()).toEqual([
      'daily-2026-01-02.db',
      'daily-2026-01-03.db',
      'daily-notes.txt',
      'other-2026-01-01.db',
    ]);
  });

  it('does nothing when the directory does not exist', () => {
    expect(() => pruneBackupFiles(path.join(dir, 'missing'), 'daily-', 1)).not.toThrow();
  });
});
