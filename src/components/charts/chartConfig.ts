import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

export const CHART_MARGIN = { top: 10, right: 20, left: 10, bottom: 5 };
export const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#e5e7eb' };
export const AXIS_TICK = { fontSize: 10 };
export const MONTH_AXIS_PROPS = { dataKey: 'month', tick: AXIS_TICK };
export const LEGEND_STYLE = { fontSize: '12px' };

export const CHART_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#64748b',
  '#14b8a6',
  '#f97316',
];

export function moneyTickFormatter(value: number): string {
  return formatCompactCurrency(value, true);
}

export const MONEY_AXIS_PROPS = {
  tick: AXIS_TICK,
  tickFormatter: moneyTickFormatter,
  width: 60,
};

export function moneyTooltipFormatter(value: number): string {
  return formatCurrency(value);
}

export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
