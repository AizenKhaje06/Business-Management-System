import { createSupabaseServerClient } from './server';
import type { User } from '@supabase/supabase-js';

/**
 * Server-side authentication utilities.
 *
 * These helpers wrap the server Supabase client to provide
 * session and user retrieval in Server Components, Route Handlers,
 * and Server Actions. Auth UI (login/signup pages) is not built yet —
 * these are the foundation that future auth flows will build on.
 */

/**
 * Returns the current Supabase session, or null if not authenticated.
 */
export async function getSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Returns the currently authenticated user, or null if not logged in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the currently authenticated user.
 * Throws if no user is authenticated — use in protected server contexts.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required: no user session found.');
  }
  return user;
}
