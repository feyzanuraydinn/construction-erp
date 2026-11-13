// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';

const electron = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  showSaveDialog: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) =>
      electron.handlers.set(channel, handler),
  },
  dialog: { showSaveDialog: electron.showSaveDialog },
  app: {
    getPath: () => '/tmp',
    getVersion: () => '0.0.0',
    isPackaged: false,
    getAppPath: () => '/tmp',
  },
  shell: { showItemInFolder: vi.fn(), openPath: vi.fn() },
}));

vi.mock('../../main/logger', () => ({
  mainLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { registerExportHandlers, safeFileName } from '../../main/ipc/exportHandlers';
import { registerAppHandlers } from '../../main/ipc/appHandlers';
import { registerTransactionHandlers } from '../../main/ipc/transactionHandlers';
import { registerCompanyHandlers } from '../../main/ipc/companyHandlers';
import { FALLBACKS } from '../../utils/constants';
import { SaveProblemError } from '../../database/repositories/TransactionRepository';
import { t, getLocale, setLocale } from '../../main/i18n';
import { safeHandle } from '../../main/ipc/safeHandle';
import { UserFacingError } from '../../utils/userFacingError';

function invoke(channel: string, ...args: unknown[]) {
  const handler = electron.handlers.get(channel);
  if (!handler) throw new Error(`no handler for ${channel}`);
  return handler({}, ...args);
}

describe('export handlers', () => {
  beforeEach(() => {
    electron.handlers.clear();
    electron.showSaveDialog.mockReset();
    registerExportHandlers(() => ({}) as unknown as BrowserWindow);
  });

  it('rejects malformed export requests before opening a save dialog', async () => {
    await expect(invoke('export:toExcel', { filename: '', records: 'rows' })).rejects.toThrow();
    await expect(
      invoke('export:share', { filename: 'islemler', records: [{ Tutar: { nested: 1 } }] })
    ).rejects.toThrow();
    expect(electron.showSaveDialog).not.toHaveBeenCalled();
  });

  it('accepts a valid request and stops quietly when the dialog is cancelled', async () => {
    electron.showSaveDialog.mockResolvedValue({ canceled: true });
    await expect(
      invoke('export:toExcel', {
        filename: 'islemler',
        records: [{ Tarih: '01.02.2026', Tutar: '1.250,00' }],
      })
    ).resolves.toBe('');
    expect(electron.showSaveDialog).toHaveBeenCalledOnce();
  });

  it('exports lists of companies and projects with very long names', async () => {
    electron.showSaveDialog.mockResolvedValue({ canceled: true });
    const longName = `${'Çok Uzun Adlı İnşaat Taahhüt ve Ticaret Anonim Şirketi '.repeat(4)}_cari_islemleri`;
    await expect(
      invoke('export:toExcel', { records: [], filename: `${longName}_2026-11-13` })
    ).resolves.toBe('');
    const defaultPath: string = electron.showSaveDialog.mock.calls[0][1].defaultPath;
    expect(defaultPath.length).toBeLessThanOrEqual(155);
    expect(defaultPath.endsWith('.xlsx')).toBe(true);
  });

  it('keeps file names safe for the file system', () => {
    expect(safeFileName('Demir: Tedarik/İnşaat?')).toBe('Demir_ Tedarik_İnşaat_');
    expect(safeFileName('x'.repeat(400))).toHaveLength(150);
  });

  it('no longer offers the unused PDF export channel', () => {
    expect(electron.handlers.has('export:toPDF')).toBe(false);
  });
});

describe('exchange rate handler', () => {
  beforeEach(() => {
    electron.handlers.clear();
    registerAppHandlers();
  });

  it('falls back to default rates when the service answers with unexpected data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ rates: { TRY: 'x' } }) })
    );
    await expect(invoke('exchange:getRates')).resolves.toEqual({
      USD: FALLBACKS.USD_RATE,
      EUR: FALLBACKS.EUR_RATE,
    });
    vi.unstubAllGlobals();
  });

  it('derives USD and EUR rates from a valid answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: async () => ({ rates: { TRY: 40, EUR: 0.8 } }) })
    );
    await expect(invoke('exchange:getRates')).resolves.toEqual({ USD: 40, EUR: 50 });
    vi.unstubAllGlobals();
  });
});

