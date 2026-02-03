import React, { useEffect, useState } from 'react';
import { DollarSign, Check, X, Eye, AlertCircle, TrendingUp, Clock, CheckCircle as CheckCircleIcon, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminWithdrawalsPageProps {
  onNavigate: (page: string) => void;
}

interface PayoutRequest {
  id: string;
  merchant_id: string;
  amount_requested: number;
  amount_fees: number;
  amount_to_transfer: number;
  status: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  merchant: {
    business_name: string;
    kyc_status: string;
  };
  bank_account: {
    bank_name: string;
    account_holder_name: string;
    account_number_masked: string;
  };
}

interface Statistics {
  total: number;
  pending: number;
  processing: number;
  paid: number;
  rejected: number;
  total_amount_pending: number;
  total_amount_processing: number;
  total_amount_paid: number;
}

export const AdminWithdrawalsPage: React.FC<AdminWithdrawalsPageProps> = ({ onNavigate }) => {
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      loadPayouts();
    }
  }, [profile, filter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payouts-list`;
      const url = filter !== 'all' ? `${apiUrl}?status=${filter}` : apiUrl;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setPayouts(result.payouts || []);
      setStatistics(result.statistics);
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayout) return;
    setProcessing(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payouts-approve`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_id: selectedPayout.id,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({ type: 'success', text: 'تمت الموافقة على الطلب بنجاح' });
      setShowModal(false);
      setSelectedPayout(null);
      setNotes('');
      await loadPayouts();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;
    if (!rejectionReason) {
      setMessage({ type: 'error', text: 'يرجى إضافة سبب الرفض' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setProcessing(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payouts-reject`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_id: selectedPayout.id,
          reason: rejectionReason,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({ type: 'success', text: 'تم رفض الطلب' });
      setShowModal(false);
      setSelectedPayout(null);
      setRejectionReason('');
      await loadPayouts();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setNotes(payout.admin_notes || '');
    setRejectionReason(payout.rejection_reason || '');
    setShowModal(true);
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600 mb-6">هذه الصفحة متاحة للمشرفين فقط</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

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
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-orange-500" />
            إدارة طلبات السحب
          </h1>
          <p className="text-gray-600 mt-2">إدارة جميع طلبات سحب التجار</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">قيد المراجعة</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.pending}</p>
                  <p className="text-xs text-gray-500">{statistics.total_amount_pending.toFixed(2)} ريال</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">قيد المعالجة</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.processing}</p>
                  <p className="text-xs text-gray-500">{statistics.total_amount_processing.toFixed(2)} ريال</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">مدفوعة</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.paid}</p>
                  <p className="text-xs text-gray-500">{statistics.total_amount_paid.toFixed(2)} ريال</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">مرفوضة</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.rejected}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            قيد المراجعة
          </button>
          <button
            onClick={() => setFilter('processing')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'processing' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            قيد المعالجة
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'paid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            مدفوعة
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'rejected' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            مرفوضة
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاجر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصافي</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    لا توجد طلبات سحب
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payout.merchant.business_name}</div>
                        <div className="text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            payout.merchant.kyc_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payout.merchant.kyc_status === 'verified' ? 'موثق' : 'غير موثق'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {payout.amount_requested.toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-green-600">
                        {payout.amount_to_transfer.toFixed(2)} ريال
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payout.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : payout.status === 'processing'
                            ? 'bg-blue-100 text-blue-700'
                            : payout.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {payout.status === 'pending' && 'قيد المراجعة'}
                        {payout.status === 'processing' && 'قيد المعالجة'}
                        {payout.status === 'paid' && 'مدفوعة'}
                        {payout.status === 'rejected' && 'مرفوضة'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(payout.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openModal(payout)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && selectedPayout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">تفاصيل طلب السحب</h2>

              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {message.text}
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">معلومات التاجر</h3>
                  <p className="text-sm text-gray-600">الاسم: {selectedPayout.merchant.business_name}</p>
                  <p className="text-sm text-gray-600">
                    حالة التحقق:
                    <span className={`mr-2 px-2 py-0.5 rounded text-xs ${
                      selectedPayout.merchant.kyc_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedPayout.merchant.kyc_status === 'verified' ? 'موثق' : 'غير موثق'}
                    </span>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">معلومات الحساب البنكي</h3>
                  <p className="text-sm text-gray-600">البنك: {selectedPayout.bank_account.bank_name}</p>
                  <p className="text-sm text-gray-600">صاحب الحساب: {selectedPayout.bank_account.account_holder_name}</p>
                  <p className="text-sm text-gray-600 font-mono">رقم الحساب: {selectedPayout.bank_account.account_number_masked}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">معلومات المبلغ</h3>
                  <p className="text-sm text-gray-600">المبلغ المطلوب: {selectedPayout.amount_requested.toFixed(2)} ريال</p>
                  <p className="text-sm text-gray-600">الرسوم: {selectedPayout.amount_fees.toFixed(2)} ريال</p>
                  <p className="text-sm font-bold text-green-600">المبلغ للتحويل: {selectedPayout.amount_to_transfer.toFixed(2)} ريال</p>
                </div>

                {selectedPayout.admin_notes && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-2">ملاحظات الإدارة</h3>
                    <p className="text-sm text-gray-700">{selectedPayout.admin_notes}</p>
                  </div>
                )}

                {selectedPayout.rejection_reason && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-bold text-red-900 mb-2">سبب الرفض</h3>
                    <p className="text-sm text-red-700">{selectedPayout.rejection_reason}</p>
                  </div>
                )}

                {selectedPayout.status === 'pending' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات الإدارة (اختياري)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="أضف ملاحظات إضافية"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سبب الرفض (في حالة الرفض) <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="الرجاء كتابة سبب الرفض"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                {selectedPayout.status === 'pending' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      {processing ? 'جاري المعالجة...' : 'الموافقة'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {processing ? 'جاري المعالجة...' : 'رفض'}
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
