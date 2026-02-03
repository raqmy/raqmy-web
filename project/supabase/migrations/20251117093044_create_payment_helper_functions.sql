/*
  # دوال مساعدة لنظام الدفع

  دوال لتسهيل العمليات الشائعة
*/

-- ====================================
-- 1. دالة إنشاء محفظة تلقائياً
-- ====================================

CREATE OR REPLACE FUNCTION create_merchant_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('seller', 'admin', 'superadmin') THEN
    INSERT INTO merchant_wallets (
      merchant_id, 
      balance, 
      pending_balance, 
      total_earned, 
      total_withdrawn, 
      currency
    )
    VALUES (NEW.id, 0, 0, 0, 0, 'SAR')
    ON CONFLICT (merchant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لإنشاء المحفظة عند إنشاء مستخدم أو تحديث دوره
CREATE TRIGGER trigger_create_merchant_wallet
  AFTER INSERT OR UPDATE OF role ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_wallet();

-- ====================================
-- 2. دالة تحديث رصيد المحفظة
-- ====================================

CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_merchant_id uuid,
  p_type text,
  p_amount numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_wallet merchant_wallets;
  v_transaction_id uuid;
  v_new_balance numeric;
BEGIN
  -- قفل المحفظة للتحديث
  SELECT * INTO v_wallet 
  FROM merchant_wallets 
  WHERE merchant_id = p_merchant_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for merchant %', p_merchant_id;
  END IF;
  
  -- حساب الرصيد الجديد
  IF p_type = 'credit' THEN
    v_new_balance := v_wallet.balance + p_amount;
  ELSIF p_type = 'debit' THEN
    IF v_wallet.balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', 
        v_wallet.balance, p_amount;
    END IF;
    v_new_balance := v_wallet.balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;
  
  -- إنشاء سجل المعاملة
  INSERT INTO wallet_transactions (
    merchant_id, 
    type, 
    amount, 
    balance_before, 
    balance_after,
    reference_type, 
    reference_id, 
    description,
    metadata
  ) VALUES (
    p_merchant_id, 
    p_type, 
    p_amount, 
    v_wallet.balance, 
    v_new_balance,
    p_reference_type, 
    p_reference_id, 
    p_description,
    p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  -- تحديث المحفظة
  UPDATE merchant_wallets
  SET 
    balance = v_new_balance,
    total_earned = CASE 
      WHEN p_type = 'credit' AND p_reference_type = 'payment' 
      THEN total_earned + p_amount 
      ELSE total_earned 
    END,
    total_withdrawn = CASE 
      WHEN p_type = 'debit' AND p_reference_type = 'withdrawal' 
      THEN total_withdrawn + p_amount 
      ELSE total_withdrawn 
    END,
    updated_at = now()
  WHERE merchant_id = p_merchant_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 3. دالة معالجة الدفع الناجح
-- ====================================

CREATE OR REPLACE FUNCTION process_successful_payment(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_completed_at timestamptz DEFAULT now()
)
RETURNS boolean AS $$
DECLARE
  v_payment payments;
  v_transaction_id uuid;
BEGIN
  -- الحصول على تفاصيل الدفع
  SELECT * INTO v_payment 
  FROM payments 
  WHERE id = p_payment_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;
  
  IF v_payment.status = 'completed' THEN
    RETURN true; -- الدفع مكتمل مسبقاً
  END IF;
  
  -- تحديث حالة الدفع
  UPDATE payments
  SET 
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    completed_at = p_completed_at,
    updated_at = now()
  WHERE id = p_payment_id;
  
  -- إضافة المبلغ لمحفظة البائع
  SELECT update_wallet_balance(
    v_payment.seller_id,
    'credit',
    v_payment.seller_amount,
    'payment',
    p_payment_id,
    'Payment received for order',
    jsonb_build_object(
      'order_id', v_payment.order_id,
      'amount_total', v_payment.amount_total,
      'platform_fee', v_payment.platform_fee
    )
  ) INTO v_transaction_id;
  
  -- تحديث حالة الطلب
  UPDATE orders
  SET 
    status = 'paid',
    payment_reference = p_provider_transaction_id,
    updated_at = now()
  WHERE id = v_payment.order_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 4. دالة حساب رسوم السحب
-- ====================================

CREATE OR REPLACE FUNCTION calculate_withdrawal_fee(
  p_amount numeric
)
RETURNS numeric AS $$
DECLARE
  v_settings payment_settings;
  v_fee numeric;
BEGIN
  SELECT * INTO v_settings FROM payment_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- حساب الرسوم: نسبة مئوية + رسوم ثابتة
  v_fee := (p_amount * COALESCE(v_settings.withdrawal_fee_percentage, 0) / 100) 
           + COALESCE(v_settings.withdrawal_fixed_fee, 0);
  
  RETURN ROUND(v_fee, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 5. دالة التحقق من إمكانية السحب
-- ====================================

CREATE OR REPLACE FUNCTION can_request_withdrawal(
  p_merchant_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_wallet merchant_wallets;
  v_bank merchant_bank_details;
  v_settings payment_settings;
  v_fee numeric;
  v_result jsonb;
BEGIN
  -- التحقق من وجود المحفظة
  SELECT * INTO v_wallet FROM merchant_wallets WHERE merchant_id = p_merchant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'wallet_not_found'
    );
  END IF;
  
  -- التحقق من التفاصيل البنكية
  SELECT * INTO v_bank FROM merchant_bank_details WHERE merchant_id = p_merchant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'bank_details_not_set'
    );
  END IF;
  
  IF NOT v_bank.is_verified THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'bank_details_not_verified'
    );
  END IF;
  
  -- التحقق من الإعدادات
  SELECT * INTO v_settings FROM payment_settings LIMIT 1;
  IF FOUND AND p_amount < v_settings.minimum_withdrawal_amount THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'amount_below_minimum',
      'minimum_amount', v_settings.minimum_withdrawal_amount
    );
  END IF;
  
  -- حساب الرسوم
  v_fee := calculate_withdrawal_fee(p_amount);
  
  -- التحقق من الرصيد
  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'insufficient_balance',
      'available_balance', v_wallet.balance,
      'requested_amount', p_amount
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_withdraw', true,
    'fee', v_fee,
    'net_amount', p_amount - v_fee,
    'available_balance', v_wallet.balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
