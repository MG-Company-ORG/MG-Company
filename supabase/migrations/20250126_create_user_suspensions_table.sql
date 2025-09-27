-- Migration: Create user_suspensions table and related functionality
-- Date: 2025-01-26
-- Description: Add user suspension functionality for admin management

-- 1. Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  suspended_until TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add suspension-related columns to profiles table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_suspended'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
    END IF;
END $$;

-- 3. Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_application', 'application_status_change', 'system', 'admin')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Enable RLS on new tables
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_admin_id ON user_suspensions(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 6. RLS Policies for user_suspensions table

-- Users can view their own suspensions
CREATE POLICY "Users can view their own suspensions" ON user_suspensions
FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all suspensions
CREATE POLICY "Admins can view all suspensions" ON user_suspensions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can create suspensions
CREATE POLICY "Admins can create suspensions" ON user_suspensions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can update suspensions
CREATE POLICY "Admins can update suspensions" ON user_suspensions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 7. RLS Policies for notifications table

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications (for application/admin actions)
CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 8. Create function to automatically deactivate expired suspensions
CREATE OR REPLACE FUNCTION check_suspension_expiry()
RETURNS VOID AS $$
BEGIN
  -- Deactivate expired temporary suspensions
  UPDATE user_suspensions 
  SET is_active = FALSE
  WHERE is_active = TRUE 
    AND is_permanent = FALSE 
    AND suspended_until IS NOT NULL 
    AND suspended_until < now();
    
  -- Update profile suspension status for expired suspensions
  UPDATE profiles 
  SET is_suspended = FALSE, suspension_reason = NULL
  WHERE is_suspended = TRUE 
    AND id IN (
      SELECT user_id FROM user_suspensions 
      WHERE is_active = FALSE 
        AND is_permanent = FALSE 
        AND suspended_until IS NOT NULL 
        AND suspended_until < now()
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Create a trigger to automatically check suspension expiry on user_suspensions updates
CREATE OR REPLACE FUNCTION trigger_check_suspension_expiry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_suspension_expiry();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_check_suspension_expiry
  AFTER UPDATE ON user_suspensions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_suspension_expiry();
