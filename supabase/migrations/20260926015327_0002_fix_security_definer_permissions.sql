/*
# Fix SECURITY DEFINER function permissions

## Overview
The security advisor flagged that `handle_new_user()` and `has_permission()`
SECURITY DEFINER functions are callable by the `anon` role via the REST API.
This migration locks them down:

1. `handle_new_user()` — should ONLY be called by the database trigger on
   `auth.users`, never directly. Revoke EXECUTE from anon and authenticated.
2. `has_permission()` — should be callable by authenticated users only
   (it checks `auth.uid()` internally, so anon calls return false anyway,
   but we should not expose it). Revoke EXECUTE from anon.
3. `update_updated_at()` — set search_path to prevent search path injection.

## Security Changes
- REVOKE EXECUTE on `handle_new_user` from anon and authenticated
- REVOKE EXECUTE on `has_permission` from anon
- Set search_path on `update_updated_at` to public
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon;

-- Fix mutable search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
