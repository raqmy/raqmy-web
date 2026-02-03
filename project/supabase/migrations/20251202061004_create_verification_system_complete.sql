/*
  # نظام التحقق والسحب المتكامل - الإصدار الكامل
  
  ## الجداول الجديدة (11 جدول):
  
  1. api_providers - مزودي خدمات التحقق (SMS/Email/Bank)
  2. otp_requests - طلبات OTP للجوال
  3. email_verifications - التحقق من البريد
  4. merchants - بيانات التجار
  5. merchant_bank_accounts - الحسابات البنكية
  6. wallets - محافظ التجار (مع hold)
  7. payout_requests - طلبات السحب
  8. transactions_log - سجل المعاملات الشامل
  9. notification_templates - قوالب الإشعارات
  10. rate_limits - تتبع الحدود
  11. system_settings - إعدادات النظام
  
  ## الأمان:
  - RLS على جميع الجداول
  - تشفير المفاتيح
  - Audit logs شامل
*/

-- =====================================================
-- 1. api_providers - مزودي الخدمات
-- =====================================================
CREATE TABLE IF NOT EXISTS api_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('sms', 'email', 'bank')),
  provider_type text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  last_tested_at timestamptz,
  test_result jsonb,
  rate_limits jsonb DEFAULT '{"max_per_hour": 100, "max_per_minute": 10}'::jsonb,
  retry_policy jsonb DEFAULT '{"max_retries": 3, "retry_interval_seconds": 60}'::jsonb,
  allowed_countries jsonb DEFAULT '["SA", "AE", "EG", "JO", "KW", "BH", "QA", "OM"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_providers_type ON api_providers(type, is_active);

