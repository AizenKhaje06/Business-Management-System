export type ImportEntityType =
  | 'clients'
  | 'suppliers'
  | 'projects'
  | 'payments'
  | 'expenses'
  | 'materials';

export interface ImportColumnDef {
  field: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email' | 'enum';
  enumValues?: string[];
}

export interface ParsedFileData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface ValidationResult {
  valid: Record<string, unknown>[];
  invalid: Array<{ row: Record<string, unknown>; rowIndex: number; errors: string[] }>;
  duplicates: Array<{
    row: Record<string, unknown>;
    rowIndex: number;
    duplicateOf: string;
  }>;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
}

export interface ImportSummary {
  imported: number;
  failed: number;
  errors: string[];
  importId: string;
}

export interface ImportHistoryEntry {
  id: string;
  entity_type: string;
  file_name: string;
  file_type: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  status: string;
  error_details: Record<string, unknown> | null;
  column_mapping: Record<string, string> | null;
  created_at: string;
  completed_at: string | null;
  imported_by_email: string | null;
}

export const ENTITY_COLUMNS: Record<ImportEntityType, ImportColumnDef[]> = {
  clients: [
    { field: 'name', label: 'Name', required: true, type: 'string' },
    { field: 'company_name', label: 'Company Name', required: false, type: 'string' },
    { field: 'contact_person', label: 'Contact Person', required: false, type: 'string' },
    { field: 'email', label: 'Email', required: false, type: 'email' },
    { field: 'phone', label: 'Phone', required: false, type: 'string' },
    { field: 'address', label: 'Address', required: false, type: 'string' },
    { field: 'city', label: 'City', required: false, type: 'string' },
    { field: 'state', label: 'State', required: false, type: 'string' },
    { field: 'postal_code', label: 'Postal Code', required: false, type: 'string' },
    { field: 'country', label: 'Country', required: false, type: 'string' },
    { field: 'tax_id', label: 'Tax ID', required: false, type: 'string' },
    { field: 'website', label: 'Website', required: false, type: 'string' },
  ],
  suppliers: [
    { field: 'name', label: 'Name', required: true, type: 'string' },
    { field: 'contact_person', label: 'Contact Person', required: false, type: 'string' },
    { field: 'email', label: 'Email', required: false, type: 'email' },
    { field: 'phone', label: 'Phone', required: false, type: 'string' },
    { field: 'address', label: 'Address', required: false, type: 'string' },
    { field: 'city', label: 'City', required: false, type: 'string' },
    { field: 'state', label: 'State', required: false, type: 'string' },
    { field: 'postal_code', label: 'Postal Code', required: false, type: 'string' },
    { field: 'country', label: 'Country', required: false, type: 'string' },
    { field: 'tax_id', label: 'Tax ID', required: false, type: 'string' },
    { field: 'payment_terms', label: 'Payment Terms', required: false, type: 'string' },
  ],
  projects: [
    { field: 'name', label: 'Project Name', required: true, type: 'string' },
    { field: 'budget', label: 'Budget', required: false, type: 'number' },
    { field: 'status', label: 'Status', required: false, type: 'enum', enumValues: ['draft', 'quotation', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'] },
    { field: 'priority', label: 'Priority', required: false, type: 'enum', enumValues: ['low', 'medium', 'high', 'urgent'] },
    { field: 'start_date', label: 'Start Date', required: false, type: 'date' },
    { field: 'end_date', label: 'End Date', required: false, type: 'date' },
    { field: 'hourly_rate', label: 'Hourly Rate', required: false, type: 'number' },
    { field: 'description', label: 'Description', required: false, type: 'string' },
  ],
  payments: [
    { field: 'project_code', label: 'Project Code', required: true, type: 'string' },
    { field: 'amount', label: 'Amount', required: true, type: 'number' },
    { field: 'payment_date', label: 'Payment Date', required: true, type: 'date' },
    { field: 'payment_method', label: 'Payment Method', required: false, type: 'enum', enumValues: ['cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'] },
    { field: 'status', label: 'Status', required: false, type: 'enum', enumValues: ['paid', 'partial', 'pending', 'cancelled'] },
    { field: 'reference_number', label: 'Reference Number', required: false, type: 'string' },
  ],
  expenses: [
    { field: 'expense_date', label: 'Expense Date', required: true, type: 'date' },
    { field: 'amount', label: 'Amount', required: true, type: 'number' },
    { field: 'description', label: 'Description', required: false, type: 'string' },
    { field: 'payment_method', label: 'Payment Method', required: false, type: 'enum', enumValues: ['cash', 'bank_deposit', 'bank_transfer', 'gcash', 'maya', 'check', 'other'] },
    { field: 'status', label: 'Status', required: false, type: 'enum', enumValues: ['draft', 'pending', 'approved', 'rejected', 'void'] },
    { field: 'invoice_number', label: 'Invoice Number', required: false, type: 'string' },
  ],
  materials: [
    { field: 'name', label: 'Material Name', required: true, type: 'string' },
    { field: 'unit', label: 'Unit', required: false, type: 'string' },
    { field: 'unit_cost', label: 'Unit Cost', required: false, type: 'number' },
    { field: 'stock_quantity', label: 'Stock Quantity', required: false, type: 'number' },
    { field: 'sku', label: 'SKU', required: false, type: 'string' },
    { field: 'description', label: 'Description', required: false, type: 'string' },
  ],
};

export function getEntityColumns(entityType: ImportEntityType): ImportColumnDef[] {
  return ENTITY_COLUMNS[entityType] || [];
}

export function getEntityLabels(): Array<{ value: ImportEntityType; label: string }> {
  return [
    { value: 'clients', label: 'Clients' },
    { value: 'suppliers', label: 'Suppliers' },
    { value: 'projects', label: 'Projects' },
    { value: 'payments', label: 'Payments' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'materials', label: 'Materials' },
  ];
}
