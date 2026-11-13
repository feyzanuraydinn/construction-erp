import type ExcelJS from 'exceljs';
import { LIMITS } from '../../../utils/constants';
import type { ExportMetadata, ExportRecord } from '../../../utils/schemas';

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

export interface ExcelRowStyling {
  columnCount: number;
  amountColumn: number;
  balanceColumn: number;
  receivableColumn: number;
  payableColumn: number;
  typeColumn: number;
  expenseTypes: string[];
  redLabels: string[];
  greenLabels: string[];
  highlightLabels: string[];
}

function parseCurrencyValue(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const cleaned = val
    .replace(/[^\d.,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function colorBySign(cell: ExcelJS.Cell): void {
  const numVal = parseCurrencyValue(cell.value);
  if (numVal > 0) cell.font = GREEN_FONT;
  else if (numVal < 0) cell.font = RED_FONT;
}

function colorIfNonZero(cell: ExcelJS.Cell, font: Partial<ExcelJS.Font>): void {
  if (parseCurrencyValue(cell.value) !== 0) cell.font = font;
}

export function excelRowStyling(headers: string[], metadata?: ExportMetadata): ExcelRowStyling {
  const columnOf = (label: string | undefined) => (label ? headers.indexOf(label) + 1 : 0);
  return {
    columnCount: headers.length,
    amountColumn: columnOf(metadata?.amountColumnLabel),
    balanceColumn: columnOf(metadata?.balanceColumnLabel),
    receivableColumn: columnOf(metadata?.receivableColumnLabel),
    payableColumn: columnOf(metadata?.payableColumnLabel),
    typeColumn: columnOf(metadata?.typeColumnLabel),
    expenseTypes: metadata?.expenseTypeValues ?? [],
    redLabels: metadata?.redSummaryLabels ?? [],
    greenLabels: metadata?.greenSummaryLabels ?? [],
    highlightLabels: metadata?.highlightSummaryLabels ?? [],
  };
}

export function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row.height = 22;
}

function styleSummaryHeaderRow(row: ExcelJS.Row, styling: ExcelRowStyling): void {
  for (let c = 1; c <= styling.columnCount; c++) {
    const cell = row.getCell(c);
    cell.fill = SUMMARY_HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  }
  row.height = 22;
}

function summaryLabel(row: ExcelJS.Row, columnCount: number): { label: string; column: number } {
  for (let c = 1; c <= columnCount; c++) {
    const val = String(row.getCell(c).value || '').trim();
    if (val) return { label: val, column: c };
  }
  return { label: '', column: 1 };
}

export function styleSummaryRow(
  row: ExcelJS.Row,
  values: unknown[],
  isSummaryHeader: boolean,
  styling: ExcelRowStyling
): void {
  if (isSummaryHeader) {
    styleSummaryHeaderRow(row, styling);
    return;
  }
  if (values.every((v) => v === '' || v === undefined)) return;

  const { label, column } = summaryLabel(row, styling.columnCount);
  const colorColumn = styling.amountColumn || styling.balanceColumn;

  if (colorColumn > 0) {
    const amountCell = row.getCell(colorColumn);
    if (styling.redLabels.includes(label)) {
      amountCell.font = RED_FONT;
    } else if (styling.greenLabels.includes(label)) {
      amountCell.font = GREEN_FONT;
    } else {
      colorBySign(amountCell);
    }
  }

  row.getCell(column).font = { bold: true };

  if (styling.highlightLabels.includes(label)) {
    row.eachCell((cell) => {
      cell.fill = HIGHLIGHT_FILL;
      cell.font = { ...cell.font, bold: true };
    });
  }
}

export function styleDataRow(row: ExcelJS.Row, styling: ExcelRowStyling): void {
  if (styling.typeColumn > 0 && styling.amountColumn > 0) {
    const typeVal = String(row.getCell(styling.typeColumn).value || '');
    const amountCell = row.getCell(styling.amountColumn);
    const isExpense = styling.expenseTypes.some((et) => typeVal === et);
    amountCell.font = isExpense ? RED_FONT : GREEN_FONT;
  }
  if (styling.receivableColumn > 0) {
    colorIfNonZero(row.getCell(styling.receivableColumn), GREEN_FONT);
  }
  if (styling.payableColumn > 0) {
    colorIfNonZero(row.getCell(styling.payableColumn), RED_FONT);
  }
  if (styling.balanceColumn > 0) {
    colorBySign(row.getCell(styling.balanceColumn));
  }
}

export function shadeAlternateRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    if (!cell.fill || cell.fill.type !== 'pattern' || cell.fill.pattern !== 'solid') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FA' } };
    }
  });
}

export function fitColumnWidths(
  ws: ExcelJS.Worksheet,
  headers: string[],
  records: ExportRecord[]
): void {
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
    column.width = Math.min(
      Math.max(maxWidth + 3, LIMITS.MIN_EXCEL_COLUMN_WIDTH),
      LIMITS.MAX_EXCEL_COLUMN_WIDTH
    );
  });
}
