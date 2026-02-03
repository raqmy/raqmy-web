/*
  # إنشاء نظام المفضلة والمشاهدات

  ## الجداول الجديدة
  
  ### جدول `favorites` - المنتجات المفضلة
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key → auth.users)
  - `product_id` (uuid, foreign key → products)
  - `created_at` (timestamptz) - وقت الإضافة
  - قيد فريد على (user_id, product_id) لمنع التكرار

  ### جدول `viewed_products` - المنتجات المشاهدة
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key → auth.users)
  - `product_id` (uuid, foreign key → products)
  - `viewed_at` (timestamptz) - وقت المشاهدة
  - قيد فريد على (user_id, product_id) لمنع التكرار
  - يتم التحديث التلقائي لـ viewed_at عند إعادة المشاهدة

  ## الأمان
  - تفعيل RLS على جميع الجداول
  - المستخدمون يمكنهم قراءة/كتابة بياناتهم الخاصة فقط
  - إضافة indexes لتحسين الأداء

  ## الملاحظات
  - عند إعادة مشاهدة منتج، يتم تحديث وقت المشاهدة فقط
  - دعم pagination عبر الترتيب حسب التاريخ
*/

-- ==========================================
-- جدول المفضلة (Favorites)
-- ==========================================

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- تفعيل RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمفضلة
CREATE POLICY "Users can view their own favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their favorites"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their favorites"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- ==========================================
-- جدول المشاهدات (Viewed Products)
-- ==========================================

CREATE TABLE IF NOT EXISTS viewed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- تفعيل RLS
ALTER TABLE viewed_products ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمشاهدات
CREATE POLICY "Users can view their own viewed products"
  ON viewed_products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add viewed products"
  ON viewed_products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their viewed products"
  ON viewed_products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_viewed_products_user_id ON viewed_products(user_id);
CREATE INDEX IF NOT EXISTS idx_viewed_products_product_id ON viewed_products(product_id);
CREATE INDEX IF NOT EXISTS idx_viewed_products_viewed_at ON viewed_products(viewed_at DESC);

-- ==========================================
-- Functions مساعدة
-- ==========================================

-- دالة لتسجيل أو تحديث مشاهدة منتج
CREATE OR REPLACE FUNCTION record_product_view(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO viewed_products (user_id, product_id, viewed_at)
  VALUES (p_user_id, p_product_id, now())
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET viewed_at = now();
END;
$$;

-- دالة للتبديل بين إضافة/إزالة من المفضلة
CREATE OR REPLACE FUNCTION toggle_favorite(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- التحقق من وجود المنتج في المفضلة
  SELECT EXISTS(
    SELECT 1 FROM favorites
    WHERE user_id = p_user_id AND product_id = p_product_id
  ) INTO v_exists;

  IF v_exists THEN
    -- إذا موجود، احذفه
    DELETE FROM favorites
    WHERE user_id = p_user_id AND product_id = p_product_id;
    RETURN false; -- تم الحذف
  ELSE
    -- إذا غير موجود، أضفه
    INSERT INTO favorites (user_id, product_id)
    VALUES (p_user_id, p_product_id);
    RETURN true; -- تمت الإضافة
  END IF;
END;
$$;