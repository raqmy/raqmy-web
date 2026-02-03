import React, { useState, useEffect } from 'react';
import { Banknote, Loader2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface MerchantBankDetailsPageProps {
  onNavigate: (page: string) => void;
}

const SAUDI_BANKS = [
  'البنك الأهلي السعودي',
  'مصرف الراجحي',
  'البنك السعودي الفرنسي',
  'البنك السعودي البريطاني (ساب)',
  'بنك الرياض',
  'بنك البلاد',
  'بنك الجزيرة',
  'البنك العربي الوطني',
  'بنك سامبا',
  'بنك الإنماء',
  'بنك الخليج الدولي',
  'مصرف الإمارات الإسلامي',
  'البنك الأول',
  'بنك آخر',
];

export const MerchantBankDetailsPage: React.FC<MerchantBankDetailsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkExistingBankDetails();
  }, [profile]);

  const checkExistingBankDetails = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('merchant_payout_accounts')
        .select('*')
        .eq('merchant_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        onNavigate('home');
      }
    } catch (err) {
      console.error('Error checking bank details:', err);
    } finally {
      setCheckingExisting(false);
    }
  };

  const formatIBAN = (value: string): string => {
    const cleaned = value.replace(/\s+/g, '').toUpperCase();
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const normalizeIBAN = (value: string): string => {
    return value.replace(/\s+/g, '').toUpperCase();
  };

  const validateIBAN = (value: string): { valid: boolean; error?: string } => {
    const normalized = normalizeIBAN(value);

    if (!normalized) {
      return { valid: false, error: 'رقم الآيبان مطلوب' };
    }

    if (!normalized.startsWith('SA')) {
      return { valid: false, error: 'رقم الآيبان يجب أن يبدأ بـ SA' };
    }

    if (normalized.length !== 24) {
      return { valid: false, error: 'رقم الآيبان السعودي يجب أن يتكون من 24 حرفاً (SA + 22 رقماً)' };
    }

    const digitsOnly = normalized.slice(2);
    if (!/^\d{22}$/.test(digitsOnly)) {
      return { valid: false, error: 'رقم الآيبان يجب أن يحتوي على أرقام فقط بعد SA' };
    }

    return { valid: true };
  };

  const handleIBANChange = (value: string) => {
    const formatted = formatIBAN(value);
    if (formatted.length <= 29) {
      setIban(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!accountHolderName.trim()) {
      setError('اسم صاحب الحساب مطلوب');
      return;
    }

    const ibanValidation = validateIBAN(iban);
    if (!ibanValidation.valid) {
      setError(ibanValidation.error || 'رقم الآيبان غير صحيح');
      return;
    }

    if (!profile) {
      setError('يرجى تسجيل الدخول مرة أخرى');
      return;
    }

    setLoading(true);

    try {
      const normalizedIBAN = normalizeIBAN(iban);

      const bankAccountData = {
        merchant_id: profile.id,
        account_holder_name: accountHolderName.trim(),
        iban: normalizedIBAN,
        bank_name: bankName || null,
        country_code: 'SA',
        currency: 'SAR',
        payout_method: 'bank_transfer',
        is_default: true,
      };

      console.log('Saving bank details for user:', profile.id);

      const { data: savedData, error: insertError } = await supabase
        .from('merchant_payout_accounts')
        .upsert(bankAccountData)
        .select();

      if (insertError) {
        console.error('Error saving bank details:', insertError);
        throw new Error(`فشل حفظ بيانات الحساب البنكي: ${insertError.message}`);
      }

      console.log('Bank details saved successfully');

      setSuccess('تم حفظ بيانات الحساب البنكي بنجاح');

      setTimeout(() => {
        onNavigate('home');
      }, 1500);
    } catch (err: any) {
      console.error('Bank details save error:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Banknote className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">بيانات الحساب البنكي</h1>
              <p className="text-gray-600">
                أدخل بيانات حسابك البنكي لاستلام الأرباح من المبيعات
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  هذه الخطوة مطلوبة لجميع التجار. سيتم استخدام هذه البيانات لتحويل أرباحك من المبيعات.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم صاحب الحساب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="الاسم كما هو مسجل في البنك"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                يجب أن يطابق الاسم المسجل في الحساب البنكي
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الآيبان (IBAN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => handleIBANChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="SA00 0000 0000 0000 0000 0000"
                required
                disabled={loading}
                dir="ltr"
              />
              <p className="mt-1 text-xs text-gray-500">
                رقم الآيبان السعودي (24 حرفاً: SA + 22 رقماً)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم البنك
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">اختر البنك</option>
                {SAUDI_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                اختياري ولكن يساعد في تسريع عمليات التحويل
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">معلومات مهمة:</p>
                  <ul className="list-disc list-inside space-y-1 mr-2">
                    <li>الدولة: المملكة العربية السعودية</li>
                    <li>العملة: الريال السعودي (SAR)</li>
                    <li>يمكنك تعديل هذه البيانات لاحقاً من صفحة الملف الشخصي</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <span>حفظ والمتابعة</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              بيانات حسابك البنكي محمية ومشفرة ولن يتم مشاركتها مع أي طرف ثالث
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
