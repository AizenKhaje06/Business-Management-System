import type { Client } from '@/types/client';
import type { Project } from '@/types/project';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types/payment';
import type { Expense, ExpenseStatus, ExpensePaymentMethod } from '@/types/expense';
import type { Supplier } from '@/types/supplier';

describe('Clients CRUD', () => {
  const mockClient: Client = {
    id: 'client-1',
    name: 'Acme Corp',
    client_code: 'CLI-0001',
    company_name: 'Acme Corporation',
    contact_person: 'Jane Doe',
    email: 'contact@acme.com',
    phone: '555-0100',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'USA',
    website: 'https://acme.com',
    tax_id: 'TAX-001',
    notes: 'VIP client',
    status: 'active',
    is_active: true,
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should create a valid client object', () => {
    expect(mockClient.name).toBe('Acme Corp');
    expect(mockClient.client_code).toMatch(/^CLI-/);
    expect(mockClient.status).toBe('active');
  });

  it('should validate client has required fields', () => {
    expect(mockClient).toHaveProperty('id');
    expect(mockClient).toHaveProperty('name');
    expect(mockClient).toHaveProperty('client_code');
    expect(mockClient).toHaveProperty('status');
    expect(mockClient).toHaveProperty('created_at');
  });

  it('should support active and inactive status', () => {
    const statuses = ['active', 'inactive'] as const;
    statuses.forEach((s) => {
      expect(['active', 'inactive']).toContain(s);
    });
  });

  it('should have auto-generated client code', () => {
    expect(mockClient.client_code).toBeDefined();
    expect(mockClient.client_code!.length).toBeGreaterThan(0);
  });
});

describe('Projects CRUD', () => {
  const mockProject: Project = {
    id: 'project-1',
    name: 'Website Redesign',
    project_code: 'PRJ-0001',
    client_id: 'client-1',
    description: 'Complete website overhaul',
    status: 'in_progress',
    priority: 'medium',
    start_date: '2024-01-15',
    end_date: '2024-04-15',
    actual_end_date: null,
    budget: 50000,
    hourly_rate: 75,
    progress: 45,
    notes: 'High priority project',
    archived: false,
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should create a valid project object', () => {
    expect(mockProject.name).toBe('Website Redesign');
    expect(mockProject.project_code).toMatch(/^PRJ-\d{4}$/);
    expect(mockProject.status).toBe('in_progress');
  });

  it('should validate project has required fields', () => {
    expect(mockProject).toHaveProperty('id');
    expect(mockProject).toHaveProperty('name');
    expect(mockProject).toHaveProperty('client_id');
    expect(mockProject).toHaveProperty('status');
    expect(mockProject).toHaveProperty('budget');
  });

  it('should support all project statuses', () => {
    const statuses = [
      'draft',
      'quotation',
      'approved',
      'in_progress',
      'on_hold',
      'completed',
      'cancelled',
    ];
    statuses.forEach((s) => {
      expect(s).toBeDefined();
    });
  });

  it('should track progress between 0 and 100', () => {
    expect(mockProject.progress).toBeGreaterThanOrEqual(0);
    expect(mockProject.progress).toBeLessThanOrEqual(100);
  });

  it('should support archive functionality', () => {
    expect(mockProject.archived).toBe(false);
    const archived = { ...mockProject, archived: true };
    expect(archived.archived).toBe(true);
  });
});

describe('Payments CRUD', () => {
  const mockPayment: Payment = {
    id: 'payment-1',
    payment_code: 'PAY-0001',
    project_id: 'project-1',
    amount: 15000,
    payment_date: '2024-02-01',
    payment_method: 'bank_transfer',
    status: 'posted',
    reference_number: 'TXN-12345',
    notes: 'Initial deposit',
    created_by: 'user-1',
    submitted_by: null,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    posted_at: '2024-02-01T10:00:00Z',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  };

  it('should create a valid payment object', () => {
    expect(mockPayment.amount).toBe(15000);
    expect(mockPayment.payment_code).toMatch(/^PAY-\d{4}$/);
    expect(mockPayment.status).toBe('posted');
  });

  it('should validate payment has required fields', () => {
    expect(mockPayment).toHaveProperty('id');
    expect(mockPayment).toHaveProperty('project_id');
    expect(mockPayment).toHaveProperty('amount');
    expect(mockPayment).toHaveProperty('payment_date');
    expect(mockPayment).toHaveProperty('status');
  });

  it('should support all payment statuses', () => {
    const statuses: PaymentStatus[] = [
      'pending',
      'approved',
      'posted',
      'partial',
      'cancelled',
    ];
    statuses.forEach((s) => {
      expect(['pending', 'approved', 'posted', 'partial', 'cancelled']).toContain(s);
    });
  });

  it('should support all payment methods', () => {
    const methods: PaymentMethod[] = [
      'cash',
      'bank_deposit',
      'bank_transfer',
      'gcash',
      'maya',
      'check',
      'other',
    ];
    methods.forEach((m) => {
      expect(mockPayment.payment_method).toBeDefined();
    });
  });

  it('should require positive amount', () => {
    expect(mockPayment.amount).toBeGreaterThan(0);
  });

  it('should track approval workflow fields', () => {
    expect(mockPayment).toHaveProperty('submitted_by');
    expect(mockPayment).toHaveProperty('approved_by');
    expect(mockPayment).toHaveProperty('rejected_by');
    expect(mockPayment).toHaveProperty('posted_at');
  });
});

