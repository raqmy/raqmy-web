import React, { useState } from 'react';
import {
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

type LoginStep = 'credentials' | 'email-verification';

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const { signIn } = useAuth();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const isEmailNotConfirmedMessage = (message: string) => {
    const lowered = String(message || '').toLowerCase();

    return (
      lowered.includes('email not confirmed') ||
      lowered.includes('email_not_confirmed') ||
      lowered.includes('confirm your email') ||
      lowered.includes('not confirmed')
    );
  };

  const ensureSignupCompleted = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('signup_completed, phone_verified')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`فشل التحقق من حالة الحساب: ${profileError.message}`);
    }

    const signupCompleted = Boolean(profile?.signup_completed);
    const phoneVerified = Boolean(profile?.phone_verified);

    if (!signupCompleted || !phoneVerified) {
      await supabase.auth.signOut();

      throw new Error(
        'هذا الحساب لم يكمل خطوات التسجيل بعد. يجب إكمال التحقق من البريد ثم إضافة رقم الجوال وتأكيده قبل تسجيل الدخول.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        if (isEmailNotConfirmedMessage(signInError.message || '')) {
          setStep('email-verification');
          setInfoMessage(
            'تم العثور على الحساب، لكن يجب تأكيد البريد الإلكتروني أولًا قبل الدخول.'
          );
          return;
        }

        throw signInError;
      }

      if (!data.user) {
        throw new Error('فشل تسجيل الدخول');
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setStep('email-verification');
        setInfoMessage(
          'تم العثور على الحساب، لكن يجب تأكيد البريد الإلكتروني أولًا قبل الدخول.'
        );
        return;
      }

      await ensureSignupCompleted(data.user.id);

      await signIn(normalizedEmail, password);
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setInfoMessage('');
    setResending(true);

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
      setResending(false);
    }
  };

  const handleCheckEmailThenLogin = async () => {
    setError('');
    setInfoMessage('');
    setChecking(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        if (isEmailNotConfirmedMessage(signInError.message || '')) {
          setInfoMessage(
            'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
          );
          return;
        }

        throw signInError;
      }

      if (!data.user) {
        throw new Error('فشل تسجيل الدخول');
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setInfoMessage(
          'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
        );
        return;
      }

      await ensureSignupCompleted(data.user.id);

      await signIn(normalizedEmail, password);
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من البريد وتسجيل الدخول');
    } finally {
      setChecking(false);
    }
  };

  if (step === 'email-verification') {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">تحقق البريد الإلكتروني</h2>
          <p className="text-gray-600 leading-7">
            قبل تسجيل الدخول، يجب تأكيد البريد الإلكتروني لهذا الحساب.
          </p>
        </div>

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

        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">البريد المستخدم:</p>
          <p className="font-semibold text-gray-900 break-all">{normalizeEmail(email)}</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleCheckEmailThenLogin}
            disabled={checking}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'جاري التحقق...' : 'تم التحقق من البريد'}
          </button>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {resending ? 'جاري إعادة الإرسال...' : 'إعادة إرسال رابط التحقق'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('credentials');
              setError('');
              setInfoMessage('');
            }}
            className="w-full text-gray-600 py-2 font-medium hover:text-gray-800 transition-colors"
          >
            الرجوع لتسجيل الدخول
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ليس لديك حساب؟{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              أنشئ حساب جديد
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">مرحباً بك</h2>
        <p className="text-gray-600">سجل الدخول لحسابك في رقمي</p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          ليس لديك حساب؟{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            أنشئ حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
}
