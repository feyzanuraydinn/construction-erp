import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow } from 'electron';
import { app, shell } from 'electron';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import { LIMITS } from '../../utils/constants';
import { sanitizeError } from '../../utils/security';

interface ExportMetadata {
  summaryStartIndex?: number;
  amountColumnLabel?: string;
  balanceColumnLabel?: string;
  receivableColumnLabel?: string;
  payableColumnLabel?: string;
  typeColumnLabel?: string;
  /** Values in the type column that should be colored red. Others will be green. */
  expenseTypeValues?: string[];
  /** Summary row labels that should have RED amount regardless of sign */
  redSummaryLabels?: string[];
  /** Summary row labels that should have GREEN amount regardless of sign */
  greenSummaryLabels?: string[];
  /** Summary row labels that should have yellow highlight background */
  highlightSummaryLabels?: string[];
}

interface ExportData {
  type: string;
  records: Record<string, unknown>[];
  filename?: string;
  metadata?: ExportMetadata;
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2D3748' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const SUMMARY_HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const GREEN_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF15803D' }, bold: true };
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFB91C1C' }, bold: true };

const HIGHLIGHT_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF3CD' },
};

function parseCurrencyValue(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

async function createStyledWorkbook(records: Record<string, unknown>[], metadata?: ExportMetadata): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t('main.export.sheetName'));

  if (records.length === 0) {
    ws.addRow([t('main.export.noData')]);
    return wb;
  }

  const headers = Object.keys(records[0]);

  // Add header row
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;

  // Find column indices for color coding (1-based for ExcelJS)
  const amtColIdx = metadata?.amountColumnLabel ? headers.indexOf(metadata.amountColumnLabel) + 1 : 0;
  const balColIdx = metadata?.balanceColumnLabel ? headers.indexOf(metadata.balanceColumnLabel) + 1 : 0;
  const recColIdx = metadata?.receivableColumnLabel ? headers.indexOf(metadata.receivableColumnLabel) + 1 : 0;
  const payColIdx = metadata?.payableColumnLabel ? headers.indexOf(metadata.payableColumnLabel) + 1 : 0;
  const typeColIdx = metadata?.typeColumnLabel ? headers.indexOf(metadata.typeColumnLabel) + 1 : 0;
  const expenseTypes = metadata?.expenseTypeValues ?? [];
  const redLabels = metadata?.redSummaryLabels ?? [];
  const greenLabels = metadata?.greenSummaryLabels ?? [];
  const highlightLabels = metadata?.highlightSummaryLabels ?? [];
  const summaryStart = metadata?.summaryStartIndex ?? Infinity;

  // Add data rows
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const values = headers.map((h) => {
      const val = record[h];
      return val === null || val === undefined ? '' : val;
    });
    const row = ws.addRow(values);
    const rowIdx = i + 1; // 0-based data index (header is row 1)

    // Summary section styling
    if (rowIdx >= summaryStart) {
      const isEmptyRow = values.every((v) => v === '' || v === undefined);
      const isSummaryHeader = rowIdx === summaryStart + 1; // second row after empty = header

      if (isSummaryHeader) {
        // Apply blue background to ALL columns, not just cells with values
        for (let c = 1; c <= headers.length; c++) {
          const cell = row.getCell(c);
          cell.fill = SUMMARY_HEADER_FILL;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        }
        row.height = 22;
      } else if (!isEmptyRow) {
        // Find the label (first non-empty cell in the row)
        let label = '';
        let labelCellIdx = 1;
        for (let c = 1; c <= headers.length; c++) {
          const val = String(row.getCell(c).value || '').trim();
          if (val) { label = val; labelCellIdx = c; break; }
        }

        const colorColIdx = amtColIdx || balColIdx;

        // Color the amount/balance cell based on label or value sign
        if (colorColIdx > 0) {
          const amountCell = row.getCell(colorColIdx);
          if (redLabels.includes(label)) {
            amountCell.font = RED_FONT;
          } else if (greenLabels.includes(label)) {
            amountCell.font = GREEN_FONT;
          } else {
            const numVal = parseCurrencyValue(amountCell.value);
            if (numVal > 0) amountCell.font = GREEN_FONT;
            else if (numVal < 0) amountCell.font = RED_FONT;
          }
        }

        // Bold the label cell
        row.getCell(labelCellIdx).font = { bold: true };

        // Yellow highlight for result rows
        if (highlightLabels.includes(label)) {
          row.eachCell((cell) => {
            cell.fill = HIGHLIGHT_FILL;
            cell.font = { ...cell.font, bold: true };
          });
        }
      }
    } else {
      // Regular data rows — color amount by transaction type
      if (typeColIdx > 0 && amtColIdx > 0) {
        const typeVal = String(row.getCell(typeColIdx).value || '');
        const amountCell = row.getCell(amtColIdx);
        const isExpense = expenseTypes.some((et) => typeVal === et);
        amountCell.font = isExpense ? RED_FONT : GREEN_FONT;
      }
      // Color receivable column (always green)
      if (recColIdx > 0) {
        const cell = row.getCell(recColIdx);
        const numVal = parseCurrencyValue(cell.value);
        if (numVal !== 0) cell.font = GREEN_FONT;
      }
      // Color payable column (always red)
      if (payColIdx > 0) {
        const cell = row.getCell(payColIdx);
        const numVal = parseCurrencyValue(cell.value);
        if (numVal !== 0) cell.font = RED_FONT;
      }
      // Color balance column by positive/negative
      if (balColIdx > 0) {
        const cell = row.getCell(balColIdx);
        const numVal = parseCurrencyValue(cell.value);
        if (numVal > 0) cell.font = GREEN_FONT;
        else if (numVal < 0) cell.font = RED_FONT;
      }
    }

    // Alternate row shading for data rows
    if (rowIdx < summaryStart && i % 2 === 1) {
      row.eachCell((cell) => {
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).pattern !== 'solid') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FA' } };
        }
      });
    }
  }

  // Auto-fit column widths
  ws.columns.forEach((column, idx) => {
    const header = headers[idx] || '';
    let maxWidth = header.length;
    const sampleSize = Math.min(100, records.length);
    for (let i = 0; i < sampleSize; i++) {
      const val = records[i][header];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxWidth) maxWidth = len;
      }
    }
    column.width = Math.min(Math.max(maxWidth + 3, LIMITS.MIN_EXCEL_COLUMN_WIDTH), LIMITS.MAX_EXCEL_COLUMN_WIDTH);
  });

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return wb;
}

