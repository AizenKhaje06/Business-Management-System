import type { BaseEntity, ID, ISODateString } from './base';

export type ProjectStatus =
  | 'draft'
  | 'quotation'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ProjectMemberRole = 'lead' | 'manager' | 'member';

export interface Project extends BaseEntity {
  id: ID;
  project_code: string | null;
  client_id: ID;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  end_date: string | null;
  actual_end_date: string | null;
  budget: number | null;
  hourly_rate: number | null;
  progress: number;
  notes: string | null;
  archived: boolean;
  created_by: ID | null;
}

export interface ProjectWithClient extends Project {
  client_name: string;
  client_code: string | null;
}

export interface ProjectMember {
  id: ID;
  project_id: ID;
  user_id: ID;
  role: ProjectMemberRole;
  allocated_hours: number | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: ISODateString;
}

export interface ProjectStatusHistoryEntry {
  id: ID;
  project_id: ID;
  old_status: ProjectStatus | null;
  new_status: ProjectStatus;
  changed_by: ID | null;
  changed_by_email: string | null;
  notes: string | null;
  created_at: ISODateString;
}

export interface ProjectPayment {
  id: ID;
  project_id: ID;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  created_at: ISODateString;
}

export interface ProjectExpense {
  id: ID;
  project_id: ID | null;
  amount: number;
  expense_date: string;
  description: string | null;
  category: string | null;
  status: string;
  created_at: ISODateString;
}

export interface ProjectMaterial {
  id: ID;
  project_id: ID | null;
  name: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  created_at: ISODateString;
}

export interface ProjectDocument {
  id: ID;
  name: string;
  file_url: string;
  file_type: string | null;
  entity_type: string;
  created_at: ISODateString;
}

export interface ProjectActivity {
  id: ID;
  action: string;
  entity_type: string;
  created_at: ISODateString;
  user_email: string | null;
}

export interface CreateProjectInput {
  client_id: ID;
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  end_date?: string;
  budget?: number;
  hourly_rate?: number;
  progress?: number;
  notes?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: ID;
  actual_end_date?: string;
  archived?: boolean;
}

export interface AssignMemberInput {
  project_id: ID;
  user_id: ID;
  role: ProjectMemberRole;
  allocated_hours?: number;
}

export interface ProjectCosting {
  contract_amount: number;
  total_payments: number;
  outstanding_balance: number;
  total_expenses: number;
  material_cost: number;
  labor_cost: number;
  other_cost: number;
  total_project_cost: number;
  project_difference: number;
}

export interface CostBreakdownEntry {
  category_name: string;
  cost_group: 'material' | 'labor' | 'other';
  total_amount: number;
  expense_count: number;
}
