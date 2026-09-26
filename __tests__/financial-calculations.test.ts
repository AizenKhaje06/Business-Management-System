import type { PaymentStatus } from '@/types/payment';
import type { ExpenseStatus } from '@/types/expense';

interface MockPayment {
  id: string;
  amount: number;
  payment_date: string;
  status: PaymentStatus;
  project_id: string;
}

interface MockExpense {
  id: string;
  amount: number;
  expense_date: string;
  status: ExpenseStatus;
  category_id: string;
  project_id: string | null;
}

interface MockProject {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  archived: boolean;
}

interface MonthlyDataPoint {
  month: string;
  label: string;
  input: number;
  output: number;
  difference: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function calculateKPIs(
  payments: MockPayment[],
  expenses: MockExpense[],
  projects: MockProject[]
) {
  const receivedPayments = payments.filter(
    (p) => p.status === 'posted' || p.status === 'partial'
  );
  const grossInput = receivedPayments.reduce((sum, p) => sum + p.amount, 0);

  const approvedExpenses = expenses.filter((e) => e.status === 'approved');
  const grossOutput = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netTotal = grossInput - grossOutput;

  const projectPaymentTotals: Record<string, number> = {};
  for (const p of receivedPayments) {
    projectPaymentTotals[p.project_id] =
      (projectPaymentTotals[p.project_id] || 0) + p.amount;
  }
  let outstandingReceivables = 0;
  const activeProjects = projects.filter(
    (p) => !p.archived && (p.status === 'approved' || p.status === 'in_progress' || p.status === 'quotation')
  ).length;
  const completedProjects = projects.filter(
    (p) => !p.archived && p.status === 'completed'
  ).length;
  const pendingPayments = payments.filter((p) => p.status === 'pending').length;
  const pendingExpenses = expenses.filter(
    (e) => e.status === 'pending' || e.status === 'draft' || e.status === 'submitted'
  ).length;

  for (const proj of projects.filter((p) => !p.archived)) {
    if (proj.budget) {
      const received = projectPaymentTotals[proj.id] || 0;
      const outstanding = proj.budget - received;
      if (outstanding > 0) outstandingReceivables += outstanding;
    }
  }

  return {
    grossInput,
    grossOutput,
    netTotal,
    outstandingReceivables,
    activeProjects,
    completedProjects,
    pendingPayments,
    pendingExpenses,
  };
}

function calculateMonthlyData(
  payments: MockPayment[],
  expenses: MockExpense[]
): MonthlyDataPoint[] {
  const now = new Date();
  const monthMap: Record<string, MonthlyDataPoint> = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d);
    monthMap[key] = {
      month: key,
      label: getMonthLabel(d),
      input: 0,
      output: 0,
      difference: 0,
    };
  }

  const receivedPayments = payments.filter(
    (p) => p.status === 'posted' || p.status === 'partial'
  );
  for (const p of receivedPayments) {
    const d = new Date(p.payment_date);
    const key = getMonthKey(d);
    if (monthMap[key]) monthMap[key].input += p.amount;
  }

  const approvedExpenses = expenses.filter((e) => e.status === 'approved');
  for (const e of approvedExpenses) {
    const d = new Date(e.expense_date);
    const key = getMonthKey(d);
    if (monthMap[key]) monthMap[key].output += e.amount;
  }

  return Object.values(monthMap).map((m) => ({
    ...m,
    difference: m.input - m.output,
  }));
}

