/*
  # Fix Merchant Payout Accounts RLS Policies

  ## Problem
  The RLS policies on merchant_payout_accounts table incorrectly use:
  - merchant_id = auth.uid()
  
  But merchant_id is from the merchants table, not directly from auth.users.
  This causes permission errors when merchants try to save their bank details.

  ## Solution
  Update all policies to correctly check:
  - merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())

  ## Changes
  - Drop and recreate all RLS policies on merchant_payout_accounts table
  - Use correct merchant_id lookup from merchants table
*/

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Users can create own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Users can update own payout accounts" ON merchant_payout_accounts;
DROP POLICY IF EXISTS "Users can delete own payout accounts" ON merchant_payout_accounts;

-- Create correct SELECT policy
CREATE POLICY "Merchants can view own payout accounts"
  ON merchant_payout_accounts
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Create correct INSERT policy
CREATE POLICY "Merchants can create own payout accounts"
  ON merchant_payout_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Create correct UPDATE policy
CREATE POLICY "Merchants can update own payout accounts"
  ON merchant_payout_accounts
  FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Create correct DELETE policy
CREATE POLICY "Merchants can delete own payout accounts"
  ON merchant_payout_accounts
  FOR DELETE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );