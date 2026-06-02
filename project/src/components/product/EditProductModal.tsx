import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Trash2, Briefcase, Download, Clock3 } from 'lucide-react';
import { supabase, Product, Store } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CopyLinkButton } from '../shared/CopyLinkButton';
import { ProductImagesManager, ProductImage } from './ProductImagesManager';
import { ProductAttachmentsManager, ProductAttachment } from './ProductAttachmentsManager';
import { useCurrency } from '../../lib/currency';
import { PRODUCT_KIND_LABELS, PRODUCT_DELIVERY_MODE_LABELS, normalizeProductKind, normalizeProductDeliveryMode } from '../../lib/productSchema';
import type { ProductKind, ProductDeliveryMode } from '../../lib/productSchema';

interface EditProductModalProps {
  isOpen: boolean;
  productId: string;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  productId,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const { profile } = useAuth();
  const { currencies } = useCurrency(profile?.id, (profile as any)?.preferred_currency);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);

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
    is_active: true,
    quantity_limit_enabled: false,
    quantity_limit: '',
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);

  const [existingImageIds, setExistingImageIds] = useState<string[]>([]);
  const [existingAttachmentIds, setExistingAttachmentIds] = useState<string[]>([]);

  const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));
  const safeTrim = (v: any) => safeStr(v).trim();

  useEffect(() => {
    if (isOpen && productId) {
      setError('');
      setLoading(false);
      setDeleting(false);

      fetchProduct();
      fetchStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error || !data) {
        console.error('fetchProduct error:', error);
        setError('تعذر تحميل بيانات المنتج');
        return;
      }

      setProduct(data);

      const quantityLimit = (data as any).quantity_limit;
      const productKind = normalizeProductKind((data as any).product_kind);
      const deliveryMode = normalizeProductDeliveryMode((data as any).delivery_mode, productKind);

      setFormData({
        name: safeStr((data as any).title ?? (data as any).name),
        description: safeStr((data as any).description),
        price: safeStr((data as any).price),
        currency: safeStr((data as any).currency || 'SAR'),
        product_kind: productKind,
        delivery_mode: deliveryMode,
        service_delivery_days: safeStr((data as any).service_delivery_days),
        service_revisions_count: safeStr((data as any).service_revisions_count),
        service_requirements_note: safeStr((data as any).service_requirements_note),
        store_id: safeStr((data as any).store_id),
        visibility: safeStr((data as any).visibility || 'marketplace'),
        is_active: Boolean((data as any).is_active),
        quantity_limit_enabled: quantityLimit !== null && quantityLimit !== undefined,
        quantity_limit: quantityLimit !== null && quantityLimit !== undefined ? safeStr(quantityLimit) : '',
      });

      const { data: imgs, error: imgsError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (imgsError) {
        console.error('fetch product_images error:', imgsError);
        setImages([]);
        setExistingImageIds([]);
      } else if (imgs) {
        setImages(
          imgs.map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: Boolean(img.is_primary),
            display_order: Number(img.display_order ?? 0),
          }))
        );

        setExistingImageIds(imgs.map((img: any) => img.id));
      } else {
        setImages([]);
        setExistingImageIds([]);
      }

      const { data: atts, error: attsError } = await supabase
        .from('product_attachments')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (attsError) {
        console.error('fetch product_attachments error:', attsError);
        setAttachments([]);
        setExistingAttachmentIds([]);
      } else if (atts) {
        setAttachments(
          atts.map((att: any) => ({
            id: att.id,
            title: safeStr(att.title),
            attachment_type: safeStr(att.attachment_type),
            file_url: att.file_url || undefined,
            text_content: att.text_content || undefined,
            file_size: att.file_size || undefined,
            display_order: Number(att.display_order ?? 0),
          }))
        );

        setExistingAttachmentIds(atts.map((att: any) => att.id));
      } else {
        setAttachments([]);
        setExistingAttachmentIds([]);
      }
    } catch (err) {
      console.error('fetchProduct unexpected error:', err);
      setError('حدث خطأ أثناء تحميل المنتج');
    }
  };

  const fetchStores = async () => {
    if (!profile) return;

    try {
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
    } catch (err) {
      console.error('fetchStores unexpected error:', err);
    }
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
  const requiresInstantAttachments = !isDigitalService && formData.delivery_mode === 'instant';

  const isServiceDeliveryDaysValid = () => {
    if (!isDigitalService) return true;
    if (!safeTrim(formData.service_delivery_days)) return true;
    const value = Number(formData.service_delivery_days);
    return Number.isInteger(value) && value > 0;
  };

  const isServiceRevisionsCountValid = () => {
    if (!isDigitalService) return true;
    if (!safeTrim(formData.service_revisions_count)) return true;
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
    return Boolean(
      safeTrim(formData.name) &&
        safeTrim(formData.price) &&
        images.length > 0 &&
        (!requiresInstantAttachments || attachments.length > 0) &&
        isQuantityLimitValid() &&
        isServiceDeliveryDaysValid() &&
        isServiceRevisionsCountValid()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      setError(isDigitalService ? 'أكمل الحقول المطلوبة وأضف صورة واحدة على الأقل للخدمة' : 'أكمل جميع الحقول المطلوبة وأضف صورة ومرفق واحد على الأقل');
      return;
    }

    const price = parseFloat(safeStr(formData.price));
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
    setError('');

    try {
      const updatePayload: Record<string, any> = {
        title: safeTrim(formData.name),
        description: safeTrim(formData.description) ? safeTrim(formData.description) : null,
        price,
        currency: formData.currency || 'SAR',
        product_kind: formData.product_kind,
        delivery_mode: isDigitalService ? 'manual' : formData.delivery_mode,
        service_delivery_days: isDigitalService ? getNullablePositiveInteger(formData.service_delivery_days) : null,
        service_revisions_count: isDigitalService ? getNullableNonNegativeInteger(formData.service_revisions_count) : null,
        service_requirements_note: isDigitalService && safeTrim(formData.service_requirements_note) ? safeTrim(formData.service_requirements_note) : null,
        store_id: formData.store_id || null,
        visibility: formData.visibility || 'marketplace',
        is_active: Boolean(formData.is_active),
        quantity_limit: getQuantityLimitValue(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      const currentImageIds = images.filter((i) => i.id).map((i) => i.id!);
      const deleteImages = existingImageIds.filter((id) => !currentImageIds.includes(id));

      if (deleteImages.length) {
        const { error: deleteImagesError } = await supabase
          .from('product_images')
          .delete()
          .in('id', deleteImages);

        if (deleteImagesError) {
          console.error('delete product_images error:', deleteImagesError);
        }
      }

      for (const img of images) {
        if (img.id) {
          const { error: updateImageError } = await supabase
            .from('product_images')
            .update({
              is_primary: Boolean(img.is_primary),
              display_order: Number(img.display_order ?? 0),
            })
            .eq('id', img.id);

          if (updateImageError) {
            console.error('update product_images error:', updateImageError);
          }
        } else {
          const { error: insertImageError } = await supabase.from('product_images').insert({
            product_id: productId,
            image_url: img.image_url,
            is_primary: Boolean(img.is_primary),
            display_order: Number(img.display_order ?? 0),
          });

          if (insertImageError) {
            console.error('insert product_images error:', insertImageError);
          }
        }
      }

      const currentAttIds = attachments.filter((a) => a.id).map((a) => a.id!);
      const deleteAtts = existingAttachmentIds.filter((id) => !currentAttIds.includes(id));

      if (deleteAtts.length) {
        const { error: deleteAttachmentsError } = await supabase
          .from('product_attachments')
          .delete()
          .in('id', deleteAtts);

        if (deleteAttachmentsError) {
          console.error('delete product_attachments error:', deleteAttachmentsError);
        }
      }

      for (const att of attachments) {
        if (att.id) {
          const { error: updateAttachmentError } = await supabase
            .from('product_attachments')
            .update({
              title: safeStr(att.title),
              display_order: Number(att.display_order ?? 0),
            })
            .eq('id', att.id);

          if (updateAttachmentError) {
            console.error('update product_attachments error:', updateAttachmentError);
          }
        } else {
          const { error: insertAttachmentError } = await supabase.from('product_attachments').insert({
            product_id: productId,
            title: safeStr(att.title),
            attachment_type: safeStr(att.attachment_type),
            file_url: att.file_url || null,
            text_content: att.text_content || null,
            file_size: att.file_size || null,
            display_order: Number(att.display_order ?? 0),
          });

          if (insertAttachmentError) {
            console.error('insert product_attachments error:', insertAttachmentError);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating product:', err);

      const message = safeStr(err?.message);

      if (message.includes('quantity_limit')) {
        setError('تعذر حفظ حد المبيعات. تأكد أن عمود quantity_limit موجود في جدول products.');
      } else {
        setError(message || 'حدث خطأ أثناء حفظ التعديلات');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف المنتج؟')) return;

    setDeleting(true);
    setError('');

    try {
      const { data, error: deleteError } = await supabase.rpc('seller_delete_product', {
        p_product_id: productId,
      });

      if (deleteError) {
        throw deleteError;
      }

      const result = data as { success?: boolean; message?: string } | null;

      if (result && result.success === false) {
        throw new Error(result.message || 'فشل حذف المنتج');
      }

      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error deleting product:', err);

      const message = safeStr(err?.message);

      if (message.includes('function public.seller_delete_product')) {
        setError('تعذر حذف المنتج لأن دالة seller_delete_product غير موجودة في Supabase. شغّل SQL الخاص بالدالة أولاً.');
      } else {
        setError(message || 'فشل حذف المنتج');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">تعديل المنتج</h2>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {product && (
            <div className="mt-4 flex justify-end">
              <CopyLinkButton
                url={`${window.location.origin}/#/product-${product.id}`}
                label="نسخ رابط المنتج"
                variant="minimal"
              />
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-6 space-y-8 max-h-[calc(100vh-170px)] overflow-y-auto"
        >
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="pb-3 border-b">
              <h3 className="font-bold text-lg">1. معلومات المنتج الأساسية</h3>
              <p className="text-sm text-gray-500">أدخل المعلومات الأساسية</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="اسم المنتج"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف المنتج</label>
              <textarea
                rows={4}
                placeholder="وصف المنتج"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                <p className="text-xs leading-6">ملف أو قالب أو محتوى جاهز يحصل عليه العميل بعد الدفع.</p>
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
                <p className="text-xs leading-6">خدمة ينفذها التاجر بعد الشراء مثل تصميم أو إعداد أو استشارة.</p>
              </button>
            </div>

            {!isDigitalService && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">طريقة تسليم المنتج</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, delivery_mode: 'instant' })}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      formData.delivery_mode === 'instant'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {PRODUCT_DELIVERY_MODE_LABELS.instant}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, delivery_mode: 'manual' })}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      formData.delivery_mode === 'manual'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {PRODUCT_DELIVERY_MODE_LABELS.manual}
                  </button>
                </div>
              </div>
            )}

            {isDigitalService && (
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-4">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <Clock3 className="w-5 h-5" />
                  إعدادات الخدمة الرقمية
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مدة التنفيذ بالأيام</label>
                    <input type="number" min="1" step="1" value={formData.service_delivery_days} onChange={(e) => setFormData({ ...formData, service_delivery_days: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="مثال: 3" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عدد التعديلات المشمولة</label>
                    <input type="number" min="0" step="1" value={formData.service_revisions_count} onChange={(e) => setFormData({ ...formData, service_revisions_count: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="مثال: 2" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات ومتطلبات الخدمة</label>
                  <textarea value={formData.service_requirements_note} onChange={(e) => setFormData({ ...formData, service_requirements_note: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="مثال: بعد الشراء سيحتاج العميل إلى إرسال الألوان، النصوص، الشعار، والمقاسات المطلوبة." />
                  <p className="text-xs text-purple-700 mt-2">هذه الملاحظة تساعد العميل يعرف ماذا سيجهز بعد شراء الخدمة.</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="السعر"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العملة</label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b">
              <h3 className="font-bold text-lg">2. صور المنتج</h3>
            </div>

            <ProductImagesManager images={images} onChange={setImages} maxImages={8} />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b">
              <h3 className="font-bold text-lg">3. {isDigitalService ? 'مرفقات اختيارية للخدمة' : 'مرفقات المنتج'}</h3>
              <p className="text-sm text-gray-500 mt-1">{isDigitalService ? 'يمكنك إضافة ملف تعريفي أو تعليمات اختيارية، ولا يشترط وجود مرفق للخدمة.' : 'المحتوى الذي سيحصل عليه العميل بعد الشراء.'}</p>
            </div>

            <ProductAttachmentsManager
              attachments={attachments}
              onChange={setAttachments}
            />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b">
              <h3 className="font-bold text-lg">4. التسعير والظهور</h3>
              <p className="text-sm text-gray-500">حدد إعدادات النشر والعرض وحد المبيعات</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المتجر التابع له</label>
              <select
                value={formData.store_id}
                onChange={(e) =>
                  setFormData({ ...formData, store_id: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={(e) =>
                  setFormData({ ...formData, visibility: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="marketplace">عرض في السوق العام</option>
                <option value="public">في المتجر فقط</option>
                <option value="private">رابط مباشر فقط</option>
              </select>
            </div>

            <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              المنتج نشط
            </label>

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
                    عند الوصول لهذا العدد سيتم منع شراء المنتج حتى ترفع الحد أو تجعله بدون حد.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  المنتج متاح للبيع بدون حد أقصى لعدد مرات الشراء.
                </p>
              )}
            </div>
          </div>

          {!isFormValid() && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <p className="font-medium mb-2">لحفظ التغييرات، يجب:</p>
              <ul className="space-y-1 mr-4">
                {!safeTrim(formData.name) && <li>• إدخال اسم المنتج</li>}
                {!safeTrim(formData.price) && <li>• إدخال السعر</li>}
                {images.length === 0 && <li>• إضافة صورة واحدة على الأقل</li>}
                {requiresInstantAttachments && attachments.length === 0 && <li>• إضافة مرفق واحد على الأقل للمنتج الفوري</li>}
                {!isServiceDeliveryDaysValid() && <li>• إدخال مدة تنفيذ صحيحة للخدمة</li>}
                {!isServiceRevisionsCountValid() && <li>• إدخال عدد تعديلات صحيح للخدمة</li>}
                {formData.quantity_limit_enabled && !isQuantityLimitValid() && (
                  <li>• إدخال حد مبيعات صحيح أكبر من صفر</li>
                )}
              </ul>
            </div>
          )}

          <div className="pt-6 border-t flex items-center gap-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  <span>حذف المنتج</span>
                </>
              )}
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
