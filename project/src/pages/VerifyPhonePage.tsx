import React from 'react';
import { Smartphone, Info } from 'lucide-react';

export const VerifyPhonePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">تحقق رقم الجوال</h1>
            <p className="text-gray-600 leading-7">
              تم تعطيل خطوة رقم الجوال مؤقتًا في هذه المرحلة من الإطلاق.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              يمكنك المتابعة في استخدام المنصة بالبريد الإلكتروني فقط حاليًا، وسيتم تفعيل
              رقم الجوال لاحقًا عند الحاجة.
            </span>
          </div>

          <button
            onClick={() => window.location.replace('/')}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition-colors"
          >
            الذهاب إلى الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};
