import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  name: string;
  role: 'customer' | 'seller' | 'admin';
  phone?: string;
  phone_verified: boolean;
  avatar_url?: string;
  plan_id?: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  max_products: number;
  max_subscription_products: number;
  max_stores: number;
  commission_rate: number;
  marketplace_commission_rate: number;
  features: string[];
  is_active: boolean;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  logo_url?: string;
  category?: string;
  default_currency?: string;
  show_in_marketplace?: boolean;
  payment_methods?: {
    hyperpay: boolean;
    paypal: boolean;
  };
  social_links?: {
    email?: string;
    twitter?: string;
    instagram?: string;
    telegram?: string;
  };
  email?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  store_id?: string | null;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  is_subscription: boolean;
  subscription_period?: string;
  visibility: 'public' | 'private' | 'marketplace';
  thumbnail_url?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  download_limit: number;
  delivery_method?: 'instant' | 'email';
  coupons_enabled?: boolean;
  category?: string;
  is_featured: boolean;
  is_active: boolean;
  views_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  name_ar: string;
  icon?: string;
  created_at: string;
}

export interface ProductCoupon {
  id: string;
  product_id: string;
  user_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserLimits {
  current_stores: number;
  current_products: number;
  current_subscription_products: number;
  max_stores: number;
  max_products: number;
  max_subscription_products: number;
  can_create_store: boolean;
  can_create_product: boolean;
  can_create_subscription_product: boolean;
  commission_rate: number;
  marketplace_commission_rate: number;
}

export interface Order {
  id: string;
  order_number: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  commission_amount: number;
  seller_amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  payment_id?: string;
  coupon_code?: string;
  discount_amount: number;
  download_url?: string;
  download_count: number;
  created_at: string;
  paid_at?: string;
}
