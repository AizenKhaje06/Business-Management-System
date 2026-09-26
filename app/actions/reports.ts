'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MonthlyReportRow {
  month: string;
  label: string;
  input: number;
  output: number;
  difference: number;
}

export interface MonthlyReportData {
  rows: MonthlyReportRow[];
  grossInput: number;
  grossOutput: number;
  netTotal: number;
  availableYears: number[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_ABBR = [
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

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export interface ProjectReportRow {
  id: string;
  project_code: string | null;
  name: string;
  client_name: string;
  client_code: string | null;
  contract_amount: number;
  total_payments: number;
  outstanding: number;
  total_cost: number;
  project_difference: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectReportData {
  rows: ProjectReportRow[];
  total: number;
}

export async function getProjectReport(params?: {
  search?: string;
  clientId?: string;
  projectId?: string;
  status?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
  managerId?: string;
  staffId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<ProjectReportData> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    clientId,
    projectId,
    status = 'all',
    dateFrom,
    dateTo,
    managerId,
    staffId,
    sortBy = 'name',
    sortDir = 'asc',
    page = 1,
    pageSize = 15,
  } = params || {};

  // If filtering by staff/manager, first find project IDs they're assigned to
  let memberProjectIds: string[] | null = null;
  if (managerId || staffId) {
    const memberQuery = supabase
      .from('project_members')
      .select('project_id');
    const { data: memberData } = await (managerId
      ? memberQuery.eq('user_id', managerId).eq('role', 'manager')
      : memberQuery.eq('user_id', staffId)
    );
    memberProjectIds = (memberData || []).map((m) => m.project_id as string);
    if (memberProjectIds.length === 0) {
      return { rows: [], total: 0 };
    }
  }

  // Build the projects query
  let query = supabase
    .from('projects')
    .select('*, client:clients(name, client_code)', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,project_code.ilike.%${search}%`
    );
  }

  if (status !== 'all') query = query.eq('status', status);
  if (clientId) query = query.eq('client_id', clientId);
  if (projectId) query = query.eq('id', projectId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);
  if (memberProjectIds) query = query.in('id', memberProjectIds);

  query = query.eq('archived', false);

  // Apply sort
  const validSortColumns = [
    'name',
    'project_code',
    'status',
    'budget',
    'start_date',
    'end_date',
    'created_at',
  ];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error || !data) {
    return { rows: [], total: count || 0 };
  }

  // Fetch costing for each project in parallel
  const rows: ProjectReportRow[] = await Promise.all(
    (data || []).map(async (p) => {
      const client = p.client as unknown as {
        name: string;
        client_code: string | null;
      } | null;

      let costing = {
        contract_amount: Number(p.budget) || 0,
        total_payments: 0,
        outstanding_balance: 0,
        total_project_cost: 0,
        project_difference: 0,
      };

      const { data: costingData } = await supabase
        .rpc('get_project_costing', { p_project_id: p.id })
        .maybeSingle();

      if (costingData) {
        const cd = costingData as {
          contract_amount: number;
          total_payments: number;
          outstanding_balance: number;
          total_project_cost: number;
          project_difference: number;
        };
        costing = {
          contract_amount: Number(cd.contract_amount) || 0,
          total_payments: Number(cd.total_payments) || 0,
          outstanding_balance: Number(cd.outstanding_balance) || 0,
          total_project_cost: Number(cd.total_project_cost) || 0,
          project_difference: Number(cd.project_difference) || 0,
        };
      }

      return {
        id: p.id,
        project_code: p.project_code,
        name: p.name,
        client_name: client?.name ?? 'Unknown',
        client_code: client?.client_code ?? null,
        contract_amount: costing.contract_amount,
        total_payments: costing.total_payments,
        outstanding: costing.outstanding_balance,
        total_cost: costing.total_project_cost,
        project_difference: costing.project_difference,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
      };
    })
  );

  return { rows, total: count || 0 };
}

export async function getProjectReportFilterOptions(): Promise<{
  clients: Array<{ id: string; name: string; client_code: string | null }>;
  projects: Array<{ id: string; name: string; project_code: string | null }>;
  staff: Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }>;
}> {
  const supabase = createSupabaseServerClient();

  const [{ data: clients }, { data: projects }, { data: staff }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, name, client_code')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('archived', false)
        .order('name'),
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('is_active', true)
        .order('first_name'),
    ]);

  return {
    clients: clients || [],
    projects: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      project_code: p.project_code,
    })),
    staff: staff || [],
  };
}

export async function getMonthlyReport(params?: {
  year?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<MonthlyReportData> {
  const supabase = createSupabaseServerClient();
  const { year, dateFrom, dateTo } = params || {};

  const currentYear = new Date().getFullYear();
  const reportYear = year || currentYear;

  // Fetch available years and the report year's data in parallel
  const yearStart = `${reportYear}-01-01`;
  const yearEnd = `${reportYear}-12-31`;

  const [paymentsRes, expensesRes, yearsRes] = await Promise.all([
    supabase
      .from('project_payments')
      .select('id, amount, payment_date, status')
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd)
      .order('payment_date', { ascending: true }),
    supabase
      .from('expenses')
      .select('id, amount, expense_date, status')
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd)
      .order('expense_date', { ascending: true }),
    supabase
      .from('project_payments')
      .select('payment_date')
      .order('payment_date', { ascending: true })
      .limit(1),
  ]);

  const payments = (paymentsRes.data || []).map((p) => ({
    amount: Number(p.amount),
    payment_date: p.payment_date,
    status: p.status,
  }));

  const expenses = (expensesRes.data || []).map((e) => ({
    amount: Number(e.amount),
    expense_date: e.expense_date,
    status: e.status,
  }));

  // Determine available years: fetch distinct years via a lightweight query
  const oldestPayment = yearsRes.data?.[0]?.payment_date;
  const availableYears: number[] = [currentYear];
  if (oldestPayment) {
    const oldestYear = new Date(oldestPayment).getFullYear();
    for (let y = currentYear; y >= oldestYear; y--) {
      availableYears.push(y);
    }
  }
  const uniqueYears = Array.from(new Set(availableYears)).sort((a, b) => b - a);

  // Filter payments: posted or partial status only (monthly input)
  const receivedPayments = payments.filter(
    (p) => p.status === 'posted' || p.status === 'partial'
  );

  // Filter expenses: approved status only (monthly output)
  const approvedExpenses = expenses.filter((e) => e.status === 'approved');


  const monthMap: Record<string, MonthlyReportRow> = {};
  for (let m = 0; m < 12; m++) {
    const d = new Date(reportYear, m, 1);
    const key = getMonthKey(d);
    monthMap[key] = {
      month: key,
      label: MONTH_NAMES[m],
      input: 0,
      output: 0,
      difference: 0,
    };
  }

  // Apply date range filter if provided
  const inDateRange = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo)) return false;
    return true;
  };

  // Aggregate payments
  for (const p of receivedPayments) {
    const d = new Date(p.payment_date);
    if (d.getFullYear() !== reportYear) continue;
    if (dateFrom || dateTo) {
      if (!inDateRange(p.payment_date)) continue;
    }
    const key = getMonthKey(d);
    if (monthMap[key]) {
      monthMap[key].input += p.amount;
    }
  }

  // Aggregate expenses
  for (const e of approvedExpenses) {
    const d = new Date(e.expense_date);
    if (d.getFullYear() !== reportYear) continue;
    if (dateFrom || dateTo) {
      if (!inDateRange(e.expense_date)) continue;
    }
    const key = getMonthKey(d);
    if (monthMap[key]) {
      monthMap[key].output += e.amount;
    }
  }

  // Build rows (all 12 months), compute difference
  const rows: MonthlyReportRow[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(reportYear, m, 1);
    const key = getMonthKey(d);
    const row = monthMap[key];
    rows.push({
      ...row,
      difference: row.input - row.output,
    });
  }

  // Gross totals
  const grossInput = rows.reduce((s, r) => s + r.input, 0);
  const grossOutput = rows.reduce((s, r) => s + r.output, 0);
  const netTotal = grossInput - grossOutput;

  return {
    rows,
    grossInput,
    grossOutput,
    netTotal,
    availableYears: uniqueYears,
  };
}

export interface ExpenseReportRow {
  id: string;
  expense_date: string;
  expense_code: string | null;
  project_name: string | null;
  project_code: string | null;
  supplier_name: string | null;
  category_name: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  status: string;
}

export interface ExpenseReportData {
  rows: ExpenseReportRow[];
  total: number;
  totalAmount: number;
}

export async function getExpenseReport(params?: {
  search?: string;
  status?: string | 'all';
  method?: string | 'all';
  categoryId?: string;
  supplierId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<ExpenseReportData> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    method = 'all',
    categoryId,
    supplierId,
    projectId,
    dateFrom,
    dateTo,
    sortBy = 'expense_date',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase.from('expenses').select(
    `
      *,
      category:expense_categories(name),
      project:projects(id, name, project_code),
      supplier:suppliers(id, name)
    `,
    { count: 'exact' }
  );

  if (search) {
    query = query.or(
      `expense_code.ilike.%${search}%,invoice_number.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (status !== 'all') query = query.eq('status', status);
  if (method !== 'all') query = query.eq('payment_method', method);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('expense_date', dateFrom);
  if (dateTo) query = query.lte('expense_date', dateTo);

  const validSortColumns = [
    'expense_date',
    'amount',
    'status',
    'expense_code',
    'created_at',
  ];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'expense_date';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) return { rows: [], total: 0, totalAmount: 0 };

  const rows: ExpenseReportRow[] = data.map((row) => {
    const category = row.category as unknown as { name: string } | null;
    const project = row.project as unknown as {
      id: string;
      name: string;
      project_code: string | null;
    } | null;
    const supplier = row.supplier as unknown as { name: string } | null;

    return {
      id: row.id,
      expense_date: row.expense_date,
      expense_code: row.expense_code,
      project_name: project?.name ?? null,
      project_code: project?.project_code ?? null,
      supplier_name: supplier?.name ?? null,
      category_name: category?.name ?? 'Unknown',
      description: row.description,
      amount: Number(row.amount) || 0,
      payment_method: row.payment_method,
      status: row.status,
    };
  });

  // Calculate total amount for the full filtered set using SQL SUM
  let totalQuery = supabase.rpc('sum_expense_amounts', {
    p_status: status !== 'all' ? status : null,
    p_method: method !== 'all' ? method : null,
    p_category_id: categoryId || null,
    p_supplier_id: supplierId || null,
    p_project_id: projectId || null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_search: search || null,
  });

  const { data: sumResult } = await totalQuery;
  const totalAmount = Number((sumResult as unknown as { total?: number })?.total) || 0;

  return { rows, total: count || 0, totalAmount };
}

export interface PaymentReportRow {
  id: string;
  payment_date: string;
  payment_code: string | null;
  client_name: string;
  client_code: string | null;
  project_name: string;
  project_code: string | null;
  amount: number;
  payment_method: string | null;
  status: string;
  reference_number: string | null;
}

export interface PaymentReportData {
  rows: PaymentReportRow[];
  total: number;
  totalAmount: number;
}

export async function getPaymentReport(params?: {
  search?: string;
  status?: string | 'all';
  method?: string | 'all';
  clientId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<PaymentReportData> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    method = 'all',
    clientId,
    projectId,
    dateFrom,
    dateTo,
    sortBy = 'payment_date',
    sortDir = 'desc',
    page = 1,
    pageSize = 15,
  } = params || {};

  // If filtering by client, get project IDs for that client first
  let clientProjectIds: string[] | null = null;
  if (clientId) {
    const { data: clientProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', clientId);
    clientProjectIds = (clientProjects || []).map((p) => p.id as string);
    if (clientProjectIds.length === 0)
      return { rows: [], total: 0, totalAmount: 0 };
  }

  let query = supabase.from('project_payments').select(
    `
      *,
      project:projects(
        id,
        name,
        project_code,
        client:clients(id, name, client_code)
      )
    `,
    { count: 'exact' }
  );

  if (search) {
    query = query.or(
      `payment_code.ilike.%${search}%,reference_number.ilike.%${search}%`
    );
  }
  if (status !== 'all') query = query.eq('status', status);
  if (method !== 'all') query = query.eq('payment_method', method);
  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('payment_date', dateFrom);
  if (dateTo) query = query.lte('payment_date', dateTo);
  if (clientProjectIds) query = query.in('project_id', clientProjectIds);

  const validSortColumns = [
    'payment_date',
    'amount',
    'status',
    'payment_code',
    'created_at',
  ];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'payment_date';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) return { rows: [], total: 0, totalAmount: 0 };

  const rows: PaymentReportRow[] = data.map((row) => {
    const project = row.project as unknown as {
      id: string;
      name: string;
      project_code: string | null;
      client: { id: string; name: string; client_code: string | null } | null;
    } | null;

    return {
      id: row.id,
      payment_date: row.payment_date,
      payment_code: row.payment_code,
      client_name: project?.client?.name ?? 'Unknown',
      client_code: project?.client?.client_code ?? null,
      project_name: project?.name ?? 'Unknown',
      project_code: project?.project_code ?? null,
      amount: Number(row.amount) || 0,
      payment_method: row.payment_method,
      status: row.status,
      reference_number: row.reference_number,
    };
  });

  // Calculate total amount for the full filtered set
  let totalAmount = 0;
  if (clientProjectIds) {
    // When filtering by client, sum amounts for those project IDs
    const { data: allAmounts } = await supabase
      .from('project_payments')
      .select('amount')
      .in('project_id', clientProjectIds);
    totalAmount = (allAmounts || []).reduce(
      (s, r) => s + (Number(r.amount) || 0),
      0
    );
  } else {
    const { data: sumResult } = await supabase.rpc('sum_payment_amounts', {
      p_status: status !== 'all' ? status : null,
      p_method: method !== 'all' ? method : null,
      p_project_id: projectId || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_search: search || null,
    });
    totalAmount = Number((sumResult as unknown as { total?: number })?.total) || 0;
  }

  return { rows, total: count || 0, totalAmount };
}

export interface ReportFilterOptions {
  clients: Array<{ id: string; name: string; client_code: string | null }>;
  projects: Array<{
    id: string;
    name: string;
    project_code: string | null;
  }>;
  suppliers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const supabase = createSupabaseServerClient();

  const [{ data: clients }, { data: projects }, { data: suppliers }, { data: categories }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, name, client_code')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('archived', false)
        .order('name'),
      supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ]);

  return {
    clients: clients || [],
    projects: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      project_code: p.project_code,
    })),
    suppliers: suppliers || [],
    categories: categories || [],
  };
}

