import React, { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface WithdrawalRequestsPageProps {
  onNavigate: (page: string) => void;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  admin_notes: string | null;
  bank_reference: string | null;
  created_at: string;
  processed_at: string | null;
}

export const WithdrawalRequestsPage: React.FC<WithdrawalRequestsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    if (profile) {
      loadRequests();
    }
  }, [profile]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('merchant_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('merchant_id', profile!.id)
        .eq('status', 'pending');

      if (error) throw error;
      await loadRequests();
    } catch (err: any) {
      alert('فشل إلغاء الطلب: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };

    const labels: any = {
      pending: 'قيد المراجعة',
      approved: 'تمت الموافقة',
      completed: 'مكتمل',
      rejected: 'مرفوض',
      cancelled: 'ملغي',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-orange-500" />
            طلبات السحب
          </h1>
          <p className="text-gray-600 mt-2">تتبع جميع طلبات سحب الأرباح</p>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => onNavigate('bank-account')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
          >
            إضافة طلب سحب جديد
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات سحب</h3>
            <p className="text-gray-600 mb-6">لم تقم بإضافة أي طلب سحب حتى الآن</p>
            <button
              onClick={() => onNavigate('bank-account')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
            >
              طلب سحب الآن
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرسوم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصافي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {request.amount.toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {request.fee.toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-green-600">
                        {request.net_amount.toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.admin_notes ? (
                        <span className="text-sm text-gray-600">{request.admin_notes}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          إلغاء
                        </button>
                      )}
                      {request.status === 'completed' && request.bank_reference && (
                        <span className="text-xs text-gray-500">
                          مرجع: {request.bank_reference}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
