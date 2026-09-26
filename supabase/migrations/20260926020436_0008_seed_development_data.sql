/*
# Seed development data

## Overview
This migration inserts development seed data for testing and initial setup.
All data is idempotent (ON CONFLICT DO NOTHING) and safe to re-run.

## Seed Data

### expense_categories
- Office Supplies
- Travel & Transportation
- Software & Subscriptions
- Professional Services
- Equipment & Hardware
- Marketing & Advertising
- Utilities
- Meals & Entertainment

### settings
- company_name: "BizManage Demo"
- currency: "USD"
- fiscal_year_start: "01-01"
- date_format: "YYYY-MM-DD"
- timezone: "UTC"

### clients (sample)
- Acme Corporation (acme@acme.com)
- TechStart Inc (contact@techstart.io)

### suppliers (sample)
- Global Office Supply Co
- TechEquipment Distributors

### materials (sample)
- A4 Paper Ream (SKU: PAP-A4-001)
- Laptop Stand (SKU: ACC-LAP-001)

### projects (sample)
- Website Redesign (for Acme Corporation, active)
- Mobile App Development (for TechStart Inc, planning)

## Important Notes
1. All inserts use ON CONFLICT DO NOTHING — safe to re-run.
2. Sample data references the admin user (admin@bizmanage.com) as created_by.
3. Settings use JSONB values for flexibility.
*/

-- ============================================================================
-- SEED EXPENSE CATEGORIES
-- ============================================================================
INSERT INTO expense_categories (name, description) VALUES
  ('Office Supplies', 'General office supplies and stationery'),
  ('Travel & Transportation', 'Business travel, fuel, parking'),
  ('Software & Subscriptions', 'SaaS subscriptions, licenses, digital tools'),
  ('Professional Services', 'Consulting, legal, accounting fees'),
  ('Equipment & Hardware', 'Computers, furniture, equipment purchases'),
  ('Marketing & Advertising', 'Ads, promotional materials, events'),
  ('Utilities', 'Internet, phone, electricity for office'),
  ('Meals & Entertainment', 'Client meetings, team lunches, events')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED SETTINGS
-- ============================================================================
INSERT INTO settings (key, value, description, is_public) VALUES
  ('company_name', '"BizManage Demo"', 'Company display name', true),
  ('currency', '"USD"', 'Default currency code', true),
  ('fiscal_year_start', '"01-01"', 'Fiscal year start month-day', true),
  ('date_format', '"YYYY-MM-DD"', 'Default date display format', true),
  ('timezone', '"UTC"', 'Application default timezone', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED SAMPLE CLIENTS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO clients (name, email, phone, city, state, country, created_by)
  VALUES
    ('Acme Corporation', 'contact@acme.com', '+1-555-0100', 'New York', 'NY', 'US', admin_id),
    ('TechStart Inc', 'hello@techstart.io', '+1-555-0200', 'San Francisco', 'CA', 'US', admin_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE SUPPLIERS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO suppliers (name, email, phone, city, state, country, payment_terms, created_by)
  VALUES
    ('Global Office Supply Co', 'orders@globaloffice.com', '+1-555-0300', 'Chicago', 'IL', 'US', 'Net 30', admin_id),
    ('TechEquipment Distributors', 'sales@techequip.com', '+1-555-0400', 'Austin', 'TX', 'US', 'Net 15', admin_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE MATERIALS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;

  INSERT INTO materials (name, description, sku, unit, unit_cost, stock_quantity, reorder_level, created_by)
  VALUES
    ('A4 Paper Ream', '500 sheets, 80gsm white paper', 'PAP-A4-001', 'ream', 4.50, 120, 20, admin_id),
    ('Laptop Stand', 'Adjustable aluminum laptop stand', 'ACC-LAP-001', 'pcs', 25.00, 15, 5, admin_id)
  ON CONFLICT (sku) DO NOTHING;
END $$;

-- ============================================================================
-- SEED SAMPLE PROJECTS
-- ============================================================================
DO $$
DECLARE
  admin_id uuid;
  acme_id uuid;
  techstart_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@bizmanage.com' LIMIT 1;
  SELECT id INTO acme_id FROM clients WHERE name = 'Acme Corporation' LIMIT 1;
  SELECT id INTO techstart_id FROM clients WHERE name = 'TechStart Inc' LIMIT 1;

  INSERT INTO projects (client_id, name, description, status, priority, start_date, end_date, budget, created_by)
  VALUES
    (acme_id, 'Website Redesign', 'Complete redesign of corporate website with new CMS', 'active', 'high', '2026-09-01', '2026-12-15', 45000.00, admin_id),
    (techstart_id, 'Mobile App Development', 'iOS and Android app for customer portal', 'planning', 'medium', '2026-10-01', '2027-03-01', 80000.00, admin_id)
  ON CONFLICT DO NOTHING;
END $$;
