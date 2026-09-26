-- Revoke EXECUTE from PUBLIC (which includes anon) for all SECURITY DEFINER functions.
-- The default Postgres grant gives EXECUTE to PUBLIC on all functions.
-- We must REVOKE FROM PUBLIC to truly block anon access.

REVOKE EXECUTE ON FUNCTION public.calculate_purchase_total() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_client_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_expense_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_material_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_project_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_purchase_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_supplier_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_project_costing(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(
  text, text, uuid, uuid, uuid, date, date, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(
  text, text, uuid, date, date, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_client_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;

-- Re-grant to authenticated only.
GRANT EXECUTE ON FUNCTION public.calculate_purchase_total() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_expense_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_material_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_project_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_purchase_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_supplier_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_costing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sum_expense_amounts(
  text, text, uuid, uuid, uuid, date, date, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sum_payment_amounts(
  text, text, uuid, date, date, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_client_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;