describe('language handler', () => {
  beforeEach(() => {
    electron.handlers.clear();
    registerAppHandlers();
  });

  it('switches to a shipped language and refuses anything else', async () => {
    await invoke('app:setLanguage', 'en');
    expect(getLocale()).toBe('en');
    await expect(invoke('app:setLanguage', '__proto__')).rejects.toThrow();
    await expect(invoke('app:setLanguage', 42)).rejects.toThrow();
    expect(getLocale()).toBe('en');
    setLocale('tr');
  });
});

describe('writes through IPC', () => {
  const company = { type: 'company', account_type: 'customer', name: 'Yapı Ltd' };

  function setup(create: () => unknown) {
    electron.handlers.clear();
    const db = { companies: { create: vi.fn(create), delete: vi.fn() }, save: vi.fn() };
    registerCompanyHandlers(() => db as unknown as DatabaseService);
    return db;
  }

  it('saves the database once after a successful change', async () => {
    const db = setup(() => ({ id: 3 }));
    await expect(invoke('company:create', company)).resolves.toEqual({ id: 3 });
    expect(db.companies.create).toHaveBeenCalledOnce();
    expect(db.save).toHaveBeenCalledOnce();
  });

  it('checks the input before touching the database', async () => {
    const db = setup(() => ({ id: 3 }));
    await expect(invoke('company:create', { ...company, name: '' })).rejects.toThrow();
    await expect(invoke('company:delete', 'x')).rejects.toThrow();
    expect(db.companies.create).not.toHaveBeenCalled();
    expect(db.companies.delete).not.toHaveBeenCalled();
    expect(db.save).not.toHaveBeenCalled();
  });

  it('does not save when the change fails', async () => {
    const db = setup(() => {
      throw new Error('disk full');
    });
    await expect(invoke('company:create', company)).rejects.toThrow(t('error.unexpected'));
    expect(db.save).not.toHaveBeenCalled();
  });
});

describe('transaction save problems', () => {
  it('turns a rate problem from the database into a translated message', async () => {
    electron.handlers.clear();
    const transactions = {
      create: vi.fn(() => {
        throw new SaveProblemError('rate_not_positive');
      }),
    };
    registerTransactionHandlers(
      () => ({ transactions, save: vi.fn() }) as unknown as DatabaseService
    );

    await expect(
      invoke('transaction:create', {
        scope: 'cari',
        type: 'invoice_out',
        date: '2026-11-11',
        description: 'Kira',
        amount: 100,
        currency: 'EUR',
        exchange_rate: 35,
      })
    ).rejects.toThrow(t('validation.exchangeRateRequired'));
  });
});

describe('error messages sent to the screen', () => {
  it('translates database errors instead of showing a raw key', async () => {
    electron.handlers.clear();
    safeHandle('test:unique', () => {
      throw new Error('UNIQUE constraint failed: companies.code');
    });
    await expect(invoke('test:unique')).rejects.toThrow(t('error.db.uniqueConstraint'));
    expect(t('error.db.uniqueConstraint')).not.toBe('error.db.uniqueConstraint');
  });

  it('passes messages meant for the user and hides technical ones', async () => {
    electron.handlers.clear();
    safeHandle('test:plain', () => {
      throw new UserFacingError('Geçersiz dosya yolu');
    });
    safeHandle('test:raw', () => {
      throw new Error("ENOENT: no such file or directory, open 'C:\\x.db'");
    });
    await expect(invoke('test:plain')).rejects.toThrow('Geçersiz dosya yolu');
    await expect(invoke('test:raw')).rejects.toThrow(t('error.unexpected'));
  });
});

describe('data change notice', () => {
  it('tells the window after every saved change and not after a failed one', async () => {
    const { setDataWrittenListener } = await import('../../main/ipc/writeAndSave');
    const listener = vi.fn();
    setDataWrittenListener(listener);
    electron.handlers.clear();
    const db = {
      companies: {
        create: vi.fn(() => ({ id: 1 })),
        delete: vi.fn(() => {
          throw new Error('locked');
        }),
      },
      save: vi.fn(),
    };
    registerCompanyHandlers(() => db as unknown as DatabaseService);

    await invoke('company:create', { type: 'company', account_type: 'customer', name: 'Yapı' });
    await expect(invoke('company:delete', 1)).rejects.toThrow();

    expect(listener).toHaveBeenCalledOnce();
    setDataWrittenListener(() => {});
  });
});
