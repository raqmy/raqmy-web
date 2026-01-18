import React, { useState, useEffect } from 'react';
import { X, Store as StoreIcon, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, StoreCategory, UserLimits } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [error, setError] = useState('');
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
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchUserLimits();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('store_categories')
      .select('*')
      .order('name_ar');
    if (data) setCategories(data);
  };

  const fetchUserLimits = async () => {
    if (!profile) return;
    const { data } = await supabase.rpc('get_user_limits', {
      p_user_id: profile.id,
    });
    if (data && data.length > 0) {
      setLimits(data[0]);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) return;

    if (limits && !limits.can_create_store) {
      setError(
        `لقد وصلت للحد الأقصى من المتاجر (${limits.max_stores}). قم بترقية باقتك للحصول على المزيد.`
      );
      return;
    }

    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم المتجر');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(formData.name);

      const { error: insertError } = await supabase.from('stores').insert({
        user_id: profile.id,
        name: formData.name,
        slug: `${profile.id.slice(0, 8)}-${slug}`,
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
        payment_methods: {
          hyperpay: true,
          paypal: false,
        },
        is_active: true,
      } as any);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setFormData({
        name: '',
        description: '',
        category: 'other',
        default_currency: 'SAR',
        show_in_marketplace: true,
        email: '',
        twitter: '',
        instagram: '',
        telegram: '',
      });
    } catch (err: any) {
      console.error('Error creating store:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء المتجر');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <StoreIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">إنشاء متجر جديد</h2>
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

          {limits && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>الحد المسموح:</strong> {limits.current_stores} من {limits.max_stores} متجر
              </p>
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
              placeholder="مثال: متجر التصاميم الإبداعية"
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
              placeholder="اكتب وصفاً مختصراً عن متجرك ونوع المنتجات التي تقدمها"
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
                onChange={(e) =>
                  setFormData({ ...formData, default_currency: e.target.value })
                }
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
              id="show_in_marketplace"
              checked={formData.show_in_marketplace}
              onChange={(e) =>
                setFormData({ ...formData, show_in_marketplace: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="show_in_marketplace" className="text-sm text-gray-700 cursor-pointer">
              عرض هذا المتجر في السوق العام (يمكنك إلغاء التفعيل لاحقاً)
            </label>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">وسائل التواصل (اختيارية)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني التجاري
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="store@example.com"
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
                  placeholder="@username"
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
                  placeholder="@username"
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
                  placeholder="@username"
                  dir="ltr"
                />
              </div>
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
              disabled={loading || (limits && !limits.can_create_store)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                'إنشاء المتجر'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
