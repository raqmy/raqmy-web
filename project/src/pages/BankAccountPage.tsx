import React, { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, CheckCircle, AlertCircle, Shield, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BankAccountPageProps {
  onNavigate: (page: string) => void;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number_masked: string;
  iban?: string;
  swift_code?: string;
  bank_country?: string;
  bank_city?: string;
  bank_branch?: string;
  verification_status: string;
  created_at: string;
}

export const BankAccountPage: React.FC<BankAccountPageProps> = ({ onNavigate }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
    bank_country: 'SA',
    bank_city: '',
    bank_branch: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-bank-accounts`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setAccounts(result.accounts || []);
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.bank_name || !newAccount.account_holder_name || !newAccount.account_number) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/merchant-bank-accounts`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAccount),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({ type: 'success', text: 'تم إضافة الحساب البنكي بنجاح! سيتم مراجعته من قبل فريق الإدارة.' });
      setShowAddModal(false);
      setNewAccount({
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        iban: '',
        swift_code: '',
        bank_country: 'SA',
        bank_city: '',
        bank_branch: '',
      });
      await loadAccounts();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      console.error('Add error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل إضافة الحساب' });
    } finally {
      setSaving(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'موثق';
      case 'pending': return 'قيد المراجعة';
      case 'rejected': return 'مرفوض';
      default: return status;
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
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-orange-500" />
            الحسابات البنكية
          </h1>
          <p className="text-gray-600 mt-2">إدارة حساباتك البنكية لاستلام الأرباح</p>
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
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة حساب بنكي جديد
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد حسابات بنكية</h3>
            <p className="text-gray-600 mb-6">
              قم بإضافة حساب بنكي لتتمكن من سحب أرباحك
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إضافة حساب بنكي
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-xl shadow-sm p-6 border-2 border-gray-200 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{account.bank_name}</h3>
                    <p className="text-sm text-gray-600">{account.account_holder_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getVerificationStatusColor(account.verification_status)}`}>
                    {account.verification_status === 'verified' && <Shield className="w-3 h-3" />}
                    {getVerificationStatusText(account.verification_status)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">رقم الحساب:</span>
                    <span className="font-mono text-gray-900">{account.account_number_masked}</span>
                  </div>
                  {account.iban && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">IBAN:</span>
                      <span className="font-mono text-gray-900">{account.iban}</span>
                    </div>
                  )}
                  {account.bank_country && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">الدولة:</span>
                      <span className="text-gray-900">{account.bank_country}</span>
                    </div>
                  )}
                  {account.bank_city && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">المدينة:</span>
                      <span className="text-gray-900">{account.bank_city}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 border-t pt-3">
                  تم الإضافة: {new Date(account.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">إضافة حساب بنكي جديد</h2>
                <button
                  onClick={() => setShowAddModal(false)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم البنك <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccount.bank_name}
                    onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="مثال: البنك الأهلي السعودي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم صاحب الحساب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccount.account_holder_name}
                    onChange={(e) => setNewAccount({ ...newAccount, account_holder_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="الاسم الكامل كما في السجل البنكي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الحساب البنكي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccount.account_number}
                    onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="رقم الحساب"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الآيبان (IBAN)
                  </label>
                  <input
                    type="text"
                    value={newAccount.iban}
                    onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="SA0000000000000000000000"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز SWIFT
                  </label>
                  <input
                    type="text"
                    value={newAccount.swift_code}
                    onChange={(e) => setNewAccount({ ...newAccount, swift_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="SWIFT Code"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الدولة
                    </label>
                    <input
                      type="text"
                      value={newAccount.bank_country}
                      onChange={(e) => setNewAccount({ ...newAccount, bank_country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="SA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المدينة
                    </label>
                    <input
                      type="text"
                      value={newAccount.bank_city}
                      onChange={(e) => setNewAccount({ ...newAccount, bank_city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="الرياض"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الفرع
                  </label>
                  <input
                    type="text"
                    value={newAccount.bank_branch}
                    onChange={(e) => setNewAccount({ ...newAccount, bank_branch: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="اسم الفرع"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    سيتم مراجعة بياناتك البنكية من قبل فريق الإدارة قبل التفعيل.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddAccount}
                  disabled={saving}
                  className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ الحساب'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
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
