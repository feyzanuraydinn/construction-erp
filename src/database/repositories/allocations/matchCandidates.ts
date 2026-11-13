import type { MatchCandidate, MatchPool } from '../../../types';
import { MONEY_TOLERANCE, roundMoney } from '../../../utils/money';
import { tryAmountSql } from '../../sqlFragments';
import type { AllocationSide } from './allocationSides';

export type CandidateRow = Omit<MatchCandidate, 'remaining'> & { allocated_elsewhere: number };

export function poolCondition(pool: MatchPool): { sql: string; params: unknown[] } | null {
  if (pool.companyId) return { sql: 't.company_id = ?', params: [pool.companyId] };
  if (pool.projectId)
    return { sql: 't.company_id IS NULL AND t.project_id = ?', params: [pool.projectId] };
  return null;
}

export function candidatesSql(side: AllocationSide, poolSql: string): string {
  return `
      SELECT t.id, t.type, t.description, t.amount, t.currency,
        ${tryAmountSql('t')} as amount_try,
        t.date, t.document_no, t.company_id, c.name as company_name,
        t.project_id, p.name as project_name,
        COALESCE((SELECT SUM(amount) FROM payment_allocations
          WHERE ${side.other} = t.id AND ${side.own} != ?), 0) as allocated_elsewhere,
        COALESCE((SELECT SUM(amount) FROM payment_allocations
          WHERE ${side.other} = t.id AND ${side.own} = ?), 0) as allocated_here
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.type = ? AND t.id != ? AND ${poolSql}
      ORDER BY t.date ASC, t.id ASC
    `;
}

export function rankCandidates(rows: CandidateRow[], pool: MatchPool): MatchCandidate[] {
  return rows
    .map(({ allocated_elsewhere, ...row }) => ({
      ...row,
      remaining: roundMoney(row.amount_try - allocated_elsewhere),
    }))
    .filter((row) => row.remaining > MONEY_TOLERANCE || row.allocated_here > 0)
    .sort((a, b) => {
      const aHere = pool.projectId != null && a.project_id === pool.projectId ? 0 : 1;
      const bHere = pool.projectId != null && b.project_id === pool.projectId ? 0 : 1;
      return aHere - bHere;
    });
}
