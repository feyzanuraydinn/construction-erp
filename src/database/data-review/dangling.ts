import type { Database as SqlJsDatabase } from 'sql.js';
import { countWhere, missingRefSql } from './reviewQueries';
import type { DanglingCounts } from './reviewTypes';

const MISSING_CATEGORY = missingRefSql('category_id', 'categories');
const MISSING_LINKED_INVOICE = missingRefSql('linked_invoice_id', 'transactions');
const MISSING_CLIENT_COMPANY = missingRefSql('client_company_id', 'companies');
const MISSING_PROJECT_ID = missingRefSql('project_id', 'projects');
const MISSING_COMPANY_ID = missingRefSql('company_id', 'companies');
const BROKEN_ALLOCATION =
  'payment_id NOT IN (SELECT id FROM transactions) OR invoice_id NOT IN (SELECT id FROM transactions)';
const BROKEN_PARTY =
  'project_id NOT IN (SELECT id FROM projects) OR company_id NOT IN (SELECT id FROM companies)';
const STALE_PROJECT_TAG = `scope != 'project' AND ${MISSING_PROJECT_ID} AND NOT (${MISSING_COMPANY_ID})`;

const REPAIRS = [
  `UPDATE transactions SET category_id = NULL WHERE ${MISSING_CATEGORY}`,
  `UPDATE transactions SET linked_invoice_id = NULL WHERE ${MISSING_LINKED_INVOICE}`,
  `UPDATE projects SET client_company_id = NULL WHERE ${MISSING_CLIENT_COMPANY}`,
  `UPDATE stock_movements SET project_id = NULL WHERE ${MISSING_PROJECT_ID}`,
  `UPDATE stock_movements SET company_id = NULL WHERE ${MISSING_COMPANY_ID}`,
  `DELETE FROM payment_allocations WHERE ${BROKEN_ALLOCATION}`,
  `DELETE FROM project_parties WHERE ${BROKEN_PARTY}`,
  `UPDATE transactions SET project_id = NULL WHERE ${STALE_PROJECT_TAG}`,
];

export function findDangling(db: SqlJsDatabase): DanglingCounts {
  return {
    categories: countWhere(db, 'transactions', MISSING_CATEGORY),
    linkedInvoices: countWhere(db, 'transactions', MISSING_LINKED_INVOICE),
    clientCompanies: countWhere(db, 'projects', MISSING_CLIENT_COMPANY),
    stockLinks: countWhere(
      db,
      'stock_movements',
      `(${MISSING_PROJECT_ID}) OR (${MISSING_COMPANY_ID})`
    ),
    allocations: countWhere(db, 'payment_allocations', BROKEN_ALLOCATION),
    parties: countWhere(db, 'project_parties', BROKEN_PARTY),
    projectTags: countWhere(db, 'transactions', STALE_PROJECT_TAG),
  };
}

export function repairDangling(db: SqlJsDatabase): number {
  let changed = 0;
  for (const sql of REPAIRS) {
    db.run(sql);
    changed += db.getRowsModified();
  }
  return changed;
}
