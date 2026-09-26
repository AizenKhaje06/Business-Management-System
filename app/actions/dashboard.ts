'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface DashboardKPIs {
  grossInput: number;
  grossOutput: number;
  netTotal: number;
  outstandingReceivables: number;
  activeProjects: number;
  completedProjects: number;
  pendingPayments: number;
  pendingExpenses: number;
}

export interface MonthlyDataPoint {
  month: string;
  label: string;
  input: number;
  output: number;
  difference: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}

export interface ProjectStatusDataPoint {
  status: string;
  count: number;
}

export interface PaymentStatusDataPoint {
  status: string;
  count: number;
  amount: number;
}

export interface RecentPayment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  project_name: string;
  project_code: string | null;
  client_name: string;
}

export interface RecentExpense {
  id: string;
  amount: number;
  expense_date: string;
  status: string;
  category_name: string;
  description: string | null;
  project_name: string | null;
}

export interface RecentProject {
  id: string;
  name: string;
  status: string;
  project_code: string | null;
  client_name: string;
  budget: number | null;
  progress: number;
  created_at: string;
}

export interface RecentActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user_email: string | null;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  monthlyData: MonthlyDataPoint[];
  expenseByCategory: CategoryDataPoint[];
  projectCostDistribution: CategoryDataPoint[];
  paymentStatusData: PaymentStatusDataPoint[];
  projectStatusData: ProjectStatusDataPoint[];
  recentPayments: RecentPayment[];
  recentExpenses: RecentExpense[];
  recentProjects: RecentProject[];
  recentActivity: RecentActivityEntry[];
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();

  // Fetch all data in parallel
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

  const [paymentsRes, expensesRes, projectsRes, categoriesRes, auditRes] =
    await Promise.all([
      supabase
        .from('project_payments')
        .select(
          'id, amount, payment_date, status, project_id, projects(name, project_code, clients(name))'
        )
        .gte('payment_date', cutoffDate)
        .order('payment_date', { ascending: false }),
      supabase
        .from('expenses')
        .select(
          'id, amount, expense_date, status, category_id, description, project_id, projects(name)'
        )
        .gte('expense_date', cutoffDate)
        .order('expense_date', { ascending: false }),
      supabase
        .from('projects')
        .select(
          'id, name, status, project_code, budget, progress, created_at, archived, clients(name)'
        )
        .order('created_at', { ascending: false }),
      supabase.from('expense_categories').select('id, name').order('name'),
      supabase
        .from('audit_logs')
        .select('id, action, entity_type, created_at, user_id, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

  const payments = paymentsRes.data || [];
  const expenses = expensesRes.data || [];
  const projects = (projectsRes.data || []).filter((p) => !p.archived);
  const categories = categoriesRes.data || [];
  const auditLogs = auditRes.data || [];

  // Build category lookup
  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    categoryMap[c.id] = c.name;
  }

  // === KPIs ===
  // Gross Input = sum of all payments with status 'posted' or 'partial'
  const receivedPayments = payments.filter(
    (p) => p.status === 'posted' || p.status === 'partial'
  );
  const grossInput = receivedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Gross Output = sum of all approved expenses (only approved counts in official output)
  const approvedExpenses = expenses.filter(
    (e) => e.status === 'approved'
  );
  const grossOutput = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netTotal = grossInput - grossOutput;

  // Outstanding Receivables = sum of project budgets - sum of received payments per project
  const projectPaymentTotals: Record<string, number> = {};
  for (const p of receivedPayments) {
    const pid = p.project_id as string;
    projectPaymentTotals[pid] = (projectPaymentTotals[pid] || 0) + p.amount;
  }
  let outstandingReceivables = 0;
  for (const proj of projects) {
    if (proj.budget) {
      const received = projectPaymentTotals[proj.id] || 0;
      const outstanding = proj.budget - received;
      if (outstanding > 0) outstandingReceivables += outstanding;
    }
  }

  const activeProjects = projects.filter(
    (p) =>
      p.status === 'approved' ||
      p.status === 'in_progress' ||
      p.status === 'quotation'
  ).length;

  const completedProjects = projects.filter(
    (p) => p.status === 'completed'
  ).length;

  const pendingPayments = payments.filter((p) => p.status === 'pending').length;

  const pendingExpenses = expenses.filter(
    (e) => e.status === 'pending' || e.status === 'draft' || e.status === 'submitted'
  ).length;

  const kpis: DashboardKPIs = {
    grossInput,
    grossOutput,
    netTotal,
    outstandingReceivables,
    activeProjects,
    completedProjects,
    pendingPayments,
    pendingExpenses,
  };

  // === Monthly Input vs Output (last 12 months) ===
  const now = new Date();
  const monthMap: Record<string, MonthlyDataPoint> = {};

  // Initialize last 12 months
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

  // Aggregate payments into months
  for (const p of receivedPayments) {
    const d = new Date(p.payment_date);
    const key = getMonthKey(d);
    if (monthMap[key]) {
      monthMap[key].input += p.amount;
    }
  }

  // Aggregate expenses into months
  for (const e of approvedExpenses) {
    const d = new Date(e.expense_date);
    const key = getMonthKey(d);
    if (monthMap[key]) {
      monthMap[key].output += e.amount;
    }
  }

  // Calculate difference
  const monthlyData = Object.values(monthMap).map((m) => ({
    ...m,
    difference: m.input - m.output,
  }));

  // === Expense by Category ===
  const categoryTotals: Record<string, number> = {};
  for (const e of approvedExpenses) {
    const catName = categoryMap[e.category_id as string] || 'Other';
    categoryTotals[catName] = (categoryTotals[catName] || 0) + e.amount;
  }
  const expenseByCategory: CategoryDataPoint[] = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // === Project Cost Distribution (by budget ranges) ===
  const budgetRanges = [
    { name: 'Under $1K', min: 0, max: 1000 },
    { name: '$1K - $5K', min: 1000, max: 5000 },
    { name: '$5K - $10K', min: 5000, max: 10000 },
    { name: '$10K - $50K', min: 10000, max: 50000 },
    { name: '$50K+', min: 50000, max: Infinity },
  ];
  const projectCostDistribution: CategoryDataPoint[] = budgetRanges.map(
    (range) => ({
      name: range.name,
      value: projects.filter(
        (p) =>
          p.budget !== null && p.budget >= range.min && p.budget < range.max
      ).length,
    })
  );

  // === Payment Status ===
  const paymentStatusMap: Record<string, PaymentStatusDataPoint> = {};
  for (const p of payments) {
    if (!paymentStatusMap[p.status]) {
      paymentStatusMap[p.status] = { status: p.status, count: 0, amount: 0 };
    }
    paymentStatusMap[p.status].count++;
    paymentStatusMap[p.status].amount += p.amount;
  }
  const paymentStatusData = Object.values(paymentStatusMap);

  // === Project Status ===
  const projectStatusMap: Record<string, number> = {};
  for (const p of projects) {
    projectStatusMap[p.status] = (projectStatusMap[p.status] || 0) + 1;
  }
  const projectStatusData: ProjectStatusDataPoint[] = Object.entries(
    projectStatusMap
  ).map(([status, count]) => ({ status, count }));

  // === Recent Payments (5) ===
  const recentPayments: RecentPayment[] = payments.slice(0, 5).map((p) => {
    const proj = p.projects as unknown as {
      name: string;
      project_code: string | null;
      clients: { name: string } | null;
    } | null;
    return {
      id: p.id as string,
      amount: p.amount,
      payment_date: p.payment_date,
      status: p.status,
      project_name: proj?.name || '-',
      project_code: proj?.project_code || null,
      client_name: proj?.clients?.name || '-',
    };
  });

  // === Recent Expenses (5) ===
  const recentExpenses: RecentExpense[] = expenses.slice(0, 5).map((e) => {
    const proj = e.projects as unknown as { name: string } | null;
    return {
      id: e.id as string,
      amount: e.amount,
      expense_date: e.expense_date,
      status: e.status,
      category_name: categoryMap[e.category_id as string] || 'Other',
      description: e.description,
      project_name: proj?.name || null,
    };
  });

  // === Recent Projects (5) ===
  const recentProjects: RecentProject[] = projects.slice(0, 5).map((p) => {
    const client = p.clients as unknown as { name: string } | null;
    return {
      id: p.id as string,
      name: p.name,
      status: p.status,
      project_code: p.project_code,
      client_name: client?.name || '-',
      budget: p.budget,
      progress: p.progress,
      created_at: p.created_at,
    };
  });

  // === Recent Activity (10) ===
  const recentActivity: RecentActivityEntry[] = auditLogs
    .slice(0, 10)
    .map((a) => {
      const profile = a.profiles as unknown as { email: string } | null;
      return {
        id: a.id as string,
        action: a.action,
        entity_type: a.entity_type,
        created_at: a.created_at,
        user_email: profile?.email || null,
      };
    });

  return {
    kpis,
    monthlyData,
    expenseByCategory,
    projectCostDistribution,
    paymentStatusData,
    projectStatusData,
    recentPayments,
    recentExpenses,
    recentProjects,
    recentActivity,
  };
}
