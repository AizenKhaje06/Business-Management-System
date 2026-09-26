-- Phase 28 Security Audit Fixes

-- 1. Revoke EXECUTE from anon on all SECURITY DEFINER functions
--    These functions should only be callable by authenticated users.
REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_costing(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;

-- 2. Fix audit_logs INSERT policy: require authentication instead of with_check=true
DROP POLICY IF EXISTS insert_audit_logs ON audit_logs;
CREATE POLICY insert_audit_logs ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix storage.objects policies: scope document access by owner
--    Currently any authenticated user can read/delete ANY document
DROP POLICY IF EXISTS read_documents ON storage.objects;
DROP POLICY IF EXISTS delete_documents ON storage.objects;
DROP POLICY IF EXISTS upload_documents ON storage.objects;

-- Documents: only owner can manage their uploads
CREATE POLICY read_documents ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY upload_documents ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY update_documents ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );

CREATE POLICY delete_documents ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND owner = auth.uid()
  );
