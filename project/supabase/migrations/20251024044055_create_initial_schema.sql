/*
  # إنشاء قاعدة بيانات منصة رقمي - المخطط الأساسي

  ## الجداول الجديدة
  
  ### 1. users_profile
  - `id` (uuid, primary key) - مرتبط مع auth.users
  - `name` (text) - الاسم الكامل
  - `role` (text) - نوع الحساب: customer, seller, admin
  - `phone` (text) - رقم الجوال
  - `phone_verified` (boolean) - هل تم التحقق من الجوال
  - `avatar_url` (text) - صورة الملف الشخصي
  - `plan_id` (uuid) - الباقة المشترك بها
  - `created_at` (timestamptz) - تاريخ الإنشاء
  
  ### 2. plans
  - `id` (uuid, primary key)
  - `name` (text) - اسم الباقة
  - `price` (decimal) - السعر
  - `max_products` (integer) - الحد الأقصى للمنتجات
  - `max_subscription_products` (integer) - الحد الأقصى لمنتجات الاشتراك
  - `max_stores` (integer) - الحد الأقصى للمتاجر
  - `commission_rate` (decimal) - نسبة العمولة على المنتجات العادية
  - `marketplace_commission_rate` (decimal) - نسبة العمولة في السوق العام
  - `features` (jsonb) - المميزات الإضافية
  - `is_active` (boolean) - هل الباقة نشطة
  - `created_at` (timestamptz)
  
  ### 3. stores
  - `id` (uuid, primary key)
  - `user_id` (uuid) - صاحب المتجر
  - `name` (text) - اسم المتجر
  - `slug` (text, unique) - رابط المتجر
  - `description` (text) - وصف المتجر
  - `cover_image` (text) - صورة الغلاف
  - `logo_url` (text) - الشعار
  - `is_active` (boolean) - حالة المتجر
  - `created_at` (timestamptz)
  
  ### 4. products
  - `id` (uuid, primary key)
  - `store_id` (uuid) - المتجر التابع له
  - `user_id` (uuid) - صاحب المنتج
  - `name` (text) - اسم المنتج
  - `slug` (text) - رابط المنتج
  - `description` (text) - الوصف
  - `price` (decimal) - السعر
  - `currency` (text) - العملة (SAR, USD)
  - `is_subscription` (boolean) - هل هو منتج اشتراك
  - `subscription_period` (text) - فترة الاشتراك (monthly, yearly)
  - `visibility` (text) - public, private, marketplace
  - `thumbnail_url` (text) - صورة المنتج
  - `file_url` (text) - رابط الملف
  - `file_type` (text) - نوع الملف
  - `file_size` (bigint) - حجم الملف بالبايت
  - `download_limit` (integer) - حد التحميل
  - `is_featured` (boolean) - منتج مميز
  - `is_active` (boolean) - نشط
  - `views_count` (integer) - عدد المشاهدات
  - `sales_count` (integer) - عدد المبيعات
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 5. orders
  - `id` (uuid, primary key)
  - `order_number` (text, unique) - رقم الطلب
  - `product_id` (uuid) - المنتج
  - `buyer_id` (uuid) - المشتري
  - `seller_id` (uuid) - البائع
  - `total_amount` (decimal) - المبلغ الإجمالي
  - `commission_amount` (decimal) - العمولة
  - `seller_amount` (decimal) - مبلغ البائع
  - `currency` (text) - العملة
  - `status` (text) - pending, completed, failed, refunded
  - `payment_method` (text) - HyperPay, PayPal
  - `payment_id` (text) - معرف الدفع الخارجي
  - `coupon_code` (text) - كود الخصم المستخدم
  - `discount_amount` (decimal) - قيمة الخصم
  - `download_url` (text) - رابط التحميل
  - `download_count` (integer) - عدد مرات التحميل
  - `created_at` (timestamptz)
  - `paid_at` (timestamptz) - تاريخ الدفع
  
  ### 6. bank_accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid) - صاحب الحساب
  - `bank_name` (text) - اسم البنك
  - `account_name` (text) - اسم صاحب الحساب
  - `iban` (text) - رقم الآيبان
  - `swift_code` (text) - رمز السويفت
  - `is_verified` (boolean) - موثق
  - `verification_status` (text) - pending, approved, rejected
  - `created_at` (timestamptz)
  
  ### 7. withdrawals
  - `id` (uuid, primary key)
  - `user_id` (uuid) - المستخدم
  - `amount` (decimal) - المبلغ
  - `currency` (text) - العملة
  - `status` (text) - pending, processing, completed, rejected
  - `bank_account_id` (uuid) - الحساب البنكي
  - `notes` (text) - ملاحظات
  - `processed_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 8. coupons
  - `id` (uuid, primary key)
  - `user_id` (uuid) - منشئ الكوبون
  - `store_id` (uuid) - المتجر
  - `code` (text, unique) - الكود
  - `discount_type` (text) - percentage, fixed
  - `discount_value` (decimal) - قيمة الخصم
  - `max_uses` (integer) - الحد الأقصى للاستخدام
  - `used_count` (integer) - عدد مرات الاستخدام
  - `expires_at` (timestamptz) - تاريخ الانتهاء
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  
  ### 9. reviews
  - `id` (uuid, primary key)
  - `product_id` (uuid) - المنتج
  - `user_id` (uuid) - المستخدم
  - `rating` (integer) - التقييم (1-5)
  - `comment` (text) - التعليق
  - `is_verified_purchase` (boolean) - شراء موثق
  - `created_at` (timestamptz)
  
  ### 10. analytics
  - `id` (uuid, primary key)
  - `product_id` (uuid) - المنتج
  - `store_id` (uuid) - المتجر
  - `user_id` (uuid) - المستخدم
  - `date` (date) - التاريخ
  - `views` (integer) - المشاهدات
  - `sales` (integer) - المبيعات
  - `revenue` (decimal) - الإيرادات
  - `created_at` (timestamptz)
  
  ### 11. affiliate_links
  - `id` (uuid, primary key)
  - `user_id` (uuid) - المسوق
  - `product_id` (uuid) - المنتج
  - `code` (text, unique) - كود الأفلييت
  - `commission_rate` (decimal) - نسبة العمولة
  - `clicks` (integer) - عدد النقرات
  - `sales` (integer) - عدد المبيعات
  - `earnings` (decimal) - الأرباح
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - إضافة سياسات الوصول المناسبة
*/

