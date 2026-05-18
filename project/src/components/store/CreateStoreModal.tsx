import React, { useState, useEffect } from 'react';
import { X, Store as StoreIcon, AlertCircle, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { supabase, StoreCategory, UserLimits } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FALLBACK_CATEGORIES: StoreCategory[] = [
  {
    id: 'fallback-other',
    name: 'other',
    name_ar: 'أخرى',
    icon: '🏪',
  } as StoreCategory,
];

const STORE_IMAGES_BUCKET = 'store-images';
const STORE_IMAGE_URL_FIELDS = ['store_image_url', 'logo_url', 'image_url', 'cover_image', 'cover_url'] as const;
const STORE_IMAGE_PATH_FIELDS = ['store_image_path', 'logo_path', 'image_path', 'cover_image_path', 'cover_path'] as const;

type StoreRecord = Record<string, any>;

const STOREFRONT_THEME_OPTIONS = [
  { value: 'default', label: 'الافتراضي', description: 'الشكل الحالي البسيط والمتوازن' },
  { value: 'clean', label: 'النظيف', description: 'واجهة بيضاء هادئة مناسبة للملفات والقوالب' },
  { value: 'dark', label: 'الداكن الرقمي', description: 'مناسب للألعاب والأدوات التقنية والمنتجات الرقمية' },
  { value: 'creator', label: 'التعليمي', description: 'مناسب للدورات والملخصات والمحتوى التعليمي' },
  { value: 'creative', label: 'الإبداعي', description: 'ألوان ناعمة مناسبة للتصاميم وقوالب Canva' },
  { value: 'premium', label: 'الفخم', description: 'مظهر راقٍ للمنتجات الاحترافية والأعلى قيمة' },
] as const;

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>(FALLBACK_CATEGORIES);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [error, setError] = useState('');
  const [storeImageFile, setStoreImageFile] = useState<File | null>(null);
  const [storeImagePreview, setStoreImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    storefront_theme: 'default',
    category: 'other',
    default_currency: 'SAR',
    show_in_marketplace: true,
    email: '',
    twitter: '',
    instagram: '',
    telegram: '',
    contact_section_enabled: false,
    contact_section_title: 'للتواصل',
    contact_section_content: '',
    custom_section_enabled: false,
    custom_section_title: '',
    custom_section_content: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    fetchCategories();
    fetchUserLimits();
  }, [isOpen, profile?.id]);

  useEffect(() => {
    if (!storeImageFile) {
      setStoreImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(storeImageFile);
    setStoreImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [storeImageFile]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('store_categories')
        .select('*')
        .order('name_ar');

      if (error) {
        console.error('fetchCategories error:', error);
        setCategories(FALLBACK_CATEGORIES);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
        return;
      }

      setCategories(FALLBACK_CATEGORIES);
    } catch (err) {
      console.error('fetchCategories exception:', err);
      setCategories(FALLBACK_CATEGORIES);
    }
  };

  const fetchUserLimits = async () => {
    if (!profile?.id) {
      setLimits(null);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_limits', {
        p_user_id: profile.id,
      });

      if (error) {
        console.error('fetchUserLimits error:', error);
        setLimits(null);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setLimits(data[0]);
      } else {
        setLimits(null);
      }
    } catch (err) {
      console.error('fetchUserLimits exception:', err);
      setLimits(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      storefront_theme: 'default',
      category: 'other',
      default_currency: 'SAR',
      show_in_marketplace: true,
      email: '',
      twitter: '',
      instagram: '',
      telegram: '',
      contact_section_enabled: false,
      contact_section_title: 'للتواصل',
      contact_section_content: '',
      custom_section_enabled: false,
      custom_section_title: '',
      custom_section_content: '',
    });
    setStoreImageFile(null);
    setStoreImagePreview('');
    setError('');
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    const latinSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    return latinSlug || 'store';
  };

  const resolveStoreImageFields = (store: StoreRecord) => {
    const existingUrlField = STORE_IMAGE_URL_FIELDS.find((field) => field in store);
    const existingPathField = STORE_IMAGE_PATH_FIELDS.find((field) => field in store);

    return {
      urlField: existingUrlField || 'logo_url',
      pathField: existingPathField || null,
    };
  };

  const updateStoreImageReference = async (
    store: StoreRecord,
    nextUrl: string | null,
    nextPath: string | null
  ) => {
    const { urlField, pathField } = resolveStoreImageFields(store);
    const updatePayload: Record<string, any> = {
      [urlField]: nextUrl,
    };

    if (pathField) {
      updatePayload[pathField] = nextPath;
    }

    let { error } = await supabase.from('stores').update(updatePayload).eq('id', store.id);

    if (!error) return;

    const fallbackFields = STORE_IMAGE_URL_FIELDS.filter((field) => field !== urlField);
    for (const field of fallbackFields) {
      const fallbackPayload: Record<string, any> = {
        [field]: nextUrl,
      };

      if (pathField) {
        fallbackPayload[pathField] = nextPath;
      }

      const response = await supabase.from('stores').update(fallbackPayload).eq('id', store.id);
      if (!response.error) return;
      error = response.error;
    }

    throw error;
  };

  const uploadStoreImage = async (store: StoreRecord, file: File) => {
    if (!profile?.id) throw new Error('يجب تسجيل الدخول أولاً');

    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExt = (fileExt || 'jpg').toLowerCase();
    const filePath = `${profile.id}/${store.id}-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(STORE_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(STORE_IMAGES_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || '';

    await updateStoreImageReference(store, publicUrl, filePath);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageChange = (file: File | null) => {
    setError('');

    if (!file) {
      setStoreImageFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صحيح للمتجر');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم صورة المتجر يجب ألا يتجاوز 5MB');
      return;
    }

    setStoreImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile?.id) {
      setError('تعذر التحقق من بيانات الحساب. حاول تسجيل الدخول مرة أخرى.');
      return;
    }

    if (limits && limits.can_create_store === false) {
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

      const payload = {
        user_id: profile.id,
        name: formData.name.trim(),
        slug: `${profile.id.slice(0, 8)}-${slug}`,
        description: formData.description.trim() || null,
        storefront_theme: formData.storefront_theme || 'default',
        category: formData.category || 'other',
        default_currency: formData.default_currency || 'SAR',
        show_in_marketplace: !!formData.show_in_marketplace,
        email: formData.email.trim() || null,
        contact_section_enabled: formData.contact_section_enabled,
        contact_section_title: formData.contact_section_title.trim() || 'للتواصل',
        contact_section_content: formData.contact_section_content.trim() || null,
        custom_section_enabled: formData.custom_section_enabled,
        custom_section_title: formData.custom_section_title.trim() || null,
        custom_section_content: formData.custom_section_content.trim() || null,
        social_links: {
          twitter: formData.twitter.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          telegram: formData.telegram.trim() || undefined,
        },
        payment_methods: {
          hyperpay: true,
          paypal: false,
        },
        is_active: true,
      };

      const { data: createdStore, error: insertError } = await supabase
        .from('stores')
        .insert(payload as any)
        .select('*')
        .single();

      if (insertError) throw insertError;

      if (createdStore && storeImageFile) {
        try {
          await uploadStoreImage(createdStore, storeImageFile);
        } catch (imageError) {
          console.error('Store image upload after create error:', imageError);
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating store:', err);
      setError(err?.message || 'حدث خطأ أثناء إنشاء المتجر');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canCreateStore = limits ? limits.can_create_store !== false : true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <StoreIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">إنشاء متجر جديد</h2>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
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
              صورة المتجر
            </label>

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0">
                  {storeImagePreview ? (
                    <img
                      src={storeImagePreview}
                      alt="معاينة صورة المتجر"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="w-10 h-10 text-blue-600" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-3">
                    أضف صورة لمتجرك لتظهر في لوحة التحكم وواجهة المتجر.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                      <ImagePlus className="w-4 h-4" />
                      <span>{storeImageFile ? 'تغيير الصورة' : 'رفع صورة'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                      />
                    </label>

                    {storeImageFile && (
                      <button
                        type="button"
                        onClick={() => handleImageChange(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الصورة</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-3">الحد الأقصى لحجم الصورة: 5MB</p>
                </div>
              </div>
            </div>
          </div>

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

          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
            <div className="text-right">
              <h3 className="text-lg font-bold text-gray-900">ثيم واجهة المتجر</h3>
              <p className="text-sm text-gray-500 mt-1">
                اختر الشكل الذي يظهر للزوار في صفحة المتجر. يمكن تغييره لاحقاً من إعدادات المتجر.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STOREFRONT_THEME_OPTIONS.map((theme) => (
                <label
                  key={theme.value}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    formData.storefront_theme === theme.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-gray-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="storefront_theme"
                    value={theme.value}
                    checked={formData.storefront_theme === theme.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        storefront_theme: e.target.value,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between gap-3 text-right">
                    <span className="mt-1 w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center shrink-0">
                      {formData.storefront_theme === theme.value && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{theme.label}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-5">{theme.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-5">
            <div className="text-right">
              <h3 className="text-lg font-bold text-gray-900">أقسام أسفل المتجر</h3>
              <p className="text-sm text-gray-500 mt-1">
                يمكنك تفعيل خانات إضافية تظهر للزوار أسفل واجهة المتجر.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contact_section_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact_section_enabled: e.target.checked,
                    })
                  }
                  className="mt-1 w-5 h-5 text-blue-600 rounded"
                />

                <div className="text-right">
                  <div className="font-semibold text-gray-900">إظهار خانة التواصل</div>
                  <p className="text-sm text-gray-500 mt-1">
                    إذا لم تفعّلها فلن تظهر في المتجر.
                  </p>
                </div>
              </label>

              {formData.contact_section_enabled && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان خانة التواصل
                    </label>
                    <input
                      type="text"
                      value={formData.contact_section_title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_section_title: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: للتواصل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      محتوى خانة التواصل
                    </label>
                    <textarea
                      value={formData.contact_section_content}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_section_content: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: للتواصل عبر واتساب: 05xxxxxxxx"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.custom_section_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_section_enabled: e.target.checked,
                    })
                  }
                  className="mt-1 w-5 h-5 text-blue-600 rounded"
                />

                <div className="text-right">
                  <div className="font-semibold text-gray-900">إظهار خانة مخصصة إضافية</div>
                  <p className="text-sm text-gray-500 mt-1">
                    استخدمها لطريقة التسليم، الشروط، أو أي معلومات أخرى.
                  </p>
                </div>
              </label>

              {formData.custom_section_enabled && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان الخانة المخصصة
                    </label>
                    <input
                      type="text"
                      value={formData.custom_section_title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          custom_section_title: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: معلومات مهمة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      محتوى الخانة المخصصة
                    </label>
                    <textarea
                      value={formData.custom_section_content}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          custom_section_content: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="اكتب أي نص تريد ظهوره للزوار"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !canCreateStore}
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
