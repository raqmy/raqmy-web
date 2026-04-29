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
              />
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