export interface ClientReportRow {
  id: string;
  client_code: string | null;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  total_projects: number;
  active_projects: number;
  total_contract: number;
  total_payments: number;
  outstanding: number;
}

export interface ClientReportData {
  rows: ClientReportRow[];
  total: number;
  totalContract: number;
  totalPayments: number;
  totalOutstanding: number;
}

export async function getClientReport(params?: {
  search?: string;
  status?: string | 'all';
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<ClientReportData> {
  const supabase = createSupabaseServerClient();
  const {
    search = '',
    status = 'all',
    city,
    dateFrom,
    dateTo,
    sortBy = 'name',
    sortDir = 'asc',
    page = 1,
    pageSize = 15,
  } = params || {};

  let query = supabase.from('clients').select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,client_code.ilike.%${search}%`
    );
  }
  if (status !== 'all') query = query.eq('status', status);
  if (city) query = query.ilike('city', `%${city}%`);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  const validSortColumns = ['name', 'client_code', 'status', 'created_at', 'city'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) {
    return { rows: [], total: 0, totalContract: 0, totalPayments: 0, totalOutstanding: 0 };
  }

  const rows: ClientReportRow[] = await Promise.all(
    (data || []).map(async (c) => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, budget, status')
        .eq('client_id', c.id)
        .eq('archived', false);

      const allProjects = projects || [];
      const activeProjects = allProjects.filter(
        (p) => p.status === 'in_progress' || p.status === 'approved'
      );

      const totalContract = allProjects.reduce(
        (s, p) => s + (Number(p.budget) || 0),
        0
      );

      // Batch fetch payments for all projects of this client in one query
      const projectIds = allProjects.map((p) => p.id);
      let totalPayments = 0;
      if (projectIds.length > 0) {
        const { data: payments } = await supabase
          .from('project_payments')
          .select('amount')
          .in('project_id', projectIds)
          .in('status', ['posted', 'partial']);
        totalPayments = (payments || []).reduce(
          (s, p) => s + (Number(p.amount) || 0),
          0
        );
      }

      const outstanding = totalContract - totalPayments;

      return {
        id: c.id,
        client_code: c.client_code,
        name: c.name,
        company_name: c.company_name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        status: c.status,
        total_projects: allProjects.length,
        active_projects: activeProjects.length,
        total_contract: totalContract,
        total_payments: totalPayments,
        outstanding,
      };
    })
  );

  const totalContract = rows.reduce((s, r) => s + r.total_contract, 0);
  const totalPayments = rows.reduce((s, r) => s + r.total_payments, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return {
    rows,
    total: count || 0,
    totalContract,
    totalPayments,
    totalOutstanding,
  };
}
