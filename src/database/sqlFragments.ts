import type { TransactionType } from '../types';

function column(alias: string | undefined, name: string): string {
  return alias ? `${alias}.${name}` : name;
}

export function tryAmountSql(alias?: string): string {
  return `COALESCE(NULLIF(${column(alias, 'amount_try')}, 0), ${column(alias, 'amount')})`;
}

export function sumOfTypeSql(type: TransactionType, alias?: string): string {
  return `COALESCE(SUM(CASE WHEN ${column(alias, 'type')} = '${type}' THEN ${tryAmountSql(alias)} ELSE 0 END), 0)`;
}

export function netBalanceSql(alias?: string): string {
  const type = column(alias, 'type');
  const amount = tryAmountSql(alias);
  return `COALESCE(SUM(CASE WHEN ${type} IN ('invoice_out', 'payment_out') THEN ${amount} WHEN ${type} IN ('invoice_in', 'payment_in') THEN -${amount} ELSE 0 END), 0)`;
}

export function flowTotalsSql(alias?: string): string {
  return [
    `${sumOfTypeSql('invoice_out', alias)} as income`,
    `${sumOfTypeSql('invoice_in', alias)} as expense`,
    `${sumOfTypeSql('payment_in', alias)} as collected`,
    `${sumOfTypeSql('payment_out', alias)} as paid`,
  ].join(', ');
}

type AllocationSide = 'payment_id' | 'invoice_id';

export function allocatedSumSql(side: AllocationSide, alias: string): string {
  return `COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE ${side} = ${alias}.id), 0)`;
}

export function openAmountSql(side: AllocationSide, alias: string): string {
  return `${tryAmountSql(alias)} - ${allocatedSumSql(side, alias)}`;
}

export function allocationTotalsJoinSql(
  side: AllocationSide,
  joinAlias: string,
  totalColumn: string,
  alias: string
): string {
  return `LEFT JOIN (SELECT ${side}, SUM(amount) as ${totalColumn} FROM payment_allocations GROUP BY ${side}) ${joinAlias} ON ${joinAlias}.${side} = ${alias}.id`;
}
