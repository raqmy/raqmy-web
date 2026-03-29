import React, { useEffect, useState } from 'react';
import { XCircle, RotateCcw, Home, HelpCircle, Store as StoreIcon, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentFailedPageProps {
  onNavigate: (page: string) => void;
  orderId?: string;
}

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const resolveStoreScope = async (): Promise<ScopeInfo | null> => {
  const slug = getActiveStoreScopeSlug();
  if (!slug) return null;

  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id, slug, name, user_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!storeError && storeData) {
    return {
      slug,
      name: storeData.name || 'المتجر',
      source: 'stores',
      storeId: storeData.id,
      merchantUserId: storeData.user_id || null,
    };
  }

  const { data: merchantData, error: merchantError } = await supabase
    .from('merchants')
    .select('id, slug, user_id, store_name, business_name, name')
    .eq('slug', slug)
    .maybeSingle();

  if (!merchantError && merchantData) {
    return {
      slug,
      name:
        merchantData.store_name || merchantData.business_name || merchantData.name || 'المتجر',
      source: 'merchants',
      storeId: null,
      merchantUserId: merchantData.user_id || merchantData.id,
    };
  }

  return null;
};

const StoreScopedBanner: React.FC<{ scopeInfo: ScopeInfo; onNavigate: (page: string) => void }> = ({
  scopeInfo,
  onNavigate,
}) => {
  return (
    <button
      onClick={() => onNavigate(`storefront-${scopeInfo.slug}`)}
      className="w-full mb-6 text-right bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-5 hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/80">محاولة دفع داخل متجر</p>
            <h2 className="text-2xl font-bold">{scopeInfo.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium bg-white/15 px-4 py-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
          <span>العودة إلى المتجر</span>
        </div>
      </div>
    </button>
  );
};

export const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ onNavigate, orderId }) => {
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  useEffect(() => {
    localStorage.removeItem('pending_payment_order_id');
    localStorage.removeItem('pending_payment_started_at');
    localStorage.removeItem('pending_payment_return_expected');
  }, []);

  useEffect(() => {
    const loadScope = async () => {
      const resolved = await resolveStoreScope();
      setScopeInfo(resolved);
    };

    void loadScope();
  }, []);

  const retryTarget = orderId ? `payment-${orderId}` : null;
  const backTarget = scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">فشلت عملية الدفع</h1>
            <p className="text-red-100 text-lg">
              {scopeInfo
                ? `للأسف لم نتمكن من إتمام الدفع داخل متجر ${scopeInfo.name}`
                : 'للأسف لم نتمكن من إتمام عملية الدفع'}
            </p>
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
              {retryTarget && (
                <button
                  onClick={() => onNavigate(retryTarget)}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>إعادة المحاولة</span>
                </button>
              )}

              <button
                onClick={() => onNavigate(backTarget)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>{scopeInfo ? 'العودة إلى المتجر' : 'العودة للرئيسية'}</span>
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
