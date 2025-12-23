/*
  # إعادة إنشاء جدول مفاتيح الدفع Paymob

  1. حذف الجدول القديم
  2. إنشاء جدول جديد بسيط يحتوي على:
    - id (uuid)
    - provider (text) - دائماً 'paymob'
    - api_key (text)
    - integration_id (text)
    - hmac_secret (text)
    - is_active (boolean)
    - created_at, updated_at
  3. RLS policies للأدمن فقط
*/

DROP TABLE IF EXISTS payment_provider_keys CASCADE;

CREATE TABLE payment_provider_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'paymob',
  api_key text NOT NULL,
  integration_id text NOT NULL,
  hmac_secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_provider_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view payment keys"
  ON payment_provider_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Only admins can insert payment keys"
  ON payment_provider_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Only admins can update payment keys"
  ON payment_provider_keys FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Only admins can delete payment keys"
  ON payment_provider_keys FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );
