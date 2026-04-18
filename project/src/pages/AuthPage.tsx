import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  ArrowRight,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
  storeMode?: boolean;
  storeSlug?: string;
  onNavigate?: (page: string) => void;
  initialMode?: 'login' | 'signup' | 'forgot-password' | 'reset-password';
}

type SignupPrefillState = {
  email?: string;
  password?: string;
  resumeReason?: 'account-not-found' | 'incomplete-account';
} | null;

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const getInitialAuthMode = (
  initialMode?: 'login' | 'signup' | 'forgot-password' | 'reset-password'
): AuthMode => {
  if (initialMode) return initialMode;

  if (typeof window === 'undefined') return 'login';

  const pathname = window.location.pathname.toLowerCase();

  if (pathname.includes('/auth/reset-password')) {
    return 'reset-password';
  }

  if (pathname.includes('/auth/signup')) {
    return 'signup';
  }

  return 'login';
};

const ForgotPasswordForm: React.FC<{
  onBackToLogin: () => void;
}> = ({ onBackToLogin }) => {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setSuccessMessage(
        'إذا كان البريد الإلكتروني مسجلاً، فسيصل إليه رابط إعادة تعيين كلمة المرور خلال لحظات.'
      );
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال رابط إعادة تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">نسيت كلمة المرور</h2>
        <p className="text-gray-600 leading-7">
          أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-blue-600 font-semibold hover:text-blue-700"
        >
          الرجوع إلى تسجيل الدخول
        </button>
      </div>
    </div>
  );
};

const ResetPasswordForm: React.FC<{
  onBackToLogin: () => void;
}> = ({ onBackToLogin }) => {
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      try {
        const hash = window.location.hash.toLowerCase();
        const hasRecoveryHash =
          hash.includes('access_token=') ||
          hash.includes('refresh_token=') ||
          hash.includes('type=recovery');

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user || hasRecoveryHash) {
          setIsRecoveryReady(true);
        } else {
          setIsRecoveryReady(false);
          setError(
            'رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا ثم حاول مرة أخرى.'
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setIsRecoveryReady(false);
        setError('تعذر التحقق من صلاحية رابط إعادة التعيين.');
      } finally {
        if (isMounted) {
          setCheckingRecovery(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY' || !!session?.user) {
        setIsRecoveryReady(true);
        setCheckingRecovery(false);
        setError('');
      }
    });

    void checkRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isRecoveryReady) {
      setError('رابط إعادة التعيين غير جاهز. افتح الرابط من البريد ثم حاول مرة أخرى.');
      return;
    }

    if (!password.trim()) {
      setError('كلمة المرور الجديدة مطلوبة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      await supabase.auth.signOut();

      setSuccessMessage(
        'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.'
      );
      setPassword('');
      setConfirmPassword('');
      setIsRecoveryReady(false);
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  if (checkingRecovery) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">جاري التحقق من الرابط</h2>
          <p className="text-gray-600">انتظر قليلًا حتى نجهز صفحة إعادة تعيين كلمة المرور.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">إعادة تعيين كلمة المرور</h2>
        <p className="text-gray-600 leading-7">
          أدخل كلمة المرور الجديدة ثم أكدها لإتمام التغيير.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور الجديدة
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
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تأكيد كلمة المرور الجديدة
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
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isRecoveryReady}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري تحديث كلمة المرور...' : 'حفظ كلمة المرور الجديدة'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-blue-600 font-semibold hover:text-blue-700"
        >
          الرجوع إلى تسجيل الدخول
        </button>
      </div>
    </div>
  );
};

