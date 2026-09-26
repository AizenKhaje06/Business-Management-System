-- Add category column to notifications for typed notification filtering
-- The existing `type` column handles severity (info/success/warning/error)
-- The new `category` column handles the business event type

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system'
    CHECK (category IN (
      'payment_received',
      'payment_overdue',
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'project_status_changed',
      'project_deadline_approaching',
      'document_uploaded',
      'photo_uploaded',
      'system'
    ));

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(user_id, category);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
