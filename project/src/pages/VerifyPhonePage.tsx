import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Loader2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const VerifyPhonePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    if (error) setError('');
    if (success) setSuccess('');

    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (error) setError('');
    if (success) setSuccess('');

    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('يرجى إدخال رمز مكون من 6 أرقام');
      return;
    }

    // ✅ الرمز الوحيد المسموح حاليًا
    if (otpString !== '000000') {
      setError('رمز التحقق غير صحيح (استخدم 000000 للتجربة)');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('يرجى تسجيل الدخول مرة أخرى');
        return;
      }

      // ✅ محاولة تحديث قاعدة البيانات (ولو فشل بسبب عدم وجود الأعمدة، نكمل مؤقتًا)
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) {
        // إذا الأعمدة غير موجودة/الكاش، لا نوقف المستخدم مؤقتًا
        console.warn('Phone verify columns update failed (temporary bypass):', updateError);
      }

      setSuccess('تم تأكيد رقم الجوال بنجاح (وضع مؤقت)');
      await refreshProfile();

      // ✅ توجيه للصفحة الرئيسية بعد نجاح التحقق
      // (استبدل "/" لو صفحتك الرئيسية مسارها مختلف)
      navigate('/', { replace: true });
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSuccess('تم إرسال الرمز (وضع تجريبي)');
    setError('');
    setCooldown(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleChangePhone = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold">تأكيد رقم الجوال</h1>
            {profile?.phone && (
              <p className="text-blue-600 font-semibold" dir="ltr">
                {profile.phone}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex justify-center gap-2" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                value={digit}
                maxLength={1}
                inputMode="numeric"
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl border-2 rounded focus:border-blue-500"
                disabled={loading}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'تأكيد'}
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="w-full border py-2 rounded text-gray-700 disabled:opacity-50"
          >
            {cooldown > 0
              ? `إعادة الإرسال بعد ${cooldown}s`
              : 'إعادة إرسال الرمز'}
          </button>

          <button
            onClick={handleChangePhone}
            disabled={loading}
            className="w-full text-sm text-gray-500 disabled:opacity-50"
          >
            تغيير رقم الجوال
          </button>
        </div>
      </div>
    </div>
  );
};
