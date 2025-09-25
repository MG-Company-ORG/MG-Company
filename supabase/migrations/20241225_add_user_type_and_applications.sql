-- Migration: Add user_type to profiles and create applications table
-- Date: 2024-12-25

-- 1. Add user_type column to profiles table
ALTER TABLE profiles
ADD COLUMN user_type TEXT DEFAULT 'jobseeker' CHECK (user_type IN ('employer', 'jobseeker'));

-- 2. Create applications table
CREATE TABLE applications (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  message TEXT,
  contact_info JSONB DEFAULT '{}',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, applicant_id)
);

-- 3. Extend posts table
ALTER TABLE posts
ADD COLUMN application_deadline DATE,
ADD COLUMN max_applicants INTEGER,
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft'));

-- 4. Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for applications table

-- Applicants can view their own applications
CREATE POLICY "Users can view their own applications" ON applications
FOR SELECT USING (auth.uid() = applicant_id);

-- Applicants can create their own applications
CREATE POLICY "Users can create their own applications" ON applications
FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- Applicants can update their own applications (withdraw, update message)
CREATE POLICY "Users can update their own applications" ON applications
FOR UPDATE USING (auth.uid() = applicant_id);

-- Employers can view applications for their posts
CREATE POLICY "Employers can view applications for their posts" ON applications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = applications.post_id
    AND posts.user_id = auth.uid()
  )
);

-- Employers can update application status for their posts
CREATE POLICY "Employers can update application status" ON applications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = applications.post_id
    AND posts.user_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "Admins can manage all applications" ON applications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 6. Update RLS policies for posts table to respect user_type

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Everyone can view active posts
CREATE POLICY "Everyone can view active posts" ON posts
FOR SELECT USING (status = 'active');

-- Only employers can create posts
CREATE POLICY "Employers can create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'employer'
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
  )
);

-- Admins can manage all posts
CREATE POLICY "Admins can manage all posts" ON posts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 7. Create function to update application updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for applications updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_updated_at();

-- 9. Create indexes for better performance
CREATE INDEX idx_applications_post_id ON applications(post_id);
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_application_deadline ON posts(application_deadline);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);