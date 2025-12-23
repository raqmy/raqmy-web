/*
  # نظام الدفع الكامل - المرحلة 1: الجداول الأساسية

  إنشاء جميع الجداول المطلوبة لنظام دفع متكامل مع Paymob
*/

-- ====================================
-- 1. جدول مزودي الدفع
-- ====================================

CREATE TABLE payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('paymob', 'stripe', 'paypal', 'manual')),
  display_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment providers"
  ON payment_providers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Anyone can view active providers"
  ON payment_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ====================================
-- 2. جدول المدفوعات المحسّن
-- ====================================

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  amount_total numeric(10, 2) NOT NULL CHECK (amount_total > 0),
  currency text NOT NULL DEFAULT 'SAR',
  platform_fee numeric(10, 2) NOT NULL DEFAULT 0,
  gateway_fee numeric(10, 2) NOT NULL DEFAULT 0,
  seller_amount numeric(10, 2) NOT NULL CHECK (seller_amount >= 0),
  commission_rate_used numeric(5, 2) DEFAULT 0,
  provider text NOT NULL DEFAULT 'paymob',
  provider_reference text,
  provider_transaction_id text,
  provider_payment_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
  ),
  payment_method text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_seller ON payments(seller_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX idx_payments_provider ON payments(provider, created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 3. محافظ التجار
-- ====================================

CREATE TABLE merchant_wallets (
  merchant_id uuid PRIMARY KEY REFERENCES users_profile(id) ON DELETE CASCADE,
  balance numeric(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  pending_balance numeric(10, 2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_withdrawn numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  last_payout_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own wallet"
  ON merchant_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all wallets"
  ON merchant_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 4. معاملات المحفظة
-- ====================================

CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  balance_before numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('payment', 'withdrawal', 'refund', 'adjustment', 'commission')),
  reference_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_merchant ON wallet_transactions(merchant_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type, created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 5. تفاصيل البنوك للتجار
-- ====================================

CREATE TABLE merchant_bank_details (
  merchant_id uuid PRIMARY KEY REFERENCES users_profile(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  iban text NOT NULL,
  swift_code text,
  branch_name text,
  account_number text,
  id_document_url text,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES users_profile(id),
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE merchant_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage own bank details"
  ON merchant_bank_details FOR ALL
  TO authenticated
  USING (auth.uid() = merchant_id)
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Admins can manage all bank details"
  ON merchant_bank_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 6. طلبات السحب
-- ====================================

CREATE TABLE withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  fee numeric(10, 2) NOT NULL DEFAULT 0,
  net_amount numeric(10, 2) NOT NULL CHECK (net_amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')
  ),
  bank_reference text,
  notes text,
  admin_notes text,
  requested_at timestamptz DEFAULT now(),
  processed_by uuid REFERENCES users_profile(id),
  processed_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_withdrawal_requests_merchant ON withdrawal_requests(merchant_id, requested_at DESC);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status, requested_at DESC);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can cancel own pending requests"
  ON withdrawal_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = merchant_id AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 7. سجل Webhooks
-- ====================================

CREATE TABLE webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  parsed_data jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  processed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider, created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status, created_at DESC);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type, created_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.id = auth.uid()
      AND users_profile.role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 8. بيانات افتراضية
-- ====================================

-- إضافة Paymob كمزود افتراضي
INSERT INTO payment_providers (name, display_name, is_active, mode)
VALUES ('paymob', 'Paymob', false, 'test')
ON CONFLICT (name) DO NOTHING;

-- إنشاء محافظ للتجار الموجودين
INSERT INTO merchant_wallets (merchant_id)
SELECT id
FROM users_profile
WHERE role IN ('seller', 'admin')
ON CONFLICT (merchant_id) DO NOTHING;
