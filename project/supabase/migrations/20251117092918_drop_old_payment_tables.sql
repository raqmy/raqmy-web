/*
  # حذف الجداول القديمة للدفع

  حذف آمن للجداول القديمة قبل إعادة البناء
*/

-- حذف الجداول القديمة بترتيب آمن
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS merchant_wallets CASCADE;
DROP TABLE IF EXISTS merchant_bank_details CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_providers CASCADE;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS create_merchant_wallet() CASCADE;
DROP FUNCTION IF EXISTS update_wallet_balance(uuid, text, numeric, text, uuid, text) CASCADE;
