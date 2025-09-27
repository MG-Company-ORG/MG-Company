-- Migration: Fix profiles table structure
-- Date: 2025-01-25
-- Description: Add missing columns to profiles table

-- 1. Add created_at column to profiles table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- 2. Add user_type column to profiles table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN user_type TEXT DEFAULT 'jobseeker' CHECK (user_type IN ('employer', 'jobseeker'));
    END IF;
END $$;

-- 3. Update existing users with default user_type if null
UPDATE profiles SET user_type = 'jobseeker' WHERE user_type IS NULL;

-- 4. Create indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- 5. Update RLS policies for profiles table (if needed)
-- Allow users to read their own profile
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY IF NOT EXISTS "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update all profiles
CREATE POLICY IF NOT EXISTS "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
