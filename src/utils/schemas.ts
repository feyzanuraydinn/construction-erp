import { z } from 'zod';
import i18n from '../i18n';

// Helper: get translated validation message
function v(key: string): string {
  return i18n.t(`validation.${key}`);
}

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTcNumber(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = d.slice(0, 10).reduce((sum, n) => sum + n, 0) % 10;
  return d[9] === tenth && d[10] === eleventh;
}

export function isValidIban(value: string): boolean {
  const iban = value.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith('TR') && iban.length !== 26) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const optionalNonNegativeNumberField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? null : num;
  })
  .refine((val) => val === null || val >= 0, { error: () => v('nonNegative') });

// ==================== HELPER SCHEMAS ====================

const optionalDateField = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === '') return null;
    return val;
  })
  .refine((val) => !val || isValidCalendarDate(val), {
    error: () => v('dateFormat'),
  });

const requiredDateField = z.string().refine(isValidCalendarDate, { error: () => v('dateFormat') });

// Optional number field that coerces string to number
const optionalNumberField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return isNaN(num) ? null : num;
  });

// Required positive number field that coerces string to number
const requiredPositiveNumberField = z
  .union([z.number(), z.string()])
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num;
  })
  .refine((val) => !isNaN(val) && val > 0, {
    error: () => v('positiveNumber'),
  });

// ==================== COMPANY SCHEMAS ====================

export const companySchema = z.object({
  type: z.enum(['person', 'company']),
  account_type: z.enum(['customer', 'supplier', 'subcontractor', 'investor']),
  name: z.string().min(1, { error: () => v('nameRequired') }).max(255),
  tc_number: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      return val;
    })
    .refine((val) => !val || isValidTcNumber(val), {
      error: () => v('tcNumber'),
    }),
  profession: z.string().max(255).optional().nullable(),
  tax_office: z.string().max(255).optional().nullable(),
  tax_number: z.string().max(20).optional().nullable(),
  trade_registry_no: z.string().max(50).optional().nullable(),
  contact_person: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      return val;
    })
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      error: () => v('emailFormat'),
    }),
  address: z.string().max(500).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  iban: z
    .string()
    .max(42)
    .optional()
    .nullable()
    .refine(
      (val) => {
        const compact = (val ?? '').replace(/\s/g, '').toUpperCase();
        return compact === '' || compact === 'TR' || isValidIban(compact);
      },
      { error: () => v('iban') }
    ),
  notes: z.string().max(1000).optional().nullable(),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type CompanyFormInput = z.input<typeof companySchema>;

// ==================== PROJECT SCHEMAS ====================

export const projectSchema = z.object({
  code: z.string().min(1, { error: () => v('projectCodeRequired') }).max(50),
  name: z.string().min(1, { error: () => v('projectNameRequired') }).max(255),
  ownership_type: z.enum(['own', 'client']),
  client_company_id: optionalNumberField,
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).default('planned'),
  project_type: z
    .enum(['residential', 'villa', 'commercial', 'mixed', 'infrastructure', 'renovation'])
    .optional()
    .nullable(),
  location: z.string().max(255).optional().nullable(),
  total_area: optionalNonNegativeNumberField,
  unit_count: optionalNumberField,
  estimated_budget: optionalNonNegativeNumberField,
  planned_start: optionalDateField,
  planned_end: optionalDateField,
  actual_start: optionalDateField,
  actual_end: optionalDateField,
  description: z.string().max(2000).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.planned_start && data.planned_end && data.planned_end < data.planned_start) {
    ctx.addIssue({ code: 'custom', path: ['planned_end'], message: v('endBeforeStart') });
  }
  if (data.actual_start && data.actual_end && data.actual_end < data.actual_start) {
    ctx.addIssue({ code: 'custom', path: ['actual_end'], message: v('endBeforeStart') });
  }
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectFormInput = z.input<typeof projectSchema>;

export const projectPartySchema = z.object({
  project_id: requiredPositiveNumberField,
  company_id: requiredPositiveNumberField,
  role: z.enum(['customer', 'supplier', 'subcontractor', 'investor']),
  notes: z.string().max(500).optional().nullable(),
});

export type ProjectPartyInput = z.infer<typeof projectPartySchema>;

// ==================== TRANSACTION SCHEMAS ====================

export const transactionSchema = z.object({
  scope: z.enum(['cari', 'project', 'company']),
  company_id: optionalNumberField,
  project_id: optionalNumberField,
  type: z.enum(['invoice_out', 'payment_in', 'invoice_in', 'payment_out']),
  category_id: optionalNumberField,
  date: requiredDateField,
  description: z.string().min(1, { error: () => v('descriptionRequired') }).max(500),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num;
    })
    .refine((val) => !isNaN(val) && val > 0, {
      error: () => v('amountPositive'),
    }),
  currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  exchange_rate: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return Number.isFinite(num) ? num : null;
    }),
  document_no: z.string().max(50).optional().nullable(),
  linked_invoice_id: optionalNumberField,
  notes: z.string().max(1000).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.currency !== 'TRY' && !(data.exchange_rate !== null && data.exchange_rate > 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['exchange_rate'],
      message: v('exchangeRateRequired'),
    });
  }
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFormInput = z.input<typeof transactionSchema>;

