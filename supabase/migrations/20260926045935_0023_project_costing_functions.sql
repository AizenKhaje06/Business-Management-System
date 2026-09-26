/*
# Project costing function

Returns exact decimal financials for a project using Postgres numeric arithmetic.
Only approved expenses and paid/partial payments count toward totals.

Categories mapped to cost groups:
- Material: Materials, Hardware, Wood, Glass
- Labor: Labor
- Other: everything else (Gasoline, Delivery, Transportation, Office Supplies, Tools, Utilities, Other, + pre-existing categories)

Material purchases (material_purchases.total_cost) are added to Material Cost.
*/

CREATE OR REPLACE FUNCTION public.get_project_costing(p_project_id uuid)
RETURNS TABLE (
  contract_amount numeric,
  total_payments numeric,
  outstanding_balance numeric,
  total_expenses numeric,
  material_cost numeric,
  labor_cost numeric,
  other_cost numeric,
  total_project_cost numeric,
  project_difference numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric;
  v_total_payments numeric;
  v_total_expenses numeric;
  v_material_cost numeric;
  v_labor_cost numeric;
  v_other_cost numeric;
  v_total_project_cost numeric;
BEGIN
  -- Contract amount from project budget
  SELECT COALESCE(budget, 0) INTO v_budget
  FROM projects WHERE id = p_project_id;

  -- Total payments (only paid and partial)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
  FROM project_payments
  WHERE project_id = p_project_id
    AND status IN ('paid', 'partial');

  -- Material cost: approved expenses in material-related categories + material purchases
  SELECT COALESCE(SUM(e.amount), 0) INTO v_material_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name IN ('Materials', 'Hardware', 'Wood', 'Glass');

  -- Add material purchases total
  v_material_cost := v_material_cost + COALESCE((
    SELECT SUM(total_cost) FROM material_purchases
    WHERE project_id = p_project_id
  ), 0);

  -- Labor cost: approved expenses in Labor category
  SELECT COALESCE(SUM(e.amount), 0) INTO v_labor_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name = 'Labor';

  -- Other cost: approved expenses in all other categories
  SELECT COALESCE(SUM(e.amount), 0) INTO v_other_cost
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
    AND ec.name NOT IN ('Materials', 'Hardware', 'Wood', 'Glass', 'Labor');

  v_total_expenses := v_material_cost + v_labor_cost + v_other_cost;
  v_total_project_cost := v_total_expenses;

  RETURN QUERY SELECT
    v_budget,
    v_total_payments,
    v_budget - v_total_payments,
    v_total_expenses,
    v_material_cost,
    v_labor_cost,
    v_other_cost,
    v_total_project_cost,
    v_budget - v_total_project_cost;
END;
$$;

-- Cost breakdown by category for a project (approved expenses only)
CREATE OR REPLACE FUNCTION public.get_project_cost_breakdown(p_project_id uuid)
RETURNS TABLE (
  category_name text,
  cost_group text,
  total_amount numeric,
  expense_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ec.name AS category_name,
    CASE
      WHEN ec.name IN ('Materials', 'Hardware', 'Wood', 'Glass') THEN 'material'
      WHEN ec.name = 'Labor' THEN 'labor'
      ELSE 'other'
    END AS cost_group,
    COALESCE(SUM(e.amount), 0) AS total_amount,
    COUNT(*) AS expense_count
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.project_id = p_project_id
    AND e.status = 'approved'
  GROUP BY ec.name, cost_group
  ORDER BY total_amount DESC;
$$;
