import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, Wallet, AlertCircle, CheckCircle, Plus, X, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MerchantWithdrawPageProps {
  onNavigate: (page: string) => void;
}

interface WalletData {
  balance_total: number;
  balance_available: number;
  balance_hold: number;
  balance_pending_payout: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  hold_period_hours: number;
  last_payout_at: string | null;
}

interface MerchantData {
  kyc_status: string;
  can_withdraw: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  bank_accounts_count: number;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number_masked: string;
  verification_status: string;
}

interface PayoutRequest {
  id: string;
  amount_requested: number;
  amount_fees: number;
  amount_to_transfer: number;
  status: string;
  requested_at: string;
  bank_account: {
    bank_name: string;
    account_number_masked: string;
  };
  rejection_reason?: string;
}

export const MerchantWithdrawPage: React.FC<MerchantWithdrawPageProps> = ({ onNavigate }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWalletData();
    loadBankAccounts();
    loadRecentPayouts();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-wallet`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setWallet(result.wallet);
      setMerchant(result.merchant);
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-bank-accounts`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setBankAccounts(result.accounts || []);
      if (result.accounts && result.accounts.length > 0) {
        setSelectedBankAccount(result.accounts[0].id);
      }
    } catch (err: any) {
      console.error('Load bank accounts error:', err);
    }
  };

  const loadRecentPayouts = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-payouts-list?limit=10`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setRecentPayouts(result.payouts || []);
    } catch (err: any) {
      console.error('Load payouts error:', err);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage({ type: 'error', text: 'الرجاء إدخال مبلغ صحيح' });
      return;
    }

    if (!selectedBankAccount) {
      setMessage({ type: 'error', text: 'الرجاء اختيار حساب بنكي' });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (wallet && amount > wallet.balance_available) {
      setMessage({ type: 'error', text: 'المبلغ المطلوب أكبر من الرصيد المتاح' });
      return;
    }

    setProcessing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-payout-request`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          bank_account_id: selectedBankAccount,
          note: withdrawNote || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({
        type: 'success',
        text: 'تم إرسال طلب السحب بنجاح! سيتم معالجة طلبك خلال 24 ساعة.'
      });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawNote('');

      await loadWalletData();
      await loadRecentPayouts();
    } catch (err: any) {
      console.error('Withdraw error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const canWithdraw = () => {
    if (!merchant || !wallet) return false;
    if (merchant.kyc_status !== 'verified') return false;
    if (!merchant.can_withdraw) return false;
    if (bankAccounts.length === 0) return false;
    if (wallet.balance_available <= 0) return false;
    return true;
  };

  const getBlockMessage = () => {
    if (!merchant) return '';
    if (merchant.kyc_status !== 'verified') return 'يجب التحقق من الهوية أولاً';
    if (bankAccounts.length === 0) return 'يجب إضافة حساب بنكي أولاً';
    if (!merchant.can_withdraw) return 'حسابك محظور من السحب مؤقتاً';
    if (wallet && wallet.balance_available <= 0) return 'لا يوجد رصيد متاح للسحب';
    return '';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'processing': return 'قيد المعالجة';
      case 'paid': return 'مدفوعة';
      case 'rejected': return 'مرفوضة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-orange-500" />
            سحب الأرباح
          </h1>
          <p className="text-gray-600 mt-2">إدارة أرباحك وطلبات السحب</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : message.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                message.type === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`} />
            )}
            <p className={
              message.type === 'success'
                ? 'text-green-700'
                : message.type === 'warning'
                ? 'text-yellow-700'
                : 'text-red-700'
            }>
              {message.text}
            </p>
          </div>
        )}

        {!canWithdraw() && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-semibold">لا يمكن السحب حالياً</p>
              <p className="text-red-600 text-sm mt-1">{getBlockMessage()}</p>
              {bankAccounts.length === 0 && (
                <button
                  onClick={() => onNavigate('bank-account')}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                >
                  إضافة حساب بنكي
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-1">إجمالي الأرباح</p>
            <p className="text-3xl font-bold">{wallet?.total_earned.toFixed(2) || '0.00'} ريال</p>
            <p className="text-blue-100 text-xs mt-2">
              تم السحب: {wallet?.total_withdrawn.toFixed(2) || '0.00'} ريال
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-yellow-100 text-sm mb-1">الأرباح المعلقة</p>
            <p className="text-3xl font-bold">{wallet?.balance_hold.toFixed(2) || '0.00'} ريال</p>
            <p className="text-yellow-100 text-xs mt-2">
              سيتم تحريرها خلال {wallet?.hold_period_hours || 24} ساعة
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-green-100 text-sm mb-1">الرصيد المتاح للسحب</p>
            <p className="text-3xl font-bold">{wallet?.balance_available.toFixed(2) || '0.00'} ريال</p>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!canWithdraw()}
              className={`mt-3 w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 ${
                canWithdraw()
                  ? 'bg-white text-green-600 hover:bg-green-50'
                  : 'bg-white bg-opacity-50 text-green-100 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              طلب سحب
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">طلبات السحب الأخيرة</h2>
          </div>

          {recentPayouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلبات سحب حتى الآن</p>
              <p className="text-gray-400 text-sm mt-2">قم بإنشاء طلب سحب جديد لبدء استلام أرباحك</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ المطلوب</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرسوم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ النهائي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحساب البنكي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(payout.requested_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {payout.amount_requested.toFixed(2)} ريال
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        -{payout.amount_fees.toFixed(2)} ريال
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">
                        {payout.amount_to_transfer.toFixed(2)} ريال
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="text-xs">{payout.bank_account.bank_name}</div>
                        <div className="text-xs font-mono text-gray-500">{payout.bank_account.account_number_masked}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payout.status)}`}>
                          {getStatusText(payout.status)}
                        </span>
                        {payout.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">{payout.rejection_reason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">طلب سحب جديد</h2>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {message.text}
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-semibold">الرصيد المتاح للسحب</p>
                  <p className="text-2xl font-bold text-green-600">{wallet?.balance_available.toFixed(2)} ریال</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ المطلوب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="0"
                    max={wallet?.balance_available || 0}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => setWithdrawAmount(wallet?.balance_available.toString() || '0')}
                    className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    سحب كامل الرصيد
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحساب البنكي <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number_masked}
                      </option>
                    ))}
                  </select>
                  {bankAccounts.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">لا توجد حسابات بنكية</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="أضف أي ملاحظات إضافية"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    سيتم معالجة طلبك خلال 24 ساعة من قبل فريق الإدارة.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleWithdrawRequest}
                  disabled={processing}
                  className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {processing ? 'جاري المعالجة...' : 'تأكيد الطلب'}
                </button>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={processing}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
