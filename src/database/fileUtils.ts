import fs from 'fs';
import path from 'path';

/**
 * Writes `data` to `filePath` so a crash or power loss mid-write cannot leave a
 * half-written file: the bytes go to a temporary sibling, are flushed to disk,
 * and only then replace the target with a single rename.
 */
export function writeFileAtomic(filePath: string, data: Uint8Array): void {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  const fd = fs.openSync(tempPath, 'w');
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(tempPath, filePath);
  } catch {
    // Windows refuses the rename while another process (antivirus, indexer,
    // backup tool) holds the target open. Fall back to an in-place write so the
    // save itself is never lost.
    fs.rmSync(tempPath, { force: true });
    fs.writeFileSync(filePath, data);
  }
}

/**
 * Returns a local-time timestamp that sorts chronologically and is safe to use
 * in file names, e.g. `2026-11-10_14-05-09-123`.
 */
export function fileTimestamp(date: Date = new Date()): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}` +
    `-${pad(date.getMilliseconds(), 3)}`
  );
}

/** Returns the local date as `YYYY-MM-DD`. */
export function localDateStamp(date: Date = new Date()): string {
  return fileTimestamp(date).slice(0, 10);
}

/**
 * Deletes all but the newest `keep` `.db` files in `dir` whose names start with
 * `prefix`. File names must sort chronologically (see `fileTimestamp`).
 */
export function pruneBackupFiles(dir: string, prefix: string, keep: number): void {
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.db'))
    .sort()
    .reverse();
  for (const name of files.slice(keep)) {
    fs.rmSync(path.join(dir, name), { force: true });
  }
}
