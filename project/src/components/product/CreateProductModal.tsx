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

const PRODUCT_IMAGES_BUCKET = 'product-images';
const PRODUCT_ATTACHMENTS_BUCKET = 'product-attachments';

const sanitizeFileName = (name: string) => {
  // keep it safe for URLs/paths
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w.\-()]+/g, '_');
};

const getUuid = () => {
  // modern browsers
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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
    // Return cached result if available
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

  const uploadToBucket = async (
    bucket: string,
    path: string,
    file: File
  ): Promise<string> => {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      console.error(`❌ Upload failed [${bucket}]`, uploadError);
      throw new Error(`فشل رفع الملف: ${file.name}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new Error('تعذر إنشاء رابط الملف بعد الرفع');
    }
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('يجب تسجيل الدخول أولاً.');
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

    try {
      // Step 1: Detect available columns in products table
      const availableColumns = await detectProductColumns();

      console.group('🔍 Building Product Payload');
      console.log('Available columns:', availableColumns);

      // Step 2: Determine the correct column for product name
      let nameColumn: string | null = null;
      if (availableColumns.includes('title')) {
        nameColumn = 'title';
      } else if (availableColumns.includes('name')) {
        nameColumn = 'name';
      } else if (availableColumns.includes('product_name')) {
        nameColumn = 'product_name';
      }

      if (!nameColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود لاسم المنتج في جدول products. يرجى التواصل مع الدعم.');
      }

      // Step 3: Determine description column
      let descriptionColumn: string | null = null;
      if (availableColumns.includes('description')) {
        descriptionColumn = 'description';
      } else if (availableColumns.includes('details')) {
        descriptionColumn = 'details';
      }

      // Step 4: Determine price column
      let priceColumn: string | null = null;
      if (availableColumns.includes('price')) {
        priceColumn = 'price';
      } else if (availableColumns.includes('amount')) {
        priceColumn = 'amount';
      }

      if (!priceColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود للسعر في جدول products. يرجى التواصل مع الدعم.');
      }

      // Step 5: Determine merchant column
      const merchantColumn = await detectProductMerchantColumn();
      if (!merchantColumn) {
        console.groupEnd();
        throw new Error('تعذر تحديد بنية قاعدة البيانات. يرجى التواصل مع الدعم.');
      }

      // Step 6: Build payload
      const productPayload: any = {};
      productPayload[nameColumn] = formData.name.trim();

      if (descriptionColumn && formData.description?.trim()) {
        productPayload[descriptionColumn] = formData.description.trim();
      }

      productPayload[priceColumn] = price;

      if (availableColumns.includes('currency')) {
        productPayload['currency'] = formData.currency;
      }
      if (availableColumns.includes('visibility')) {
        productPayload['visibility'] = formData.visibility;
      }
      if (availableColumns.includes('is_active')) {
        productPayload['is_active'] = true;
      }
      if (availableColumns.includes('store_id')) {
        productPayload['store_id'] = formData.store_id || null;
      }

      productPayload[merchantColumn] = profile.id;

      console.log('✅ Final payload:', productPayload);
      console.groupEnd();

      // Step 7: Insert product first (to get product_id)
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert product error:', insertError);
        throw insertError;
      }
      if (!newProduct) {
        throw new Error('فشل إنشاء المنتج');
      }

      console.log('✅ Product created:', newProduct.id);

      // ✅ Step 8: Upload images to storage + insert into product_images
      const uploadedImageRows: Array<{
        product_id: string;
        image_url: string;
        is_primary: boolean;
        display_order: number;
      }> = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.file) {
          // if somehow no file exists, skip (but usually always exists)
          continue;
        }

        const ext = img.file.name.split('.').pop() || 'jpg';
        const fileName = `${getUuid()}.${ext}`;
        const path = `${profile.id}/${newProduct.id}/${fileName}`;

        const publicUrl = await uploadToBucket(PRODUCT_IMAGES_BUCKET, path, img.file);

        uploadedImageRows.push({
          product_id: newProduct.id,
          image_url: publicUrl, // ✅ REAL URL not blob:
          is_primary: img.is_primary,
          display_order: i,
        });
      }

      if (uploadedImageRows.length > 0) {
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(uploadedImageRows);

        if (imagesError) {
          console.error('❌ Error inserting images rows:', imagesError);
          throw new Error('تم إنشاء المنتج لكن فشل حفظ الصور في قاعدة البيانات');
        }
      }

      // ✅ Step 9: Upload attachments (file/image) + insert into product_attachments
      const uploadedAttachmentRows: Array<any> = [];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];

        // Text attachment: no upload needed
        if (att.attachment_type === 'text') {
          uploadedAttachmentRows.push({
            product_id: newProduct.id,
            title: att.title,
            attachment_type: att.attachment_type,
            file_url: null,
            text_content: att.text_content || null,
            file_size: null,
            display_order: i,
          });
          continue;
        }

        // File/Image attachment: upload required
        if (!att.file) {
          // fallback: if no file exists, treat as error
          throw new Error(`المرفق "${att.title}" لا يحتوي ملف للرفع`);
        }

        const safeName = sanitizeFileName(att.file.name || att.title || 'attachment');
        const fileName = `${getUuid()}-${safeName}`;
        const path = `${profile.id}/${newProduct.id}/${fileName}`;

        const publicUrl = await uploadToBucket(PRODUCT_ATTACHMENTS_BUCKET, path, att.file);

        uploadedAttachmentRows.push({
          product_id: newProduct.id,
          title: att.title,
          attachment_type: att.attachment_type,
          file_url: publicUrl, // ✅ REAL URL not blob:
          text_content: null,
          file_size: att.file.size || att.file_size || null,
          display_order: i,
        });
      }

      if (uploadedAttachmentRows.length > 0) {
        const { error: attachmentsError } = await supabase
          .from('product_attachments')
          .insert(uploadedAttachmentRows);

        if (attachmentsError) {
          console.error('❌ Error inserting attachments rows:', attachmentsError);
          throw new Error('تم إنشاء المنتج لكن فشل حفظ المرفقات في قاعدة البيانات');
        }
      }

      // Step 10: Link coupon if selected
      if (selectedCouponId && selectedCouponId !== 'none') {
        const { error: couponError } = await supabase
          .from('coupon_products')
          .insert({
            coupon_id: selectedCouponId,
            product_id: newProduct.id,
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

      const userMessage =
        err?.message?.includes('schema') ||
        err?.message?.includes('column') ||
        err?.code === 'PGRST204'
          ? 'تعذر إضافة المنتج بسبب إعدادات قاعدة البيانات. حاول مرة أخرى أو تواصل مع الدعم.'
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
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="marketplace">عرض في السوق العام</option>
                <option value="public">عام (يظهر في متجري فقط)</option>
                <option value="private">خاص (رابط مباشر فقط)</option>
              </select>
            </div>
          </div>

          {/* 5. كوبونات الخصم */}
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">5. كوبونات الخصم</h3>
              <p className="text-sm text-gray-500 mt-1">اختر كوبون خصم لربطه بهذا المنتج (اختياري)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كوبون الخصم
              </label>
              <select
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">عدم إضافة كوبونات خصم</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code} - {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} ريال`}
                  </option>
                ))}
              </select>
              {coupons.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  لا توجد كوبونات خصم نشطة. يمكنك إنشاء كوبونات من صفحة إدارة الكوبونات
                </p>
              )}
            </div>
          </div>

          {/* Validation Messages */}
          {!isFormValid() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">لإتمام إنشاء المنتج، يجب:</p>
              <ul className="text-sm text-blue-800 space-y-1 mr-4">
                {!formData.name.trim() && <li>• إدخال اسم المنتج</li>}
                {!formData.price.trim() && <li>• إدخال السعر</li>}
                {images.length === 0 && <li>• إضافة صورة واحدة على الأقل</li>}
                {attachments.length === 0 && <li>• إضافة مرفق واحد على الأقل</li>}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الإضافة...</span>
                </>
              ) : (
                'إضافة المنتج'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
