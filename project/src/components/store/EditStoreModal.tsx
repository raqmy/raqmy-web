import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Store as StoreIcon,
  AlertCircle,
  Loader2,
  Trash2,
  Camera,
  Upload,
} from 'lucide-react';
import { supabase, Store } from '../../lib/supabase';
import { CopyLinkButton } from '../shared/CopyLinkButton';

interface EditStoreModalProps {
  isOpen: boolean;
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

const STORE_IMAGES_BUCKET = 'store-images';

const STORE_IMAGE_URL_FIELDS = [
  'store_image_url',
  'logo_url',
  'image_url',
  'cover_image',
  'cover_url',
] as const;

const STORE_IMAGE_PATH_FIELDS = [
  'store_image_path',
  'logo_path',
  'image_path',
  'cover_image_path',
  'cover_path',
] as const;

type StoreRow = Store & Record<string, any>;

type StorefrontTheme = 'default' | 'clean' | 'dark' | 'creator' | 'creative' | 'premium';

const STOREFRONT_THEME_OPTIONS: Array<{
  value: StorefrontTheme;
  label: string;
  description: string;
}> = [
  { value: 'default', label: 'الافتراضي', description: 'الشكل الحالي البسيط والمناسب لكل المتاجر.' },
  { value: 'clean', label: 'النظيف', description: 'واجهة بيضاء هادئة مناسبة للملفات والقوالب.' },
  { value: 'dark', label: 'الداكن الرقمي', description: 'واجهة داكنة مناسبة للألعاب والأدوات والمنتجات التقنية.' },
  { value: 'creator', label: 'التعليمي', description: 'مناسب للدورات، الملخصات، والمنتجات التعليمية.' },
  { value: 'creative', label: 'الإبداعي', description: 'ألوان وتدرجات مناسبة للتصاميم وقوالب Canva.' },
  { value: 'premium', label: 'الفخم', description: 'تصميم أرقى للمنتجات عالية القيمة والباقات.' },
];

const normalizeStorefrontTheme = (value: unknown): StorefrontTheme => {
  const theme = String(value || 'default') as StorefrontTheme;
  return STOREFRONT_THEME_OPTIONS.some((option) => option.value === theme) ? theme : 'default';
};


export const EditStoreModal: React.FC<EditStoreModalProps> = ({
  isOpen,
  storeId,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [store, setStore] = useState<StoreRow | null>(null);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageMenuRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_section_enabled: false,
    contact_section_title: 'للتواصل',
    contact_section_content: '',
    custom_section_enabled: false,
    custom_section_title: '',
    custom_section_content: '',
    storefront_theme: 'default' as StorefrontTheme,
  });

  useEffect(() => {
    if (isOpen && storeId) {
      fetchStore();
    }
  }, [isOpen, storeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        imageMenuRef.current &&
        !imageMenuRef.current.contains(event.target as Node)
      ) {
        setImageMenuOpen(false);
      }
    };

    if (imageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [imageMenuOpen]);

  const extractSupabaseStoragePath = (
    value: string | null | undefined,
    bucketName: string
  ) => {
    if (!value) return '';

    let pathValue = String(value).trim();
    if (!pathValue) return '';

    const signMarker = `/object/sign/${bucketName}/`;
    const publicMarker = `/object/public/${bucketName}/`;

    if (pathValue.includes(signMarker)) {
      pathValue = pathValue.split(signMarker)[1] || '';
    } else if (pathValue.includes(publicMarker)) {
      pathValue = pathValue.split(publicMarker)[1] || '';
    }

    if (pathValue.startsWith(`${bucketName}/`)) {
      pathValue = pathValue.slice(bucketName.length + 1);
    }

    if (pathValue.startsWith('/')) {
      pathValue = pathValue.slice(1);
    }

    const queryIndex = pathValue.indexOf('?');
    if (queryIndex !== -1) {
      pathValue = pathValue.slice(0, queryIndex);
    }

    return decodeURIComponent(pathValue);
  };

