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
  onSwitchToSignup: (prefill?: {
    email?: string;
    password?: string;
    resumeReason?: 'account-not-found' | 'incomplete-account';
  }) => void;
  onForgotPassword: () => void;
}

type LoginStep = 'credentials' | 'email-verification';

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToSignup,
  onForgotPassword,
}) => {
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
  const [showCompleteSignupAction, setShowCompleteSignupAction] = useState(false);

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

  const isInvalidCredentialsMessage = (message: string) => {
    const lowered = String(message || '').toLowerCase();

    return (
      lowered.includes('invalid login credentials') ||
      lowered.includes('invalid_credentials') ||
      lowered.includes('invalid credentials')
    );
  };

  const isIncompleteSignupMessage = (message: string) => {
    const lowered = String(message || '').toLowerCase();

    return (
      lowered.includes('لم يكمل خطوات التسجيل') ||
      lowered.includes('signup_completed') ||
      lowered.includes('phone_verified') ||
      lowered.includes('complete signup')
    );
  };

  const inspectAccountByEmail = async (normalizedEmail: string) => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('id, email, signup_completed, phone_verified, phone')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('inspectAccountByEmail error:', error);
      return null;
    }

    return data;
  };

  const resetMessages = () => {
    setError('');
    setInfoMessage('');
    setShowCompleteSignupAction(false);
  };

  const handleIncompleteAccount = () => {
    setError(
      'هذا الحساب موجود لكنه لم يكمل إنشاء الحساب بعد. يجب الرجوع إلى إنشاء الحساب بنفس البريد الإلكتروني وكلمة المرور السابقة لإكمال الخطوات المتبقية.'
    );
    setShowCompleteSignupAction(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      await signIn(normalizedEmail, password);
    } catch (err: any) {
      const message = err?.message || 'فشل تسجيل الدخول';

      if (isEmailNotConfirmedMessage(message)) {
        setStep('email-verification');
        setInfoMessage(
          'تم العثور على الحساب، لكن البريد الإلكتروني لم يتم تأكيده بعد. افتح رسالة البريد ثم اضغط رابط التحقق.'
        );
        setShowCompleteSignupAction(false);
        return;
      }

      if (isIncompleteSignupMessage(message)) {
        handleIncompleteAccount();
        return;
      }

      if (isInvalidCredentialsMessage(message)) {
        const normalizedEmail = normalizeEmail(email);
        const account = await inspectAccountByEmail(normalizedEmail);

        if (!account) {
          setError('هذا الحساب غير موجود. يجب إنشاء حساب جديد أولًا.');
          setShowCompleteSignupAction(false);
          return;
        }

        if (!account.signup_completed || !account.phone_verified) {
          handleIncompleteAccount();
          return;
        }

        setError('كلمة المرور غير صحيحة. تأكد منها ثم حاول مرة أخرى.');
        setShowCompleteSignupAction(false);
        return;
      }

      setError(message);
      setShowCompleteSignupAction(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    resetMessages();
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
    resetMessages();
    setChecking(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      await signIn(normalizedEmail, password);
    } catch (err: any) {
      const message = err?.message || 'فشل التحقق من البريد وتسجيل الدخول';

      if (isEmailNotConfirmedMessage(message)) {
        setInfoMessage(
          'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
        );
        return;
      }

      if (isIncompleteSignupMessage(message)) {
        handleIncompleteAccount();
        return;
      }

      if (isInvalidCredentialsMessage(message)) {
        const account = await inspectAccountByEmail(normalizedEmail);

        if (!account) {
          setError('هذا الحساب غير موجود. يجب إنشاء حساب جديد أولًا.');
          return;
        }

        if (!account.signup_completed || !account.phone_verified) {
          handleIncompleteAccount();
          return;
        }

        setError('كلمة المرور غير صحيحة. تأكد منها ثم حاول مرة أخرى.');
        return;
      }

      setError(message);
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

        {showCompleteSignupAction && (
          <button
            type="button"
            onClick={() =>
              onSwitchToSignup({
                email: normalizeEmail(email),
                password,
                resumeReason: 'incomplete-account',
              })
            }
            className="w-full mb-6 bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
          >
            إكمال إنشاء الحساب
          </button>
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
              resetMessages();
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
              onClick={() =>
                onSwitchToSignup({
                  email: normalizeEmail(email),
                  password,
                  resumeReason: 'account-not-found',
                })
              }
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

      {showCompleteSignupAction && (
        <button
          type="button"
          onClick={() =>
            onSwitchToSignup({
              email: normalizeEmail(email),
              password,
              resumeReason: 'incomplete-account',
            })
          }
          className="w-full mb-6 bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
        >
          إكمال إنشاء الحساب
        </button>
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              كلمة المرور
            </label>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

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
            onClick={() =>
              onSwitchToSignup({
                email: normalizeEmail(email),
                password,
                resumeReason: 'account-not-found',
              })
            }
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            أنشئ حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
};
