import type { ID, ISODateString } from './index';

export type ExpenseStatus =
  | 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'void';

export type ExpensePaymentMethod =
  | 'cash'
  | 'bank_deposit'
  | 'bank_transfer'
  | 'gcash'
  | 'maya'
  | 'check'
  | 'other';

export type ExpenseCategory =
  | 'materials'
  | 'hardware'
  | 'wood'
  | 'glass'
  | 'labor'
  | 'gasoline'
  | 'delivery'
  | 'transportation'
  | 'office_supplies'
  | 'tools'
  | 'utilities'
  | 'other';

export interface Expense {
  id: ID;
  expense_code: string | null;
  expense_date: string;
  invoice_number: string | null;
  category_id: ID;
  project_id: ID | null;
  supplier_id: ID | null;
  amount: number;
  currency: string;
  description: string | null;
  status: ExpenseStatus;
  payment_method: ExpensePaymentMethod | null;
  notes: string | null;
  submitted_by: ID | null;
  submitted_at: string | null;
  approved_by: ID | null;
  approved_at: string | null;
  approval_notes: string | null;
  rejected_by: ID | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ExpenseWithRelations extends Expense {
  category_name: string;
  project_name: string | null;
  project_code: string | null;
  supplier_name: string | null;
  submitted_by_email: string | null;
  approved_by_email: string | null;
  rejected_by_email: string | null;
}

export interface CreateExpenseInput {
  expense_date: string;
  invoice_number?: string;
  category_id: ID;
  project_id?: ID;
  supplier_id?: ID;
  amount: number;
  description?: string;
  status?: ExpenseStatus;
  payment_method?: ExpensePaymentMethod;
  notes?: string;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  id: ID;
}
