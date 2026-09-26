import type { BaseEntity, ID, ISODateString } from './base';

export type ClientStatus = 'active' | 'inactive' | 'archived';

export interface Client extends BaseEntity {
  id: ID;
  client_code: string | null;
  name: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  website: string | null;
  tax_id: string | null;
  notes: string | null;
  status: ClientStatus;
  is_active: boolean;
  created_by: ID | null;
}

export interface ClientWithStats extends Client {
  project_count: number;
  total_contract_value: number;
  total_payments: number;
  outstanding_balance: number;
}

export interface ClientProject {
  id: ID;
  name: string;
  status: string;
  budget: number | null;
  progress: number;
  start_date: string | null;
  end_date: string | null;
}

export interface ClientPayment {
  id: ID;
  project_id: ID;
  project_name: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
}

export interface ClientDocument {
  id: ID;
  name: string;
  file_url: string;
  file_type: string | null;
  entity_type: string;
  created_at: ISODateString;
}

export interface ClientActivity {
  id: ID;
  action: string;
  entity_type: string;
  created_at: ISODateString;
  user_email: string | null;
}

export interface CreateClientInput {
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  tax_id?: string;
  notes?: string;
  status?: ClientStatus;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: ID;
}
