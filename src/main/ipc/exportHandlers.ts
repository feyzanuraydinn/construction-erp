import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow, app, shell } from 'electron';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import {
  exportRequestSchema,
  parseInput,
  type ExportRecord,
  type ExportMetadata,
} from '../../utils/schemas';
import { safeHandle, toUserMessage } from './safeHandle';
import { tempFilePath, removeLater } from '../appPaths';
import {
  excelRowStyling,
  fitColumnWidths,
  shadeAlternateRow,
  styleDataRow,
  styleHeaderRow,
  styleSummaryRow,
} from './export/excelRowStyles';

const PDF_OPTIONS: Electron.PrintToPDFOptions = {
  printBackground: true,
  landscape: false,
  pageSize: 'A4',
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

export async function createStyledWorkbook(
  records: ExportRecord[],
  metadata?: ExportMetadata
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t('main.export.sheetName'));

  if (records.length === 0) {
    ws.addRow([t('main.export.noData')]);
    return wb;
  }

  const headers = Object.keys(records[0]);
  styleHeaderRow(ws.addRow(headers));

  const styling = excelRowStyling(headers, metadata);
  const summaryStart = metadata?.summaryStartIndex ?? Infinity;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const values = headers.map((h) => {
      const val = record[h];
      return val === null || val === undefined ? '' : val;
    });
    const row = ws.addRow(values);
    const rowIdx = i + 1;

    if (rowIdx >= summaryStart) {
      styleSummaryRow(row, values, rowIdx === summaryStart + 1, styling);
    } else {
      styleDataRow(row, styling);
      if (i % 2 === 1) shadeAlternateRow(row);
    }
  }

  fitColumnWidths(ws, headers, records);

  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return wb;
}

const MAX_FILE_NAME_LENGTH = 150;

export function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, MAX_FILE_NAME_LENGTH);
}

export function registerExportHandlers(getMainWindow: () => BrowserWindow | null): void {
  safeHandle(
    'export:toExcel',
    async (_: IpcMainInvokeEvent, input: unknown) => {
      const data = parseInput(exportRequestSchema, input);
      const mainWindow = getMainWindow();
      if (!mainWindow) return '';

      const { records, filename, metadata } = data;
      const defaultFilename = safeFileName(filename.replace(/\.xlsx$/, ''));

      const result = await dialog.showSaveDialog(mainWindow, {
        title: t('main.export.excelSaveTitle'),
        defaultPath: `${defaultFilename}.xlsx`,
        filters: [
          { name: t('main.export.excelFiles'), extensions: ['xlsx'] },
          { name: t('main.export.allFiles'), extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) return '';

      const wb = await createStyledWorkbook(records, metadata);
      await wb.xlsx.writeFile(result.filePath);
      return result.filePath;
    },
    { message: 'Excel export error', scope: 'Export' }
  );

  safeHandle(
    'export:share',
    async (_: IpcMainInvokeEvent, input: unknown) => {
      const { records, filename, metadata } = parseInput(exportRequestSchema, input);
      const wb = await createStyledWorkbook(records, metadata);
      const tempPath = tempFilePath(`${safeFileName(filename)}_${Date.now()}.xlsx`);
      await wb.xlsx.writeFile(tempPath);

      const shareHelperPath = app.isPackaged
        ? path.join(process.resourcesPath, 'ShareHelper.exe')
        : path.join(app.getAppPath(), 'resources', 'ShareHelper.exe');
      if (fs.existsSync(shareHelperPath)) {
        execFile(shareHelperPath, [tempPath], (err) => {
          if (err) {
            mainLogger.error('ShareHelper error', 'Export', err);
          }
        });
      } else {
        shell.showItemInFolder(tempPath);
      }

      removeLater(tempPath, 600_000);
      return { success: true };
    },
    { message: 'Share export error', scope: 'Export' }
  );

  ipcMain.handle('app:print', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false };
    try {
      const pdfData = await mainWindow.webContents.printToPDF(PDF_OPTIONS);
      const tempPath = tempFilePath(`yazdir-${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, pdfData);
      await shell.openPath(tempPath);
      removeLater(tempPath, 60_000);
      return { success: true };
    } catch (error) {
      mainLogger.error('Print error', 'Print', error);
      return { success: false, error: toUserMessage(error) };
    }
  });
}
