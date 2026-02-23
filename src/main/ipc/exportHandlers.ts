import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { shell } from 'electron';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import { API, LIMITS } from '../../utils/constants';
import { sanitizeError } from '../../utils/security';

export function registerExportHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'export:toExcel',
    async (_: IpcMainInvokeEvent, data: { type: string; records: unknown[]; filename?: string }) => {
      try {
        const mainWindow = getMainWindow();
        if (!mainWindow) return '';

        const { type, records, filename } = data;
        const defaultFilename = filename || `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

        const result = await dialog.showSaveDialog(mainWindow, {
          title: t('main.export.excelSaveTitle'),
          defaultPath: defaultFilename,
          filters: [
            { name: 'Excel Files', extensions: ['xlsx'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return '';
        }

        // Convert records to Excel
        if (records.length === 0) {
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet([[t('main.export.noData')]]);
          XLSX.utils.book_append_sheet(wb, ws, t('main.export.sheetName'));
          XLSX.writeFile(wb, result.filePath);
          return result.filePath;
        }

        const wb = XLSX.utils.book_new();

        if (records.length > API.EXPORT_BATCH_SIZE) {
          const headers = Object.keys(records[0] as object);
          const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([headers]);

          for (let i = 0; i < records.length; i += API.EXPORT_BATCH_SIZE) {
            const batch = records.slice(i, Math.min(i + API.EXPORT_BATCH_SIZE, records.length));
            const batchData = batch.map((record) =>
              headers.map((header) => {
                const val = (record as Record<string, unknown>)[header];
                return val === null || val === undefined ? '' : val;
              })
            );

            XLSX.utils.sheet_add_aoa(ws, batchData, { origin: i + 1 });

            if (mainWindow && records.length > API.LARGE_EXPORT_THRESHOLD) {
              const progress = Math.round(((i + batch.length) / records.length) * 100);
              mainWindow.webContents.send('export:progress', { progress, total: records.length });
            }
          }

          const sampleSize = Math.min(100, records.length);
          const colWidths = headers.map((header) => {
            let maxWidth = header.length;
            for (let i = 0; i < sampleSize; i++) {
              const val = (records[i] as Record<string, unknown>)[header];
              if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxWidth) maxWidth = len;
              }
            }
            return {
              wch: Math.min(
                Math.max(maxWidth + 2, LIMITS.MIN_EXCEL_COLUMN_WIDTH),
                LIMITS.MAX_EXCEL_COLUMN_WIDTH
              ),
            };
          });
          ws['!cols'] = colWidths;

          XLSX.utils.book_append_sheet(wb, ws, t('main.export.sheetName'));
        } else {
          const ws = XLSX.utils.json_to_sheet(records as object[]);
          const headers = Object.keys(records[0] as object);
          const colWidths = headers.map((header) => {
            let maxWidth = header.length;
            records.forEach((record) => {
              const val = (record as Record<string, unknown>)[header];
              if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxWidth) maxWidth = len;
              }
            });
            return {
              wch: Math.min(
                Math.max(maxWidth + 2, LIMITS.MIN_EXCEL_COLUMN_WIDTH),
                LIMITS.MAX_EXCEL_COLUMN_WIDTH
              ),
            };
          });
          ws['!cols'] = colWidths;

          XLSX.utils.book_append_sheet(wb, ws, t('main.export.sheetName'));
        }

        const writeOptions: XLSX.WritingOptions = {
          compression: records.length > API.EXPORT_BATCH_SIZE,
        };

        XLSX.writeFile(wb, result.filePath, writeOptions);
        return result.filePath;
      } catch (error) {
        mainLogger.error('Excel export error', 'Export', error);
        throw new Error(sanitizeError(error));
      }
    }
  );

  ipcMain.handle(
    'export:toPDF',
    async (_: IpcMainInvokeEvent, data: { type: string; html: string; filename?: string }) => {
      try {
        const mainWindow = getMainWindow();
        if (!mainWindow) return '';

        const { type, filename } = data;
        const defaultFilename = filename || `${type}_${new Date().toISOString().split('T')[0]}.pdf`;

        const result = await dialog.showSaveDialog(mainWindow, {
          title: t('main.export.pdfSaveTitle'),
          defaultPath: defaultFilename,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return '';
        }

        const pdfData = await mainWindow.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          margins: { top: 1, bottom: 1, left: 1, right: 1 },
        });

        fs.writeFileSync(result.filePath, pdfData);
        return result.filePath;
      } catch (error) {
        mainLogger.error('PDF export error', 'Export', error);
        throw new Error(sanitizeError(error));
      }
    }
  );

  // Print handler
  ipcMain.handle('app:print', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false };
    try {
      const pdfData = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      const tempDir = path.join(app.getPath('temp'), 'insaat-erp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, `yazdir-${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, pdfData);
      await shell.openPath(tempPath);
      // Clean up temp PDF after 60 seconds
      setTimeout(() => {
        try { fs.unlinkSync(tempPath); } catch { /* file may already be deleted */ }
      }, 60_000);
      return { success: true };
    } catch (error) {
      mainLogger.error('Print error', 'Print', error);
      return { success: false, error: sanitizeError(error) };
    }
  });
}
