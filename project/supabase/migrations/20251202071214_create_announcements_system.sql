/*
  # Create Announcements System

  1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `title` (text) - عنوان الرسالة
      - `content` (text) - محتوى الرسالة
      - `target_audience` (text) - الجمهور المستهدف (all, merchants, customers)
      - `start_date` (timestamptz) - تاريخ بدء الظهور
      - `end_date` (timestamptz) - تاريخ انتهاء الظهور
      - `status` (text) - الحالة (active, deleted)
      - `created_by` (uuid) - المدير الذي أنشأ الرسالة
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `announcement_dismissed_by_users`
      - `id` (uuid, primary key)
      - `announcement_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `dismissed_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Admins can manage announcements
    - Users can view active announcements and dismiss them
    - Users can only see their own dismissals
  
  3. Indexes
    - Index on target_audience for filtering
    - Index on status for active announcements
    - Composite index on (announcement_id, user_id) for dismissals
*/

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'merchants', 'customers')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dismissed announcements table
CREATE TABLE IF NOT EXISTS announcement_dismissed_by_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON announcements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_dismissed_announcement_user ON announcement_dismissed_by_users(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_user ON announcement_dismissed_by_users(user_id);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissed_by_users ENABLE ROW LEVEL SECURITY;

-- Announcements policies
DROP POLICY IF EXISTS "Admins can view all announcements" ON announcements;
CREATE POLICY "Admins can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can view active announcements" ON announcements;
CREATE POLICY "Users can view active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
  );

DROP POLICY IF EXISTS "Public can view active announcements" ON announcements;
CREATE POLICY "Public can view active announcements"
  ON announcements FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
  );

DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- Dismissed announcements policies
DROP POLICY IF EXISTS "Users can view their own dismissals" ON announcement_dismissed_by_users;
CREATE POLICY "Users can view their own dismissals"
  ON announcement_dismissed_by_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can dismiss announcements" ON announcement_dismissed_by_users;
CREATE POLICY "Users can dismiss announcements"
  ON announcement_dismissed_by_users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all dismissals" ON announcement_dismissed_by_users;
CREATE POLICY "Admins can view all dismissals"
  ON announcement_dismissed_by_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at_trigger ON announcements;
CREATE TRIGGER update_announcements_updated_at_trigger
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();
