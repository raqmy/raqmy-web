/*
  # نظام أكواد الخصم الشامل
  
  1. جدول جديد
    - `discount_coupons` - جدول أكواد الخصم
      - `id` (uuid, primary key) - معرف الكوبون
      - `user_id` (uuid, foreign key) - معرف التاجر
      - `code` (text, unique) - كود الخصم
      - `discount_type` (text) - نوع الخصم (percentage أو fixed)
      - `discount_value` (numeric) - قيمة الخصم
      - `min_purchase_amount` (numeric, nullable) - الحد الأدنى للشراء
      - `max_discount_amount` (numeric, nullable) - الحد الأقصى للخصم
      - `usage_limit` (integer, nullable) - عدد مرات الاستخدام المسموح
      - `used_count` (integer) - عدد مرات الاستخدام الفعلي
      - `start_date` (timestamptz) - تاريخ البداية
      - `end_date` (timestamptz, nullable) - تاريخ الانتهاء
      - `is_active` (boolean) - حالة الكوبون
      - `apply_to` (text) - نطاق التطبيق (all, specific_products, specific_stores)
      - `created_at` (timestamptz) - تاريخ الإنشاء
      - `updated_at` (timestamptz) - تاريخ التحديث
    
    - `coupon_products` - ربط الكوبونات بالمنتجات
      - `coupon_id` (uuid, foreign key) - معرف الكوبون
      - `product_id` (uuid, foreign key) - معرف المنتج
    
    - `coupon_stores` - ربط الكوبونات بالمتاجر
      - `coupon_id` (uuid, foreign key) - معرف الكوبون
      - `store_id` (uuid, foreign key) - معرف المتجر
  
  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات الوصول للتجار فقط
*/

-- جدول أكواد الخصم
CREATE TABLE IF NOT EXISTS discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_profile(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_purchase_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  used_count integer DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean DEFAULT true,
  apply_to text DEFAULT 'all' CHECK (apply_to IN ('all', 'specific_products', 'specific_stores')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول ربط الكوبونات بالمنتجات
CREATE TABLE IF NOT EXISTS coupon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES discount_coupons(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, product_id)
);

-- جدول ربط الكوبونات بالمتاجر
CREATE TABLE IF NOT EXISTS coupon_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES discount_coupons(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, store_id)
);

-- تفعيل RLS
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_stores ENABLE ROW LEVEL SECURITY;

-- سياسات discount_coupons
CREATE POLICY "Users can view own coupons"
  ON discount_coupons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coupons"
  ON discount_coupons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons"
  ON discount_coupons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own coupons"
  ON discount_coupons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات coupon_products
CREATE POLICY "Users can view own coupon products"
  ON coupon_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_products.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own coupon products"
  ON coupon_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_products.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own coupon products"
  ON coupon_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_products.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

-- سياسات coupon_stores
CREATE POLICY "Users can view own coupon stores"
  ON coupon_stores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_stores.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own coupon stores"
  ON coupon_stores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_stores.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own coupon stores"
  ON coupon_stores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discount_coupons
      WHERE discount_coupons.id = coupon_stores.coupon_id
      AND discount_coupons.user_id = auth.uid()
    )
  );

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_discount_coupons_user_id ON discount_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_products_coupon_id ON coupon_products(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_stores_coupon_id ON coupon_stores(coupon_id);
