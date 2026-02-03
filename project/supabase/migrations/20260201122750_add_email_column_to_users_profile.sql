/*
  # إضافة عمود البريد الإلكتروني لجدول users_profile

  1. التغييرات
    - إضافة عمود `email` (text, nullable) إلى جدول users_profile
    - هذا العمود مطلوب لعملية التسجيل الصحيحة

  2. الأمان
    - لا تغيير في RLS policies - موجودة بالفعل وصحيحة
*/

-- إضافة عمود email إلى users_profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_profile' AND column_name = 'email'
  ) THEN
    ALTER TABLE users_profile ADD COLUMN email text;
  END IF;
END $$;
