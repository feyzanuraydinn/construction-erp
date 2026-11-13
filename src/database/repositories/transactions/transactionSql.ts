import type { TransactionFilters } from '../../../types';
import { allocationTotalsJoinSql } from '../../sqlFragments';

export const TRANSACTION_UPDATABLE_FIELDS = [
  'scope',
  'company_id',
  'project_id',
  'type',
  'category_id',
  'date',
  'description',
  'amount',
  'currency',
  'document_no',
  'linked_invoice_id',
  'notes',
] as const;

export const DETAILS_SELECT = `
  SELECT t.*,
    c.name as company_name,
    p.name as project_name,
    cat.name as category_name,
    cat.color as category_color,
    COALESCE(pa_sum.total_allocated, 0) as allocated_amount,
    COALESCE(inv_sum.total_settled, 0) as settled_amount
  FROM transactions t
  LEFT JOIN companies c ON c.id = t.company_id
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN categories cat ON cat.id = t.category_id
  ${allocationTotalsJoinSql('payment_id', 'pa_sum', 'total_allocated', 't')}
  ${allocationTotalsJoinSql('invoice_id', 'inv_sum', 'total_settled', 't')}
`;

export const TRASH_DISPLAY_SELECT = `
      SELECT t.*, c.name as company_name, p.name as project_name
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `;

export function filteredDetailsQuery(filters?: TransactionFilters): {
  query: string;
  params: unknown[];
} {
  let query = `${DETAILS_SELECT} WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.scope) {
    query += ` AND t.scope = ?`;
    params.push(filters.scope);
  }
  if (filters?.type) {
    query += ` AND t.type = ?`;
    params.push(filters.type);
  }
  if (filters?.company_id) {
    query += ` AND t.company_id = ?`;
    params.push(filters.company_id);
  }
  if (filters?.project_id) {
    query += ` AND t.project_id = ?`;
    params.push(filters.project_id);
  }
  if (filters?.start_date) {
    query += ` AND t.date >= ?`;
    params.push(filters.start_date);
  }
  if (filters?.end_date) {
    query += ` AND t.date <= ?`;
    params.push(filters.end_date);
  }
  if (filters?.search) {
    query += ` AND (t.description LIKE ? OR t.document_no LIKE ? OR c.name LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  query += ` ORDER BY t.date DESC, t.created_at DESC`;
  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
  }
  return { query, params };
}
