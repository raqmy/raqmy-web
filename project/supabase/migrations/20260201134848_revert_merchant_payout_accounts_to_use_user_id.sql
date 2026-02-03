/*
  # Revert Merchant Payout Accounts to Use User ID Directly

  ## Problem
  The merchant_payout_accounts table has a foreign key pointing to users_profile.id,
  but the RLS policies were changed to look up merchants.id, causing a mismatch.

  ## Solution
  Revert RLS policies to use merchant_id = auth.uid() directly, since merchant_id
  in this table actually refers to the user_id (users_profile.id).

  ## Changes
  - Drop current policies
  - Recreate original policies using merchant_id = auth.uid()
*/

-- Drop current policies
DROP POLICY IF EXISTS "Merchants can view own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Merchants can create own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Merchants can update own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Merchants can delete own payout accounts" ON merchant_payout_accounts;

-- Recreate original policies using merchant_id = auth.uid()
-- Since merchant_id actually references users_profile.id

-- SELECT policy
CREATE POLICY "Users can view own payout accounts"
  ON merchant_payout_accounts
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- INSERT policy
CREATE POLICY "Users can create own payout accounts"
  ON merchant_payout_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

-- UPDATE policy
CREATE POLICY "Users can update own payout accounts"
  ON merchant_payout_accounts
  FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- DELETE policy
CREATE POLICY "Users can delete own payout accounts"
  ON merchant_payout_accounts
  FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid());