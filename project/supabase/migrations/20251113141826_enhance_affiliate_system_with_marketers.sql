/*
  # تطوير نظام التسويق بالعمولة - إضافة جدول المسوقين
  
  1. جدول جديد
    - `affiliate_marketers` - إدارة المسوقين بالعمولة
      - `id` (uuid, primary key) - معرف المسوق
      - `seller_id` (uuid, foreign key) - معرف التاجر الذي أضاف المسوق
      - `name` (text) - اسم المسوق
      - `email` (text, optional) - البريد الإلكتروني
      - `phone` (text, optional) - رقم الهاتف
      - `commission_rate` (numeric) - نسبة العمولة المخصصة
      - `total_earnings` (numeric) - إجمالي الأرباح
      - `total_sales` (integer) - إجمالي المبيعات
      - `total_clicks` (integer) - إجمالي النقرات
      - `is_active` (boolean) - حالة المسوق
      - `notes` (text, optional) - ملاحظات
      - `created_at` (timestamptz) - تاريخ الإضافة
      - `updated_at` (timestamptz) - تاريخ التحديث
  
  2. تعديل جدول affiliate_links
    - إضافة `marketer_id` لربط الروابط بالمسوقين
    - إضافة `apply_to` لتحديد نطاق الرابط (product, store, all)
  
  3. الأمان
    - تفعيل RLS
    - سياسات وصول محكمة
*/

-- جدول إدارة المسوقين بالعمولة
CREATE TABLE IF NOT EXISTS affiliate_marketers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  commission_rate numeric DEFAULT 10.00 NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  total_earnings numeric DEFAULT 0 NOT NULL,
  total_sales integer DEFAULT 0 NOT NULL,
  total_clicks integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة أعمدة جديدة لجدول affiliate_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'marketer_id'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN marketer_id uuid REFERENCES affiliate_marketers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_links' AND column_name = 'apply_to'
  ) THEN
    ALTER TABLE affiliate_links ADD COLUMN apply_to text DEFAULT 'product' CHECK (apply_to IN ('product', 'store', 'all'));
  END IF;
END $$;

-- تفعيل RLS
ALTER TABLE affiliate_marketers ENABLE ROW LEVEL SECURITY;

-- سياسات affiliate_marketers
CREATE POLICY "Sellers can view own marketers"
  ON affiliate_marketers FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create own marketers"
  ON affiliate_marketers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own marketers"
  ON affiliate_marketers FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own marketers"
  ON affiliate_marketers FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_affiliate_marketers_seller_id ON affiliate_marketers(seller_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_marketer_id ON affiliate_links(marketer_id);

-- تحديث سياسات affiliate_links لتشمل المسوقين
DROP POLICY IF EXISTS "Users can view own affiliate links" ON affiliate_links;
CREATE POLICY "Users can view own affiliate links or marketer links"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM affiliate_marketers 
      WHERE affiliate_marketers.id = affiliate_links.marketer_id 
      AND affiliate_marketers.seller_id = auth.uid()
    )
  );
