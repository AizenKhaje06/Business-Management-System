import type { ID, ISODateString } from './index';

export type PaymentStatus = 'pending' | 'approved' | 'posted' | 'partial' | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'bank_deposit'
  | 'bank_transfer'
  | 'gcash'
  | 'maya'
  | 'check'
  | 'other';

export interface Payment {
  id: ID;
  payment_code: string | null;
  project_id: ID;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  reference_number: string | null;
  notes: string | null;
  created_by: ID | null;
  submitted_by: ID | null;
  submitted_at: string | null;
  approved_by: ID | null;
  approved_at: string | null;
  rejected_by: ID | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  posted_at: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface PaymentWithRelations extends Payment {
  project_name: string;
  project_code: string | null;
  project_budget: number | null;
  client_id: ID;
  client_name: string;
  client_code: string | null;
  submitted_by_email: string | null;
  approved_by_email: string | null;
  rejected_by_email: string | null;
}

export interface PaymentSummary {
  project_id: ID;
  project_name: string;
  project_code: string | null;
  contract_amount: number | null;
  total_payments: number;
  outstanding_balance: number;
}

export interface CreatePaymentInput {
  project_id: ID;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  status?: PaymentStatus;
  reference_number?: string;
  notes?: string;
}

export interface UpdatePaymentInput extends Partial<CreatePaymentInput> {
  id: ID;
}