export function registerExportHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(
    'export:toExcel',
    async (_: IpcMainInvokeEvent, data: ExportData) => {
      try {
        const mainWindow = getMainWindow();
        if (!mainWindow) return '';

        const { records, filename, metadata } = data;
        const defaultFilename = filename || `${data.type}_${new Date().toISOString().split('T')[0]}.xlsx`;

        const result = await dialog.showSaveDialog(mainWindow, {
          title: t('main.export.excelSaveTitle'),
          defaultPath: defaultFilename.endsWith('.xlsx') ? defaultFilename : `${defaultFilename}.xlsx`,
          filters: [
            { name: 'Excel Files', extensions: ['xlsx'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) return '';

        const wb = await createStyledWorkbook(records as Record<string, unknown>[], metadata);
        await wb.xlsx.writeFile(result.filePath);
        return result.filePath;
      } catch (error) {
        mainLogger.error('Excel export error', 'Export', error);
        throw new Error(sanitizeError(error));
      }
    }
  );

  ipcMain.handle(
    'export:share',
    async (_: IpcMainInvokeEvent, data: ExportData) => {
      try {
        const { records, filename, metadata } = data;
        const wb = await createStyledWorkbook(records as Record<string, unknown>[], metadata);
        const safeName = (filename || data.type).replace(/[<>:"/\\|?*]/g, '_');
        // Use unique suffix to avoid file lock conflicts from previous shares
        const exportFilename = `${safeName}_${Date.now()}.xlsx`;

        // Save to temp directory
        const tempDir = path.join(app.getPath('temp'), 'construction-erp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, exportFilename);
        await wb.xlsx.writeFile(tempPath);

        // Launch ShareHelper.exe to show native Windows Share dialog
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
          // Fallback: open file in Explorer
          shell.showItemInFolder(tempPath);
        }

        // Clean up temp file after 10 minutes
        setTimeout(() => {
          try { fs.unlinkSync(tempPath); } catch { /* file may already be deleted */ }
        }, 600_000);

        return { success: true };
      } catch (error) {
        mainLogger.error('Share export error', 'Export', error);
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

      const tempDir = path.join(app.getPath('temp'), 'construction-erp');
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
