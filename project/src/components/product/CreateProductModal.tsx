import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, Store, StoreCategory, UserLimits } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [error, setError] = useState('');
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
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoading(false);
      // ما نخلي limits تتحكم بالزر لو كانت ناقصة/غير دقيقة
      setLimits(null);

      fetchStores();
      fetchCategories();
      fetchUserLimits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('store_categories')
      .select('*')
      .order('name_ar');

    if (error) {
      console.error('fetchCategories error:', error);
      return;
    }
    if (data) setCategories(data);
  };

  const fetchUserLimits = async () => {
    if (!profile) return;

    const { data, error } = await supabase.rpc('get_user_limits', {
      p_user_id: profile.id,
    });

    if (error) {
      console.error('fetchUserLimits error:', error);
      // لا نوقف إنشاء المنتج بسبب limits — نخليها اختيارية
      return;
    }

    // ✅ بعض RPC ترجع array وبعضها object
    if (Array.isArray(data)) {
      if (data.length > 0) setLimits(data[0] as UserLimits);
      return;
    }

    if (data && typeof data === 'object') {
      setLimits(data as UserLimits);
      return;
    }
  };

  // ✅ الزر ما يتعطل إلا إذا الفورم ناقص أو loading
  const isFormValid =
    formData.name.trim().length > 0 && formData.price.trim().length > 0;

  // ✅ limits: لا نعطل إذا الحقل غير موجود (undefined)
  const canCreateProduct =
    limits?.can_create_product === false ? false : true;

  const canCreateSubscriptionProduct =
    limits?.can_create_subscription_product === false ? false : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('يجب تسجيل الدخول أولاً.');
      return;
    }

    // ✅ تحقق حدود الباقة فقط إذا كانت limits فعلاً تعطيك false بشكل صريح
    if (!canCreateProduct) {
      setError('لا يمكنك إنشاء منتج جديد حسب حدود باقتك الحالية.');
      return;
    }

    if (formData.is_subscription && !canCreateSubscriptionProduct) {
      setError('لا يمكنك إنشاء منتج اشتراك جديد حسب حدود باقتك الحالية.');
      return;
    }

    if (!formData.name.trim() || !formData.price.trim()) {
      setError('يرجى إدخال جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      const price = parseFloat(formData.price);

      if (isNaN(price) || price < 0) {
        throw new Error('السعر غير صالح');
      }

      const payload: any = {
        title: formData.name.trim(),
        description: formData.description?.trim() || null,
        price,
        visibility: formData.visibility,
        is_active: true,

        // نخلي الاثنين عشان كل الشاشات تشتغل
        user_id: profile.id,
        merchant_id: profile.id,

        store_id: formData.store_id || null,
      };

      const { error: insertError } = await supabase.from('products').insert(payload);

      if (insertError) {
        console.error('insertError:', insertError);
        throw insertError;
      }

      onSuccess();
      onClose();

      setFormData({
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
      });
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err?.message || 'حدث خطأ أثناء إنشاء المنتج');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.length === 0 ? (
                  <option value="other">📦 أخرى</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name_ar}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_subscription"
              checked={formData.is_subscription}
              onChange={(e) => setFormData({ ...formData, is_subscription: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_subscription" className="text-sm text-gray-700 cursor-pointer">
              هذا المنتج عبارة عن اشتراك متكرر
            </label>
          </div>

          {formData.is_subscription && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مدة التجديد</label>
              <select
                value={formData.subscription_period}
                onChange={(e) =>
                  setFormData({ ...formData, subscription_period: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">طريقة التسليم</label>
            <select
              value={formData.delivery_method}
              onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="instant">تحميل فوري بعد الدفع</option>
              <option value="email">إرسال بالبريد الإلكتروني</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="coupons_enabled"
              checked={formData.coupons_enabled}
              onChange={(e) => setFormData({ ...formData, coupons_enabled: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="coupons_enabled" className="text-sm text-gray-700 cursor-pointer">
              تفعيل كوبونات الخصم لهذا المنتج
            </label>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                ملاحظة: يمكنك رفع ملف المنتج وصورة الغلاف بعد الإنشاء من صفحة تعديل المنتج
              </p>
            </div>
          </div>

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
              disabled={loading || !isFormValid}
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
