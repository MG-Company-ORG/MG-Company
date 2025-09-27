-- Migration: Fix Infinite Recursion in RLS Policies
-- Date: 2025-01-27
-- Description: Remove circular RLS policies causing 42P17 infinite recursion error

-- 🚨 CRITICAL: Remove ALL existing RLS policies on profiles table to stop infinite recursion
DROP POLICY IF EXISTS "Everyone can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Step 1: Temporarily disable RLS to allow admin operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Create a simple admin check function to avoid recursion
-- This function uses a direct lookup without RLS policies
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Direct query without triggering RLS policies
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;

    RETURN (user_role = 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create NON-RECURSIVE RLS policies using the function

-- Policy 1: Everyone can view profiles (needed for public user discovery)
CREATE POLICY "public_profiles_viewable" ON profiles
FOR SELECT USING (true);

-- Policy 2: Users can insert their own profile during registration
CREATE POLICY "users_insert_own_profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Users can delete their own profile
CREATE POLICY "users_delete_own_profile" ON profiles
FOR DELETE USING (auth.uid() = id);

-- Policy 5: Admins can do EVERYTHING - but using the safe function
CREATE POLICY "admins_full_access" ON profiles
FOR ALL USING (is_admin(auth.uid()));

-- Step 5: Fix posts table RLS policies to work with the new setup
DROP POLICY IF EXISTS "Admins can manage all posts" ON posts;

-- Create admin policy for posts using the safe function
CREATE POLICY "admins_manage_all_posts" ON posts
FOR ALL USING (is_admin(auth.uid()));

-- Step 6: Fix applications table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'applications'
    ) THEN
        DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;

        CREATE POLICY "admins_manage_all_applications" ON applications
        FOR ALL USING (is_admin(auth.uid()));
    END IF;
END $$;

-- Step 7: Fix banners table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'banners'
    ) THEN
        DROP POLICY IF EXISTS "Admins can manage all banners" ON banners;

        CREATE POLICY "admins_manage_all_banners" ON banners
        FOR ALL USING (is_admin(auth.uid()));
    END IF;
END $$;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;

-- Step 9: Create helpful debug function
CREATE OR REPLACE FUNCTION debug_user_access()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    is_admin_result BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        auth.uid() as user_id,
        p.email,
        p.role,
        is_admin(auth.uid()) as is_admin_result
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_user_access() TO authenticated;

-- Step 10: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Infinite recursion RLS policies fixed successfully';
    RAISE NOTICE '✅ Created safe is_admin() function to prevent recursion';
    RAISE NOTICE '✅ All tables now have non-recursive admin policies';
    RAISE NOTICE '🔧 Use SELECT * FROM debug_user_access(); to test admin access';
END $$;