const positiveIdField = z.number().int().positive();
const nullableIdField = positiveIdField.nullable();
const allocationAmountField = z.number().positive().max(1e12);

export const saveTransactionSchema = z.object({
  id: positiveIdField.optional(),
  data: transactionSchema,
  paymentAllocations: z
    .array(z.object({ invoiceId: positiveIdField, amount: allocationAmountField }))
    .max(1000)
    .optional(),
  invoiceAllocations: z
    .array(z.object({ paymentId: positiveIdField, amount: allocationAmountField }))
    .max(1000)
    .optional(),
  remainderDocument: z.object({ categoryId: positiveIdField }).optional(),
});

export const matchCandidatesSchema = z.object({
  type: z.enum(['invoice_out', 'payment_in', 'invoice_in', 'payment_out']),
  companyId: nullableIdField,
  projectId: nullableIdField,
  selfId: nullableIdField,
});

const reviewIdList = z.array(positiveIdField).max(100000);

export const reviewRepairsSchema = z.object({ orphanIds: reviewIdList });

export const reviewRatesSchema = z.object({
  rates: z.array(z.object({ id: positiveIdField, rate: z.number().gt(1).max(1e6) })).max(100000),
});

export const reviewAllocationFixesSchema = z.object({
  keys: z.array(z.string().regex(/^[a-z_]+:\d+$/)).max(100000),
});

export const reviewUnmatchedSchema = z.object({
  choices: z
    .array(
      z.object({
        id: positiveIdField,
        match: z.boolean(),
        rest: z.enum(['document', 'advance']),
        categoryId: nullableIdField,
      })
    )
    .max(100000),
  firmChoices: z.array(z.object({ id: positiveIdField, categoryId: positiveIdField })).max(100000),
});

export const transactionFiltersSchema = z.object({
  scope: z.enum(['cari', 'project', 'company']).optional(),
  type: z.enum(['invoice_out', 'payment_in', 'invoice_in', 'payment_out']).optional(),
  company_id: optionalNumberField,
  project_id: optionalNumberField,
  start_date: optionalDateField,
  end_date: optionalDateField,
  search: z.string().max(100).optional(),
  limit: optionalNumberField,
});

export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;

// ==================== MATERIAL SCHEMAS ====================

export const materialSchema = z.object({
  code: z.string().min(1, { error: () => v('materialCodeRequired') }).max(50),
  name: z.string().min(1, { error: () => v('materialNameRequired') }).max(255),
  category: z.string().max(100).optional().nullable(),
  unit: z.string().min(1, { error: () => v('unitRequired') }).max(20),
  min_stock: z
    .union([z.number(), z.string()])
    .default(0)
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : Math.max(0, num);
    }),
  current_stock: z
    .union([z.number(), z.string()])
    .default(0)
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : Math.max(0, num);
    }),
  notes: z.string().max(1000).optional().nullable(),
});

export type MaterialInput = z.infer<typeof materialSchema>;
export type MaterialFormInput = z.input<typeof materialSchema>;

// ==================== STOCK MOVEMENT SCHEMAS ====================

export const stockMovementSchema = z.object({
  material_id: requiredPositiveNumberField,
  movement_type: z.enum(['in', 'out', 'adjustment', 'waste']),
  quantity: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num;
    })
    .refine((val) => !isNaN(val) && val > 0, {
      error: () => v('quantityPositive'),
    }),
  unit_price: optionalNonNegativeNumberField,
  project_id: optionalNumberField,
  company_id: optionalNumberField,
  date: requiredDateField,
  description: z.string().max(500).optional().nullable(),
  document_no: z.string().max(50).optional().nullable(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type StockMovementFormInput = z.input<typeof stockMovementSchema>;

export const stockMovementFiltersSchema = z.object({
  material_id: optionalNumberField,
  movement_type: z.enum(['in', 'out', 'adjustment', 'waste']).optional(),
  project_id: optionalNumberField,
  start_date: optionalDateField,
  end_date: optionalDateField,
});

export type StockMovementFiltersInput = z.infer<typeof stockMovementFiltersSchema>;

// ==================== CATEGORY SCHEMAS ====================

export const categorySchema = z.object({
  name: z.string().min(1, { error: () => v('categoryNameRequired') }).max(100),
  type: z.enum(['invoice_out', 'invoice_in', 'payment']),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6366f1'),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ==================== GOOGLE DRIVE SCHEMAS ====================

export const gdriveCredentialsSchema = z.object({
  clientId: z.string().min(1, { error: () => v('clientIdRequired') }),
  clientSecret: z.string().min(1, { error: () => v('clientSecretRequired') }),
});

export type GDriveCredentialsInput = z.infer<typeof gdriveCredentialsSchema>;

// ==================== VALIDATION HELPER ====================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { success: false, error: messages };
    }
    return { success: false, error: v('validationError') };
  }
}

// ==================== ID VALIDATION ====================

export const idSchema = z.number().int().positive();

export function validateId(id: unknown): ValidationResult<number> {
  return validateInput(idSchema, id);
}
