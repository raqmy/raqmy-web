import React, { useEffect, useState } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PaymentPageProps {
  onNavigate: (page: string) => void;
  orderId: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
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
  }, [profile, orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', profile!.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('لم يتم العثور على الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('يجب تسجيل الدخول');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-stripe-payment`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'فشلت عملية الدفع');
      }

      await supabase.from('payment_logs').insert({
        order_id: orderId,
        event_type: 'payment_success',
        status: 'success',
        payload: { paymentIntentId: result.paymentIntentId }
      });

      onNavigate(`payment-success-${orderId}`);
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'فشلت عملية الدفع. الرجاء المحاولة مرة أخرى.');

      await supabase.from('payment_logs').insert({
        order_id: orderId,
        event_type: 'payment_failed',
        status: 'failed',
        error_message: error.message
      });

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-8 h-8" />
              <h1 className="text-2xl font-bold">صفحة الدفع</h1>
            </div>
            <p className="text-blue-100">رقم الطلب: {order.order_number}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل الطلب</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">اسم العميل</span>
                  <span className="font-semibold text-gray-900">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني</span>
                  <span className="font-semibold text-gray-900" dir="ltr">{order.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الهاتف</span>
                  <span className="font-semibold text-gray-900" dir="ltr">{order.customer_phone}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">المبلغ الإجمالي</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {order.total_amount.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
              </div>
            </div>

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
              disabled={processing || order.status === 'paid'}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري معالجة الدفع...</span>
                </>
              ) : order.status === 'paid' ? (
                <>
                  <CheckCircle className="w-6 h-6" />
                  <span>تم الدفع بنجاح</span>
                </>
              ) : (
                <>
                  <span>تأكيد ودفع {order.total_amount.toFixed(2)} ريال</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
