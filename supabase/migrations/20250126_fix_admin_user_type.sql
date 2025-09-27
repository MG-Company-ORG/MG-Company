-- Migration: Fix admin user_type
-- Date: 2025-01-26
-- Description: Allow user_type to be null for admin users

-- 1. Remove the NOT NULL constraint from user_type column
ALTER TABLE profiles ALTER COLUMN user_type DROP NOT NULL;

-- 2. Update the CHECK constraint to allow NULL values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IS NULL OR user_type IN ('employer', 'jobseeker'));

-- 3. Set admin users' user_type to NULL
UPDATE profiles 
SET user_type = NULL 
WHERE role = 'admin';

-- 4. Add a comment to explain the logic
COMMENT ON COLUMN profiles.user_type IS 'User type: employer, jobseeker, or NULL for admin users';
