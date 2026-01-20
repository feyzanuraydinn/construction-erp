import { z } from 'zod';

// ==================== HELPER SCHEMAS ====================

// Optional date field that accepts empty string, null, or valid date format
const optionalDateField = z
  .string()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === '') return null;
    return val;
  })
  .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Geçerli tarih formatı: YYYY-MM-DD',
  });

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
    message: 'Geçerli pozitif bir sayı giriniz',
  });

// ==================== COMPANY SCHEMAS ====================

export const companySchema = z.object({
  type: z.enum(['person', 'company']),
  account_type: z.enum(['customer', 'supplier', 'subcontractor', 'investor']),
  name: z.string().min(1, 'İsim zorunludur').max(255),
  tc_number: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      return val;
    })
    .refine((val) => !val || (val.length === 11 && /^\d+$/.test(val)), {
      message: 'TC Kimlik numarası 11 haneli ve sadece rakamlardan oluşmalıdır',
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
      message: 'Geçerli bir e-posta adresi giriniz',
    }),
  address: z.string().max(500).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  iban: z.string().max(34).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ==================== PROJECT SCHEMAS ====================

export const projectSchema = z.object({
  code: z.string().min(1, 'Proje kodu zorunludur').max(50),
  name: z.string().min(1, 'Proje adı zorunludur').max(255),
  ownership_type: z.enum(['own', 'client']),
  client_company_id: optionalNumberField,
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).default('planned'),
  project_type: z
    .enum(['residential', 'villa', 'commercial', 'mixed', 'infrastructure', 'renovation'])
    .optional()
    .nullable(),
  location: z.string().max(255).optional().nullable(),
  total_area: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    }),
  unit_count: optionalNumberField,
  estimated_budget: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    }),
  planned_start: optionalDateField,
  planned_end: optionalDateField,
  actual_start: optionalDateField,
  actual_end: optionalDateField,
  description: z.string().max(2000).optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli tarih formatı: YYYY-MM-DD'),
  description: z.string().min(1, 'Açıklama zorunludur').max(500),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num;
    })
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Tutar sıfırdan büyük olmalıdır',
    }),
  currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  exchange_rate: z
    .union([z.number(), z.string()])
    .default(1)
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) || num <= 0 ? 1 : num;
    }),
  document_no: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

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
  code: z.string().min(1, 'Malzeme kodu zorunludur').max(50),
  name: z.string().min(1, 'Malzeme adı zorunludur').max(255),
  category: z.string().max(100).optional().nullable(),
  unit: z.string().min(1, 'Birim zorunludur').max(20),
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
      message: 'Miktar sıfırdan büyük olmalıdır',
    }),
  unit_price: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    }),
  project_id: optionalNumberField,
  company_id: optionalNumberField,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli tarih formatı: YYYY-MM-DD'),
  description: z.string().max(500).optional().nullable(),
  document_no: z.string().max(50).optional().nullable(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

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
  name: z.string().min(1, 'Kategori adı zorunludur').max(100),
  type: z.enum(['invoice_out', 'invoice_in', 'payment']),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6366f1'),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ==================== GOOGLE DRIVE SCHEMAS ====================

export const gdriveCredentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID zorunludur'),
  clientSecret: z.string().min(1, 'Client Secret zorunludur'),
});

export type GDriveCredentialsInput = z.infer<typeof gdriveCredentialsSchema>;

// ==================== EXPORT SCHEMAS ====================

export const exportToExcelSchema = z.object({
  type: z.string().min(1),
  records: z.array(z.record(z.string(), z.unknown())),
  filename: z.string().optional(),
});

export type ExportToExcelInput = z.infer<typeof exportToExcelSchema>;

export const exportToPDFSchema = z.object({
  type: z.string().min(1),
  html: z.string().min(1),
  filename: z.string().optional(),
});

export type ExportToPDFInput = z.infer<typeof exportToPDFSchema>;

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
    return { success: false, error: 'Validasyon hatası' };
  }
}

// ==================== ID VALIDATION ====================

export const idSchema = z.number().int().positive();

export function validateId(id: unknown): ValidationResult<number> {
  return validateInput(idSchema, id);
}
