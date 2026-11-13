import type {
  PaymentAllocationWithDetails,
  MatchCandidate,
  MatchPool,
  AllocationInput,
  InvoiceAllocationInput,
} from '../../types';
import { runInSavepoint } from '../savepoint';
import { MONEY_TOLERANCE, roundMoney } from '../../utils/money';
import { tryAmountSql } from '../sqlFragments';
import { SqlRepository } from './SqlRepository';
import {
  INVOICE_SIDE,
  PAYMENT_SIDE,
  sideOf,
  type AllocationColumn,
  type AllocationSide,
  type MatchRow,
  type SideAllocation,
} from './allocations/allocationSides';
import {
  candidatesSql,
  poolCondition,
  rankCandidates,
  type CandidateRow,
} from './allocations/matchCandidates';

export type AllocationProblem =
  | 'not_found'
  | 'type_mismatch'
  | 'duplicate'
  | 'exceeds_payment'
  | 'exceeds_invoice'
  | 'counterparty_mismatch';

export function sameMatchPool(
  a: Pick<MatchRow, 'company_id' | 'project_id'>,
  b: Pick<MatchRow, 'company_id' | 'project_id'>
): boolean {
  if (a.company_id != null || b.company_id != null) return a.company_id === b.company_id;
  return a.project_id != null && a.project_id === b.project_id;
}

export class PaymentAllocationRepository extends SqlRepository {
  private getMatchRow(id: number): MatchRow | undefined {
    return this.query<MatchRow>(
      `SELECT id, type, company_id, project_id, ${tryAmountSql()} as amount_try FROM transactions WHERE id = ?`,
      [id]
    )[0];
  }

  private getWithCounterparts(side: AllocationSide, ownId: number): PaymentAllocationWithDetails[] {
    const prefix = side.counterpartPrefix;
    return this.query<PaymentAllocationWithDetails>(
      `
      SELECT pa.*,
        t.description as ${prefix}_description,
        t.date as ${prefix}_date,
        t.document_no as ${prefix}_document_no
      FROM payment_allocations pa
      JOIN transactions t ON t.id = pa.${side.other}
      WHERE pa.${side.own} = ?
      ORDER BY t.date ASC
    `,
      [ownId]
    );
  }

  getForPayment(paymentId: number): PaymentAllocationWithDetails[] {
    return this.getWithCounterparts(PAYMENT_SIDE, paymentId);
  }

  getForInvoice(invoiceId: number): PaymentAllocationWithDetails[] {
    return this.getWithCounterparts(INVOICE_SIDE, invoiceId);
  }

  private getCandidates(
    side: AllocationSide,
    ownType: string,
    pool: MatchPool,
    selfId: number | null
  ): MatchCandidate[] {
    const candidateType = side.counterpartType(ownType);
    const condition = poolCondition(pool);
    if (!candidateType || !condition) return [];
    const self = selfId ?? -1;
    const rows = this.query<CandidateRow>(candidatesSql(side, condition.sql), [
      self,
      self,
      candidateType,
      self,
      ...condition.params,
    ]);

    return rankCandidates(rows, pool);
  }

  getInvoiceCandidates(
    paymentType: string,
    pool: MatchPool,
    paymentId: number | null
  ): MatchCandidate[] {
    return this.getCandidates(PAYMENT_SIDE, paymentType, pool, paymentId);
  }

  getPaymentCandidates(
    invoiceType: string,
    pool: MatchPool,
    invoiceId: number | null
  ): MatchCandidate[] {
    return this.getCandidates(INVOICE_SIDE, invoiceType, pool, invoiceId);
  }

