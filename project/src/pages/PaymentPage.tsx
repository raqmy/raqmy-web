import React, { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PaymentPageProps {
  onNavigate: (page: string) => void;
  orderId: string;
}

interface Order {
  id: string;
  order_number?: string | null;
  total_amount: number;
  status: string;
  currency?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  created_at?: string | null;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ onNavigate, orderId }) => {
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile && orderId) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError('');

    try {
      const ownerFilter = `customer_id.eq.${profile!.id},user_id.eq.${profile!.id}`;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .or(ownerFilter)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setOrder(null);
        setError('لم يتم العثور على الطلب');
        return;
      }

      setOrder(data as Order);
    } catch (err) {
      console.error('Error fetching order:', err);
      setOrder(null);
      setError('لم يتم العثور على الطلب');
    } finally {
      setLoading(false);
    }
  };

  const buildPaymobIframeUrl = (iframeId: string | number, paymentToken: string) => {
    return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
  };

  const extractRedirectUrl = (result: any): string | null => {
    if (!result) return null;

    if (typeof result === 'string' && result.startsWith('http')) {
      return result;
    }

    if (result.iframe_url && typeof result.iframe_url === 'string') {
      return result.iframe_url;
    }

    if (result.payment_url && typeof result.payment_url === 'string') {
      return result.payment_url;
    }

    if (result.checkout_url && typeof result.checkout_url === 'string') {
      return result.checkout_url;
    }

    if (result.url && typeof result.url === 'string') {
      return result.url;
    }

    if (result.redirect_url && typeof result.redirect_url === 'string') {
      return result.redirect_url;
    }

    if (result.iframe_id && result.payment_token) {
      return buildPaymobIframeUrl(result.iframe_id, result.payment_token);
    }

    if (result.data?.iframe_url && typeof result.data.iframe_url === 'string') {
      return result.data.iframe_url;
    }

    if (result.data?.payment_url && typeof result.data.payment_url === 'string') {
      return result.data.payment_url;
    }

    if (result.data?.checkout_url && typeof result.data.checkout_url === 'string') {
      return result.data.checkout_url;
    }

    if (result.data?.url && typeof result.data.url === 'string') {
      return result.data.url;
    }

    if (result.data?.redirect_url && typeof result.data.redirect_url === 'string') {
      return result.data.redirect_url;
    }

    if (result.data?.iframe_id && result.data?.payment_token) {
      return buildPaymobIframeUrl(result.data.iframe_id, result.data.payment_token);
    }

    return null;
  };

  const handlePayment = async () => {
    if (!order) return;

    if (order.status === 'paid' || order.status === 'completed') {
      onNavigate(`payment-success-${order.id}`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('يجب تسجيل الدخول أولًا');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-paymob-payment`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          orderId: orderId,
        }),
      });

      const rawText = await response.text();
      let result: any = null;

      try {
        result = rawText ? JSON.parse(rawText) : null;
      } catch {
        result = rawText;
      }

      if (!response.ok) {
        const serverMessage =
          result?.error ||
          result?.message ||
          (typeof result === 'string' ? result : null) ||
          'فشل بدء جلسة الدفع';
        throw new Error(serverMessage);
      }

      const redirectUrl = extractRedirectUrl(result);

      if (!redirectUrl) {
        console.error('Unexpected create-paymob-payment response:', result);
        throw new Error('تعذر الحصول على رابط الدفع من Paymob');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error('Paymob payment start error:', err);
      setError(err?.message || 'حدث خطأ أثناء بدء الدفع. حاول مرة أخرى.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">خطأ</h3>
          <p className="text-gray-600 mb-6">{error || 'لم يتم العثور على الطلب'}</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const displayOrderNumber = order.order_number || order.id;
  const displayCurrency = order.currency === 'SAR' || !order.currency ? 'ريال' : order.currency;
  const isAlreadyPaid = order.status === 'paid' || order.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-8 h-8" />
              <h1 className="text-2xl font-bold">صفحة الدفع</h1>
            </div>
            <p className="text-blue-100">رقم الطلب: {displayOrderNumber}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل الطلب</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">اسم العميل</span>
                  <span className="font-semibold text-gray-900">
                    {order.customer_name || '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني</span>
                  <span className="font-semibold text-gray-900" dir="ltr">
                    {order.customer_email || '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الهاتف</span>
                  <span className="font-semibold text-gray-900" dir="ltr">
                    {order.customer_phone || '—'}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">المبلغ الإجمالي</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {Number(order.total_amount || 0).toFixed(2)} {displayCurrency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!isAlreadyPaid && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                سيتم تحويلك إلى صفحة الدفع الآمنة لإدخال بيانات البطاقة وإتمام العملية.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">خطأ في الدفع</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={processing || isAlreadyPaid}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تحويلك إلى Paymob...</span>
                </>
              ) : isAlreadyPaid ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>تم الدفع بنجاح</span>
                </>
              ) : (
                <span>تأكيد ودفع {Number(order.total_amount || 0).toFixed(2)} {displayCurrency}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
