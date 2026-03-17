import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Check,
  X,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle as CheckCircleIcon,
  XCircle,
  RefreshCw,
  User,
  Wallet,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminWithdrawalsPageProps {
  onNavigate: (page: string) => void;
}

type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'paid';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface WithdrawalRequestRow {
  id: string;
  merchant_id: string;
  amount: number;
  status: WithdrawalStatus;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  processed_at: string | null;
}

interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

interface IdentityVerificationRow {
  user_id: string;
  status: string | null;
}

interface WalletRow {
  merchant_id: string;
  balance_available: number | null;
  balance_pending: number | null;
}

interface WalletLedgerRow {
  id: string;
  merchant_id: string;
  wallet_id?: string | null;
  entry_type: string;
  amount: number;
  status: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface PayoutRequest extends WithdrawalRequestRow {
  merchant_name: string;
  merchant_email: string;
  merchant_role: string;
  merchant_verification_status: 'approved' | 'pending' | 'rejected' | 'not_submitted';
  wallet_balance_available: number;
  wallet_balance_pending: number;
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_pending: number;
  total_amount_approved: number;
  total_amount_rejected: number;
}

const formatMoney = (value: number | null | undefined) => {
  return `${Number(value || 0).toFixed(2)} ريال`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ar-SA');
  } catch {
    return value;
  }
};

const mapVerificationStatusLabel = (status: string | null | undefined) => {
  if (status === 'approved') return 'موثق';
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'rejected') return 'مرفوض';
  return 'غير موثق';
};

const verificationStatusClass = (status: string | null | undefined) => {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
};

const withdrawalStatusLabel = (status: string | null | undefined) => {
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'approved') return 'تمت الموافقة';
  if (status === 'rejected') return 'مرفوض';
  if (status === 'processing') return 'قيد المعالجة';
  if (status === 'paid') return 'مدفوع';
  return status || 'غير معروف';
};

const withdrawalStatusClass = (status: string | null | undefined) => {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'processing') return 'bg-blue-100 text-blue-700';
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-700';
};

