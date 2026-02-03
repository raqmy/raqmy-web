import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Loader2, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const VerifyPhonePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }

    setOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('يرجى تسجيل الدخول مرة أخرى');
        await supabase.auth.signOut();
        return;
      }

      // DEV-only bypass: Accept "000000" or "123456" for testing
      const isDevelopment = import.meta.env.DEV;
      const isProductionSafe = !import.meta.env.PROD;
      const isBypassOtp = otpString === '000000' || otpString === '123456';

      if (isDevelopment && isProductionSafe && isBypassOtp) {
        console.log('🔧 DEV MODE: Using bypass OTP verification');

        // Update phone_verified in database directly
        const { error: updateError } = await supabase
          .from('users_profile')
          .update({
            phone_verified: true,
            phone_verified_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Error updating phone verification:', updateError);
          throw new Error('فشل تحديث حالة التحقق');
        }

        console.log('✅ DEV MODE: Phone verified successfully (bypass)');
        setSuccess('تم التحقق من رقم الجوال بنجاح (وضع التطوير)');
        await refreshProfile();
        return;
      }

      // Production flow: Call the edge function for real OTP verification
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp: otpString }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'فشل التحقق من رمز التحقق');
      }

      setSuccess('تم التحقق من رقم الجوال بنجاح');

      await refreshProfile();
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'حدث خطأ أثناء التحقق');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !profile?.phone) {
        setError('يرجى تسجيل الدخول مرة أخرى');
        await supabase.auth.signOut();
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: profile.phone }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'فشل إعادة إرسال رمز التحقق');
      }

      setSuccess('تم إعادة إرسال رمز التحقق بنجاح');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'حدث خطأ أثناء إعادة الإرسال');
    } finally {
      setResending(false);
    }
  };

  const handleChangePhone = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">تأكيد رقم الجوال</h1>
              <p className="text-gray-600">
                أدخل رمز التحقق المرسل إلى
              </p>
              {profile?.phone && (
                <p className="text-blue-600 font-semibold mt-1" dir="ltr">
                  {profile.phone}
                </p>
              )}
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                رمز التحقق
              </label>
              <div className="flex justify-center gap-2" dir="ltr">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    disabled={loading}
                  />
                ))}
              </div>
              {import.meta.env.DEV && (
                <p className="text-xs text-center text-amber-600 mt-2 bg-amber-50 py-1.5 px-3 rounded-md border border-amber-200">
                  DEV: استخدم 000000 للتجربة
                </p>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <span>تأكيد</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>إعادة الإرسال بعد {cooldown} ثانية</span>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>إعادة إرسال الرمز</span>
                  </>
                )}
              </button>

              <button
                onClick={handleChangePhone}
                className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                تغيير رقم الجوال
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              لم تستلم الرمز؟ تحقق من رسائل SMS أو جرب إعادة الإرسال
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
