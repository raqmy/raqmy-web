/*
  # جدول مفاتيح بوابة الدفع Paymob

  جدول بسيط لتخزين مفاتيح Paymob API بشكل آمن
*/

CREATE TABLE IF NOT EXISTS payment_provider_keys (
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

CREATE POLICY "Only admins can manage payment keys"
  ON payment_provider_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );
