import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Briefcase, Download, Clock3 } from 'lucide-react';
import { supabase, Store } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProductImagesManager, ProductImage } from './ProductImagesManager';
import { ProductAttachmentsManager, ProductAttachment } from './ProductAttachmentsManager';
import { detectProductMerchantColumn, PRODUCT_KIND_LABELS } from '../../lib/productSchema';
import type { ProductKind, ProductDeliveryMode } from '../../lib/productSchema';
import { useCurrency } from '../../lib/currency';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}


type FeeNoticeLevel = 'info' | 'warning' | 'danger';

interface PaymentFeeSetting {
  provider?: string | null;
  currency?: string | null;
  method_key?: string | null;
  fee_rate?: number | string | null;
  fixed_fee?: number | string | null;
  is_active?: boolean | null;
}

interface PriceFeeNotice {
  level: FeeNoticeLevel;
  title: string;
  description: string;
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
  'currency',
  'product_kind',
  'delivery_mode',
  'service_delivery_days',
  'service_revisions_count',
  'service_requirements_note',
  'quantity_limit',
  'quantity_sold'
];

const PRODUCT_IMAGES_BUCKET = 'product-images';
const PRODUCT_ATTACHMENTS_BUCKET = 'product-attachments';

function safeFileName(name: string) {
  return name
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function randomId() {
  // @ts-ignore
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    // @ts-ignore
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function uploadToStorage(params: {
  bucket: string;
  userId: string;
  productId: string;
  file: File;
}) {
  const { bucket, userId, productId, file } = params;

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const base = safeFileName(file.name.replace(/\.[^/.]+$/, '')) || 'file';
  const fileName = `${base}-${randomId()}.${ext}`;
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
  const { currencies } = useCurrency(profile?.id, (profile as any)?.preferred_currency);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState('');
  const [paymentFeeSettings, setPaymentFeeSettings] = useState<PaymentFeeSetting[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'SAR',
    product_kind: 'digital_product' as ProductKind,
    delivery_mode: 'instant' as ProductDeliveryMode,
    service_delivery_days: '',
    service_revisions_count: '',
    service_requirements_note: '',
    store_id: '',
    visibility: 'marketplace',
    quantity_limit_enabled: false,
    quantity_limit: '',
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);

  const normalizeCurrencyCode = (value?: string | null) => {
    const normalized = String(value || 'SAR').trim().toUpperCase();
    return normalized || 'SAR';
  };

  const roundMoney = (value: number) => {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  };


  const fetchPaymentFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_fee_settings')
        .select('provider,currency,method_key,fee_rate,fixed_fee,is_active')
        .eq('is_active', true)
        .order('currency', { ascending: true })
        .order('method_key', { ascending: true });

      if (error) {
        console.warn('Could not load payment fee settings:', error.message);
        setPaymentFeeSettings([]);
        return;
      }

      setPaymentFeeSettings((data || []) as PaymentFeeSetting[]);
    } catch (error) {
      console.warn('Could not load payment fee settings:', error);
      setPaymentFeeSettings([]);
    }
  };

  const getCurrencyRateToSar = (currencyCode?: string | null) => {
    const code = normalizeCurrencyCode(currencyCode);
    const currency = currencies.find((item: any) => normalizeCurrencyCode(item.code) === code) as any;
    const rate = Number(currency?.rate_to_sar ?? currency?.exchange_rate_to_sar ?? currency?.sar_rate ?? 0);

    if (!Number.isFinite(rate) || rate <= 0) {
      return code === 'SAR' ? 1 : null;
    }

    return rate;
  };

  const buildPriceFeeNotice = (): PriceFeeNotice | null => {
    const price = Number(formData.price);

    if (!formData.price || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    const currency = normalizeCurrencyCode(formData.currency);
    const selectedCurrencySettings = paymentFeeSettings.filter(
      (setting) => normalizeCurrencyCode(setting.currency) === currency
    );
    const sarSettings = paymentFeeSettings.filter(
      (setting) => normalizeCurrencyCode(setting.currency) === 'SAR'
    );

    const rateToSar = getCurrencyRateToSar(currency);
    const priceInSar = currency === 'SAR' ? price : rateToSar ? roundMoney(price * rateToSar) : null;

    const settingsForEstimate = selectedCurrencySettings.length > 0
      ? selectedCurrencySettings
      : priceInSar !== null
      ? sarSettings
      : [];
    const priceForEstimate = selectedCurrencySettings.length > 0 ? price : priceInSar ?? price;

    const feeEstimates = settingsForEstimate
      .map((setting) => {
        const rate = Number(setting.fee_rate || 0);
        const fixed = Number(setting.fixed_fee || 0);
        return roundMoney((priceForEstimate * rate) / 100 + fixed);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    const fixedFees = settingsForEstimate
      .map((setting) => Number(setting.fixed_fee || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const highestFixedFee = fixedFees.length ? Math.max(...fixedFees) : 0;
    const highestEstimatedFee = feeEstimates.length ? Math.max(...feeEstimates) : 0;
    const lowPriceThreshold = highestFixedFee > 0 ? highestFixedFee * 5 : 0;

    const isTooLowByGatewayFee =
      (highestFixedFee > 0 && priceForEstimate <= highestFixedFee) ||
      (highestEstimatedFee > 0 && priceForEstimate <= highestEstimatedFee);
    const isLowByGatewayFee = lowPriceThreshold > 0 && priceForEstimate < lowPriceThreshold;
    const isLowBySarValue = priceInSar !== null && priceInSar < 5;
    const isLowByRawFallback = priceInSar === null && price < 5;

    if (isTooLowByGatewayFee || isLowByGatewayFee || isLowBySarValue || isLowByRawFallback) {
      return {
        level: isTooLowByGatewayFee ? 'danger' : 'warning',
        title: 'تنبيه',
        description: 'السعر منخفض جدًا وقد تكون الأرباح قليلة جدًا أو شبه معدومة بعد خصم عمولة رقمي ورسوم الدفع.',
      };
    }

    return null;
  };

  const getPriceFeeNoticeClassName = (level: FeeNoticeLevel) => {
    if (level === 'danger') {
      return 'border-red-200 bg-red-50 text-red-800';
    }

    if (level === 'warning') {
      return 'border-amber-200 bg-amber-50 text-amber-800';
    }

    return 'border-blue-200 bg-blue-50 text-blue-800';
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchPaymentFeeSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'SAR',
      product_kind: 'digital_product' as ProductKind,
      delivery_mode: 'instant' as ProductDeliveryMode,
      service_delivery_days: '',
      service_revisions_count: '',
      service_requirements_note: '',
      store_id: '',
      visibility: 'marketplace',
      quantity_limit_enabled: false,
      quantity_limit: '',
    });
    setImages([]);
    setAttachments([]);
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

  const isQuantityLimitValid = () => {
    if (!formData.quantity_limit_enabled) return true;

    const value = Number(formData.quantity_limit);
    return Number.isInteger(value) && value > 0;
  };

  const getQuantityLimitValue = () => {
    if (!formData.quantity_limit_enabled) return null;

    const value = Number(formData.quantity_limit);
    if (!Number.isInteger(value) || value <= 0) return null;

    return value;
  };

  const isDigitalService = formData.product_kind === 'digital_service';
  const requiresInstantAttachments = formData.product_kind === 'digital_product';

  const isServiceDeliveryDaysValid = () => {
    if (!isDigitalService) return true;
    if (!formData.service_delivery_days.trim()) return true;
    const value = Number(formData.service_delivery_days);
    return Number.isInteger(value) && value > 0;
  };

  const isServiceRevisionsCountValid = () => {
    if (!isDigitalService) return true;
    if (!formData.service_revisions_count.trim()) return true;
    const value = Number(formData.service_revisions_count);
    return Number.isInteger(value) && value >= 0;
  };

  const getNullablePositiveInteger = (value: string) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const getNullableNonNegativeInteger = (value: string) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.price.trim().length > 0 &&
      images.length > 0 &&
      (!requiresInstantAttachments || attachments.length > 0) &&
      isQuantityLimitValid() &&
      isServiceDeliveryDaysValid() &&
      isServiceRevisionsCountValid()
    );
  };

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
      setError(isDigitalService ? 'يرجى إدخال الحقول المطلوبة وإضافة صورة واحدة على الأقل للخدمة' : 'يرجى إدخال جميع الحقول المطلوبة وإضافة صورة ومرفق واحد على الأقل');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError('السعر غير صالح');
      return;
    }

    if (formData.quantity_limit_enabled && !isQuantityLimitValid()) {
      setError('حد المبيعات يجب أن يكون رقمًا صحيحًا أكبر من صفر، أو اختر بدون حد.');
      return;
    }

    if (!isServiceDeliveryDaysValid()) {
      setError('مدة تنفيذ الخدمة يجب أن تكون رقمًا صحيحًا أكبر من صفر، أو اتركها فارغة.');
      return;
    }

    if (!isServiceRevisionsCountValid()) {
      setError('عدد التعديلات يجب أن يكون صفرًا أو رقمًا صحيحًا أكبر من صفر، أو اتركه فارغًا.');
      return;
    }

    setLoading(true);

    let createdProductId: string | null = null;

    try {
      const availableColumns = await detectProductColumns();

      console.group('🔍 Building Product Payload');
      console.log('Available columns:', availableColumns);

      let nameColumn: string | null = null;
      if (availableColumns.includes('title')) nameColumn = 'title';
      else if (availableColumns.includes('name')) nameColumn = 'name';
      else if (availableColumns.includes('product_name')) nameColumn = 'product_name';

      if (!nameColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود لاسم المنتج في جدول products.');
      }

      let descriptionColumn: string | null = null;
      if (availableColumns.includes('description')) descriptionColumn = 'description';
      else if (availableColumns.includes('details')) descriptionColumn = 'details';

      let priceColumn: string | null = null;
      if (availableColumns.includes('price')) priceColumn = 'price';
      else if (availableColumns.includes('amount')) priceColumn = 'amount';

      if (!priceColumn) {
        console.groupEnd();
        throw new Error('لا يوجد عمود للسعر في جدول products.');
      }

      const merchantColumn = await detectProductMerchantColumn();
      if (!merchantColumn) {
        console.groupEnd();
        throw new Error('تعذر تحديد عمود التاجر في products.');
      }

      const productPayload: any = {};
      productPayload[nameColumn] = formData.name.trim();

      if (descriptionColumn && formData.description?.trim()) {
        productPayload[descriptionColumn] = formData.description.trim();
      }

      productPayload[priceColumn] = price;

      if (availableColumns.includes('currency')) productPayload['currency'] = formData.currency;
      if (availableColumns.includes('product_kind')) productPayload['product_kind'] = formData.product_kind;
      if (availableColumns.includes('delivery_mode')) productPayload['delivery_mode'] = isDigitalService ? 'manual' : 'instant';
      if (availableColumns.includes('service_delivery_days')) {
        productPayload['service_delivery_days'] = isDigitalService
          ? getNullablePositiveInteger(formData.service_delivery_days)
          : null;
      }
      if (availableColumns.includes('service_revisions_count')) {
        productPayload['service_revisions_count'] = isDigitalService
          ? getNullableNonNegativeInteger(formData.service_revisions_count)
          : null;
      }
      if (availableColumns.includes('service_requirements_note')) {
        productPayload['service_requirements_note'] = isDigitalService && formData.service_requirements_note.trim()
          ? formData.service_requirements_note.trim()
          : null;
      }
      if (availableColumns.includes('visibility')) productPayload['visibility'] = formData.visibility;
      if (availableColumns.includes('is_active')) productPayload['is_active'] = true;
      if (availableColumns.includes('store_id')) productPayload['store_id'] = formData.store_id || null;

      if (availableColumns.includes('quantity_limit')) {
        productPayload['quantity_limit'] = getQuantityLimitValue();
      }

      if (availableColumns.includes('quantity_sold')) {
        productPayload['quantity_sold'] = 0;
      }

      productPayload[merchantColumn] = profile.id;

      console.log('✅ Final payload:', productPayload);
      console.groupEnd();

      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newProduct) throw new Error('فشل إنشاء المنتج');

      createdProductId = newProduct.id;
      console.log('✅ Product created:', createdProductId);

      const preparedImages = images.map((img, idx) => ({
        ...img,
        display_order: typeof img.display_order === 'number' ? img.display_order : idx,
      }));

      if (!preparedImages.some((i) => i.is_primary) && preparedImages.length > 0) {
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
            userId: authUserId,
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

      const uploadedAttachments = attachments.length > 0
        ? await Promise.all(
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
                userId: authUserId,
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
          )
        : [];

      if (uploadedAttachments.length > 0) {
        const { error: attachmentsError } = await supabase
          .from('product_attachments')
          .insert(uploadedAttachments);

        if (attachmentsError) throw attachmentsError;
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

  const itemLabel = isDigitalService ? 'الخدمة' : 'المنتج';
  const itemLabelWithDigital = isDigitalService ? 'الخدمة الرقمية' : 'المنتج الرقمي';
  const createButtonLabel = isDigitalService ? 'إضافة الخدمة' : 'إضافة المنتج';
  const priceFeeNotice = buildPriceFeeNotice();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">إضافة {itemLabel} جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
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

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">1. نوع العرض</h3>
              <p className="text-sm text-gray-500 mt-1">اختر هل تريد بيع منتج رقمي جاهز أو خدمة رقمية يتم تنفيذها بعد الطلب.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    product_kind: 'digital_product',
                    delivery_mode: 'instant',
                    service_delivery_days: '',
                    service_revisions_count: '',
                    service_requirements_note: '',
                  })
                }
                className={`rounded-xl border p-4 text-right transition-colors ${
                  formData.product_kind === 'digital_product'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Download className="w-5 h-5" />
                  {PRODUCT_KIND_LABELS.digital_product}
                </div>
                <p className="text-xs leading-6">ملف أو قالب أو محتوى جاهز يحصل عليه العميل فورًا بعد الدفع.</p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    product_kind: 'digital_service',
                    delivery_mode: 'manual',
                  })
                }
                className={`rounded-xl border p-4 text-right transition-colors ${
                  formData.product_kind === 'digital_service'
                    ? 'border-purple-600 bg-purple-50 text-purple-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Briefcase className="w-5 h-5" />
                  {PRODUCT_KIND_LABELS.digital_service}
                </div>
                <p className="text-xs leading-6">خدمة ينفذها التاجر بعد الشراء مثل تصميم، إعداد، كتابة محتوى، أو استشارة.</p>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">2. معلومات {itemLabel} الأساسية</h3>
              <p className="text-sm text-gray-500 mt-1">أدخل المعلومات الأساسية لـ {itemLabelWithDigital}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم {itemLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={isDigitalService ? 'مثال: تصميم بوست احترافي لحسابك' : 'مثال: قالب إدارة الميزانية الشهرية'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف {itemLabel}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={isDigitalService ? 'اكتب وصفًا واضحًا للخدمة، ما الذي ستنفذه، وما الذي سيحصل عليه العميل.' : 'اكتب وصفًا تفصيليًا عن المنتج ومميزاته.'}
              />
            </div>

            {isDigitalService && (
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-4">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <Clock3 className="w-5 h-5" />
                  إعدادات الخدمة الرقمية
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مدة تنفيذ الخدمة بالأيام</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.service_delivery_days}
                      onChange={(e) => setFormData({ ...formData, service_delivery_days: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="مثال: 3"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عدد التعديلات المشمولة</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.service_revisions_count}
                      onChange={(e) => setFormData({ ...formData, service_revisions_count: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="مثال: 2"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">متطلبات تنفيذ الخدمة</label>
                  <textarea
                    value={formData.service_requirements_note}
                    onChange={(e) => setFormData({ ...formData, service_requirements_note: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="مثال: بعد الشراء سيحتاج العميل إلى إرسال الألوان، النصوص، الشعار، والمقاسات المطلوبة."
                  />
                  <p className="text-xs text-purple-700 mt-2">هذه الملاحظة تظهر للعميل وتساعده يعرف ما الذي يجب إرساله بعد شراء الخدمة.</p>
                </div>
              </div>
            )}

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
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {priceFeeNotice && (
              <div className={`mt-4 rounded-xl border p-4 ${getPriceFeeNoticeClassName(priceFeeNotice.level)}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">{priceFeeNotice.title}</p>
                    <p className="text-sm leading-6 mt-1">{priceFeeNotice.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">3. صور {itemLabel}</h3>
              <p className="text-sm text-gray-500 mt-1">أضف صورًا توضيحية لـ {itemLabelWithDigital}</p>
            </div>

            <ProductImagesManager images={images} onChange={setImages} maxImages={8} />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">4. {isDigitalService ? 'مرفقات اختيارية للخدمة' : 'مرفقات المنتج الرقمي'}</h3>
              <p className="text-sm text-gray-500 mt-1">{isDigitalService ? 'يمكنك إضافة ملف تعريفي أو تعليمات اختيارية، ولا يشترط وجود مرفق للخدمة.' : 'المحتوى الذي سيحصل عليه العميل بعد الشراء'}</p>
            </div>

            <ProductAttachmentsManager attachments={attachments} onChange={setAttachments} productKind={formData.product_kind} required={requiresInstantAttachments} />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">5. التسعير والظهور</h3>
              <p className="text-sm text-gray-500 mt-1">حدد إعدادات النشر والعرض وحد المبيعات</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المتجر التابع له</label>
              <select
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{isDigitalService ? 'خدمة مستقلة (بدون متجر)' : 'منتج مستقل (بدون متجر)'}</option>
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

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">حد المبيعات</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      quantity_limit_enabled: false,
                      quantity_limit: '',
                    })
                  }
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                    !formData.quantity_limit_enabled
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  بدون حد
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      quantity_limit_enabled: true,
                    })
                  }
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                    formData.quantity_limit_enabled
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  عدد محدود
                </button>
              </div>

              {formData.quantity_limit_enabled ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأقصى للمبيعات <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity_limit}
                    onChange={(e) => setFormData({ ...formData, quantity_limit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: 100"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    عند الوصول لهذا العدد سيتم منع شراء {itemLabel} حتى ترفع الحد أو تجعله بدون حد.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {itemLabel} متاح للبيع بدون حد أقصى لعدد مرات الشراء.
                </p>
              )}
            </div>
          </div>

          {!isFormValid() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">لإتمام إنشاء {itemLabel}، يجب:</p>
              <ul className="text-sm text-blue-800 space-y-1 mr-4">
                {!formData.name.trim() && <li>• إدخال اسم {itemLabel}</li>}
                {!formData.price.trim() && <li>• إدخال السعر</li>}
                {images.length === 0 && <li>• إضافة صورة واحدة على الأقل</li>}
                {requiresInstantAttachments && attachments.length === 0 && <li>• إضافة مرفق واحد على الأقل للمنتج الرقمي</li>}
                {!isServiceDeliveryDaysValid() && <li>• إدخال مدة تنفيذ صحيحة للخدمة</li>}
                {!isServiceRevisionsCountValid() && <li>• إدخال عدد تعديلات صحيح للخدمة</li>}
                {formData.quantity_limit_enabled && !isQuantityLimitValid() && (
                  <li>• إدخال حد مبيعات صحيح أكبر من صفر</li>
                )}
              </ul>
            </div>
          )}

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
                createButtonLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