export const AdminWithdrawalsPage: React.FC<AdminWithdrawalsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showTimedMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => {
      setMessage(null);
    }, 3500);
  };

  const closeModal = () => {
    if (processing) return;
    setShowModal(false);
    setSelectedPayout(null);
    setNotes('');
    setRejectionReason('');
  };

  const openModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setNotes(payout.notes || '');
    setRejectionReason(payout.rejection_reason || '');
    setShowModal(true);
  };

  const loadPayouts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) {
        console.error('withdrawal_requests fetch error:', requestsError);
        throw new Error('حدث خطأ أثناء تحميل طلبات السحب');
      }

      const requests = (requestsData || []) as WithdrawalRequestRow[];

      const merchantIds = Array.from(new Set(requests.map((r) => r.merchant_id).filter(Boolean)));

      let usersMap: Record<string, UserProfileRow> = {};
      let verificationMap: Record<string, string> = {};
      let walletsMap: Record<string, WalletRow> = {};

      if (merchantIds.length > 0) {
        const [
          { data: usersData, error: usersError },
          { data: verificationData, error: verificationError },
          { data: walletsData, error: walletsError },
        ] = await Promise.all([
          supabase.from('users_profile').select('id, name, email, role').in('id', merchantIds),
          supabase.from('identity_verifications').select('user_id, status').in('user_id', merchantIds),
          supabase.from('wallets').select('merchant_id, balance_available, balance_pending').in('merchant_id', merchantIds),
        ]);

        if (usersError) {
          console.error('users_profile fetch error:', usersError);
        }

        if (verificationError) {
          console.error('identity_verifications fetch error:', verificationError);
        }

        if (walletsError) {
          console.error('wallets fetch error:', walletsError);
        }

        for (const user of (usersData || []) as UserProfileRow[]) {
          usersMap[user.id] = user;
        }

        for (const item of (verificationData || []) as IdentityVerificationRow[]) {
          verificationMap[item.user_id] = item.status || 'not_submitted';
        }

        for (const wallet of (walletsData || []) as WalletRow[]) {
          walletsMap[wallet.merchant_id] = wallet;
        }
      }

      const enhancedPayouts: PayoutRequest[] = requests.map((request) => {
        const user = usersMap[request.merchant_id];
        const wallet = walletsMap[request.merchant_id];

        return {
          ...request,
          merchant_name: user?.name || 'تاجر',
          merchant_email: user?.email || '—',
          merchant_role: user?.role || 'seller',
          merchant_verification_status:
            (verificationMap[request.merchant_id] as
              | 'approved'
              | 'pending'
              | 'rejected'
              | 'not_submitted') || 'not_submitted',
          wallet_balance_available: Number(wallet?.balance_available || 0),
          wallet_balance_pending: Number(wallet?.balance_pending || 0),
        };
      });

      setPayouts(enhancedPayouts);
    } catch (err: any) {
      console.error('Load payouts error:', err);
      showTimedMessage('error', err?.message || 'فشل تحميل طلبات السحب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      loadPayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, filter]);

  const statistics = useMemo<Statistics>(() => {
    const total = payouts.length;
    const pendingRows = payouts.filter((item) => item.status === 'pending');
    const approvedRows = payouts.filter((item) => item.status === 'approved');
    const rejectedRows = payouts.filter((item) => item.status === 'rejected');

    return {
      total,
      pending: pendingRows.length,
      approved: approvedRows.length,
      rejected: rejectedRows.length,
      total_amount_pending: pendingRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      total_amount_approved: approvedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      total_amount_rejected: rejectedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [payouts]);

  const updateMatchingWalletLedger = async (
    merchantId: string,
    amount: number,
    status: 'completed' | 'rejected',
    adminNote: string
  ) => {
    const { data: ledgerRows, error: ledgerFetchError } = await supabase
      .from('wallet_ledger')
      .select('id, merchant_id, entry_type, amount, status, reference, notes, created_at')
      .eq('merchant_id', merchantId)
      .eq('entry_type', 'withdrawal_request')
      .eq('amount', amount)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (ledgerFetchError) {
      console.error('wallet_ledger fetch error:', ledgerFetchError);
      return;
    }

    const ledgerRow = (ledgerRows || [])[0] as WalletLedgerRow | undefined;
    if (!ledgerRow) return;

    const { error: ledgerUpdateError } = await supabase
      .from('wallet_ledger')
      .update({
        status,
        notes: adminNote,
      })
      .eq('id', ledgerRow.id);

    if (ledgerUpdateError) {
      console.error('wallet_ledger update error:', ledgerUpdateError);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayout || !profile) return;
    if (selectedPayout.status !== 'pending') {
      showTimedMessage('error', 'لا يمكن اعتماد هذا الطلب لأن حالته لم تعد قيد المراجعة');
      return;
    }

    try {
      setProcessing(true);

      const nowIso = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_at: nowIso,
          approved_by: profile.id,
          processed_at: nowIso,
          notes: notes.trim() || null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
        })
        .eq('id', selectedPayout.id)
        .eq('status', 'pending');

      if (updateError) {
        console.error('withdrawal_requests approve error:', updateError);
        throw new Error('تعذر اعتماد طلب السحب');
      }

      await updateMatchingWalletLedger(
        selectedPayout.merchant_id,
        Number(selectedPayout.amount || 0),
        'completed',
        notes.trim() || 'تمت الموافقة على طلب السحب من الإدارة'
      );

      showTimedMessage('success', 'تمت الموافقة على الطلب بنجاح');
      closeModal();
      await loadPayouts();
    } catch (err: any) {
      console.error('handleApprove error:', err);
      showTimedMessage('error', err?.message || 'حدث خطأ أثناء الموافقة على الطلب');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout || !profile) return;

    if (selectedPayout.status !== 'pending') {
      showTimedMessage('error', 'لا يمكن رفض هذا الطلب لأن حالته لم تعد قيد المراجعة');
      return;
    }

    if (!rejectionReason.trim()) {
      showTimedMessage('error', 'يرجى كتابة سبب الرفض');
      return;
    }

    try {
      setProcessing(true);

      const nowIso = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejected_at: nowIso,
          rejected_by: profile.id,
          rejection_reason: rejectionReason.trim(),
          processed_at: nowIso,
          notes: notes.trim() || null,
          approved_at: null,
          approved_by: null,
        })
        .eq('id', selectedPayout.id)
        .eq('status', 'pending');

      if (updateError) {
        console.error('withdrawal_requests reject error:', updateError);
        throw new Error('تعذر رفض طلب السحب');
      }

      await updateMatchingWalletLedger(
        selectedPayout.merchant_id,
        Number(selectedPayout.amount || 0),
        'rejected',
        `تم رفض طلب السحب. السبب: ${rejectionReason.trim()}`
      );

      showTimedMessage('success', 'تم رفض الطلب بنجاح');
      closeModal();
      await loadPayouts();
    } catch (err: any) {
      console.error('handleReject error:', err);
      showTimedMessage('error', err?.message || 'حدث خطأ أثناء رفض الطلب');
    } finally {
      setProcessing(false);
    }
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
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-orange-500" />
              إدارة طلبات السحب
            </h1>
            <p className="text-gray-600 mt-2">إدارة جميع طلبات سحب التجار</p>
          </div>

          <button
            onClick={loadPayouts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث البيانات
          </button>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">قيد المراجعة</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.pending}</p>
                <p className="text-xs text-gray-500">{formatMoney(statistics.total_amount_pending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">تمت الموافقة</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.approved}</p>
                <p className="text-xs text-gray-500">{formatMoney(statistics.total_amount_approved)}</p>
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
                <p className="text-xs text-gray-500">{formatMoney(statistics.total_amount_rejected)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            الكل
          </button>

          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            قيد المراجعة
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'approved'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            تمت الموافقة
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'rejected'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            مرفوضة
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاجر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد المتاح</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      لا توجد طلبات سحب
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{payout.merchant_name}</div>
                          <div className="text-xs text-gray-500 mt-1">{payout.merchant_email}</div>
                          <div className="mt-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${verificationStatusClass(
                                payout.merchant_verification_status
                              )}`}
                            >
                              {mapVerificationStatusLabel(payout.merchant_verification_status)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{formatMoney(payout.amount)}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-green-700 font-semibold">
                          {formatMoney(payout.wallet_balance_available)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${withdrawalStatusClass(
                            payout.status
                          )}`}
                        >
                          {withdrawalStatusLabel(payout.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{formatDateTime(payout.created_at)}</span>
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
        </div>

        {showModal && selectedPayout && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">تفاصيل طلب السحب</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${withdrawalStatusClass(
                    selectedPayout.status
                  )}`}
                >
                  {withdrawalStatusLabel(selectedPayout.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">معلومات التاجر</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">الاسم: {selectedPayout.merchant_name}</p>
                  <p className="text-sm text-gray-700 mb-2">البريد: {selectedPayout.merchant_email}</p>
                  <p className="text-sm text-gray-700">
                    التوثيق:
                    <span
                      className={`mr-2 px-2 py-1 rounded text-xs font-semibold ${verificationStatusClass(
                        selectedPayout.merchant_verification_status
                      )}`}
                    >
                      {mapVerificationStatusLabel(selectedPayout.merchant_verification_status)}
                    </span>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-gray-900">معلومات المحفظة</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    المبلغ المطلوب: <span className="font-bold">{formatMoney(selectedPayout.amount)}</span>
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    الرصيد المتاح الحالي: <span className="font-bold">{formatMoney(selectedPayout.wallet_balance_available)}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    الرصيد المعلّق: <span className="font-bold">{formatMoney(selectedPayout.wallet_balance_pending)}</span>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-gray-900">تواريخ الطلب</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">تاريخ الإنشاء: {formatDateTime(selectedPayout.created_at)}</p>
                  <p className="text-sm text-gray-700 mb-2">تاريخ الموافقة: {formatDateTime(selectedPayout.approved_at)}</p>
                  <p className="text-sm text-gray-700">تاريخ الرفض: {formatDateTime(selectedPayout.rejected_at)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">الحالة الحالية</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    الحالة: <span className="font-bold">{withdrawalStatusLabel(selectedPayout.status)}</span>
                  </p>
                  <p className="text-sm text-gray-700">تاريخ المعالجة: {formatDateTime(selectedPayout.processed_at)}</p>
                </div>
              </div>

              {selectedPayout.notes && (
                <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-2">ملاحظات الإدارة</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPayout.notes}</p>
                </div>
              )}

              {selectedPayout.rejection_reason && (
                <div className="mb-4 bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-900 mb-2">سبب الرفض</h3>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedPayout.rejection_reason}</p>
                </div>
              )}

              {selectedPayout.status === 'pending' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ملاحظات الإدارة (اختياري)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="أضف ملاحظات داخلية إن لزم"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سبب الرفض <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                      placeholder="اكتب سبب الرفض هنا في حال قررت رفض الطلب"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3">
                {selectedPayout.status === 'pending' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      {processing ? 'جاري المعالجة...' : 'الموافقة على الطلب'}
                    </button>

                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      {processing ? 'جاري المعالجة...' : 'رفض الطلب'}
                    </button>
                  </>
                )}

                <button
                  onClick={closeModal}
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
