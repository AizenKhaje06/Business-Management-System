-- ============================================================================
-- ADD USERNAME FIELD AND USERNAME-BASED LOGIN
-- ============================================================================
-- 
-- This migration adds username support for login instead of email
-- Users can now login with: username + password
--
-- Changes:
-- 1. Add username column to profiles table
-- 2. Add unique constraint on username
-- 3. Create function to lookup email by username
-- 4. Update trigger to generate default username
-- ============================================================================

-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update existing profiles with default usernames (based on email prefix)
UPDATE profiles 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Function to get email by username (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE LOWER(username) = LOWER(p_username) LIMIT 1;
$$;

-- Update the handle_new_user trigger to auto-generate username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_role_id uuid;
  default_username text;
BEGIN
  -- Get the VIEWER role ID
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'VIEWER' LIMIT 1;

  -- Generate default username from email (part before @)
  default_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  
  -- Make username unique if it already exists
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = default_username) LOOP
    default_username := default_username || '_' || (random() * 1000)::int;
  END LOOP;

  -- Insert new profile with VIEWER role and username
  INSERT INTO public.profiles (id, email, username, role_id)
  VALUES (NEW.id, NEW.email, default_username, viewer_role_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Revoke public access to the function
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated, anon;

-- Add comment
COMMENT ON COLUMN profiles.username IS 'Unique username for login (auto-generated from email, can be changed)';
COMMENT ON FUNCTION public.get_email_by_username IS 'Converts username to email for authentication';
