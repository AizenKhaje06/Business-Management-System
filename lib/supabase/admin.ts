import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the secret (service-role) key.
 * Bypasses RLS — use ONLY in server contexts that require
 * privileged access (admin operations, webhooks, etc.).
 *
 * NEVER import this in a Client Component.
 * NEVER expose the secret key to the browser.
 */
export function createSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set. This client is server-only and must not be used in the browser.'
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
