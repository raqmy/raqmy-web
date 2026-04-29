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
  }, [isOpen, productId]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error || !data) {
        setError('تعذر تحميل بيانات المنتج');
        return;
      }

      setProduct(data);

      setFormData({
        name: safeStr((data as any).title ?? (data as any).name),
        description: safeStr((data as any).description),
        price: safeStr((data as any).price),
        currency: safeStr((data as any).currency || 'SAR'),
        store_id: safeStr((data as any).store_id),
        visibility: safeStr((data as any).visibility || 'marketplace'),
        is_active: Boolean((data as any).is_active),
      });

      const { data: imgs } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (imgs) {
        setImages(
          imgs.map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: img.is_primary,
            display_order: img.display_order,
          }))
        );

        setExistingImageIds(imgs.map((img: any) => img.id));
      }

      const { data: atts } = await supabase
        .from('product_attachments')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (atts) {
        setAttachments(
          atts.map((att: any) => ({
            id: att.id,
            title: att.title,
            attachment_type: att.attachment_type,
            file_url: att.file_url,
            text_content: att.text_content,
            file_size: att.file_size,
            display_order: att.display_order,
          }))
        );

        setExistingAttachmentIds(atts.map((att: any) => att.id));
      }
    } catch {
      setError('حدث خطأ أثناء تحميل المنتج');
    }
  };

  const fetchStores = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true);

    if (data) setStores(data);
  };

  const isFormValid = () => {
    return (
      safeTrim(formData.name) &&
      safeTrim(formData.price) &&
      images.length > 0 &&
      attachments.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      setError('أكمل جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await supabase
        .from('products')
        .update({
          title: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          currency: formData.currency,
          store_id: formData.store_id || null,
          visibility: formData.visibility,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      const currentImageIds = images.filter((i) => i.id).map((i) => i.id!);
      const deleteImages = existingImageIds.filter((id) => !currentImageIds.includes(id));

      if (deleteImages.length) {
        await supabase.from('product_images').delete().in('id', deleteImages);
      }

      for (const img of images) {
        if (img.id) {
          await supabase
            .from('product_images')
            .update({
              is_primary: img.is_primary,
              display_order: img.display_order,
            })
            .eq('id', img.id);
        } else {
          await supabase.from('product_images').insert({
            product_id: productId,
            image_url: img.image_url,
            is_primary: img.is_primary,
            display_order: img.display_order,
          });
        }
      }

      const currentAttIds = attachments.filter((a) => a.id).map((a) => a.id!);
      const deleteAtts = existingAttachmentIds.filter((id) => !currentAttIds.includes(id));

      if (deleteAtts.length) {
        await supabase.from('product_attachments').delete().in('id', deleteAtts);
      }

      for (const att of attachments) {
        if (att.id) {
          await supabase
            .from('product_attachments')
            .update({
              title: att.title,
              display_order: att.display_order,
            })
            .eq('id', att.id);
        } else {
          await supabase.from('product_attachments').insert({
            product_id: productId,
            title: att.title,
            attachment_type: att.attachment_type,
            file_url: att.file_url || null,
            text_content: att.text_content || null,
            file_size: att.file_size || null,
            display_order: att.display_order,
          });
        }
      }

      onSuccess();
      onClose();
    } catch {
      setError('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف المنتج؟')) return;

    setDeleting(true);

    try {
      await supabase.from('products').delete().eq('id', productId);
      onDelete();
      onClose();
    } catch {
      setError('فشل حذف المنتج');
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

            <input
              type="text"
              placeholder="اسم المنتج"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-xl"
            />

            <textarea
              rows={4}
              placeholder="وصف المنتج"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-xl"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="السعر"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl"
              />

              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl"
              >
                <option value="SAR">ريال سعودي</option>
                <option value="USD">دولار</option>
                <option value="EUR">يورو</option>
              </select>
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
              <h3 className="font-bold text-lg">3. مرفقات المنتج</h3>
            </div>

            <ProductAttachmentsManager
              attachments={attachments}
              onChange={setAttachments}
            />
          </div>

          <div className="space-y-6">
            <div className="pb-3 border-b">
              <h3 className="font-bold text-lg">4. التسعير والظهور</h3>
            </div>

            <select
              value={formData.store_id}
              onChange={(e) =>
                setFormData({ ...formData, store_id: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-xl"
            >
              <option value="">منتج مستقل (بدون متجر)</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>

            <select
              value={formData.visibility}
              onChange={(e) =>
                setFormData({ ...formData, visibility: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-xl"
            >
              <option value="marketplace">عرض في السوق العام</option>
              <option value="public">في المتجر فقط</option>
              <option value="private">رابط مباشر فقط</option>
            </select>

            <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
              />
              المنتج نشط
            </label>
          </div>

          {!isFormValid() && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
              أكمل الحقول المطلوبة وأضف صورة ومرفق واحد على الأقل
            </div>
          )}

          <div className="pt-6 border-t flex items-center gap-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
            >
              {deleting ? 'جاري الحذف...' : 'حذف المنتج'}
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border rounded-xl font-semibold"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
