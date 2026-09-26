'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';

export async function logout() {
  const ctx = await getCurrentUserContext();
  if (ctx) {
    await logAuditForCurrentUser(ctx.id, 'logout', 'auth', {
      entityName: ctx.email,
    });
  }
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function logLogin(email: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx) return;
  await logAuditForCurrentUser(ctx.id, 'login', 'auth', {
    entityName: email,
  });
}