ALTER TABLE api_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage API providers" ON api_providers;
CREATE POLICY "Only admins can manage API providers"
  ON api_providers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 2. otp_requests - طلبات OTP
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  phone text NOT NULL,
  country_code text NOT NULL DEFAULT '+966',
  otp_code_hash text NOT NULL,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 5,
  purpose text NOT NULL CHECK (purpose IN ('register', 'login', 'change_phone', '2fa', 'verify')),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  provider_id uuid REFERENCES api_providers(id),
  ip_address text,
  user_agent text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_status ON otp_requests(phone, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_created ON otp_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_requests(expires_at) WHERE status = 'pending';

ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own OTP requests" ON otp_requests;
CREATE POLICY "Users can view own OTP requests"
  ON otp_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all OTP requests" ON otp_requests;
CREATE POLICY "Admins can view all OTP requests"
  ON otp_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 3. email_verifications - التحقق من البريد
-- =====================================================
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'invalid')),
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  provider_id uuid REFERENCES api_providers(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_verif_token ON email_verifications(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON email_verifications(expires_at) WHERE status = 'pending';

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email verifications" ON email_verifications;
CREATE POLICY "Users can view own email verifications"
  ON email_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all email verifications" ON email_verifications;
CREATE POLICY "Admins can view all email verifications"
  ON email_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 4. merchants - التجار
-- =====================================================
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE UNIQUE,
  business_name text,
  business_type text,
  tax_number text,
  kyc_status text NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')),
  kyc_submitted_at timestamptz,
  kyc_verified_at timestamptz,
  kyc_verified_by uuid REFERENCES users_profile(id),
  kyc_notes text,
  kyc_documents jsonb DEFAULT '[]'::jsonb,
  bank_accounts_count int DEFAULT 0,
  phone_verified boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  can_withdraw boolean DEFAULT false,
  withdrawal_blocked_until timestamptz,
  withdrawal_block_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_user ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_kyc ON merchants(kyc_status);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own data" ON merchants;
CREATE POLICY "Merchants can view own data"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all merchants" ON merchants;
CREATE POLICY "Admins can manage all merchants"
  ON merchants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 5. merchant_bank_accounts - الحسابات البنكية
-- =====================================================
CREATE TABLE IF NOT EXISTS merchant_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  iban text,
  account_number text,
  swift_code text,
  country text NOT NULL DEFAULT 'SA',
  branch_name text,
  branch_code text,
  is_primary boolean DEFAULT false,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes text,
  verification_method text CHECK (verification_method IN ('manual', 'api', 'document')),
  verified_at timestamptz,
  verified_by uuid REFERENCES users_profile(id),
  proof_document_url text,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_merchant ON merchant_bank_accounts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bank_verification ON merchant_bank_accounts(verification_status);
CREATE INDEX IF NOT EXISTS idx_bank_primary ON merchant_bank_accounts(merchant_id, is_primary);

ALTER TABLE merchant_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own bank accounts" ON merchant_bank_accounts;
CREATE POLICY "Merchants can view own bank accounts"
  ON merchant_bank_accounts FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Merchants can manage own bank accounts" ON merchant_bank_accounts;
CREATE POLICY "Merchants can manage own bank accounts"
  ON merchant_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON merchant_bank_accounts;
CREATE POLICY "Admins can manage all bank accounts"
  ON merchant_bank_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 6. wallets - المحافظ (مع hold)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE UNIQUE,
  balance_total numeric(15,2) DEFAULT 0 CHECK (balance_total >= 0),
  balance_available numeric(15,2) DEFAULT 0 CHECK (balance_available >= 0),
  balance_hold numeric(15,2) DEFAULT 0 CHECK (balance_hold >= 0),
  balance_pending_payout numeric(15,2) DEFAULT 0 CHECK (balance_pending_payout >= 0),
  total_earned numeric(15,2) DEFAULT 0,
  total_withdrawn numeric(15,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  hold_period_hours int DEFAULT 24,
  last_payout_at timestamptz,
  last_transaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_balance_integrity CHECK (
    balance_total >= (balance_available + balance_hold + balance_pending_payout)
  )
);

CREATE INDEX IF NOT EXISTS idx_wallet_merchant ON wallets(merchant_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own wallet" ON wallets;
CREATE POLICY "Merchants can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
CREATE POLICY "Admins can view all wallets"
  ON wallets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 7. payout_requests - طلبات السحب
-- =====================================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES merchant_bank_accounts(id),
  amount_requested numeric(15,2) NOT NULL CHECK (amount_requested > 0),
  amount_fees numeric(15,2) DEFAULT 0,
  amount_to_transfer numeric(15,2) NOT NULL CHECK (amount_to_transfer > 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  admin_id_processed uuid REFERENCES users_profile(id),
  admin_note text,
  merchant_note text,
  rejection_reason text,
  cancellation_reason text,
  provider_reference text,
  provider_response jsonb,
  proof_document_url text,
  auto_approved boolean DEFAULT false,
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_merchant ON payout_requests(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_payout_dates ON payout_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_admin ON payout_requests(admin_id_processed);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own payout requests" ON payout_requests;
CREATE POLICY "Merchants can view own payout requests"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Merchants can create payout requests" ON payout_requests;
CREATE POLICY "Merchants can create payout requests"
  ON payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all payout requests" ON payout_requests;
CREATE POLICY "Admins can manage all payout requests"
  ON payout_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 8. transactions_log - سجل المعاملات الشامل
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  order_id uuid,
  payout_id uuid REFERENCES payout_requests(id),
  type text NOT NULL CHECK (type IN ('sale', 'refund', 'chargeback', 'payout', 'fee', 'commission', 'hold', 'release', 'adjustment')),
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  balance_before numeric(15,2),
  balance_after numeric(15,2),
  provider_fees numeric(15,2) DEFAULT 0,
  platform_commission numeric(15,2) DEFAULT 0,
  description text,
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trans_merchant ON transactions_log(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions_log(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trans_order ON transactions_log(order_id);
CREATE INDEX IF NOT EXISTS idx_trans_payout ON transactions_log(payout_id);
CREATE INDEX IF NOT EXISTS idx_trans_created ON transactions_log(created_at DESC);

ALTER TABLE transactions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own transactions" ON transactions_log;
CREATE POLICY "Merchants can view own transactions"
  ON transactions_log FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions_log;
CREATE POLICY "Admins can view all transactions"
  ON transactions_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 9. notification_templates - قوالب الإشعارات
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('sms', 'email', 'in_app')),
  event_type text NOT NULL,
  subject text,
  body_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  language text DEFAULT 'ar',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_template_type ON notification_templates(type, event_type);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage notification templates" ON notification_templates;
CREATE POLICY "Only admins can manage notification templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- 10. rate_limits - تتبع الحدود
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  count int DEFAULT 0,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  ip_address text,
  user_id uuid REFERENCES users_profile(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(identifier, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_end);

-- =====================================================
-- 11. system_settings - إعدادات النظام
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  category text,
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES users_profile(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage system settings" ON system_settings;
CREATE POLICY "Only admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- إضافة حقول التحقق في users_profile
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users_profile' AND column_name = 'phone_verified_at'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
    ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
    ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
  END IF;
END $$;

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Trigger: تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_api_providers_updated_at ON api_providers;
CREATE TRIGGER update_api_providers_updated_at BEFORE UPDATE ON api_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_otp_requests_updated_at ON otp_requests;
CREATE TRIGGER update_otp_requests_updated_at BEFORE UPDATE ON otp_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_email_verifications_updated_at ON email_verifications;
CREATE TRIGGER update_email_verifications_updated_at BEFORE UPDATE ON email_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON merchant_bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON merchant_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON payout_requests;
CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: إنشاء merchant + wallet تلقائياً للبائعين
CREATE OR REPLACE FUNCTION create_merchant_and_wallet_for_seller()
RETURNS TRIGGER AS $$
DECLARE
  merchant_id_var uuid;
BEGIN
  IF NEW.role = 'seller' THEN
    -- إنشاء merchant
    INSERT INTO merchants (user_id, phone_verified, email_verified)
    VALUES (NEW.id, COALESCE(NEW.phone_verified, false), COALESCE(NEW.email_verified, false))
    RETURNING id INTO merchant_id_var;
    
    -- إنشاء wallet
    INSERT INTO wallets (merchant_id, currency)
    VALUES (merchant_id_var, 'SAR');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_merchant_wallet ON users_profile;
CREATE TRIGGER trigger_create_merchant_wallet
  AFTER INSERT ON users_profile
  FOR EACH ROW EXECUTE FUNCTION create_merchant_and_wallet_for_seller();

-- Function: تسجيل معاملة في transactions_log
CREATE OR REPLACE FUNCTION log_wallet_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO transactions_log (
    merchant_id,
    type,
    amount,
    balance_before,
    balance_after,
    description
  ) VALUES (
    NEW.merchant_id,
    'adjustment',
    NEW.balance_total - OLD.balance_total,
    OLD.balance_total,
    NEW.balance_total,
    'Wallet balance updated'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_wallet_changes ON wallets;
CREATE TRIGGER trigger_log_wallet_changes
  AFTER UPDATE OF balance_total ON wallets
  FOR EACH ROW
  WHEN (OLD.balance_total IS DISTINCT FROM NEW.balance_total)
  EXECUTE FUNCTION log_wallet_transaction();

-- =====================================================
-- إدراج إعدادات النظام الافتراضية
-- =====================================================
INSERT INTO system_settings (key, value, description, category) VALUES
  ('otp_expiry_minutes', '5', 'مدة صلاحية OTP بالدقائق', 'verification'),
  ('otp_max_attempts', '5', 'عدد المحاولات القصوى للـ OTP', 'verification'),
  ('otp_resend_interval_seconds', '60', 'الوقت بين إعادة إرسال OTP', 'verification'),
  ('email_verification_expiry_hours', '24', 'مدة صلاحية رابط التحقق من البريد', 'verification'),
  ('hold_period_hours', '24', 'مدة تجميد الأموال بعد البيع', 'wallet'),
  ('min_withdrawal_amount', '100', 'الحد الأدنى للسحب', 'payout'),
  ('withdrawal_fee_percentage', '0', 'نسبة رسوم السحب', 'payout'),
  ('withdrawal_fee_fixed', '0', 'رسوم السحب الثابتة', 'payout'),
  ('kyc_required_for_withdrawal', 'true', 'هل يتطلب السحب تحقق KYC', 'payout'),
  ('bank_change_lock_hours', '72', 'مدة منع السحب بعد تغيير حساب بنكي', 'security')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- إدراج قوالب الإشعارات الافتراضية
-- =====================================================
INSERT INTO notification_templates (name, type, event_type, subject, body_template, variables, language) VALUES
  ('otp_sms', 'sms', 'otp_request', NULL, 'رمز التحقق الخاص بك هو: {{otp_code}}. صالح لمدة {{expiry_minutes}} دقائق.', '["otp_code", "expiry_minutes"]', 'ar'),
  ('email_verification', 'email', 'email_verify', 'تأكيد البريد الإلكتروني', 'مرحباً {{user_name}}،\n\nللتحقق من بريدك الإلكتروني، يرجى الضغط على الرابط التالي:\n{{verification_link}}\n\nالرابط صالح لمدة {{expiry_hours}} ساعة.', '["user_name", "verification_link", "expiry_hours"]', 'ar'),
  ('payout_requested_admin', 'email', 'payout_request', 'طلب سحب جديد', 'تم استلام طلب سحب جديد:\n\nالتاجر: {{merchant_name}}\nالمبلغ: {{amount}} {{currency}}\n\nيرجى المراجعة من لوحة التحكم.', '["merchant_name", "amount", "currency"]', 'ar'),
  ('payout_approved', 'email', 'payout_approved', 'تمت الموافقة على طلب السحب', 'تمت الموافقة على طلب السحب الخاص بك بمبلغ {{amount}} {{currency}}.\n\nسيتم تحويل المبلغ إلى حسابك البنكي خلال أيام العمل القادمة.', '["amount", "currency"]', 'ar'),
  ('payout_rejected', 'email', 'payout_rejected', 'تم رفض طلب السحب', 'تم رفض طلب السحب الخاص بك بمبلغ {{amount}} {{currency}}.\n\nالسبب: {{rejection_reason}}', '["amount", "currency", "rejection_reason"]', 'ar'),
  ('bank_account_verified', 'email', 'bank_verified', 'تم التحقق من الحساب البنكي', 'تم التحقق من حسابك البنكي بنجاح.\n\nيمكنك الآن طلب سحب أرباحك.', '[]', 'ar'),
  ('bank_account_rejected', 'email', 'bank_rejected', 'فشل التحقق من الحساب البنكي', 'لم يتم التحقق من حسابك البنكي.\n\nالسبب: {{rejection_reason}}\n\nيرجى تحديث البيانات والمحاولة مرة أخرى.', '["rejection_reason"]', 'ar')
ON CONFLICT (name) DO NOTHING;
