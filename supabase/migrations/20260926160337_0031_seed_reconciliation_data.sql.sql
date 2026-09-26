-- Seed transaction data for Jan-May 2026 reconciliation
-- Input = project_payments with status 'posted' or 'partial'
-- Output = expenses with status 'approved'
-- COMMENTED OUT: This seed data uses hardcoded UUIDs that don't exist in fresh database
-- Uncomment and replace UUIDs with your actual IDs if you want this test data

/*
DO $$
DECLARE
  v_project_1 uuid := '1375bd93-454d-423f-9470-91d2a396f34b';
  v_project_2 uuid := '8c22ecd9-988b-48aa-b6e0-bca6c3673301';
  v_cat_office uuid := 'c9d97069-f68c-447b-a21e-61ccb400d116';
  v_cat_travel uuid := '26f4d2a4-c827-4b04-b483-803a808977d3';
  v_cat_software uuid := '4e21bbe5-4945-4aa9-86c6-ab045348a39e';
  v_cat_services uuid := '4d70b10e-05e4-4596-9fb9-960803b3a214';
  v_cat_hardware uuid := '31ff1b20-3933-4a1b-b4ec-b6d997b69f80';
  v_user_admin uuid := '648e024a-f491-4749-a416-d0e026a241fb';
  v_user_manager uuid := '413c44de-5c68-4b60-87bc-ff34d20bfeb7';
  v_user_acct uuid := 'd9720b07-634d-43ea-b86c-bd55e4fc3f4e';
BEGIN
  -- PAYMENTS — status 'posted' or 'partial' count as input

  -- JANUARY 2026 — Total: 1,463,107.50
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 500000.00, '2026-01-08', 'posted', 'bank_transfer', 'PAY-0101', v_user_admin, '2026-01-08T10:00:00Z'),
    (v_project_1, 363107.50, '2026-01-15', 'posted', 'bank_deposit', 'PAY-0102', v_user_admin, '2026-01-15T10:00:00Z'),
    (v_project_2, 300000.00, '2026-01-22', 'posted', 'cash', 'PAY-0103', v_user_manager, '2026-01-22T10:00:00Z'),
    (v_project_2, 300000.00, '2026-01-28', 'partial', 'gcash', 'PAY-0104', v_user_manager, '2026-01-28T10:00:00Z');

  -- FEBRUARY 2026 — Total: 2,665,836.19
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 800000.00, '2026-02-05', 'posted', 'bank_transfer', 'PAY-0105', v_user_admin, '2026-02-05T10:00:00Z'),
    (v_project_1, 665836.19, '2026-02-12', 'posted', 'bank_deposit', 'PAY-0106', v_user_admin, '2026-02-12T10:00:00Z'),
    (v_project_2, 500000.00, '2026-02-18', 'posted', 'cash', 'PAY-0107', v_user_manager, '2026-02-18T10:00:00Z'),
    (v_project_2, 700000.00, '2026-02-25', 'posted', 'bank_transfer', 'PAY-0108', v_user_manager, '2026-02-25T10:00:00Z');

  -- MARCH 2026 — Total: 2,242,030.98
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 742030.98, '2026-03-03', 'posted', 'bank_transfer', 'PAY-0109', v_user_admin, '2026-03-03T10:00:00Z'),
    (v_project_1, 600000.00, '2026-03-10', 'posted', 'bank_deposit', 'PAY-0110', v_user_admin, '2026-03-10T10:00:00Z'),
    (v_project_2, 400000.00, '2026-03-17', 'posted', 'cash', 'PAY-0111', v_user_manager, '2026-03-17T10:00:00Z'),
    (v_project_2, 500000.00, '2026-03-24', 'partial', 'bank_transfer', 'PAY-0112', v_user_manager, '2026-03-24T10:00:00Z');

  -- APRIL 2026 — Total: 1,361,546.00
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 561546.00, '2026-04-07', 'posted', 'bank_transfer', 'PAY-0113', v_user_admin, '2026-04-07T10:00:00Z'),
    (v_project_1, 400000.00, '2026-04-14', 'posted', 'bank_deposit', 'PAY-0114', v_user_admin, '2026-04-14T10:00:00Z'),
    (v_project_2, 400000.00, '2026-04-21', 'posted', 'cash', 'PAY-0115', v_user_manager, '2026-04-21T10:00:00Z');

  -- MAY 2026 — Total: 801,358.41
  INSERT INTO project_payments (project_id, amount, payment_date, status, payment_method, payment_code, created_by, posted_at) VALUES
    (v_project_1, 401358.41, '2026-05-06', 'posted', 'bank_transfer', 'PAY-0116', v_user_admin, '2026-05-06T10:00:00Z'),
    (v_project_2, 200000.00, '2026-05-13', 'posted', 'bank_deposit', 'PAY-0117', v_user_manager, '2026-05-13T10:00:00Z'),
    (v_project_2, 200000.00, '2026-05-20', 'partial', 'cash', 'PAY-0118', v_user_manager, '2026-05-20T10:00:00Z');

  -- EXPENSES — only 'approved' status counts as output

  -- JANUARY 2026 — Total: 844,234.33
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_hardware, v_project_1, 300000.00, 'PHP', '2026-01-10', 'Server hardware procurement', 'approved', 'EXP-0101', 'bank_transfer', v_user_manager, v_user_admin, '2026-01-11T10:00:00Z'),
    (v_cat_services, v_project_1, 244234.33, 'PHP', '2026-01-14', 'Consulting services', 'approved', 'EXP-0102', 'bank_deposit', v_user_manager, v_user_admin, '2026-01-15T10:00:00Z'),
    (v_cat_office, v_project_2, 200000.00, 'PHP', '2026-01-20', 'Office supplies bulk order', 'approved', 'EXP-0103', 'cash', v_user_acct, v_user_admin, '2026-01-21T10:00:00Z'),
    (v_cat_travel, v_project_2, 100000.00, 'PHP', '2026-01-25', 'Site visit transportation', 'approved', 'EXP-0104', 'other', v_user_acct, v_user_admin, '2026-01-26T10:00:00Z');

  -- FEBRUARY 2026 — Total: 749,526.37
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_software, v_project_1, 300000.00, 'PHP', '2026-02-08', 'Software licenses annual', 'approved', 'EXP-0105', 'bank_transfer', v_user_manager, v_user_admin, '2026-02-09T10:00:00Z'),
    (v_cat_hardware, v_project_1, 249526.37, 'PHP', '2026-02-15', 'Network equipment', 'approved', 'EXP-0106', 'bank_deposit', v_user_manager, v_user_admin, '2026-02-16T10:00:00Z'),
    (v_cat_office, v_project_2, 200000.00, 'PHP', '2026-02-22', 'Office furniture', 'approved', 'EXP-0107', 'cash', v_user_acct, v_user_admin, '2026-02-23T10:00:00Z');

  -- MARCH 2026 — Total: 820,446.59
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_services, v_project_1, 320446.59, 'PHP', '2026-03-05', 'Legal and accounting fees', 'approved', 'EXP-0108', 'bank_transfer', v_user_manager, v_user_admin, '2026-03-06T10:00:00Z'),
    (v_cat_hardware, v_project_1, 300000.00, 'PHP', '2026-03-12', 'Hardware upgrades', 'approved', 'EXP-0109', 'bank_deposit', v_user_manager, v_user_admin, '2026-03-13T10:00:00Z'),
    (v_cat_travel, v_project_2, 200000.00, 'PHP', '2026-03-19', 'Client meeting travel', 'approved', 'EXP-0110', 'other', v_user_acct, v_user_admin, '2026-03-20T10:00:00Z');

  -- APRIL 2026 — Total: 743,588.81
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_software, v_project_1, 343588.81, 'PHP', '2026-04-09', 'Cloud infrastructure costs', 'approved', 'EXP-0111', 'bank_transfer', v_user_manager, v_user_admin, '2026-04-10T10:00:00Z'),
    (v_cat_office, v_project_1, 200000.00, 'PHP', '2026-04-16', 'Stationary and supplies', 'approved', 'EXP-0112', 'bank_deposit', v_user_manager, v_user_admin, '2026-04-17T10:00:00Z'),
    (v_cat_services, v_project_2, 200000.00, 'PHP', '2026-04-23', 'Outsourced QA testing', 'approved', 'EXP-0113', 'cash', v_user_acct, v_user_admin, '2026-04-24T10:00:00Z');

  -- MAY 2026 — Total: 984,024.52
  INSERT INTO expenses (category_id, project_id, amount, currency, expense_date, description, status, expense_code, payment_method, submitted_by, approved_by, approved_at) VALUES
    (v_cat_hardware, v_project_1, 400000.00, 'PHP', '2026-05-08', 'Equipment replacement', 'approved', 'EXP-0114', 'bank_transfer', v_user_manager, v_user_admin, '2026-05-09T10:00:00Z'),
    (v_cat_services, v_project_1, 284024.52, 'PHP', '2026-05-15', 'Professional services Q2', 'approved', 'EXP-0115', 'bank_deposit', v_user_manager, v_user_admin, '2026-05-16T10:00:00Z'),
    (v_cat_software, v_project_2, 200000.00, 'PHP', '2026-05-22', 'Development tools', 'approved', 'EXP-0116', 'bank_transfer', v_user_acct, v_user_admin, '2026-05-23T10:00:00Z'),
    (v_cat_travel, v_project_2, 100000.00, 'PHP', '2026-05-27', 'Team travel expenses', 'approved', 'EXP-0117', 'other', v_user_acct, v_user_admin, '2026-05-28T10:00:00Z');

END $$;
*/
