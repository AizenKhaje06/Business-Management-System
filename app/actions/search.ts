'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';

export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'payment' | 'expense' | 'supplier' | 'material' | 'document';
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
}

export interface GlobalSearchResult {
  results: SearchResult[];
  total: number;
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  posted: 'bg-blue-100 text-blue-700',
  partial: 'bg-cyan-100 text-cyan-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  submitted: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  void: 'bg-zinc-100 text-zinc-700',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  quotation: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function globalSearch(
  query: string,
  options?: {
    types?: SearchResult['type'][];
    limit?: number;
  }
): Promise<GlobalSearchResult> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { results: [], total: 0 };

  const q = query.trim();
  if (q.length < 2) return { results: [], total: 0 };

  const supabase = createSupabaseServerClient();
  const limit = options?.limit ?? 30;
  const perType = Math.ceil(limit / 7);
  const types = options?.types;

  const canViewContacts = ctx.permissions.includes('contacts.view');
  const canViewInvoices = ctx.permissions.includes('invoices.view');

  const results: SearchResult[] = [];

  async function searchClients(): Promise<void> {
    if (!canViewContacts) return;
    if (types && !types.includes('client')) return;
    const { data } = await supabase
      .from('clients')
      .select('id, name, client_code, status, email, phone')
      .or(`name.ilike.%${q}%,client_code.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(perType)
      .order('name');
    for (const c of data ?? []) {
      results.push({
        id: c.id,
        type: 'client',
        title: c.name,
        subtitle: [c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info',
        href: `/clients/${c.id}`,
        badge: c.status,
        badgeColor: c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-700',
      });
    }
  }

  async function searchProjects(): Promise<void> {
    if (!canViewInvoices) return;
    if (types && !types.includes('project')) return;
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_code, status, budget, client:clients(name)')
      .or(`name.ilike.%${q}%,project_code.ilike.%${q}%`)
      .limit(perType)
      .order('created_at', { ascending: false });
    for (const p of data ?? []) {
      const client = p.client as unknown as { name: string } | null;
      results.push({
        id: p.id,
        type: 'project',
        title: p.name,
        subtitle: client?.name ?? 'Unknown client',
        href: `/projects/${p.id}`,
        meta: p.budget ? formatCurrency(Number(p.budget)) : undefined,
        badge: p.status,
        badgeColor: PROJECT_STATUS_COLORS[p.status] ?? 'bg-zinc-100 text-zinc-700',
      });
    }
  }

  async function searchPayments(): Promise<void> {
    if (!canViewInvoices) return;
    if (types && !types.includes('payment')) return;
    const { data } = await supabase
      .from('project_payments')
      .select('id, payment_code, amount, status, payment_date, project:projects(name)')
      .or(`payment_code.ilike.%${q}%,reference_number.ilike.%${q}%`)
      .limit(perType)
      .order('payment_date', { ascending: false });
    for (const p of data ?? []) {
      const project = p.project as unknown as { name: string } | null;
      results.push({
        id: p.id,
        type: 'payment',
        title: p.payment_code || 'Payment',
        subtitle: project?.name ?? 'Unknown project',
        href: `/payments/${p.id}`,
        meta: formatCurrency(Number(p.amount)),
        badge: p.status,
        badgeColor: PAYMENT_STATUS_COLORS[p.status] ?? 'bg-zinc-100 text-zinc-700',
      });
    }
  }

  async function searchExpenses(): Promise<void> {
    if (!canViewInvoices) return;
    if (types && !types.includes('expense')) return;
    const { data } = await supabase
      .from('expenses')
      .select('id, expense_code, description, amount, status, expense_date, category:expense_categories(name)')
      .or(`expense_code.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(perType)
      .order('expense_date', { ascending: false });
    for (const e of data ?? []) {
      const cat = e.category as unknown as { name: string } | null;
      results.push({
        id: e.id,
        type: 'expense',
        title: e.expense_code || 'Expense',
        subtitle: [cat?.name, e.description].filter(Boolean).join(' — ') || 'No description',
        href: `/expenses/${e.id}`,
        meta: formatCurrency(Number(e.amount)),
        badge: e.status,
        badgeColor: EXPENSE_STATUS_COLORS[e.status] ?? 'bg-zinc-100 text-zinc-700',
      });
    }
  }

  async function searchSuppliers(): Promise<void> {
    if (!canViewContacts) return;
    if (types && !types.includes('supplier')) return;
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, supplier_code, contact_person, email')
      .or(`name.ilike.%${q}%,supplier_code.ilike.%${q}%,contact_person.ilike.%${q}%`)
      .limit(perType)
      .order('name');
    for (const s of data ?? []) {
      results.push({
        id: s.id,
        type: 'supplier',
        title: s.name,
        subtitle: [s.contact_person, s.email].filter(Boolean).join(' · ') || 'No contact info',
        href: `/suppliers/${s.id}`,
        badge: s.supplier_code || undefined,
      });
    }
  }

  async function searchMaterials(): Promise<void> {
    if (!canViewInvoices) return;
    if (types && !types.includes('material')) return;
    const { data } = await supabase
      .from('materials')
      .select('id, name, material_code, unit, unit_cost, supplier:suppliers(name)')
      .or(`name.ilike.%${q}%,material_code.ilike.%${q}%`)
      .limit(perType)
      .order('name');
    for (const m of data ?? []) {
      const supplier = m.supplier as unknown as { name: string } | null;
      results.push({
        id: m.id,
        type: 'material',
        title: m.name,
        subtitle: supplier?.name ?? 'No supplier',
        href: `/materials/${m.id}`,
        meta: `${m.unit} · ${formatCurrency(Number(m.unit_cost))}`,
        badge: m.material_code || undefined,
      });
    }
  }

  async function searchDocuments(): Promise<void> {
    if (types && !types.includes('document')) return;
    const { data } = await supabase
      .from('documents')
      .select('id, name, entity_type, entity_id, description, mime_type')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('archived', false)
      .limit(perType)
      .order('created_at', { ascending: false });
    for (const d of data ?? []) {
      results.push({
        id: d.id,
        type: 'document',
        title: d.name,
        subtitle: d.description || d.mime_type || 'Document',
        href: d.entity_type === 'project' ? `/projects/${d.entity_id}` : `/materials/${d.entity_id}`,
        badge: d.entity_type,
      });
    }
  }

  await Promise.all([
    searchClients(),
    searchProjects(),
    searchPayments(),
    searchExpenses(),
    searchSuppliers(),
    searchMaterials(),
    searchDocuments(),
  ]);

  results.sort((a, b) => {
    const aMatch = a.title.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    const bMatch = b.title.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    return aMatch - bMatch;
  });

  return { results: results.slice(0, limit), total: results.length };
}

export async function searchSuggestions(query: string): Promise<SearchResult[]> {
  const result = await globalSearch(query, { limit: 6 });
  return result.results;
}
