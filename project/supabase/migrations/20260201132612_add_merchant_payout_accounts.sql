/*
  # Create Merchant Payout Accounts System

  ## Overview
  This migration creates a secure system for storing merchant bank account details
  used for payout processing. Designed for Saudi Arabia first with global expansion capability.

  ## 1. New Tables
  
  ### `merchant_payout_accounts`
  Stores bank account details for merchants to receive payouts.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier
  - `merchant_id` (uuid, not null) - References users_profile(id), cascade on delete
  - `country_code` (text, not null) - ISO country code, default 'SA'
  - `currency` (text, not null) - Currency code, default 'SAR'
  - `payout_method` (text, not null) - Payment method type, default 'bank_transfer'
  - `bank_name` (text, nullable) - Name of the bank
  - `iban` (text, not null) - International Bank Account Number (required)
  - `account_holder_name` (text, not null) - Name as shown on bank account
  - `account_holder_id` (text, nullable) - National ID/Iqama (optional for now)
  - `phone` (text, nullable) - Contact phone (optional, usually in profile)
  - `is_default` (boolean, not null) - Whether this is the default payout account
  - `created_at` (timestamptz, not null) - Record creation timestamp
  - `updated_at` (timestamptz, not null) - Last update timestamp
  
  **Constraints:**
  - Unique constraint on `merchant_id` - Each merchant has exactly one payout account (MVP)
  - IBAN is required and must be valid format
  - Account holder name is required

  ## 2. Security (RLS Policies)
  
  **Row Level Security is ENABLED**
  
  **Policies:**
  1. `SELECT` - Authenticated users can view only their own payout accounts
  2. `INSERT` - Authenticated users can insert only their own payout accounts
  3. `UPDATE` - Authenticated users can update only their own payout accounts
  4. `DELETE` - Authenticated users can delete only their own payout accounts
  
  ## 3. Important Notes
  
  - **Data Privacy**: Bank details are sensitive. Only the merchant owner can access their data.
  - **IBAN Format**: SA IBAN = "SA" + 22 digits (24 chars total). Validate on frontend.
  - **Single Account**: MVP allows one account per merchant. Can expand to multiple later.
  - **Audit Trail**: `updated_at` tracks changes for compliance.
  - **Service Role**: Edge functions with service role can read/write for payout processing.
*/

-- Create merchant_payout_accounts table
CREATE TABLE IF NOT EXISTS merchant_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  country_code text NOT NULL DEFAULT 'SA',
  currency text NOT NULL DEFAULT 'SAR',
  payout_method text NOT NULL DEFAULT 'bank_transfer',
  bank_name text,
  iban text NOT NULL,
  account_holder_name text NOT NULL,
  account_holder_id text,
  phone text,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint: one account per merchant (MVP)
ALTER TABLE merchant_payout_accounts 
ADD CONSTRAINT merchant_payout_accounts_merchant_id_key 
UNIQUE (merchant_id);

-- Add check constraint for country code (basic validation)
ALTER TABLE merchant_payout_accounts
ADD CONSTRAINT merchant_payout_accounts_country_code_check
CHECK (length(country_code) = 2);

-- Add check constraint for IBAN (not empty)
ALTER TABLE merchant_payout_accounts
ADD CONSTRAINT merchant_payout_accounts_iban_check
CHECK (length(trim(iban)) >= 15);

-- Enable Row Level Security
ALTER TABLE merchant_payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT only their own payout accounts
CREATE POLICY "Users can view own payout accounts"
  ON merchant_payout_accounts
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- RLS Policy: Users can INSERT only their own payout accounts
CREATE POLICY "Users can create own payout accounts"
  ON merchant_payout_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

-- RLS Policy: Users can UPDATE only their own payout accounts
CREATE POLICY "Users can update own payout accounts"
  ON merchant_payout_accounts
  FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- RLS Policy: Users can DELETE only their own payout accounts
CREATE POLICY "Users can delete own payout accounts"
  ON merchant_payout_accounts
  FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid());

-- Create index for faster lookups by merchant_id
CREATE INDEX IF NOT EXISTS merchant_payout_accounts_merchant_id_idx 
ON merchant_payout_accounts(merchant_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_payout_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on UPDATE
CREATE TRIGGER merchant_payout_accounts_updated_at_trigger
BEFORE UPDATE ON merchant_payout_accounts
FOR EACH ROW
EXECUTE FUNCTION update_merchant_payout_accounts_updated_at();