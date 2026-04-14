import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase, Product, Store } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CopyLinkButton } from '../shared/CopyLinkButton';
import { ProductImagesManager, ProductImage } from './ProductImagesManager';
import { ProductAttachmentsManager, ProductAttachment } from './ProductAttachmentsManager';

interface EditProductModalProps {
  isOpen: boolean;
  productId: string;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  productId,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'SAR',
    store_id: '',
    visibility: 'marketplace',
    is_active: true,
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');

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
      fetchCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId]);

  const fetchProduct = async () => {
    try {
      setError('');

      const { data, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (productError) {
        console.error('fetchProduct error:', productError);
        setError('تعذر جلب بيانات المنتج. حاول تحديث الصفحة.');
        return;
      }

      if (!data) {
        setError('المنتج غير موجود أو تم حذفه.');
        return;
      }

      setProduct(data);

      const dbName = (data as any)?.title ?? (data as any)?.name ?? '';
      const dbCurrency = (data as any)?.currency ?? 'SAR';
      const dbVisibility = (data as any)?.visibility ?? 'marketplace';

      setFormData({
        name: safeStr(dbName),
        description: safeStr((data as any)?.description),
        price: safeStr((data as any)?.price ?? ''),
        currency: safeStr(dbCurrency) || 'SAR',
        store_id: safeStr((data as any)?.store_id),
        visibility: safeStr(dbVisibility) || 'marketplace',
        is_active: Boolean((data as any)?.is_active),
      });

      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (imagesError) {
        console.error('fetch product_images error:', imagesError);
        setImages([]);
        setExistingImageIds([]);
      } else if (imagesData) {
        setImages(
          imagesData.map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: Boolean(img.is_primary),
            display_order: Number(img.display_order ?? 0),
          }))
        );
        setExistingImageIds(imagesData.map((img: any) => img.id));
      } else {
        setImages([]);
        setExistingImageIds([]);
      }

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('product_attachments')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (attachmentsError) {
        console.error('fetch product_attachments error:', attachmentsError);
        setAttachments([]);
        setExistingAttachmentIds([]);
      } else if (attachmentsData) {
        setAttachments(
          attachmentsData.map((att: any) => ({
            id: att.id,
            title: safeStr(att.title),
            attachment_type: safeStr(att.attachment_type),
            file_url: att.file_url || undefined,
            text_content: att.text_content || undefined,
            file_size: att.file_size || undefined,
            display_order: Number(att.display_order ?? 0),
          }))
        );
        setExistingAttachmentIds(attachmentsData.map((att: any) => att.id));
      } else {
        setAttachments([]);
        setExistingAttachmentIds([]);
      }

      const { data: couponLink, error: couponLinkError } = await supabase
        .from('coupon_products')
        .select('coupon_id')
        .eq('product_id', productId)
        .maybeSingle();

      if (couponLinkError) {
        console.error('fetch coupon_products error:', couponLinkError);
        setSelectedCouponId('');
      } else if (couponLink?.coupon_id) {
        setSelectedCouponId(safeStr(couponLink.coupon_id));
      } else {
        setSelectedCouponId('');
      }
    } catch (e) {
      console.error('fetchProduct unexpected error:', e);
      setError('حدث خطأ غير متوقع أثناء تحميل المنتج.');
    }
  };

  const fetchStores = async () => {
    try {
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
    } catch (e) {
      console.error('fetchStores unexpected error:', e);
    }
  };

  const fetchCoupons = async () => {
    try {
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
    } catch (e) {
      console.error('fetchCoupons unexpected error:', e);
    }
  };

  const isFormValid = () => {
    return (
      safeTrim(formData.name).length > 0 &&
      safeTrim(formData.price).length > 0 &&
      images.length > 0 &&
      attachments.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!product) return;

    if (!isFormValid()) {
      setError('يرجى إدخال جميع الحقول المطلوبة وإضافة صورة ومرفق واحد على الأقل');
      return;
    }

    const price = parseFloat(safeStr(formData.price));
    if (isNaN(price) || price < 0) {
      setError('السعر غير صالح');
      return;
    }

    setLoading(true);

    try {
      const productUpdatePayload: Record<string, any> = {
        title: safeStr(formData.name),
        description: safeStr(formData.description) ? safeStr(formData.description) : null,
        price,
        currency: safeStr(formData.currency) || 'SAR',
        store_id: safeStr(formData.store_id) ? safeStr(formData.store_id) : null,
        visibility: safeStr(formData.visibility) || 'marketplace',
        is_active: Boolean(formData.is_active),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('products')
        .update(productUpdatePayload)
        .eq('id', productId);

      if (updateError) throw updateError;

      const currentImageIds = images.filter((img) => img.id).map((img) => img.id!);
      const imagesToDelete = existingImageIds.filter((id) => !currentImageIds.includes(id));

      if (imagesToDelete.length > 0) {
        const { error: delImgErr } = await supabase.from('product_images').delete().in('id', imagesToDelete);
        if (delImgErr) console.error('delete images error:', delImgErr);
      }

      for (const img of images.filter((img) => img.id)) {
        const { error: updImgErr } = await supabase
          .from('product_images')
          .update({
            is_primary: Boolean(img.is_primary),
            display_order: Number(img.display_order ?? 0),
          })
          .eq('id', img.id!);

        if (updImgErr) console.error('update image error:', updImgErr);
      }

      const newImages = images.filter((img) => !img.id);
      if (newImages.length > 0) {
        const imageInserts = newImages.map((img) => ({
          product_id: productId,
          image_url: img.image_url,
          is_primary: Boolean(img.is_primary),
          display_order: Number(img.display_order ?? 0),
        }));

        const { error: insImgErr } = await supabase.from('product_images').insert(imageInserts);
        if (insImgErr) console.error('insert images error:', insImgErr);
      }

      const currentAttachmentIds = attachments.filter((att) => att.id).map((att) => att.id!);
      const attachmentsToDelete = existingAttachmentIds.filter((id) => !currentAttachmentIds.includes(id));

      if (attachmentsToDelete.length > 0) {
        const { error: delAttErr } = await supabase
          .from('product_attachments')
          .delete()
          .in('id', attachmentsToDelete);

        if (delAttErr) console.error('delete attachments error:', delAttErr);
      }

      for (const att of attachments.filter((att) => att.id)) {
        const { error: updAttErr } = await supabase
          .from('product_attachments')
          .update({
            title: safeStr(att.title),
            display_order: Number(att.display_order ?? 0),
          })
          .eq('id', att.id!);

        if (updAttErr) console.error('update attachment error:', updAttErr);
      }

      const newAttachments = attachments.filter((att) => !att.id);
      if (newAttachments.length > 0) {
        const attachmentInserts = newAttachments.map((att) => ({
          product_id: productId,
          title: safeStr(att.title),
          attachment_type: safeStr(att.attachment_type),
          file_url: att.file_url || null,
          text_content: att.text_content || null,
          file_size: att.file_size || null,
          display_order: Number(att.display_order ?? 0),
        }));

        const { error: insAttErr } = await supabase.from('product_attachments').insert(attachmentInserts);
        if (insAttErr) console.error('insert attachments error:', insAttErr);
      }

      const { error: delCouponLinkErr } = await supabase
        .from('coupon_products')
        .delete()
        .eq('product_id', productId);

      if (delCouponLinkErr) {
        console.error('delete coupon_products error:', delCouponLinkErr);
      }

      if (safeStr(selectedCouponId)) {
        const { error: insCouponLinkErr } = await supabase.from('coupon_products').insert({
          coupon_id: selectedCouponId,
          product_id: productId,
        });

        if (insCouponLinkErr) {
          console.error('insert coupon_products error:', insCouponLinkErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating product:', err);

      const msg = safeStr(err?.message);

      const userMessage =
        msg.includes('schema') || msg.includes('column')
          ? 'تعذر تحديث المنتج بسبب إعدادات قاعدة البيانات/الأعمدة. تأكد من الأعمدة المطلوبة أو تواصل مع الدعم.'
          : msg || 'حدث خطأ أثناء تحديث المنتج';

      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
      if (deleteError) throw deleteError;

      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(safeStr(err?.message) || 'حدث خطأ أثناء حذف المنتج');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">تعديل المنتج</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {product && (
            <CopyLinkButton
              url={`${window.location.origin}/#/product-${product.id}`}
              label="نسخ رابط المنتج"
              variant="minimal"
            />
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

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

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">2. صور المنتج</h3>
              <p className="text-sm text-gray-500 mt-1">أضف صور توضيحية للمنتج</p>
            </div>

            <ProductImagesManager images={images} onChange={setImages} maxImages={8} />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">3. مرفقات المنتج الرقمي</h3>
              <p className="text-sm text-gray-500 mt-1">المحتوى الذي سيحصل عليه العميل بعد الشراء</p>
            </div>

            <ProductAttachmentsManager attachments={attachments} onChange={setAttachments} />
          </div>

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

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="is_active_edit"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active_edit" className="text-sm text-gray-700 cursor-pointer">
                المنتج نشط
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">5. كوبونات الخصم</h3>
              <p className="text-sm text-gray-500 mt-1">اختر كوبون خصم لربطه بهذا المنتج (اختياري)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">كوبون الخصم</label>
              <select
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">عدم إضافة كوبونات خصم</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code} -{' '}
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}%`
                      : `${coupon.discount_value} ريال`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isFormValid() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">لحفظ التغييرات، يجب:</p>
              <ul className="text-sm text-blue-800 space-y-1 mr-4">
                {!safeTrim(formData.name) && <li>• إدخال اسم المنتج</li>}
                {!safeTrim(formData.price) && <li>• إدخال السعر</li>}
                {images.length === 0 && <li>• إضافة صورة واحدة على الأقل</li>}
                {attachments.length === 0 && <li>• إضافة مرفق واحد على الأقل</li>}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
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

            <div className="flex-1"></div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
