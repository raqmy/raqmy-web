/*
  # إضافة الجداول المفقودة لنظام تسجيل التجار

  ## الجداول الجديدة
  - merchant_phones
  - audit_logs
  - country_codes
*/

-- ==========================================
-- جدول أرقام الهواتف
-- ==========================================

CREATE TABLE IF NOT EXISTS merchant_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  phone text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  otp_attempts integer DEFAULT 0,
  last_otp_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(country_code, phone)
);

ALTER TABLE merchant_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phones"
  ON merchant_phones FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own phones"
  ON merchant_phones FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_merchant_phones_merchant_id ON merchant_phones(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_phones_phone ON merchant_phones(country_code, phone);

-- ==========================================
-- جدول سجلات التدقيق
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================
-- جدول مفاتيح الدول
-- ==========================================

CREATE TABLE IF NOT EXISTS country_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name_ar text NOT NULL,
  country_name_en text NOT NULL,
  country_code text NOT NULL UNIQUE,
  iso_code text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE country_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active country codes"
  ON country_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- إدراج بيانات مفاتيح الدول
INSERT INTO country_codes (country_name_ar, country_name_en, country_code, iso_code, sort_order)
VALUES
  ('السعودية', 'Saudi Arabia', '+966', 'SA', 1),
  ('الإمارات', 'United Arab Emirates', '+971', 'AE', 2),
  ('مصر', 'Egypt', '+20', 'EG', 3),
  ('الكويت', 'Kuwait', '+965', 'KW', 4),
  ('قطر', 'Qatar', '+974', 'QA', 5),
  ('البحرين', 'Bahrain', '+973', 'BH', 6),
  ('عمان', 'Oman', '+968', 'OM', 7),
  ('الأردن', 'Jordan', '+962', 'JO', 8),
  ('لبنان', 'Lebanon', '+961', 'LB', 9),
  ('المغرب', 'Morocco', '+212', 'MA', 10),
  ('الجزائر', 'Algeria', '+213', 'DZ', 11),
  ('تونس', 'Tunisia', '+216', 'TN', 12),
  ('العراق', 'Iraq', '+964', 'IQ', 13),
  ('فلسطين', 'Palestine', '+970', 'PS', 14),
  ('السودان', 'Sudan', '+249', 'SD', 15)
ON CONFLICT (country_code) DO NOTHING;