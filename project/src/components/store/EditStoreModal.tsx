import React, { useState, useEffect } from 'react';
import { X, Store as StoreIcon, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase, Store, StoreCategory } from '../../lib/supabase';
import { CopyLinkButton } from '../shared/CopyLinkButton';

interface EditStoreModalProps {
  isOpen: boolean;
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export const EditStoreModal: React.FC<EditStoreModalProps> = ({
  isOpen,
  storeId,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [error, setError] = useState('');
  const [store, setStore] = useState<Store | null>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    default_currency: 'SAR',
    show_in_marketplace: true,
    email: '',
    twitter: '',
    instagram: '',
    telegram: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen && storeId) {
      fetchStore();
      fetchCategories();
      fetchUserProducts();
    }
  }, [isOpen, storeId]);

  const fetchStore = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (data) {
      setStore(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        category: data.category || 'other',
        default_currency: data.default_currency || 'SAR',
        show_in_marketplace: data.show_in_marketplace ?? true,
        email: data.email || '',
        twitter: data.social_links?.twitter || '',
        instagram: data.social_links?.instagram || '',
        telegram: data.social_links?.telegram || '',
        is_active: data.is_active,
      });
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('store_categories')
      .select('*')
      .order('name_ar');
    if (data) setCategories(data);
  };

  const fetchUserProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: products } = await supabase
        .from('products')
        .select('id, name, store_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (products) {
        setUserProducts(products);
        const storeProducts = products
          .filter(p => p.store_id === storeId)
          .map(p => p.id);
        setSelectedProducts(storeProducts);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const updateProductsStoreAssignment = async () => {
    try {
      const productsToAdd = selectedProducts;
      const productsToRemove = userProducts
        .filter(p => p.store_id === storeId && !selectedProducts.includes(p.id))
        .map(p => p.id);

      if (productsToAdd.length > 0) {
        await supabase
          .from('products')
          .update({ store_id: storeId })
          .in('id', productsToAdd);
      }

      if (productsToRemove.length > 0) {
        await supabase
          .from('products')
          .update({ store_id: null })
          .in('id', productsToRemove);
      }
    } catch (err) {
      console.error('Error updating products:', err);
      throw err;
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!store) return;

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          default_currency: formData.default_currency,
          show_in_marketplace: formData.show_in_marketplace,
          email: formData.email || null,
          social_links: {
            twitter: formData.twitter || undefined,
            instagram: formData.instagram || undefined,
            telegram: formData.telegram || undefined,
          },
          is_active: formData.is_active,
        } as any)
        .eq('id', storeId);

      if (updateError) throw updateError;

      await updateProductsStoreAssignment();

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating store:', err);
      setError(err.message || 'حدث خطأ أثناء تحديث المتجر');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف جميع المنتجات التابعة له أيضاً.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (deleteError) throw deleteError;

      onDelete();
      onClose();
    } catch (err: any) {
      console.error('Error deleting store:', err);
      setError(err.message || 'حدث خطأ أثناء حذف المتجر');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <StoreIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">تعديل المتجر</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {store && (
            <CopyLinkButton
              url={`${window.location.origin}/#/storefront-${store.slug}`}
              label="نسخ رابط المتجر"
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
              اسم المتجر <span className="text-red-500">*</span>
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
              وصف المتجر
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
                تصنيف المتجر
              </label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العملة الافتراضية
              </label>
              <select
                value={formData.default_currency}
                onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="show_in_marketplace_edit"
              checked={formData.show_in_marketplace}
              onChange={(e) =>
                setFormData({ ...formData, show_in_marketplace: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="show_in_marketplace_edit" className="text-sm text-gray-700 cursor-pointer">
              عرض هذا المتجر في السوق العام
            </label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active_store_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active_store_edit" className="text-sm text-gray-700 cursor-pointer">
              المتجر نشط
            </label>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">وسائل التواصل</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter / X</label>
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telegram</label>
                <input
                  type="text"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">المنتجات المرتبطة بالمتجر</h3>
            {loadingProducts ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">جاري تحميل المنتجات...</p>
              </div>
            ) : userProducts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">لا توجد منتجات لديك حالياً</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {userProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.store_id && product.store_id !== storeId && (
                        <p className="text-xs text-amber-600">موجود في متجر آخر - سيتم نقله</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">
              اختر المنتجات التي تريد ربطها بهذا المتجر. المنتجات الموجودة في متاجر أخرى سيتم نقلها.
            </p>
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
                  <span>حذف المتجر</span>
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
