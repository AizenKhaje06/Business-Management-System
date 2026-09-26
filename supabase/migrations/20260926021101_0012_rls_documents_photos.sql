/*
# RLS: Document and photo access control

## Overview
This migration replaces RLS policies for documents and photos tables.
Documents and photos are polymorphic — they attach to different entity types
(client, project, expense, supplier, material, invoice, payment). Access is
now scoped through the parent entity's permissions.

## Affected Tables & Policy Changes

### documents
- SELECT: User must have the view permission for the entity type:
  - client/supplier → contacts.view
  - project/invoice/payment → invoices.view
  - expense → expenses.view
  - material → inventory.view
- INSERT: Requires the edit permission for the entity type via can_manage_entity()
- UPDATE: Requires the edit permission for the entity type via can_manage_entity()
- DELETE: Requires the edit permission for the entity type via can_manage_entity()

### photos
- SELECT: Same entity-type-scoped view permissions as documents
- INSERT: Requires can_manage_entity() for the entity type
- DELETE: Requires can_manage_entity() for the entity type

## Security Notes
1. Private documents (e.g. on a restricted project) are only accessible to
   users who have the corresponding view permission.
2. The can_manage_entity() function routes to the correct permission check
   based on entity_type.
3. VIEWERs can read documents/photos (they have view permissions) but cannot
   create, modify, or delete them.
*/

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN public.has_permission('contacts.view')
      WHEN entity_type IN ('project', 'invoice', 'payment') THEN public.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN public.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN public.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated
  USING (public.can_manage_entity(entity_type, entity_id))
  WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (public.can_manage_entity(entity_type, entity_id));

-- ============================================================================
-- PHOTOS
-- ============================================================================
DROP POLICY IF EXISTS "select_photos" ON photos;
CREATE POLICY "select_photos" ON photos FOR SELECT
  TO authenticated USING (
    CASE
      WHEN entity_type IN ('client', 'supplier') THEN public.has_permission('contacts.view')
      WHEN entity_type = 'project' THEN public.has_permission('invoices.view')
      WHEN entity_type = 'expense' THEN public.has_permission('expenses.view')
      WHEN entity_type = 'material' THEN public.has_permission('inventory.view')
      ELSE false
    END
  );

DROP POLICY IF EXISTS "insert_photos" ON photos;
CREATE POLICY "insert_photos" ON photos FOR INSERT
  TO authenticated WITH CHECK (public.can_manage_entity(entity_type, entity_id));

DROP POLICY IF EXISTS "delete_photos" ON photos;
CREATE POLICY "delete_photos" ON photos FOR DELETE
  TO authenticated USING (public.can_manage_entity(entity_type, entity_id));
