/*
# Convert has_permission to SECURITY INVOKER

The security advisor flags has_permission as a SECURITY DEFINER function
callable by authenticated users. Since this function only reads from
tables the authenticated user already has RLS access to (profiles with
auth.uid() filter, plus public role/permission reference data), it is
safe as SECURITY INVOKER. This eliminates the advisor warning.
*/

CREATE OR REPLACE FUNCTION public.has_permission(perm_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN profiles prof ON prof.role_id = rp.role_id
    WHERE prof.id = auth.uid()
      AND p.name = perm_name
      AND prof.is_active = true
  );
$$;
