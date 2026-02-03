/*
  # نظام التحقق من رقم الجوال

  1. تحديثات على جدول users_profile
    - إضافة عمود `phone` (text, nullable للمستخدمين القدامى)
    - إضافة عمود `phone_verified` (boolean, default false)
    - إضافة عمود `phone_verified_at` (timestamptz, nullable)

  2. جدول جديد: phone_verifications
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key إلى auth.users)
    - `phone` (text, رقم الجوال المراد التحقق منه)
    - `otp_hash` (text, hash الـ OTP)
    - `expires_at` (timestamptz, وقت انتهاء صلاحية OTP)
    - `attempts` (int, عدد المحاولات)
    - `last_sent_at` (timestamptz, آخر وقت إرسال)
    - `created_at` (timestamptz, وقت الإنشاء)

  3. الأمان
    - تفعيل RLS على جدول phone_verifications
    - سياسة تسمح للمستخدم بالوصول لسجلاته فقط
*/

-- إضافة أعمدة التحقق من الجوال في users_profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profile' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profile' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN phone_verified boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profile' AND column_name = 'phone_verified_at'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN phone_verified_at timestamptz;
  END IF;
END $$;

-- إنشاء جدول phone_verifications
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0 NOT NULL,
  last_sent_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- إنشاء index على user_id لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS phone_verifications_user_id_idx 
  ON phone_verifications(user_id);

-- تفعيل RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يمكنه قراءة سجلاته فقط
CREATE POLICY "Users can read own phone verifications"
  ON phone_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسة: المستخدم يمكنه حذف سجلاته (للتنظيف بعد التحقق)
CREATE POLICY "Users can delete own phone verifications"
  ON phone_verifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ملاحظة: INSERT و UPDATE سيتم عبر Edge Functions مع service role
-- لذلك لا نحتاج سياسات INSERT/UPDATE للمستخدمين العاديين