describe('Financial Calculations', () => {
  describe('Gross Input', () => {
    it('should sum only posted and partial payments', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 10000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
        { id: '2', amount: 5000, payment_date: '2024-01-20', status: 'partial', project_id: 'p1' },
        { id: '3', amount: 3000, payment_date: '2024-01-25', status: 'pending', project_id: 'p2' },
        { id: '4', amount: 2000, payment_date: '2024-01-30', status: 'cancelled', project_id: 'p3' },
      ];
      const kpis = calculateKPIs(payments, [], []);
      expect(kpis.grossInput).toBe(15000);
    });

    it('should return 0 when no payments are posted or partial', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 10000, payment_date: '2024-01-15', status: 'pending', project_id: 'p1' },
      ];
      const kpis = calculateKPIs(payments, [], []);
      expect(kpis.grossInput).toBe(0);
    });

    it('should handle empty payments array', () => {
      const kpis = calculateKPIs([], [], []);
      expect(kpis.grossInput).toBe(0);
    });
  });

  describe('Gross Output', () => {
    it('should sum only approved expenses', () => {
      const expenses: MockExpense[] = [
        { id: '1', amount: 5000, expense_date: '2024-01-15', status: 'approved', category_id: 'c1', project_id: 'p1' },
        { id: '2', amount: 3000, expense_date: '2024-01-20', status: 'pending', category_id: 'c1', project_id: 'p1' },
        { id: '3', amount: 2000, expense_date: '2024-01-25', status: 'rejected', category_id: 'c2', project_id: 'p2' },
        { id: '4', amount: 1000, expense_date: '2024-01-30', status: 'draft', category_id: 'c1', project_id: null },
      ];
      const kpis = calculateKPIs([], expenses, []);
      expect(kpis.grossOutput).toBe(5000);
    });

    it('should return 0 when no expenses are approved', () => {
      const expenses: MockExpense[] = [
        { id: '1', amount: 5000, expense_date: '2024-01-15', status: 'pending', category_id: 'c1', project_id: 'p1' },
      ];
      const kpis = calculateKPIs([], expenses, []);
      expect(kpis.grossOutput).toBe(0);
    });
  });

  describe('Net Total', () => {
    it('should calculate net = grossInput - grossOutput', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 20000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
      ];
      const expenses: MockExpense[] = [
        { id: '1', amount: 8000, expense_date: '2024-01-20', status: 'approved', category_id: 'c1', project_id: 'p1' },
      ];
      const kpis = calculateKPIs(payments, expenses, []);
      expect(kpis.netTotal).toBe(12000);
    });

    it('should be negative when output exceeds input', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 5000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
      ];
      const expenses: MockExpense[] = [
        { id: '1', amount: 15000, expense_date: '2024-01-20', status: 'approved', category_id: 'c1', project_id: 'p1' },
      ];
      const kpis = calculateKPIs(payments, expenses, []);
      expect(kpis.netTotal).toBe(-10000);
    });

    it('should be 0 when input equals output', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 10000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
      ];
      const expenses: MockExpense[] = [
        { id: '1', amount: 10000, expense_date: '2024-01-20', status: 'approved', category_id: 'c1', project_id: 'p1' },
      ];
      const kpis = calculateKPIs(payments, expenses, []);
      expect(kpis.netTotal).toBe(0);
    });
  });

  describe('Monthly Input / Output / Difference', () => {
    it('should aggregate payments into correct months', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const payments: MockPayment[] = [
        { id: '1', amount: 5000, payment_date: `${thisMonth}-15`, status: 'posted', project_id: 'p1' },
        { id: '2', amount: 3000, payment_date: `${lastMonth}-20`, status: 'posted', project_id: 'p1' },
        { id: '3', amount: 2000, payment_date: `${thisMonth}-30`, status: 'partial', project_id: 'p2' },
      ];
      const monthly = calculateMonthlyData(payments, []);
      const thisM = monthly.find((m) => m.month === thisMonth);
      const lastM = monthly.find((m) => m.month === lastMonth);
      expect(thisM?.input).toBe(7000);
      expect(lastM?.input).toBe(3000);
    });

    it('should aggregate expenses into correct months', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const twoMonthsAgo = `${twoMonthsAgoDate.getFullYear()}-${String(twoMonthsAgoDate.getMonth() + 1).padStart(2, '0')}`;
      const expenses: MockExpense[] = [
        { id: '1', amount: 4000, expense_date: `${thisMonth}-15`, status: 'approved', category_id: 'c1', project_id: 'p1' },
        { id: '2', amount: 2000, expense_date: `${twoMonthsAgo}-20`, status: 'approved', category_id: 'c1', project_id: 'p1' },
      ];
      const monthly = calculateMonthlyData([], expenses);
      const thisM = monthly.find((m) => m.month === thisMonth);
      const twoM = monthly.find((m) => m.month === twoMonthsAgo);
      expect(thisM?.output).toBe(4000);
      expect(twoM?.output).toBe(2000);
    });

    it('should calculate difference as input - output per month', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const payments: MockPayment[] = [
        { id: '1', amount: 10000, payment_date: `${thisMonth}-15`, status: 'posted', project_id: 'p1' },
      ];
      const expenses: MockExpense[] = [
        { id: '1', amount: 3000, expense_date: `${thisMonth}-20`, status: 'approved', category_id: 'c1', project_id: 'p1' },
      ];
      const monthly = calculateMonthlyData(payments, expenses);
      const thisM = monthly.find((m) => m.month === thisMonth);
      expect(thisM?.difference).toBe(7000);
    });

    it('should produce 12 months of data', () => {
      const monthly = calculateMonthlyData([], []);
      expect(monthly).toHaveLength(12);
    });

    it('should exclude pending payments from monthly input', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const payments: MockPayment[] = [
        { id: '1', amount: 10000, payment_date: `${thisMonth}-15`, status: 'pending', project_id: 'p1' },
      ];
      const monthly = calculateMonthlyData(payments, []);
      const thisM = monthly.find((m) => m.month === thisMonth);
      expect(thisM?.input).toBe(0);
    });

    it('should exclude non-approved expenses from monthly output', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const expenses: MockExpense[] = [
        { id: '1', amount: 10000, expense_date: `${thisMonth}-15`, status: 'pending', category_id: 'c1', project_id: 'p1' },
      ];
      const monthly = calculateMonthlyData([], expenses);
      const thisM = monthly.find((m) => m.month === thisMonth);
      expect(thisM?.output).toBe(0);
    });
  });

  describe('Outstanding Receivables', () => {
    it('should calculate budget minus received payments per project', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 5000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
      ];
      const projects: MockProject[] = [
        { id: 'p1', name: 'Project 1', status: 'in_progress', budget: 20000, archived: false },
      ];
      const kpis = calculateKPIs(payments, [], projects);
      expect(kpis.outstandingReceivables).toBe(15000);
    });

    it('should not count archived projects', () => {
      const projects: MockProject[] = [
        { id: 'p1', name: 'Old Project', status: 'completed', budget: 10000, archived: true },
      ];
      const kpis = calculateKPIs([], [], projects);
      expect(kpis.outstandingReceivables).toBe(0);
    });

    it('should not count negative outstanding (overpaid projects)', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 25000, payment_date: '2024-01-15', status: 'posted', project_id: 'p1' },
      ];
      const projects: MockProject[] = [
        { id: 'p1', name: 'Project 1', status: 'in_progress', budget: 20000, archived: false },
      ];
      const kpis = calculateKPIs(payments, [], projects);
      expect(kpis.outstandingReceivables).toBe(0);
    });

    it('should skip projects with null budget', () => {
      const projects: MockProject[] = [
        { id: 'p1', name: 'No Budget', status: 'in_progress', budget: null, archived: false },
      ];
      const kpis = calculateKPIs([], [], projects);
      expect(kpis.outstandingReceivables).toBe(0);
    });
  });

  describe('Project status counts', () => {
    it('should count active projects (approved, in_progress, quotation)', () => {
      const projects: MockProject[] = [
        { id: 'p1', name: 'A', status: 'approved', budget: 1000, archived: false },
        { id: 'p2', name: 'B', status: 'in_progress', budget: 2000, archived: false },
        { id: 'p3', name: 'C', status: 'quotation', budget: 3000, archived: false },
        { id: 'p4', name: 'D', status: 'completed', budget: 4000, archived: false },
        { id: 'p5', name: 'E', status: 'cancelled', budget: 5000, archived: false },
      ];
      const kpis = calculateKPIs([], [], projects);
      expect(kpis.activeProjects).toBe(3);
    });

    it('should count completed projects', () => {
      const projects: MockProject[] = [
        { id: 'p1', name: 'A', status: 'completed', budget: 1000, archived: false },
        { id: 'p2', name: 'B', status: 'completed', budget: 2000, archived: false },
        { id: 'p3', name: 'C', status: 'in_progress', budget: 3000, archived: false },
      ];
      const kpis = calculateKPIs([], [], projects);
      expect(kpis.completedProjects).toBe(2);
    });

    it('should exclude archived projects from counts', () => {
      const projects: MockProject[] = [
        { id: 'p1', name: 'A', status: 'in_progress', budget: 1000, archived: true },
        { id: 'p2', name: 'B', status: 'completed', budget: 2000, archived: true },
      ];
      const kpis = calculateKPIs([], [], projects);
      expect(kpis.activeProjects).toBe(0);
      expect(kpis.completedProjects).toBe(0);
    });
  });

  describe('Pending counts', () => {
    it('should count pending payments', () => {
      const payments: MockPayment[] = [
        { id: '1', amount: 100, payment_date: '2024-01-01', status: 'pending', project_id: 'p1' },
        { id: '2', amount: 200, payment_date: '2024-01-01', status: 'posted', project_id: 'p1' },
        { id: '3', amount: 300, payment_date: '2024-01-01', status: 'pending', project_id: 'p2' },
      ];
      const kpis = calculateKPIs(payments, [], []);
      expect(kpis.pendingPayments).toBe(2);
    });

    it('should count pending expenses (draft, submitted, pending)', () => {
      const expenses: MockExpense[] = [
        { id: '1', amount: 100, expense_date: '2024-01-01', status: 'draft', category_id: 'c1', project_id: null },
        { id: '2', amount: 200, expense_date: '2024-01-01', status: 'submitted', category_id: 'c1', project_id: null },
        { id: '3', amount: 300, expense_date: '2024-01-01', status: 'pending', category_id: 'c1', project_id: null },
        { id: '4', amount: 400, expense_date: '2024-01-01', status: 'approved', category_id: 'c1', project_id: null },
      ];
      const kpis = calculateKPIs([], expenses, []);
      expect(kpis.pendingExpenses).toBe(3);
    });
  });
});