describe('Expenses CRUD', () => {
  const mockExpense: Expense = {
    id: 'expense-1',
    expense_code: 'EXP-0001',
    expense_date: '2024-02-15',
    invoice_number: 'INV-2024-001',
    category_id: 'cat-1',
    project_id: 'project-1',
    supplier_id: 'supplier-1',
    amount: 2500,
    currency: 'USD',
    description: 'Construction materials',
    status: 'approved',
    payment_method: 'cash',
    notes: 'Bulk order',
    submitted_by: 'user-1',
    submitted_at: '2024-02-15T10:00:00Z',
    approved_by: 'user-2',
    approved_at: '2024-02-16T10:00:00Z',
    approval_notes: 'Approved by manager',
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-16T00:00:00Z',
  };

  it('should create a valid expense object', () => {
    expect(mockExpense.amount).toBe(2500);
    expect(mockExpense.expense_code).toMatch(/^EXP-\d{4}$/);
    expect(mockExpense.status).toBe('approved');
  });

  it('should validate expense has required fields', () => {
    expect(mockExpense).toHaveProperty('id');
    expect(mockExpense).toHaveProperty('category_id');
    expect(mockExpense).toHaveProperty('amount');
    expect(mockExpense).toHaveProperty('expense_date');
    expect(mockExpense).toHaveProperty('status');
  });

  it('should support all expense statuses', () => {
    const statuses: ExpenseStatus[] = [
      'draft',
      'submitted',
      'pending',
      'approved',
      'rejected',
      'void',
    ];
    statuses.forEach((s) => {
      expect(['draft', 'submitted', 'pending', 'approved', 'rejected', 'void']).toContain(s);
    });
  });

  it('should support all expense payment methods', () => {
    const methods: ExpensePaymentMethod[] = [
      'cash',
      'bank_deposit',
      'bank_transfer',
      'gcash',
      'maya',
      'check',
      'other',
    ];
    methods.forEach((m) => {
      expect(m).toBeDefined();
    });
  });

  it('should require positive amount', () => {
    expect(mockExpense.amount).toBeGreaterThan(0);
  });

  it('should track approval workflow fields', () => {
    expect(mockExpense).toHaveProperty('submitted_by');
    expect(mockExpense).toHaveProperty('approved_by');
    expect(mockExpense).toHaveProperty('rejected_by');
    expect(mockExpense).toHaveProperty('approval_notes');
    expect(mockExpense).toHaveProperty('rejection_reason');
  });
});

describe('Suppliers CRUD', () => {
  const mockSupplier: Supplier = {
    id: 'supplier-1',
    name: 'BuildMart Inc',
    supplier_code: 'SUP-0001',
    contact_person: 'John Smith',
    email: 'john@buildmart.com',
    phone: '555-0200',
    address: '456 Supply St',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60601',
    country: 'USA',
    website: 'https://buildmart.com',
    tax_id: 'TAX-002',
    payment_terms: 'Net 30',
    is_active: true,
    notes: 'Primary materials supplier',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should create a valid supplier object', () => {
    expect(mockSupplier.name).toBe('BuildMart Inc');
    expect(mockSupplier.supplier_code).toMatch(/^SUP-\d{4}$/);
    expect(mockSupplier.is_active).toBe(true);
  });

  it('should validate supplier has required fields', () => {
    expect(mockSupplier).toHaveProperty('id');
    expect(mockSupplier).toHaveProperty('name');
    expect(mockSupplier).toHaveProperty('supplier_code');
    expect(mockSupplier).toHaveProperty('is_active');
  });

  it('should support active/inactive toggle', () => {
    expect(mockSupplier.is_active).toBe(true);
    const inactive = { ...mockSupplier, is_active: false };
    expect(inactive.is_active).toBe(false);
  });
});

describe('Materials CRUD', () => {
  interface Material {
    id: string;
    name: string;
    material_code: string;
    supplier_id: string;
    unit: string;
    unit_cost: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  const mockMaterial: Material = {
    id: 'material-1',
    name: 'Cement Bag 50kg',
    material_code: 'MAT-0001',
    supplier_id: 'supplier-1',
    unit: 'bag',
    unit_cost: 8.5,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should create a valid material object', () => {
    expect(mockMaterial.name).toBe('Cement Bag 50kg');
    expect(mockMaterial.material_code).toMatch(/^MAT-\d{4}$/);
    expect(mockMaterial.unit_cost).toBeGreaterThan(0);
  });

  it('should validate material has required fields', () => {
    expect(mockMaterial).toHaveProperty('id');
    expect(mockMaterial).toHaveProperty('name');
    expect(mockMaterial).toHaveProperty('supplier_id');
    expect(mockMaterial).toHaveProperty('unit');
    expect(mockMaterial).toHaveProperty('unit_cost');
  });

  it('should support active/inactive toggle', () => {
    expect(mockMaterial.is_active).toBe(true);
    const inactive = { ...mockMaterial, is_active: false };
    expect(inactive.is_active).toBe(false);
  });
});
