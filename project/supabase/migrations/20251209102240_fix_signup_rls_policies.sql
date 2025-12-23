/*
  # Fix Signup RLS Policies for Merchants and Wallets
  
  ## Problem
  Users cannot create accounts with 'seller' role because:
  - The trigger `create_merchant_and_wallet_for_seller` runs with user privileges
  - No RLS policies exist to allow users to insert into `merchants` table
  - No RLS policies exist to allow inserting into `wallets` table
  
  ## Solution
  1. Update the trigger function to use SECURITY DEFINER (runs with owner privileges)
  2. Add INSERT policy for merchants table (for additional security layer)
  3. Add INSERT policy for wallets table (for additional security layer)
  
  ## Changes Made
  - Modified `create_merchant_and_wallet_for_seller` function to use SECURITY DEFINER
  - Added RLS policy: "Merchants can insert own data" for merchants table
  - Added RLS policy: "System can create wallets for merchants" for wallets table
  - Added RLS policy: "Merchants can update own wallet" for wallets table
*/

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS create_merchant_and_wallet_for_seller() CASCADE;

CREATE OR REPLACE FUNCTION create_merchant_and_wallet_for_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merchant_id_var uuid;
BEGIN
  IF NEW.role = 'seller' THEN
    -- Create merchant record
    INSERT INTO merchants (user_id, phone_verified, email_verified)
    VALUES (NEW.id, COALESCE(NEW.phone_verified, false), COALESCE(NEW.email_verified, false))
    RETURNING id INTO merchant_id_var;
    
    -- Create wallet for merchant
    INSERT INTO wallets (merchant_id, currency)
    VALUES (merchant_id_var, 'SAR');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_merchant_wallet ON users_profile;

CREATE TRIGGER trigger_create_merchant_wallet
  AFTER INSERT ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION create_merchant_and_wallet_for_seller();

-- Add RLS policy for merchants INSERT (defensive layer)
DROP POLICY IF EXISTS "Merchants can insert own data" ON merchants;

CREATE POLICY "Merchants can insert own data"
  ON merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add RLS policy for merchants UPDATE
DROP POLICY IF EXISTS "Merchants can update own data" ON merchants;

CREATE POLICY "Merchants can update own data"
  ON merchants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add RLS policies for wallets table
DROP POLICY IF EXISTS "System can create wallets for merchants" ON wallets;

CREATE POLICY "System can create wallets for merchants"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Merchants can update own wallet" ON wallets;

CREATE POLICY "Merchants can update own wallet"
  ON wallets
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
