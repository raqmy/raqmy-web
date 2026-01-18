import React, { useState } from 'react';
import { FileText, Image, Type, X, File } from 'lucide-react';

export interface ProductAttachment {
  id?: string;
  title: string;
  attachment_type: 'file' | 'image' | 'text';
  file_url?: string; // preview (blob) in UI
  text_content?: string;
  file_size?: number;
  display_order: number;
  file?: File; // real file used for upload
}

interface ProductAttachmentsManagerProps {
  attachments: ProductAttachment[];
  onChange: (attachments: ProductAttachment[]) => void;
}

export const ProductAttachmentsManager: React.FC<ProductAttachmentsManagerProps> = ({
  attachments,
  onChange,
}) => {
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'file' | 'image'
  ) => {
    const files = Array.from(e.target.files || []);

    const newAttachments: ProductAttachment[] = files.map((file, index) => ({
      title: file.name,
      attachment_type: type,
      file_url: URL.createObjectURL(file), // preview only
      file_size: file.size,
      display_order: attachments.length + index,
      file,
    }));

    onChange([...attachments, ...newAttachments]);

    // allow selecting same file again
    e.target.value = '';
  };

  const handleAddText = () => {
    if (!textTitle.trim() || !textContent.trim()) {
      alert('يرجى إدخال العنوان والمحتوى');
      return;
    }

    const newAttachment: ProductAttachment = {
      title: textTitle.trim(),
      attachment_type: 'text',
      text_content: textContent.trim(),
      display_order: attachments.length,
    };

    onChange([...attachments, newAttachment]);
    setTextTitle('');
    setTextContent('');
    setShowTextModal(false);
  };

  const removeAttachment = (index: number) => {
    const removed = attachments[index];
    if (removed?.file_url?.startsWith('blob:')) {
      URL.revokeObjectURL(removed.file_url);
    }

    const newAttachments = attachments.filter((_, i) => i !== index);
    newAttachments.forEach((att, i) => {
      att.display_order = i;
    });
    onChange(newAttachments);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'text':
        return <Type className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'صورة';
      case 'text':
        return 'نص';
      default:
        return 'ملف';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          مرفقات المنتج الرقمي <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-4">
          المحتوى الذي سيحصل عليه العميل بعد الشراء (ملفات، صور، أو نصوص)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <File className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">رفع ملف</span>
          <span className="text-xs text-gray-500">PDF, ZIP, إلخ</span>
          <input
            type="file"
            onChange={(e) => handleFileSelect(e, 'file')}
            className="hidden"
            multiple
          />
        </label>

        <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Image className="w-6 h-6 text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">رفع صورة</span>
          <span className="text-xs text-gray-500">PNG, JPG, GIF</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
            className="hidden"
            multiple
          />
        </label>

        <button
          type="button"
          onClick={() => setShowTextModal(true)}
          className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Type className="w-6 h-6 text-purple-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">إضافة نص</span>
          <span className="text-xs text-gray-500">تعليمات، ملاحظات</span>
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">المرفقات المضافة:</p>
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                attachment.attachment_type === 'image'
                  ? 'bg-green-100 text-green-600'
                  : attachment.attachment_type === 'text'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {getIcon(attachment.attachment_type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{attachment.title}</p>
                <p className="text-xs text-gray-500">
                  {getTypeLabel(attachment.attachment_type)}
                  {attachment.file_size && ` • ${formatFileSize(attachment.file_size)}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          يجب إضافة مرفق واحد على الأقل لنشر المنتج
        </div>
      )}

      {showTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">إضافة محتوى نصي</h3>
              <button
                onClick={() => {
                  setShowTextModal(false);
                  setTextTitle('');
                  setTextContent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان
                </label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثال: تعليمات الاستخدام"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المحتوى
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="اكتب المحتوى النصي هنا..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTextModal(false);
                    setTextTitle('');
                    setTextContent('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddText}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
