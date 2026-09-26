-- Revoke EXECUTE from anon for all SECURITY DEFINER functions in public schema.
-- These functions should only be callable by authenticated users.
-- handle_new_user is already locked down (trigger-only), so we skip it.

REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_purchase_total() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_expense_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_material_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_purchase_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_supplier_code() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(p_project_id uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(p_project_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_project_costing(p_project_id uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_costing(p_project_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(
  p_status text, p_method text, p_category_id uuid, p_supplier_id uuid,
  p_project_id uuid, p_date_from date, p_date_to date, p_search text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sum_expense_amounts(
  p_status text, p_method text, p_category_id uuid, p_supplier_id uuid,
  p_project_id uuid, p_date_from date, p_date_to date, p_search text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(
  p_status text, p_method text, p_project_id uuid,
  p_date_from date, p_date_to date, p_search text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sum_payment_amounts(
  p_status text, p_method text, p_project_id uuid,
  p_date_from date, p_date_to date, p_search text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_client_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;
