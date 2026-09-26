import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('budget')
    .eq('id', projectId)
    .maybeSingle();

  const budget = project?.budget ?? null;

  const { data: payments } = await supabase
    .from('project_payments')
    .select('amount')
    .eq('project_id', projectId)
    .in('status', ['posted', 'partial']);

  const total = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    contract_amount: budget,
    total_payments: total,
    outstanding_balance: (budget ?? 0) - total,
  });
}
