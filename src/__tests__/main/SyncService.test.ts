// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const state = vi.hoisted(() => ({ tempDir: '' }));

const drive = vi.hoisted(() => ({
  hasCredentials: vi.fn(),
  isConnected: vi.fn(),
  getLatestFile: vi.fn(),
  uploadLatest: vi.fn(),
  downloadFile: vi.fn(),
  uploadSnapshot: vi.fn(),
  rotateSnapshots: vi.fn(),
  ping: vi.fn(),
  onAuthLost: vi.fn((listener: () => void) => {
    authLost.listener = listener;
    return () => undefined;
  }),
}));
const authLost = vi.hoisted(() => ({ listener: null as null | (() => void) }));

vi.mock('electron', () => ({ app: { getPath: () => state.tempDir } }));
vi.mock('../../main/googleDrive', () => ({ googleDriveService: drive }));
vi.mock('../../main/logger', () => ({
  mainLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { SyncService } from '../../main/SyncService';
import { DatabaseService } from '../../database/DatabaseService';

const T1 = '2026-11-11T10:00:00.000Z';
const T2 = '2026-11-11T11:00:00.000Z';

let root: string;
let userDataPath: string;
let db: DatabaseService;
let sync: SyncService;
type SendFn = (channel: string, ...args: unknown[]) => void;
let send: ReturnType<typeof vi.fn<SendFn>>;
let remoteBytes: Buffer;

function companyNames(service: DatabaseService): string[] {
  const result = service.rawDb.exec('SELECT name FROM companies ORDER BY id');
  return (result[0]?.values ?? []).map((row) => String(row[0]));
}

function insertCompany(service: DatabaseService, name: string): void {
  service.rawDb.run(
    "INSERT INTO companies (type, account_type, name) VALUES ('company', 'customer', ?)",
    [name]
  );
  service.save();
}

function remoteFile(modifiedTime: string, size = remoteBytes.length) {
  return { id: 'file-1', name: 'latest_backup.db', size: String(size), createdTime: T1, modifiedTime };
}

function sentChannels(): string[] {
  return send.mock.calls.map((call) => String(call[0]));
}

/** First sync: cloud is empty, local DB gets uploaded at T1. */
async function syncOnceToEmptyCloud(): Promise<void> {
  drive.getLatestFile.mockResolvedValueOnce(null);
  await sync.checkAndSync();
  expect(drive.uploadLatest).toHaveBeenCalledTimes(1);
}

beforeEach(async () => {
  vi.clearAllMocks();
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-sync-'));
  state.tempDir = path.join(root, 'temp');
  userDataPath = path.join(root, 'userData');

  // A database "from another device" to serve as the cloud copy.
  const remoteDb = new DatabaseService();
  await remoteDb.init(path.join(root, 'remote'));
  insertCompany(remoteDb, 'Remote');
  remoteBytes = remoteDb.exportBuffer();
  remoteDb.close();

  db = new DatabaseService();
  await db.init(userDataPath);
  insertCompany(db, 'Local');

  drive.hasCredentials.mockReturnValue(true);
  drive.isConnected.mockReturnValue(true);
  drive.uploadLatest.mockResolvedValue({ success: true, fileId: 'file-1', modifiedTime: T1 });
  drive.uploadSnapshot.mockResolvedValue({ success: true });
  drive.rotateSnapshots.mockResolvedValue(undefined);
  drive.downloadFile.mockImplementation(async (_id: string, dest: string) => {
    fs.writeFileSync(dest, remoteBytes);
    return { success: true };
  });

  send = vi.fn<SendFn>();
  sync = new SyncService();
  sync.init(db, { isDestroyed: () => false, webContents: { send } }, userDataPath);
});

afterEach(() => {
  db.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('SyncService upload', () => {
  it('uploads a private copy, never the live database file', async () => {
    let uploadedPath = '';
    let uploadedBytes = Buffer.alloc(0);
    drive.uploadLatest.mockImplementationOnce(async (filePath: string) => {
      uploadedPath = filePath;
      uploadedBytes = fs.readFileSync(filePath);
      return { success: true, fileId: 'file-1', modifiedTime: T1 };
    });

    await syncOnceToEmptyCloud();

    expect(uploadedPath).not.toBe(db.getDbPath());
    expect(uploadedBytes.equals(fs.readFileSync(db.getDbPath() ?? ''))).toBe(true);
    // The private copy is cleaned up afterwards.
    expect(fs.existsSync(uploadedPath)).toBe(false);
    expect(sync.getStatus().status).toBe('synced');
  });
});

describe('SyncService change detection', () => {
  it('does not report a conflict when the database was only re-saved', async () => {
    await syncOnceToEmptyCloud();

    // App close re-saves the unchanged database later (dirty flag + newer mtime).
    db.save();
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(db.getDbPath() ?? '', later, later);

    // Meanwhile another device updated the cloud copy.
    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T2));
    await sync.checkAndSync();

    expect(sentChannels()).not.toContain('sync:conflict');
    expect(companyNames(db)).toEqual(['Remote']);
    expect(sentChannels()).toContain('sync:reload-required');
  });

  it('does not upload again when nothing changed', async () => {
    await syncOnceToEmptyCloud();
    db.save();

    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T1));
    await sync.checkAndSync();

    expect(drive.uploadLatest).toHaveBeenCalledTimes(1);
    expect(sync.getStatus().status).toBe('synced');
  });

  it('reports a conflict when local data really changed', async () => {
    await syncOnceToEmptyCloud();
    insertCompany(db, 'Changed locally');

    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T2));
    await sync.checkAndSync();

    expect(sentChannels()).toContain('sync:conflict');
    expect(drive.downloadFile).not.toHaveBeenCalled();
    expect(companyNames(db)).toEqual(['Local', 'Changed locally']);
  });
});