-- إنشاء الباقات أولاً
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  max_products integer NOT NULL DEFAULT 10,
  max_subscription_products integer NOT NULL DEFAULT 1,
  max_stores integer NOT NULL DEFAULT 1,
  commission_rate decimal(5,2) NOT NULL DEFAULT 5.00,
  marketplace_commission_rate decimal(5,2) NOT NULL DEFAULT 20.00,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- جدول الملفات الشخصية
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  phone text,
  phone_verified boolean DEFAULT false,
  avatar_url text,
  plan_id uuid REFERENCES plans(id),
  created_at timestamptz DEFAULT now()
);

-- جدول المتاجر
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  currency text DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD', 'EUR')),
  is_subscription boolean DEFAULT false,
  subscription_period text CHECK (subscription_period IN ('monthly', 'yearly', 'weekly')),
  visibility text DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'marketplace')),
  thumbnail_url text,
  file_url text,
  file_type text,
  file_size bigint,
  download_limit integer DEFAULT -1,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  views_count integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول الطلبات
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) NOT NULL,
  seller_id uuid REFERENCES auth.users(id) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  commission_amount decimal(10,2) DEFAULT 0,
  seller_amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text DEFAULT 'HyperPay',
  payment_id text,
  coupon_code text,
  discount_amount decimal(10,2) DEFAULT 0,
  download_url text,
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- جدول الحسابات البنكية
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  iban text NOT NULL,
  swift_code text,
  is_verified boolean DEFAULT false,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- جدول السحب المالي
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  bank_account_id uuid REFERENCES bank_accounts(id),
  notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- جدول الكوبونات
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  discount_type text DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2) NOT NULL,
  max_uses integer DEFAULT -1,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- جدول التقييمات
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- جدول التحليلات
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  views integer DEFAULT 0,
  sales integer DEFAULT 0,
  revenue decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, date)
);

-- جدول روابط التسويق بالعمولة
CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  commission_rate decimal(5,2) DEFAULT 10.00,
  clicks integer DEFAULT 0,
  sales integer DEFAULT 0,
  earnings decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- إدخال الباقات الافتراضية
INSERT INTO plans (name, price, max_products, max_subscription_products, max_stores, commission_rate, marketplace_commission_rate, features)
VALUES 
  ('مجاني', 0, 10, 1, 1, 5.00, 20.00, '["متجر واحد", "10 منتجات", "منتج اشتراك واحد"]'::jsonb),
  ('احترافي', 40, 60, 10, 5, 2.00, 10.00, '["5 متاجر", "60 منتج", "10 منتجات اشتراك", "عمولة مخفضة"]'::jsonb),
  ('متقدم', 180, 240, 120, 16, 0.00, 0.00, '["16 متجر", "240 منتج", "120 منتج اشتراك", "بدون عمولات", "دعم أولوية", "ميزات AI"]'::jsonb)
ON CONFLICT DO NOTHING;

-- تفعيل RLS
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

-- سياسات users_profile
CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- سياسات plans
CREATE POLICY "Anyone can view active plans"
  ON plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- سياسات stores
CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Sellers can create stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can delete own stores"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات products
CREATE POLICY "Anyone can view public/marketplace products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true AND (visibility = 'marketplace' OR visibility = 'public'));

CREATE POLICY "Sellers can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات orders
CREATE POLICY "Buyers can view own purchases"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view own sales"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- سياسات bank_accounts
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bank accounts"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسات withdrawals
CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات coupons
CREATE POLICY "Users can view coupons for their stores"
  ON coupons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسات reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات analytics
CREATE POLICY "Users can view own analytics"
  ON analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات affiliate_links
CREATE POLICY "Users can view own affiliate links"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create affiliate links"
  ON affiliate_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_visibility ON products(visibility) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);