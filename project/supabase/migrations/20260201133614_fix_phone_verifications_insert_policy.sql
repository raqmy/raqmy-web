/*
  # Fix Phone Verifications Insert Policy

  ## Problem
  The phone_verifications table has no INSERT policy, which may cause issues
  even though service role should bypass RLS.

  ## Solution
  Add INSERT policy for authenticated users to insert their own verification records.
  This provides a defensive layer and ensures the function works correctly.

  ## Changes
  - Add INSERT policy for phone_verifications table
*/

-- Add INSERT policy for phone_verifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'phone_verifications'
    AND policyname = 'Users can insert own phone verifications'
  ) THEN
    CREATE POLICY "Users can insert own phone verifications"
      ON phone_verifications
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Also add UPDATE policy for attempts tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'phone_verifications'
    AND policyname = 'Users can update own phone verifications'
  ) THEN
    CREATE POLICY "Users can update own phone verifications"
      ON phone_verifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;