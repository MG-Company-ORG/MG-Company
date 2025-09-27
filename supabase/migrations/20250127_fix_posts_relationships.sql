-- Migration: Fix posts foreign keys and admin user types
-- Date: 2025-01-27
-- Description: Ensure posts.user_id references profiles and admins are not given employer user_type

-- 1. Ensure posts.user_id references profiles(id) so PostgREST can expose the relationship
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT TRUE
    INTO constraint_exists
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema = 'public'
      AND tc.table_name = 'posts'
      AND tc.constraint_name = 'posts_user_id_fkey';

    IF constraint_exists THEN
        -- Drop the existing constraint so we can recreate it against profiles(id)
        EXECUTE 'ALTER TABLE posts DROP CONSTRAINT posts_user_id_fkey';
    END IF;

    -- Recreate the foreign key pointing to profiles(id)
    EXECUTE 'ALTER TABLE posts
             ADD CONSTRAINT posts_user_id_fkey
             FOREIGN KEY (user_id)
             REFERENCES profiles(id)
             ON DELETE CASCADE';
END $$;

-- 2. Create an index on posts.user_id for faster joins (idempotent)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- 3. Allow user_type to be NULL and keep admins without a user_type
ALTER TABLE profiles ALTER COLUMN user_type DROP NOT NULL;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
CHECK (user_type IS NULL OR user_type IN ('employer', 'jobseeker'));

-- 4. Make sure admin accounts do not masquerade as employers or jobseekers
UPDATE profiles
SET user_type = NULL
WHERE role = 'admin';