  const getStoreImageUrl = (storeRow: StoreRow | null) => {
    if (!storeRow) return '';

    for (const field of STORE_IMAGE_URL_FIELDS) {
      const value = storeRow?.[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '';
  };

  const getStoreImagePath = (storeRow: StoreRow | null) => {
    if (!storeRow) return '';

    for (const field of STORE_IMAGE_PATH_FIELDS) {
      const value = storeRow?.[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return extractSupabaseStoragePath(getStoreImageUrl(storeRow), STORE_IMAGES_BUCKET);
  };

  const resolveStoreImageFields = (storeRow: StoreRow) => {
    const existingUrlField = STORE_IMAGE_URL_FIELDS.find((field) => field in storeRow);
    const existingPathField = STORE_IMAGE_PATH_FIELDS.find((field) => field in storeRow);

    return {
      urlField: existingUrlField || 'logo_url',
      pathField: existingPathField || null,
    };
  };

  const updateStoreImageReference = async (
    storeRow: StoreRow,
    nextUrl: string | null,
    nextPath: string | null
  ) => {
    const { urlField, pathField } = resolveStoreImageFields(storeRow);

    const payload: Record<string, any> = {
      [urlField]: nextUrl,
    };

    if (pathField) payload[pathField] = nextPath;

    const { error } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', storeRow.id);

    if (error) throw error;
  };

  const uploadStoreImage = async (storeRow: StoreRow, file: File) => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${storeRow.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORE_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } =
      supabase.storage.from(STORE_IMAGES_BUCKET).getPublicUrl(filePath);

    await updateStoreImageReference(
      storeRow,
      publicData.publicUrl,
      filePath
    );

    return {
      publicUrl: publicData.publicUrl,
      filePath,
    };
  };

  const handleStoreImageSelected = async (file: File | null) => {
    if (!file || !store) return;

    setError('');
    setImageMenuOpen(false);

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صحيح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم صورة المتجر يجب ألا يتجاوز 5MB');
      return;
    }

    try {
      setImageUploading(true);

      const previousPath = getStoreImagePath(store);
      const result = await uploadStoreImage(store, file);

      if (previousPath && previousPath !== result.filePath) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([previousPath]);
      }

      const fields = resolveStoreImageFields(store);

      setStore({
        ...store,
        [fields.urlField]: result.publicUrl,
        ...(fields.pathField
          ? { [fields.pathField]: result.filePath }
          : {}),
      });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setImageUploading(false);
    }
  };

  const handleStoreImageDelete = async () => {
    if (!store) return;

    try {
      setImageUploading(true);

      const path = getStoreImagePath(store);
      if (path) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([path]);
      }

      await updateStoreImageReference(store, null, null);

      const fields = resolveStoreImageFields(store);

      setStore({
        ...store,
        [fields.urlField]: null,
        ...(fields.pathField ? { [fields.pathField]: null } : {}),
      });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف الصورة');
    } finally {
      setImageUploading(false);
    }
  };