export const AuthPage: React.FC<AuthPageProps> = ({
  storeMode = false,
  storeSlug,
  onNavigate,
  initialMode,
}) => {
  const [mode, setMode] = useState<AuthMode>(getInitialAuthMode(initialMode));
  const [signupPrefill, setSignupPrefill] = useState<SignupPrefillState>(null);

  useEffect(() => {
    const syncModeWithPath = () => {
      setMode(getInitialAuthMode(initialMode));
    };

    syncModeWithPath();

    window.addEventListener('popstate', syncModeWithPath);
    window.addEventListener('hashchange', syncModeWithPath);

    return () => {
      window.removeEventListener('popstate', syncModeWithPath);
      window.removeEventListener('hashchange', syncModeWithPath);
    };
  }, [initialMode]);

  const storeDisplayName = useMemo(() => {
    if (!storeSlug) return 'المتجر';
    return decodeURIComponent(storeSlug).replace(/-/g, ' ');
  }, [storeSlug]);

  const title =
    mode === 'login'
      ? 'تسجيل الدخول'
      : mode === 'signup'
      ? 'إنشاء حساب'
      : mode === 'forgot-password'
      ? 'استعادة كلمة المرور'
      : 'إعادة تعيين كلمة المرور';

  const subtitle =
    mode === 'login'
      ? 'أدخل البريد الإلكتروني وكلمة المرور ثم أكمل التحقق المطلوب'
      : mode === 'signup'
      ? 'ابدأ ببيانات الحساب الأساسية ثم أكمل تحقق البريد والجوال'
      : mode === 'forgot-password'
      ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
      : 'أدخل كلمة المرور الجديدة لإكمال الاستعادة';

  const showModeTabs = mode === 'login' || mode === 'signup';

  const handleSwitchToSignup = (prefill?: {
    email?: string;
    password?: string;
    resumeReason?: 'account-not-found' | 'incomplete-account';
  }) => {
    setSignupPrefill(prefill ?? null);
    setMode('signup');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  const renderAuthBody = () => {
    if (mode === 'forgot-password') {
      return <ForgotPasswordForm onBackToLogin={handleSwitchToLogin} />;
    }

    if (mode === 'reset-password') {
      return <ResetPasswordForm onBackToLogin={handleSwitchToLogin} />;
    }

    if (mode === 'login') {
      return (
        <LoginForm
          onSwitchToSignup={handleSwitchToSignup}
          onForgotPassword={() => setMode('forgot-password')}
        />
      );
    }

    return (
      <SignupForm
        onSwitchToLogin={handleSwitchToLogin}
        initialData={signupPrefill ?? undefined}
      />
    );
  };

  if (storeMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-10 text-white">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-white/70">تسجيل الدخول إلى</p>
                  <h2 className="text-2xl font-bold">{storeDisplayName}</h2>
                </div>
              </div>

              <h1 className="text-4xl font-extrabold leading-tight mb-4">
                أهلاً بك في متجر التاجر
              </h1>
              <p className="text-white/80 leading-8 text-base">
                تم ترتيب تجربة الدخول وإنشاء الحساب لتكون أوضح للمستخدم:
                يبدأ بالمعلومات الأساسية، ثم يتحقق من البريد الإلكتروني،
                وبعدها يضيف رقم الجوال ويتحقق منه.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-white/90" />
                  <p className="font-semibold">تحقق البريد الإلكتروني</p>
                </div>
                <p className="text-sm text-white/75 leading-7">
                  خطوة واضحة بعد إنشاء الحساب للتأكد من صحة البريد قبل إكمال التسجيل.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="w-5 h-5 text-white/90" />
                  <p className="font-semibold">إضافة الجوال والتحقق منه</p>
                </div>
                <p className="text-sm text-white/75 leading-7">
                  تأتي بعد البريد مباشرة حتى تكون تجربة التسجيل مرتبة وواضحة.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-white/90" />
                  <p className="font-semibold">تجربة أنظف للمستخدم</p>
                </div>
                <p className="text-sm text-white/75 leading-7">
                  بدون تعقيد زائد، ومع بقاء النظام جاهزًا للتطوير لاحقًا.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 flex flex-col justify-center bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">واجهة المتجر</p>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              </div>

              {storeSlug && onNavigate && (
                <button
                  onClick={() => onNavigate(`storefront-${storeSlug}`)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة للمتجر
                </button>
              )}
            </div>

            {showModeTabs && (
              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`h-12 rounded-xl font-semibold transition-all border ${
                    mode === 'login'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  تسجيل الدخول
                </button>

                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`h-12 rounded-xl font-semibold transition-all border ${
                    mode === 'signup'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  إنشاء حساب
                </button>
              </div>
            )}

            {renderAuthBody()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md mx-auto">{renderAuthBody()}</div>
    </div>
  );
};
