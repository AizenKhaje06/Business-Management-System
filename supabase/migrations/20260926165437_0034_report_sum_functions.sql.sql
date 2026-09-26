-- Phase 29: SQL SUM functions for report totals
-- Avoids fetching all rows into JS just to sum amounts

CREATE OR REPLACE FUNCTION public.sum_expense_amounts(
  p_status text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS decimal
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM expenses
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_method IS NULL OR payment_method = p_method)
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id)
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_date_from IS NULL OR expense_date >= p_date_from)
    AND (p_date_to IS NULL OR expense_date <= p_date_to)
    AND (
      p_search IS NULL OR
      expense_code ILIKE '%' || p_search || '%' OR
      invoice_number ILIKE '%' || p_search || '%' OR
      description ILIKE '%' || p_search || '%'
    )
$$;

CREATE OR REPLACE FUNCTION public.sum_payment_amounts(
  p_status text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS decimal
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM project_payments
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_method IS NULL OR payment_method = p_method)
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_date_from IS NULL OR payment_date >= p_date_from)
    AND (p_date_to IS NULL OR payment_date <= p_date_to)
    AND (
      p_search IS NULL OR
      payment_code ILIKE '%' || p_search || '%' OR
      reference_number ILIKE '%' || p_search || '%'
    )
$$;

REVOKE EXECUTE ON FUNCTION public.sum_expense_amounts(text, text, uuid, uuid, uuid, date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sum_payment_amounts(text, text, uuid, date, date, text) FROM anon;
