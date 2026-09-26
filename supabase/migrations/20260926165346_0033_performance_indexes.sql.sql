-- Phase 29: Performance indexes for unindexed foreign keys

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_rejected_by ON expenses(rejected_by);

-- material_purchases
CREATE INDEX IF NOT EXISTS idx_material_purchases_created_by ON material_purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_material_purchases_material_id ON material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier_id ON material_purchases(supplier_id);

-- project_payments
CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_created_by ON project_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_approved_by ON project_payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_submitted_by ON project_payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_project_payments_rejected_by ON project_payments(rejected_by);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- photos
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- import_history
CREATE INDEX IF NOT EXISTS idx_import_history_imported_by ON import_history(imported_by);

-- project_members
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON expenses(status, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_payments_status_date ON project_payments(status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status_archived ON projects(status, archived);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(archived) WHERE archived = false;
