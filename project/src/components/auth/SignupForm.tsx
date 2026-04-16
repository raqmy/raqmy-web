import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Store,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

type SignupStep =
  | 'basic-info'
  | 'email-verification'
  | 'phone-entry'
  | 'phone-verification'
  | 'completed';

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<SignupStep>('basic-info');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);

  const normalizeEmail = (value: string): string => value.trim().toLowerCase();

  const validatePhone = (phoneNumber: string): boolean => {
    const cleanedPhone = phoneNumber.trim().replace(/\s+/g, '');
    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    return phoneRegex.test(cleanedPhone);
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('966')) {
      return '+' + cleaned;
    }

    if (cleaned.startsWith('05')) {
      return '+966' + cleaned.substring(1);
    }

    if (cleaned.startsWith('5')) {
      return '+966' + cleaned;
    }

    return value.trim();
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  const handleBasicSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!name.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }

    if (!email.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            role,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء الحساب');
      }

      setInfoMessage('تم إنشاء الحساب الأساسي. الآن تحقق من بريدك الإلكتروني للمتابعة.');
      setStep('email-verification');
    } catch (err: any) {
      const message = err?.message || 'فشل إنشاء الحساب';

      if (message.includes('User already registered')) {
        setError(
          'هذا البريد الإلكتروني مسجل بالفعل. إذا كان تسجيلك غير مكتمل فانتقل إلى تسجيل الدخول لإكمال الخطوات.'
        );
      } else if (message.toLowerCase().includes('email')) {
        setError('البريد الإلكتروني غير صحيح أو مستخدم بالفعل');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailVerification = async () => {
    setError('');
    setInfoMessage('');
    setSecondaryLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizeEmail(email),
      });

      if (resendError) throw resendError;

      setInfoMessage('تم إرسال رابط تحقق جديد إلى بريدك الإلكتروني.');
    } catch (err: any) {
      setError(err?.message || 'فشل إعادة إرسال رابط التحقق');
    } finally {
      setSecondaryLoading(false);
    }
  };

  const handleConfirmEmailAndContinue = async () => {
    setError('');
    setInfoMessage('');
    setSecondaryLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        const lowered = String(signInError.message || '').toLowerCase();
        const stillNotConfirmed =
          lowered.includes('email not confirmed') ||
          lowered.includes('email_not_confirmed') ||
          lowered.includes('confirm your email') ||
          lowered.includes('not confirmed');

        if (stillNotConfirmed) {
          setInfoMessage(
            'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
          );
          return;
        }

        throw signInError;
      }

      if (!data.user?.email_confirmed_at) {
        setInfoMessage(
          'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
        );
        return;
      }

      await refreshProfile();
      setStep('phone-entry');
      setInfoMessage('تم تأكيد البريد الإلكتروني بنجاح. الآن أضف رقم الجوال.');
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من البريد الإلكتروني');
    } finally {
      setSecondaryLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!phone.trim()) {
      setError('رقم الجوال مطلوب');
      return;
    }

    const formattedPhone = formatPhone(phone);

    if (!validatePhone(formattedPhone)) {
      setError('رقم الجوال غير صحيح. يجب أن يبدأ بـ +966 أو 05');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('يجب أن تكون مسجل الدخول لإكمال تحقق الجوال');

      const { error: profileUpdateError } = await supabase
        .from('users_profile')
        .update({
          phone: formattedPhone,
          phone_verified: false,
          signup_completed: false,
        })
        .eq('id', session.user.id);

      if (profileUpdateError) {
        throw new Error(`فشل حفظ رقم الجوال: ${profileUpdateError.message}`);
      }

      const otpResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-otp`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: formattedPhone }),
        }
      );

      const otpResult = await otpResponse.json();

      if (!otpResponse.ok || !otpResult.success) {
        throw new Error(otpResult.error || 'فشل إرسال رمز التحقق');
      }

      setPhone(formattedPhone);
      setInfoMessage('تم إرسال رمز التحقق إلى رقم الجوال.');
      setStep('phone-verification');
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال رمز تحقق الجوال');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!otpCode.trim()) {
      setError('رمز التحقق مطلوب');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('الجلسة غير متوفرة. سجّل الدخول ثم حاول مرة أخرى.');

      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone-otp`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            code: otpCode.trim(),
          }),
        }
      );

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.success) {
        throw new Error(verifyResult.error || 'رمز التحقق غير صحيح');
      }

      const { error: profileError } = await supabase
        .from('users_profile')
        .update({
          phone: phone,
          phone_verified: true,
          signup_completed: true,
        })
        .eq('id', session.user.id);

      if (profileError) {
        throw new Error(`تم التحقق لكن فشل تحديث الملف الشخصي: ${profileError.message}`);
      }

      await refreshProfile();
      setStep('completed');
      setInfoMessage('تم إنشاء الحساب والتحقق من البريد والجوال بنجاح.');
    } catch (err: any) {
      setError(err?.message || 'فشل تحقق الجوال');
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setError('');
    setInfoMessage('');
    setSecondaryLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('الجلسة غير متوفرة');

      const otpResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-otp`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone }),
        }
      );

      const otpResult = await otpResponse.json();

      if (!otpResponse.ok || !otpResult.success) {
        throw new Error(otpResult.error || 'فشل إعادة إرسال رمز التحقق');
      }

      setInfoMessage('تمت إعادة إرسال رمز التحقق إلى الجوال.');
    } catch (err: any) {
      setError(err?.message || 'فشل إعادة إرسال رمز التحقق');
    } finally {
      setSecondaryLoading(false);
    }
  };

  const renderStepHeader = () => {
    const steps = [
      { key: 'basic-info', label: 'المعلومات الأساسية' },
      { key: 'email-verification', label: 'تحقق البريد' },
      { key: 'phone-entry', label: 'إضافة الجوال' },
      { key: 'phone-verification', label: 'تحقق الجوال' },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          {steps.map((item, index) => {
            const order: SignupStep[] = [
              'basic-info',
              'email-verification',
              'phone-entry',
              'phone-verification',
              'completed',
            ];
            const currentIndex = order.indexOf(step);
            const itemIndex = order.indexOf(item.key as SignupStep);
            const active = currentIndex >= itemIndex;

            return (
              <React.Fragment key={item.key}>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={active ? 'text-blue-700 font-semibold' : 'text-gray-500'}>
                    {item.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 rounded ${
                      currentIndex > itemIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  if (step === 'completed') {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">تم بنجاح</h2>
          <p className="text-gray-600 leading-7 mb-6">
            تم إنشاء الحساب والتحقق من البريد الإلكتروني ورقم الجوال.
          </p>

          {infoMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {infoMessage}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            الذهاب إلى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h2>
        <p className="text-gray-600">انضم إلى منصة رقمي اليوم</p>
      </div>

      {renderStepHeader()}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {step === 'basic-info' && (
        <form onSubmit={handleBasicSignup} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الحساب
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                  role === 'customer'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className={`w-6 h-6 ${role === 'customer' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${role === 'customer' ? 'text-blue-600' : 'text-gray-600'}`}>
                  عميل
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                  role === 'seller'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Store className={`w-6 h-6 ${role === 'seller' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold ${role === 'seller' ? 'text-blue-600' : 'text-gray-600'}`}>
                  تاجر
                </span>
              </button>
            </div>

            {role === 'seller' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  بعد إنشاء الحساب ستكمل التحقق ثم تتابع تجهيز بقية بيانات التاجر.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="محمد أحمد"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
                required
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'متابعة'}
          </button>
        </form>
      )}

      {step === 'email-verification' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">البريد المستخدم:</p>
            <p className="font-semibold text-gray-900 break-all">{normalizeEmail(email)}</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 leading-7">
            افتح البريد الإلكتروني واضغط رابط التحقق الذي وصلك، ثم ارجع واضغط
            <span className="font-bold"> تم التحقق من البريد </span>
            للمتابعة.
          </div>

          <button
            type="button"
            onClick={handleConfirmEmailAndContinue}
            disabled={secondaryLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {secondaryLoading ? 'جاري التحقق...' : 'تم التحقق من البريد'}
          </button>

          <button
            type="button"
            onClick={handleResendEmailVerification}
            disabled={secondaryLoading}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة إرسال رابط التحقق
          </button>
        </div>
      )}

      {step === 'phone-entry' && (
        <form onSubmit={handleSendPhoneOtp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Smartphone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+966501234567 أو 0501234567"
                required
                dir="ltr"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              سيتم إرسال رمز تحقق إلى هذا الرقم
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'}
          </button>
        </form>
      )}

      {step === 'phone-verification' && (
        <form onSubmit={handleVerifyPhoneOtp} className="space-y-6">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">رقم الجوال:</p>
            <p className="font-semibold text-gray-900" dir="ltr">
              {phone}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رمز التحقق
            </label>
            <div className="relative">
              <Smartphone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123456"
                required
                dir="ltr"
                maxLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'جاري التحقق...' : 'تأكيد رمز الجوال'}
          </button>

          <button
            type="button"
            onClick={handleResendPhoneOtp}
            disabled={secondaryLoading}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {secondaryLoading ? 'جاري إعادة الإرسال...' : 'إعادة إرسال الرمز'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          لديك حساب بالفعل؟{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            تسجيل الدخول
          </button>
        </p>
      </div>
    </div>
  );
};
