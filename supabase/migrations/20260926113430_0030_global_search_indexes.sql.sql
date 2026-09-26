-- Enable pg_trgm extension for trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Standard B-tree indexes for exact/lowercase lookups

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_code_lower
  ON clients (lower(client_code));
CREATE INDEX IF NOT EXISTS idx_clients_email_lower
  ON clients (lower(email));

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_code_lower
  ON projects (lower(project_code));
CREATE INDEX IF NOT EXISTS idx_projects_status
  ON projects (status) WHERE archived = false;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_code_lower
  ON project_payments (lower(payment_code));
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON project_payments (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON project_payments (status);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_code_lower
  ON expenses (lower(expense_code));
CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status
  ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id
  ON expenses (category_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_code_lower
  ON suppliers (lower(supplier_code));

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_code_lower
  ON materials (lower(material_code));

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_entity
  ON documents (entity_type, entity_id) WHERE archived = false;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Trigram GIN indexes for fuzzy text search (pg_trgm enabled above)
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm
  ON projects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_expenses_desc_trgm
  ON expenses USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm
  ON suppliers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_name_trgm
  ON materials USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_name_trgm
  ON documents USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_desc_trgm
  ON documents USING gin (description gin_trgm_ops);