describe('SyncService errors', () => {
  it('treats a Drive error as an error, not as an empty cloud', async () => {
    drive.getLatestFile.mockRejectedValueOnce(new Error('network down'));
    await sync.checkAndSync();

    expect(drive.uploadLatest).not.toHaveBeenCalled();
    expect(sync.getStatus().status).toBe('error');
  });

  it('keeps local data when the downloaded file is not a database', async () => {
    await syncOnceToEmptyCloud();
    const garbage = Buffer.from('<html>quota exceeded</html>'.repeat(50));
    drive.downloadFile.mockImplementationOnce(async (_id: string, dest: string) => {
      fs.writeFileSync(dest, garbage);
      return { success: true };
    });

    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T2, garbage.length));
    await sync.checkAndSync();

    expect(sync.getStatus().status).toBe('error');
    expect(companyNames(db)).toEqual(['Local']);
    expect(sentChannels()).not.toContain('sync:reload-required');
  });

  it('rejects a truncated download and keeps local data', async () => {
    await syncOnceToEmptyCloud();

    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T2, remoteBytes.length + 4096));
    await sync.checkAndSync();

    expect(sync.getStatus().status).toBe('error');
    expect(companyNames(db)).toEqual(['Local']);
  });

  it('saves a safety copy of local data before replacing it with the cloud copy', async () => {
    await syncOnceToEmptyCloud();

    drive.getLatestFile.mockResolvedValueOnce(remoteFile(T2));
    await sync.checkAndSync();

    const safetyDir = path.join(userDataPath, 'backups', 'safety');
    const copies = fs.readdirSync(safetyDir).filter((n) => n.startsWith('pre-download-'));
    expect(copies).toHaveLength(1);
    expect(companyNames(db)).toEqual(['Remote']);
  });

  it('asks again from scratch after resetMeta (account change)', async () => {
    await syncOnceToEmptyCloud();
    sync.resetMeta();

    // A different account whose file looks older than what we knew.
    drive.getLatestFile.mockResolvedValueOnce(remoteFile('2020-01-01T00:00:00.000Z'));
    await sync.checkAndSync();

    expect(sentChannels()).toContain('sync:conflict');
    expect(drive.uploadLatest).toHaveBeenCalledTimes(1);
  });
});

describe('SyncService and the Drive connection', () => {
  const metaFile = () => JSON.parse(fs.readFileSync(path.join(userDataPath, 'sync-meta.json'), 'utf-8'));
  const lastStatus = () => {
    const calls = send.mock.calls.filter((call) => call[0] === 'sync:status');
    return calls[calls.length - 1]?.[1];
  };

  it('treats a device that has a sign-in as linked to Drive', () => {
    expect(sync.getStatus().driveRequired).toBe(true);
    expect(metaFile().driveLinked).toBe(true);
  });

  it('does not require Drive on a device that was never connected', () => {
    fs.rmSync(path.join(userDataPath, 'sync-meta.json'), { force: true });
    drive.isConnected.mockReturnValue(false);
    const fresh = new SyncService();
    fresh.init(db, { isDestroyed: () => false, webContents: { send } }, userDataPath);
    expect(fresh.getStatus()).toMatchObject({ status: 'disconnected', driveRequired: false });
    expect(fs.existsSync(path.join(userDataPath, 'sync-meta.json'))).toBe(false);
  });

  it('reports an expired sign-in as a disconnect that needs reconnecting', async () => {
    drive.getLatestFile.mockImplementationOnce(async () => {
      drive.isConnected.mockReturnValue(false);
      authLost.listener?.();
      throw new Error('Oturum süresi doldu. Lütfen tekrar bağlanın.');
    });
    await sync.checkAndSync();
    expect(sync.getStatus()).toMatchObject({ status: 'disconnected', driveRequired: true, reason: 'expired' });
    expect(lastStatus()).toMatchObject({ status: 'disconnected', driveRequired: true, reason: 'expired' });
  });

  it('keeps a network failure an error, not a disconnect', async () => {
    drive.getLatestFile.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND www.googleapis.com'));
    await sync.checkAndSync();
    expect(sync.getStatus().status).toBe('error');
  });

  it('stays required after a manual disconnect, and clears after reconnecting', async () => {
    drive.isConnected.mockReturnValue(false);
    sync.resetMeta();
    expect(sync.getStatus()).toMatchObject({ status: 'disconnected', driveRequired: true });
    expect(metaFile().driveLinked).toBe(true);

    drive.isConnected.mockReturnValue(true);
    drive.getLatestFile.mockResolvedValueOnce(null);
    sync.markConnected();
    expect(sync.getStatus().status).not.toBe('disconnected');
    await vi.waitFor(() => expect(drive.uploadLatest).toHaveBeenCalled());
  });

  it('asks instead of syncing when the cloud file is not the one synced before (another account)', async () => {
    await syncOnceToEmptyCloud();
    drive.getLatestFile.mockResolvedValueOnce({ ...remoteFile(T2), id: 'other-account-file' });
    await sync.checkAndSync();
    expect(sentChannels()).toContain('sync:conflict');
    expect(drive.downloadFile).not.toHaveBeenCalled();
    expect(companyNames(db)).toEqual(['Local']);
  });
});
