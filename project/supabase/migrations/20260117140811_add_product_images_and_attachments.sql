/*
  # Add Product Images and Attachments System
  
  ## Overview
  This migration adds support for multiple product images and digital product attachments.
  
  ## New Tables
  
  ### 1. product_images
  Stores multiple images for each product
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `image_url` (text) - URL of the image
  - `is_primary` (boolean) - Whether this is the main product image
  - `display_order` (integer) - Order for displaying images
  - `created_at` (timestamptz)
  
  ### 2. product_attachments
  Stores digital content that customers receive after purchase
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `title` (text) - Name/title of the attachment
  - `attachment_type` (text) - 'file', 'image', or 'text'
  - `file_url` (text) - URL for file/image attachments (nullable)
  - `text_content` (text) - Text content for text attachments (nullable)
  - `file_size` (bigint) - Size in bytes (nullable)
  - `display_order` (integer) - Order for displaying attachments
  - `created_at` (timestamptz)
  
  ### 3. coupon_products
  Links discount coupons to specific products
  - `id` (uuid, primary key)
  - `coupon_id` (uuid, foreign key to discount_coupons)
  - `product_id` (uuid, foreign key to products)
  - `created_at` (timestamptz)
  
  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users to manage their own product data
  - Add policies for customers to view attachments of purchased products only
*/

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create product_attachments table
CREATE TABLE IF NOT EXISTS product_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  attachment_type text NOT NULL CHECK (attachment_type IN ('file', 'image', 'text')),
  file_url text,
  text_content text,
  file_size bigint,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT attachment_content_check CHECK (
    (attachment_type = 'text' AND text_content IS NOT NULL) OR
    (attachment_type IN ('file', 'image') AND file_url IS NOT NULL)
  )
);

-- Create coupon_products table for linking coupons to specific products
CREATE TABLE IF NOT EXISTS coupon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES discount_coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_attachments_product_id ON product_attachments(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_products_coupon ON coupon_products(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_products_product ON coupon_products(product_id);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images

-- Merchants can view their own product images
CREATE POLICY "Merchants can view own product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Everyone can view images of active products
CREATE POLICY "Anyone can view active product images"
  ON product_images
  FOR SELECT
  TO public
  USING (
    product_id IN (
      SELECT id FROM products WHERE is_active = true
    )
  );

-- Merchants can insert images for their products
CREATE POLICY "Merchants can insert own product images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Merchants can update their own product images
CREATE POLICY "Merchants can update own product images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Merchants can delete their own product images
CREATE POLICY "Merchants can delete own product images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for product_attachments

-- Merchants can view their own product attachments
CREATE POLICY "Merchants can view own product attachments"
  ON product_attachments
  FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Customers can view attachments of purchased products
CREATE POLICY "Customers can view purchased product attachments"
  ON product_attachments
  FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT oi.product_id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = auth.uid()
        AND o.status IN ('completed', 'delivered')
    )
  );

-- Merchants can insert attachments for their products
CREATE POLICY "Merchants can insert own product attachments"
  ON product_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Merchants can update their own product attachments
CREATE POLICY "Merchants can update own product attachments"
  ON product_attachments
  FOR UPDATE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Merchants can delete their own product attachments
CREATE POLICY "Merchants can delete own product attachments"
  ON product_attachments
  FOR DELETE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for coupon_products

-- Merchants can view coupon-product links for their products
CREATE POLICY "Merchants can view own coupon products"
  ON coupon_products
  FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
    OR
    coupon_id IN (
      SELECT id FROM discount_coupons WHERE user_id = auth.uid()
    )
  );

-- Merchants can insert coupon-product links for their products
CREATE POLICY "Merchants can insert own coupon products"
  ON coupon_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
    AND
    coupon_id IN (
      SELECT id FROM discount_coupons WHERE user_id = auth.uid()
    )
  );

-- Merchants can delete coupon-product links for their products
CREATE POLICY "Merchants can delete own coupon products"
  ON coupon_products
  FOR DELETE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
    AND
    coupon_id IN (
      SELECT id FROM discount_coupons WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can manage all product attachments"
  ON product_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can manage all coupon products"
  ON coupon_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
    )
  );
