import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Store as StoreIcon,
  AlertCircle,
  Loader2,
  Trash2,
  Camera,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase, Store, StoreCategory } from '../../lib/supabase';
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
  const [store, setStore] = useState<StoreRow | null>(null);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageMenuRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    default_currency: 'SAR',
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

    if (pathField) {
      payload[pathField] = nextPath;
    }

    let { error: updateError } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', storeRow.id);

    if (!updateError) return;

    const fallbackFields = STORE_IMAGE_URL_FIELDS.filter((field) => field !== urlField);

    for (const field of fallbackFields) {
      const fallbackPayload: Record<string, any> = {
        [field]: nextUrl,
      };

      if (pathField) {
        fallbackPayload[pathField] = nextPath;
      }

      const response = await supabase
        .from('stores')
        .update(fallbackPayload)
        .eq('id', storeRow.id);

      if (!response.error) return;
      updateError = response.error;
    }

    throw updateError;
  };

  const uploadStoreImage = async (storeRow: StoreRow, file: File) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExt = (fileExt || 'jpg').toLowerCase();
    const filePath = `${user.id}/${storeRow.id}-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(STORE_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(STORE_IMAGES_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || '';

    await updateStoreImageReference(storeRow, publicUrl, filePath);

    return {
      publicUrl,
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

      const refreshedStore = {
        ...store,
        [resolveStoreImageFields(store).urlField]: result.publicUrl,
        ...(resolveStoreImageFields(store).pathField
          ? { [resolveStoreImageFields(store).pathField as string]: result.filePath }
          : {}),
      };

      setStore(refreshedStore);
    } catch (err: any) {
      console.error('Store image upload error:', err);

      const message = String(err?.message || '');

      if (message.includes('Bucket not found')) {
        setError(
          'مجلد صور المتاجر غير موجود في التخزين. أنشئ bucket باسم store-images ثم أعد المحاولة.'
        );
      } else {
        setError(err?.message || 'حدث خطأ أثناء رفع صورة المتجر');
      }
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStoreImageDelete = async () => {
    if (!store) return;

    setError('');
    setImageMenuOpen(false);

    try {
      setImageUploading(true);

      const existingPath = getStoreImagePath(store);
      if (existingPath) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([existingPath]);
      }

      await updateStoreImageReference(store, null, null);

      const refreshedStore = {
        ...store,
        [resolveStoreImageFields(store).urlField]: null,
        ...(resolveStoreImageFields(store).pathField
          ? { [resolveStoreImageFields(store).pathField as string]: null }
          : {}),
      };

      setStore(refreshedStore);
    } catch (err: any) {
      console.error('Store image delete error:', err);
      setError(err?.message || 'حدث خطأ أثناء حذف صورة المتجر');
    } finally {
      setImageUploading(false);
    }
  };

  const fetchStore = async () => {
    const { data, error: fetchError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (fetchError) {
      console.error('fetchStore error:', fetchError);
      setError('حدث خطأ أثناء تحميل بيانات المتجر');
      return;
    }

    if (data) {
      const storeData = data as StoreRow;
      setStore(storeData);
      setFormData({
        name: storeData.name || '',
        description: storeData.description || '',
        category: storeData.category || 'other',
        default_currency: storeData.default_currency || 'SAR',
        email: storeData.email || '',
        twitter: storeData.social_links?.twitter || '',
        instagram: storeData.social_links?.instagram || '',
        telegram: storeData.social_links?.telegram || '',
        is_active: storeData.is_active ?? true,
      });
    }
  };

  const fetchCategories = async () => {
    const { data, error: fetchError } = await supabase
      .from('store_categories')
      .select('*')
      .order('name_ar');

    if (fetchError) {
      console.error('fetchCategories error:', fetchError);
      return;
    }

    if (data) setCategories(data);
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
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر؟')) {
      return;
    }

    setDeleting(true);

    try {
      const existingPath = getStoreImagePath(store);
      if (existingPath) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([existingPath]);
      }

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

  const currentImageUrl = getStoreImageUrl(store);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
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
              type="button"
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

        <div className="max-h-[calc(90vh-110px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="relative" ref={imageMenuRef}>
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                    {currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        alt={formData.name || 'صورة المتجر'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <StoreIcon className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setImageMenuOpen((prev) => !prev)}
                    disabled={imageUploading}
                    className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg disabled:opacity-50"
                    title="خيارات صورة المتجر"
                  >
                    {imageUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>

                  {imageMenuOpen && (
                    <div className="absolute top-full mt-3 left-0 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setImageMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-4 py-3 text-right text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>تعديل الصورة</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStoreImageDelete}
                        className="w-full px-4 py-3 text-right text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الصورة</span>
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleStoreImageSelected(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">صورة المتجر</h3>
                  <p className="text-sm text-gray-600 leading-6">
                    يمكنك تعديل الصورة أو حذفها من هنا، وعند عدم وجود صورة ستظهر الصورة الكلاسيكية.
                  </p>
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
                id="is_active_store_edit"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="is_active_store_edit"
                className="text-sm text-gray-700 cursor-pointer"
              >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter / X
                  </label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telegram
                  </label>
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
    </div>
  );
};
