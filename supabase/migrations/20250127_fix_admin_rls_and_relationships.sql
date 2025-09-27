-- Migration: Fix Admin RLS and Database Relationships
-- Date: 2025-01-27
-- Description: Complete fix for admin access issues and PostgREST foreign key relationships

-- 1. Ensure posts.user_id has proper foreign key to profiles.id
DO $$
DECLARE
    constraint_exists BOOLEAN;
    posts_table_exists BOOLEAN;
    profiles_table_exists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'posts'
    ) INTO posts_table_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
    ) INTO profiles_table_exists;

    IF posts_table_exists AND profiles_table_exists THEN
        -- Check if foreign key constraint exists
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.constraint_schema = 'public'
              AND tc.table_name = 'posts'
              AND tc.constraint_name = 'posts_user_id_fkey'
        ) INTO constraint_exists;

        -- Drop existing constraint if it exists
        IF constraint_exists THEN
            ALTER TABLE posts DROP CONSTRAINT posts_user_id_fkey;
        END IF;

        -- Ensure user_id column exists and has correct type
        -- Make sure it's UUID type to match profiles.id
        ALTER TABLE posts ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

        -- Create the foreign key constraint
        ALTER TABLE posts
        ADD CONSTRAINT posts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

        -- Create index for better join performance
        CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

        RAISE NOTICE 'Foreign key constraint posts_user_id_fkey created successfully';
    ELSE
        RAISE NOTICE 'Posts or profiles table does not exist, skipping foreign key creation';
    END IF;
END $$;

-- 2. Fix RLS policies for profiles table to allow admin access
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create comprehensive RLS policies for profiles
-- Everyone can view all profiles (needed for employer/jobseeker discovery)
CREATE POLICY "Everyone can view all profiles" ON profiles
FOR SELECT USING (true);

-- Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Admins can do everything with all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- 3. Ensure RLS policies for posts allow proper admin access
-- Drop and recreate posts policies to ensure consistency
DROP POLICY IF EXISTS "Everyone can view active posts" ON posts;
DROP POLICY IF EXISTS "Employers can create posts" ON posts;
DROP POLICY IF EXISTS "Employers can update their own posts" ON posts;
DROP POLICY IF EXISTS "Employers can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON posts;

-- Everyone can view active posts
CREATE POLICY "Everyone can view active posts" ON posts
FOR SELECT USING (status = 'active');

-- Employers can create posts
CREATE POLICY "Employers can create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'employer'
    AND profiles.role = 'user'
  )
);

-- Employers can update their own posts
CREATE POLICY "Employers can update their own posts" ON posts
FOR UPDATE USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'employer'
    AND profiles.role = 'user'
  )
);

-- Employers can delete their own posts
CREATE POLICY "Employers can delete their own posts" ON posts
FOR DELETE USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'employer'
    AND profiles.role = 'user'
  )
);

-- Admins can view, update, and delete all posts (including drafts)
CREATE POLICY "Admins can manage all posts" ON posts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Ensure applications RLS policies allow admin access
-- Check if applications table exists before creating policies
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'applications'
    ) THEN
        -- Drop existing admin policy and recreate
        DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;

        CREATE POLICY "Admins can manage all applications" ON applications
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );

        RAISE NOTICE 'Applications RLS policies updated for admin access';
    END IF;
END $$;

-- 5. Ensure banners table has proper RLS policies
-- Check if banners table exists and create admin policies
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'banners'
    ) THEN
        -- Enable RLS on banners table
        ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Everyone can view active banners" ON banners;
        DROP POLICY IF EXISTS "Admins can manage all banners" ON banners;

        -- Everyone can view active banners
        CREATE POLICY "Everyone can view active banners" ON banners
        FOR SELECT USING (is_active = true);

        -- Admins can manage all banners
        CREATE POLICY "Admins can manage all banners" ON banners
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );

        RAISE NOTICE 'Banners RLS policies created';
    END IF;
END $$;

-- 6. Refresh PostgREST schema cache to recognize the new foreign key relationship
NOTIFY pgrst, 'reload schema';

-- 7. Create a function to help debug admin access
CREATE OR REPLACE FUNCTION check_admin_access()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    user_type TEXT,
    is_admin BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        profiles.id,
        profiles.email,
        profiles.role,
        profiles.user_type,
        (profiles.role = 'admin') as is_admin
    FROM profiles
    WHERE profiles.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_admin_access() TO authenticated;

-- 8. Ensure admin users have proper role and user_type
UPDATE profiles
SET
    role = 'admin',
    user_type = NULL
WHERE role = 'admin';

-- 9. Add helpful comment explaining the foreign key relationship
COMMENT ON CONSTRAINT posts_user_id_fkey ON posts IS
'Foreign key constraint linking posts.user_id to profiles.id for PostgREST relationship discovery';

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Admin RLS and database relationships fix completed successfully';
    RAISE NOTICE 'PostgREST should now be able to resolve posts->profiles relationship';
    RAISE NOTICE 'Admins should now be able to view all posts and users';
END $$;