  private findProblem(
    side: AllocationSide,
    ownId: number,
    allocations: SideAllocation[]
  ): AllocationProblem | null {
    const own = this.getMatchRow(ownId);
    if (!own) return 'not_found';
    const counterpartType = side.counterpartType(own.type);
    if (!counterpartType) return 'type_mismatch';

    const counterpartIds = allocations.map((a) => a.counterpartId);
    if (new Set(counterpartIds).size !== counterpartIds.length) return 'duplicate';

    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (total > own.amount_try + MONEY_TOLERANCE) return side.exceedsOwn;

    for (const allocation of allocations) {
      const counterpart = this.getMatchRow(allocation.counterpartId);
      if (!counterpart) return 'not_found';
      if (counterpart.type !== counterpartType) return 'type_mismatch';
      if (!sameMatchPool(own, counterpart)) return 'counterparty_mismatch';
      const elsewhere = this.allocatedTo(side.other, counterpart.id, side.own, ownId);
      if (allocation.amount > counterpart.amount_try - elsewhere + MONEY_TOLERANCE)
        return side.exceedsCounterpart;
    }
    return null;
  }

  findAllocationProblem(
    paymentId: number,
    allocations: AllocationInput[]
  ): AllocationProblem | null {
    return this.findProblem(
      PAYMENT_SIDE,
      paymentId,
      allocations.map((a) => ({ counterpartId: a.invoiceId, amount: a.amount }))
    );
  }

  findInvoiceAllocationProblem(
    invoiceId: number,
    allocations: InvoiceAllocationInput[]
  ): AllocationProblem | null {
    return this.findProblem(
      INVOICE_SIDE,
      invoiceId,
      allocations.map((a) => ({ counterpartId: a.paymentId, amount: a.amount }))
    );
  }

  findExistingAllocationProblem(transactionId: number): AllocationProblem | null {
    const row = this.getMatchRow(transactionId);
    if (!row) return 'not_found';
    const side = sideOf(row.type);
    const total = this.allocatedTo(side.own, row.id, null, null);
    return total > row.amount_try + MONEY_TOLERANCE ? side.exceedsOwn : null;
  }

  findExistingCounterpartyProblem(transactionId: number): AllocationProblem | null {
    const row = this.getMatchRow(transactionId);
    if (!row) return 'not_found';
    const side = sideOf(row.type);
    const others = this.query<MatchRow>(
      `SELECT t.id, t.type, t.company_id, t.project_id, ${tryAmountSql('t')} as amount_try
       FROM payment_allocations pa
       JOIN transactions t ON t.id = pa.${side.other}
       WHERE pa.${side.own} = ?`,
      [transactionId]
    );
    const expectedType = side.counterpartType(row.type);
    for (const other of others) {
      if (other.type !== expectedType) return 'type_mismatch';
      if (!sameMatchPool(row, other)) return 'counterparty_mismatch';
    }
    return null;
  }

  private allocatedTo(
    column: AllocationColumn,
    id: number,
    exceptColumn: AllocationColumn | null,
    exceptId: number | null
  ): number {
    const except = exceptColumn ? ` AND ${exceptColumn} != ?` : '';
    const params = exceptColumn ? [id, exceptId] : [id];
    const row = this.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payment_allocations WHERE ${column} = ?${except}`,
      params
    )[0];
    return row?.total ?? 0;
  }

  private replaceAllocations(
    side: AllocationSide,
    ownId: number,
    allocations: SideAllocation[]
  ): void {
    runInSavepoint(this.db, () => {
      this.run(`DELETE FROM payment_allocations WHERE ${side.own} = ?`, [ownId]);
      for (const allocation of allocations) {
        if (allocation.amount > 0) {
          this.run(
            `INSERT INTO payment_allocations (${side.own}, ${side.other}, amount) VALUES (?, ?, ?)`,
            [ownId, allocation.counterpartId, roundMoney(allocation.amount)]
          );
        }
      }
    });
  }

  setForPayment(paymentId: number, allocations: AllocationInput[]): void {
    this.replaceAllocations(
      PAYMENT_SIDE,
      paymentId,
      allocations.map((a) => ({ counterpartId: a.invoiceId, amount: a.amount }))
    );
  }

  setForInvoice(invoiceId: number, allocations: InvoiceAllocationInput[]): void {
    this.replaceAllocations(
      INVOICE_SIDE,
      invoiceId,
      allocations.map((a) => ({ counterpartId: a.paymentId, amount: a.amount }))
    );
  }
}