  const fetchStore = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) {
      setError('حدث خطأ أثناء تحميل المتجر');
      return;
    }

    setStore(data);

    setFormData({
      name: data.name || '',
      description: data.description || '',
      contact_section_enabled: Boolean(data.contact_section_enabled),
      contact_section_title: data.contact_section_title || 'للتواصل',
      contact_section_content: data.contact_section_content || '',
      custom_section_enabled: Boolean(data.custom_section_enabled),
      custom_section_title: data.custom_section_title || '',
      custom_section_content: data.custom_section_content || '',
      storefront_theme: normalizeStorefrontTheme(data.storefront_theme),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          description: formData.description || null,
          contact_section_enabled: formData.contact_section_enabled,
          contact_section_title: formData.contact_section_title.trim() || 'للتواصل',
          contact_section_content: formData.contact_section_content.trim() || null,
          custom_section_enabled: formData.custom_section_enabled,
          custom_section_title: formData.custom_section_title.trim() || null,
          custom_section_content: formData.custom_section_content.trim() || null,
          storefront_theme: formData.storefront_theme,
        })
        .eq('id', storeId);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف المتجر؟')) return;

    try {
      setDeleting(true);

      await supabase.from('stores').delete().eq('id', storeId);

      onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const currentImageUrl = getStoreImageUrl(store);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b">
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">تعديل المتجر</h2>

              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <StoreIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {store && (
              <div className="flex justify-end">
                <CopyLinkButton
                  url={`${window.location.origin}/#/storefront-${store.slug}`}
                  label="نسخ رابط المتجر"
                  variant="minimal"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* نفس تصميم الإنشاء */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                صورة المتجر
              </label>

              <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-600 mb-3">
                      أضف صورة لمتجرك لتظهر في لوحة التحكم وواجهة المتجر.
                    </p>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {imageUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {currentImageUrl ? 'تغيير الصورة' : 'رفع صورة'}
                      </button>

                      {currentImageUrl && (
                        <button
                          type="button"
                          onClick={handleStoreImageDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      الحد الأقصى لحجم الصورة: 5MB
                    </p>
                  </div>

                  <div className="w-20 h-20 rounded-xl border bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleStoreImageSelected(e.target.files?.[0] || null)
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-right">
                اسم المتجر
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-right">
                وصف المتجر
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="w-full border rounded-xl px-4 py-3"
                placeholder="يظهر تحت صورة واسم المتجر في أسفل واجهة المتجر"
              />
            </div>


            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
              <div className="text-right">
                <h3 className="text-lg font-bold text-gray-900">ثيم واجهة المتجر</h3>
                <p className="text-sm text-gray-500 mt-1">
                  اختر شكل واجهة المتجر التي تظهر للزوار. كل ثيم يغيّر توزيع الصفحة وشكل عرض المنتجات والأقسام.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STOREFRONT_THEME_OPTIONS.map((theme) => (
                  <label
                    key={theme.value}
                    className={`cursor-pointer rounded-2xl border p-4 text-right transition-all ${
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
                          storefront_theme: e.target.value as StorefrontTheme,
                        })
                      }
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span className={`mt-1 h-4 w-4 rounded-full border flex-shrink-0 ${
                        formData.storefront_theme === theme.value
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                      }`} />
                      <div>
                        <div className="font-bold text-gray-900">{theme.label}</div>
                        <div className="text-sm text-gray-500 mt-1 leading-6">{theme.description}</div>
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
                  تحكم في الخانات التي تظهر في أسفل واجهة المتجر للزوار.
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
                      تظهر فقط إذا كانت مفعلة، ويمكنك كتابة طريقة التواصل أو أي ملاحظة للزوار.
                    </p>
                  </div>
                </label>

                {formData.contact_section_enabled && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-right">
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
                        className="w-full border rounded-xl px-4 py-3 text-right"
                        placeholder="مثال: للتواصل"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-right">
                        محتوى خانة التواصل
                      </label>
                      <textarea
                        rows={3}
                        value={formData.contact_section_content}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_section_content: e.target.value,
                          })
                        }
                        className="w-full border rounded-xl px-4 py-3 text-right"
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
                      استخدمها لأي معلومات مهمة مثل طريقة التسليم، الشروط، أو ملاحظات الشراء.
                    </p>
                  </div>
                </label>

                {formData.custom_section_enabled && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-right">
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
                        className="w-full border rounded-xl px-4 py-3 text-right"
                        placeholder="مثال: معلومات مهمة"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-right">
                        محتوى الخانة المخصصة
                      </label>
                      <textarea
                        rows={3}
                        value={formData.custom_section_content}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            custom_section_content: e.target.value,
                          })
                        }
                        className="w-full border rounded-xl px-4 py-3 text-right"
                        placeholder="اكتب أي نص تريد ظهوره للزوار"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 border rounded-xl"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {deleting ? 'جاري الحذف...' : 'حذف المتجر'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
