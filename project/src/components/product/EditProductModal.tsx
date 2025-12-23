import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase, Product, Store, StoreCategory } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CopyLinkButton } from '../shared/CopyLinkButton';

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
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'SAR',
    store_id: '',
    category: 'other',
    is_subscription: false,
    subscription_period: 'monthly',
    visibility: 'marketplace',
    delivery_method: 'instant',
    coupons_enabled: false,
    is_active: true,
  });

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct();
      fetchStores();
      fetchCategories();
    }
  }, [isOpen, productId]);

  const fetchProduct = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (data) {
      setProduct(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        price: data.price.toString(),
        currency: data.currency,
        store_id: data.store_id || '',
        category: data.category || 'other',
        is_subscription: data.is_subscription,
        subscription_period: data.subscription_period || 'monthly',
        visibility: data.visibility,
        delivery_method: data.delivery_method || 'instant',
        coupons_enabled: data.coupons_enabled || false,
        is_active: data.is_active,
      });
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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('store_categories')
      .select('*')
      .order('name_ar');
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!product) return;

    setLoading(true);

    try {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        throw new Error('السعر غير صالح');
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description || null,
          price,
          currency: formData.currency,
          store_id: formData.store_id || null,
          category: formData.category,
          is_subscription: formData.is_subscription,
          subscription_period: formData.is_subscription ? formData.subscription_period : null,
          visibility: formData.visibility,
          delivery_method: formData.delivery_method,
          coupons_enabled: formData.coupons_enabled,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', productId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'حدث خطأ أثناء تحديث المنتج');
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
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;

      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'حدث خطأ أثناء حذف المنتج');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">تعديل المنتج</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف المنتج
            </label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المتجر التابع له
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name_ar}
                  </option>
                ))}
              </select>
            </div>
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
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
