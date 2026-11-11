// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: {},
  app: { getPath: () => '', isPackaged: false, getAppPath: () => '' },
  shell: {},
  BrowserWindow: class {},
}));
vi.mock('../../main/logger', () => ({
  mainLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import i18n from '../../i18n';
import { createStyledWorkbook } from '../../main/ipc/exportHandlers';
import { buildTransactionSummary, formatRecordsForExport, getTransactionColumns } from '../../utils/exportUtils';

const GREEN = 'FF15803D';
const RED = 'FFB91C1C';

describe('Excel export colours', () => {
  it('colours money in green and money out red, like the app', async () => {
    const t = i18n.t;
    const transactions = [
      { type: 'invoice_out', amount: 1000, amount_try: 1000, currency: 'TRY', date: '2026-01-01', description: 'Satış' },
      { type: 'payment_in', amount: 400, amount_try: 400, currency: 'TRY', date: '2026-01-02', description: 'Tahsilat' },
      { type: 'invoice_in', amount: 600, amount_try: 600, currency: 'TRY', date: '2026-01-03', description: 'Alış' },
      { type: 'payment_out', amount: 300, amount_try: 300, currency: 'TRY', date: '2026-01-04', description: 'Ödeme' },
    ];
    const rows = formatRecordsForExport(transactions, getTransactionColumns(t));
    const { rows: summary, metadata } = buildTransactionSummary(transactions, t, rows.length);
    const workbook = await createStyledWorkbook([...rows, ...summary], metadata);
    const sheet = workbook.worksheets[0];

    const header = sheet.getRow(1).values;
    const amountCol = Array.isArray(header) ? header.indexOf(t('export.columns.amount')) : -1;
    const colourOf = (rowNumber: number) => sheet.getRow(rowNumber).getCell(amountCol).font?.color?.argb;

    expect(colourOf(2)).toBe(GREEN);
    expect(colourOf(3)).toBe(GREEN);
    expect(colourOf(4)).toBe(RED);
    expect(colourOf(5)).toBe(RED);

    const summaryColour = (label: string) => {
      for (let r = 6; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const values = Array.isArray(row.values) ? row.values : [];
        if (values.includes(label)) return row.getCell(amountCol).font?.color?.argb;
      }
      return undefined;
    };
    expect(summaryColour(t('export.summary.invoiceOut'))).toBe(GREEN);
    expect(summaryColour(t('export.summary.paymentIn'))).toBe(GREEN);
    expect(summaryColour(t('export.summary.invoiceIn'))).toBe(RED);
    expect(summaryColour(t('export.summary.paymentOut'))).toBe(RED);
  });
});
