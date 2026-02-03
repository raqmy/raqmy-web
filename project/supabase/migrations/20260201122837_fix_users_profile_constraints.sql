/*
  # إصلاح قيود جدول users_profile

  1. التغييرات
    - إضافة foreign key constraint بين users_profile.id و auth.users(id)
    - التأكد من أن phone_verified ليس nullable مع default false
    - تحسين بنية الجدول

  2. الأمان
    - RLS policies موجودة ولا تحتاج تعديل
*/

-- إضافة foreign key constraint إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_profile_id_fkey'
    AND table_name = 'users_profile'
  ) THEN
    ALTER TABLE users_profile
    ADD CONSTRAINT users_profile_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- التأكد من أن phone_verified ليس nullable
DO $$
BEGIN
  ALTER TABLE users_profile 
  ALTER COLUMN phone_verified SET DEFAULT false,
  ALTER COLUMN phone_verified SET NOT NULL;
EXCEPTION
  WHEN others THEN
    -- تحديث القيم الموجودة أولاً ثم إعادة المحاولة
    UPDATE users_profile SET phone_verified = false WHERE phone_verified IS NULL;
    ALTER TABLE users_profile 
    ALTER COLUMN phone_verified SET DEFAULT false,
    ALTER COLUMN phone_verified SET NOT NULL;
END $$;
