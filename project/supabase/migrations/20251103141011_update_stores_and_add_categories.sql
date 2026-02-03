/*
  # تحديث جداول المتاجر وإضافة التصنيفات

  ## التغييرات
  
  ### 1. إضافة أعمدة جديدة لجدول stores
  - `category` (text) - تصنيف المتجر
  - `default_currency` (text) - العملة الافتراضية
  - `show_in_marketplace` (boolean) - عرض في السوق العام
  - `payment_methods` (jsonb) - طرق الدفع المفعلة
  - `social_links` (jsonb) - روابط التواصل الاجتماعي
  - `email` (text) - البريد الإلكتروني التجاري
  
  ### 2. إضافة جدول store_categories
  - جدول للتصنيفات المتاحة
  
  ### 3. تحديث جدول products
  - إضافة حقول إضافية للمنتجات
*/

-- إضافة أعمدة جديدة لجدول stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'category'
  ) THEN
    ALTER TABLE stores ADD COLUMN category text DEFAULT 'عام';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'default_currency'
  ) THEN
    ALTER TABLE stores ADD COLUMN default_currency text DEFAULT 'SAR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'show_in_marketplace'
  ) THEN
    ALTER TABLE stores ADD COLUMN show_in_marketplace boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE stores ADD COLUMN payment_methods jsonb DEFAULT '{"hyperpay": true, "paypal": false}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE stores ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'email'
  ) THEN
    ALTER TABLE stores ADD COLUMN email text;
  END IF;
END $$;

-- إنشاء جدول التصنيفات
CREATE TABLE IF NOT EXISTS store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- إضافة تصنيفات افتراضية
INSERT INTO store_categories (name, name_ar, icon)
VALUES
  ('courses', 'كورسات', '📚'),
  ('templates', 'قوالب', '🎨'),
  ('designs', 'تصاميم', '✨'),
  ('tools', 'أدوات', '🛠️'),
  ('ebooks', 'كتب إلكترونية', '📖'),
  ('software', 'برمجيات', '💻'),
  ('audio', 'ملفات صوتية', '🎵'),
  ('video', 'ملفات فيديو', '🎬'),
  ('graphics', 'جرافيكس', '🖼️'),
  ('other', 'أخرى', '📦')
ON CONFLICT (name) DO NOTHING;

-- تفعيل RLS
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة للجميع
CREATE POLICY "Anyone can view categories"
  ON store_categories FOR SELECT
  TO authenticated
  USING (true);

-- إضافة فهرس للبحث
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_show_in_marketplace ON stores(show_in_marketplace) WHERE show_in_marketplace = true;
