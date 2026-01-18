import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, Store } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProductImagesManager, ProductImage } from './ProductImagesManager';
import { ProductAttachmentsManager, ProductAttachment } from './ProductAttachmentsManager';
import { detectProductMerchantColumn } from '../../lib/productSchema';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
}

// Cache for detected product columns (local to this component)
let detectedProductColumns: string[] | null = null;

// Fallback column list
const FALLBACK_COLUMNS = [
  'title', 'name', 'product_name',
  'description', 'details',
  'price', 'amount',
  'visibility', 'is_active', 'store_id',
  'user_id', 'merchant_id', 'seller_id'
];

function safeUUID() {
  // Browser-safe uuid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'SAR',
    store_id: '',
    visibility: 'marketplace',
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchStores();
      fetchCoupons();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'SAR',
      store_id: '',
      visibility: 'marketplace',
    });
    setImages([]);
    setAttachments([]);
    setSelectedCouponId('');
    setError('');
    setLoading(false);
  };

  const fetchStores = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true);

    if (error) {
      console.error('fetchStores error:', error);
      return;
    }
    if (data) setStores(data);
  };

  const fetchCoupons = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('discount_coupons')
      .select('id, code, discount_type, discount_value, is_active')_
