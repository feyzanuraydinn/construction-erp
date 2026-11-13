import fs from 'fs';
import path from 'path';

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
    fs.rmSync(tempPath, { force: true });
    fs.writeFileSync(filePath, data);
  }
}

export function fileTimestamp(date: Date = new Date()): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}` +
    `-${pad(date.getMilliseconds(), 3)}`
  );
}

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
