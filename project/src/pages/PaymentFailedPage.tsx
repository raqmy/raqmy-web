import React from 'react';
import { XCircle, RotateCcw, Home, HelpCircle } from 'lucide-react';

interface PaymentFailedPageProps {
  onNavigate: (page: string) => void;
  orderId?: string;
}

export const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ onNavigate, orderId }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">فشلت عملية الدفع</h1>
            <p className="text-red-100 text-lg">للأسف لم نتمكن من إتمام عملية الدفع</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-900 mb-3">الأسباب المحتملة</h3>
              <ul className="space-y-2 text-sm text-red-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0 mt-2"></span>
                  <span>رصيد غير كافٍ في البطاقة</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0 mt-2"></span>
                  <span>معلومات بطاقة خاطئة</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0 mt-2"></span>
                  <span>البطاقة غير مفعلة للمشتريات الإلكترونية</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0 mt-2"></span>
                  <span>مشكلة في الاتصال بالإنترنت</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                ماذا يمكنك فعله؟
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold flex-shrink-0">1.</span>
                  <span>تأكد من صحة معلومات البطاقة والرصيد المتاح</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold flex-shrink-0">2.</span>
                  <span>تأكد من تفعيل البطاقة للمشتريات الإلكترونية</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold flex-shrink-0">3.</span>
                  <span>تحقق من اتصالك بالإنترنت</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold flex-shrink-0">4.</span>
                  <span>حاول استخدام بطاقة أخرى أو طريقة دفع مختلفة</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {orderId && (
                <button
                  onClick={() => onNavigate(`payment-${orderId}`)}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>إعادة المحاولة</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('marketplace')}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>العودة للرئيسية</span>
              </button>
            </div>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                لم يتم خصم أي مبلغ من حسابك
              </p>
              <button
                onClick={() => onNavigate('support')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                تواصل مع الدعم الفني
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
