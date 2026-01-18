import React, { useState } from 'react';
import { Image, X, Star, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ProductImage {
  id?: string;
  image_url: string; // ✅ Supabase public URL (يُحفظ في DB)
  preview_url?: string; // 👀 للعرض فقط داخل الصفحة
  is_primary: boolean;
  display_order: number;
  file?: File;
}

interface ProductImagesManagerProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

export const ProductImagesManager: React.FC<ProductImagesManagerProps> = ({
  images,
  onChange,
  maxImages = 8,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 🔹 رفع الصورة إلى Supabase Storage وإرجاع الرابط العام
  const uploadImageToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Image upload error:', error);
      throw error;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addImages = async (files: File[]) => {
    if (images.length >= maxImages) {
      alert(`يمكنك إضافة ${maxImages} صور كحد أقصى`);
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    setUploading(true);

    try {
      const uploadedImages: ProductImage[] = [];

      for (let i = 0; i < filesToAdd.length; i++) {
        const file = filesToAdd[i];

        const publicUrl = await uploadImageToStorage(file);

        uploadedImages.push({
          image_url: publicUrl, // ✅ يُحفظ في قاعدة البيانات
          preview_url: URL.createObjectURL(file), // 👀 للعرض فقط
          is_primary: images.length === 0 && i === 0,
          display_order: images.length + i,
        });
      }

      onChange([...images, ...uploadedImages]);
    } catch (err) {
      alert('فشل رفع الصورة، حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    addImages(files);
  };

  const removeImage = (index: number) => {
    const removed = images[index];
    if (removed?.preview_url?.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview_url);
    }

    const newImages = images.filter((_, i) => i !== index);

    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }

    newImages.forEach((img, i) => {
      img.display_order = i;
    });

    onChange(newImages);
  };

  const setPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          صور المنتج <span className="text-red-500">*</span>
        </label>
        <span className="text-sm text-gray-500">
          {images.length} / {maxImages}
        </span>
      </div>

      {images.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                اسحب الصور هنا أو انقر لاختيارها
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF حتى {maxImages} صور
              </p>
            </div>
            <label className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer">
              {uploading ? 'جاري رفع الصور...' : 'اختر الصور'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
              >
                <img
                  src={image.preview_url || image.image_url}
                  alt={`صورة المنتج ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
                    <Star className="w-3 h-3 fill-white" />
                    <span>رئيسية</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!image.is_primary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(index)}
                      className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {images.length < maxImages && (
            <label className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
              <Image className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-medium">
                {uploading ? 'جاري الرفع...' : 'إضافة المزيد من الصور'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          الصورة الأولى تُعتبر الصورة الرئيسية للمنتج. يمكنك تغييرها بالضغط على أيقونة النجمة.
        </p>
      )}
    </div>
  );
};
