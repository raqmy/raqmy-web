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
  'user_id', 'merchant_id', 'seller_id',
  'currency'
];

const PRODUCT_IMAGES_BUCKET = 'product-images';
const PRODUCT_ATTACHMENTS_BUCKET = 'product-attachments';

function safeFileName(name: string) {
  // Keep it simple & safe for storage paths
  return name
    .replace(/[^\w.\- ]+/g, '') // remove weird chars
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function randomId() {
  // crypto.randomUUID available on modern browsers
  // fallback for older environments
  // @ts-ignore
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    // @ts-ignore
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function uploadToStorage(params: {
  bucket: string;
  userId: string;     // MUST be auth.uid() (session.user.id)
  productId: string;
  file: File;
}) {
  const { bucket, userId, productId, file } = params;

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const base = safeFileName(file.name.replace(/\.[^/.]+$/, '')) || 'file';
  const fileName = `${base}-${randomId()}.${ext}`;

  // IMPORTANT: first folder = auth user id (matches "own folder" policy)
  const path = `${userId}/${productId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error('تعذر الحصول على رابط الملف بعد الرفع');
  }

  return { publicUrl, path };
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
      .select('id, code, discount_type, discount_value, is_active')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      // لو الجدول غير موجود عندك، لا نوقف إنشاء المنتج
      console.error('fetchCoupons error:', error);
      return;
    }
    if (data) setCoupons(data);
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.price.trim().length > 0 &&
      images.length > 0 &&
      attachments.length > 0
    );
  };

  // Detect available columns in products table
  const detectProductColumns = async (): Promise<string[]> => {
    if (detectedProductColumns) {
      console.log('📦 Using cached product columns:', detectedProductColumns);
      return detectedProductColumns;
    }

    console.group('🔍 Detecting Products Table Columns');

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

      if (error) {
        console.warn('⚠️ Could not fetch from products table:', error.message);
        console.warn('Using fallback column list');
        console.groupEnd();
        detectedProductColumns = FALLBACK_COLUMNS;
        return FALLBACK_COLUMNS;
      }

      if (data && data.length > 0) {
        const availableColumns = Object.keys(data[0]);
        console.log('✅ Products table has existing rows');
        console.log('Available columns:', availableColumns);
        console.groupEnd();
        detectedProductColumns = availableColumns;
        return availableColumns;
      } else {
        console.warn('⚠️ Products table is empty, using fallback column list');
        console.groupEnd();
        detectedProductColumns = FALLBACK_COLUMNS;
        return FALLBACK_COLUMNS;
      }
    } catch (err) {
      console.error('❌ Exception in detectProductColumns:', err);
      console.groupEnd();
      detectedProductColumns = FALLBACK_COLUMNS;
      return FALLBACK_COLUMNS;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('يجب تسجيل الدخول أولاً.');
      return;
    }

    // ✅ IMPORTANT: get the AUTH user id (auth.uid()) for Storage folder policies
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.error('getSession error:', sessionErr);
      setError('تعذر التحقق من جلسة تسجيل الدخول. حاول تسجيل الخروج ثم الدخول مرة أخرى.');
      return;
    }
    const authUserId = sessionData?.session?.user?.id;
    if (!authUserId) {
      setError('جلسة الدخول غير موجودة. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    if (!isFormValid()) {
      setError('يرجى إدخال جميع الحقول المطلوبة وإضافة صورة ومرفق واحد على الأقل');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError('السعر غير صالح');
      return;
    }

    setLoading(true);

    let createdProductId: string | null = null;

    try {
      // Step 1: Detect available columns in products table
      const availableColumns = await detectProductColumns();

      console.group('🔍 Building Product Payload');
      console.log('Available columns:', availableColumns);

      // Step 2: Determine the correct column for product name
      let nameColumn: string | null = null;
      if (availableColumns.includes('title')) nameColumn = 'title';
      else if (availableColumns.includes('name')) nameColumn = 'name';
      else if (availableColumns.includes('product_name')) nameColumn = 'product_name';

      if (!nameColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود لاسم المنتج في جدول products.');
      }

      // Step 3: Determine description column (optional)
      let descriptionColumn: string | null = null;
      if (availableColumns.includes('description')) descriptionColumn = 'description';
      else if (availableColumns.includes('details')) descriptionColumn = 'details';

      // Step 4: Determine price column
      let priceColumn: string | null = null;
      if (availableColumns.includes('price')) priceColumn = 'price';
      else if (availableColumns.includes('amount')) priceColumn = 'amount';

      if (!priceColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود للسعر في جدول products.');
      }

      // Step 5: Determine merchant column
      const merchantColumn = await detectProductMerchantColumn();
      if (!merchantColumn) {
        console.groupEnd();
        throw new Error('تعذر تحديد عمود التاجر في products.');
      }

      // Step 6: Build payload
      const productPayload: any = {};
      productPayload[nameColumn] = formData.name.trim();
      if (descriptionColumn && formData.description?.trim()) {
        productPayload[descriptionColumn] = formData.description.trim();
      }
      productPayload[priceColumn] = price;

      if (availableColumns.includes('currency')) productPayload['currency'] = formData.currency;
      if (availableColumns.includes('visibility')) productPayload['visibility'] = formData.visibility;
      if (availableColumns.includes('is_active')) productPayload['is_active'] = true;
      if (availableColumns.includes('store_id')) productPayload['store_id'] = formData.store_id || null;

      // NOTE: keep merchant/profile id for your app logic
      productPayload[merchantColumn] = profile.id;

      console.log('✅ Final payload:', productPayload);
      console.groupEnd();

      // Step 7: Insert product
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newProduct) throw new Error('فشل إنشاء المنتج');

      createdProductId = newProduct.id;
      console.log('✅ Product created:', createdProductId);

      // Step 8: Upload images to storage then insert rows
      const preparedImages = images.map((img, idx) => ({
        ...img,
        display_order: typeof img.display_order === 'number' ? img.display_order : idx,
      }));

      if (!preparedImages.some(i => i.is_primary) && preparedImages.length > 0) {
        preparedImages[0].is_primary = true;
      }

      const uploadedImages = await Promise.all(
        preparedImages.map(async (img, index) => {
          if (!img.file) {
            return {
              image_url: img.image_url,
              is_primary: img.is_primary,
              display_order: index,
            };
          }

          const { publicUrl } = await uploadToStorage({
            bucket: PRODUCT_IMAGES_BUCKET,
            userId: authUserId, // ✅ use auth uid for folder policy
            productId: createdProductId!,
            file: img.file,
          });

          return {
            image_url: publicUrl,
            is_primary: img.is_primary,
            display_order: index,
          };
        })
      );

      const imageInserts = uploadedImages.map((u) => ({
        product_id: createdProductId,
        image_url: u.image_url,
        is_primary: u.is_primary,
        display_order: u.display_order,
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imageInserts);

      if (imagesError) throw imagesError;

      // Step 9: Upload attachments then insert rows
      const uploadedAttachments = await Promise.all(
        attachments.map(async (att, index) => {
          if (att.attachment_type === 'text') {
            return {
              product_id: createdProductId,
              title: att.title,
              attachment_type: att.attachment_type,
              file_url: null,
              text_content: att.text_content || null,
              file_size: null,
              display_order: index,
            };
          }

          if (!att.file) {
            return {
              product_id: createdProductId,
              title: att.title,
              attachment_type: att.attachment_type,
              file_url: att.file_url || null,
              text_content: null,
              file_size: att.file_size || null,
              display_order: index,
            };
          }

          const { publicUrl } = await uploadToStorage({
            bucket: PRODUCT_ATTACHMENTS_BUCKET,
            userId: authUserId, // ✅ use auth uid for folder policy
            productId: createdProductId!,
            file: att.file,
          });

          return {
            product_id: createdProductId,
            title: att.title,
            attachment_type: att.attachment_type,
            file_url: publicUrl,
            text_content: null,
            file_size: att.file.size,
            display_order: index,
          };
        })
      );

      const { error: attachmentsError } = await supabase
        .from('product_attachments')
        .insert(uploadedAttachments);

      if (attachmentsError) throw attachmentsError;

      // Step 10: Link coupon (optional)
      if (selectedCouponId && selectedCouponId !== 'none') {
        const { error: couponError } = await supabase
          .from('coupon_products')
          .insert({
            coupon_id: selectedCouponId,
            product_id: createdProductId,
          });

        if (couponError) {
          console.error('Error linking coupon:', couponError);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.group('❌ Product Creation Failed');
      console.error('Error:', err);
      console.groupEnd();

      if (createdProductId) {
        try {
          await supabase.from('products').delete().eq('id', createdProductId);
        } catch (cleanupErr) {
          console.warn('Cleanup failed:', cleanupErr);
        }
      }

      const userMessage =
        err?.message?.includes('policy') || err?.message?.includes('permission')
          ? 'هناك مشكلة صلاحيات (RLS) تمنع رفع الملفات أو حفظها. تأكد من سياسات Storage والجداول.'
          : err?.message || 'حدث خطأ أثناء إنشاء المنتج';

      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">إضافة منتج جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 1. معلومات المنتج الأساسية */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">1. معلومات المنتج الأساسية</h3>
              <p className="text-sm text-gray-500 mt-1">أدخل المعلومات الأساسية للمنتج</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: دورة تصميم الجرافيك الشاملة"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف المنتج</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اكتب وصفاً تفصيلياً عن المنتج ومميزاته"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. صور المنتج */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">2. صور المنتج</h3>
              <p className="text-sm text-gray-500 mt-1">أضف صور توضيحية للمنتج</p>
            </div>

            <ProductImagesManager images={images} onChange={setImages} maxImages={8} />
          </div>

          {/* 3. مرفقات المنتج الرقمي */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">3. مرفقات المنتج الرقمي</h3>
              <p className="text-sm text-gray-500 mt-1">المحتوى الذي سيحصل عليه العميل بعد الشراء</p>
            </div>

            <ProductAttachmentsManager attachments={attachments} onChange={setAttachments} />
          </div>

          {/* 4. التسعير والظهور */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">4. التسعير والظهور</h3>
              <p className="text-sm text-gray-500 mt-1">حدد إعدادات النشر والعرض</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المتجر التابع له</label>
              <select
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">منتج مستقل (بدون متجر)</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الظهور</label>
              <select
                value={formData.visibility}
                onChange={(e
