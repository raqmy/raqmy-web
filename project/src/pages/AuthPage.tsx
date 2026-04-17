import React, { useMemo, useState } from 'react';
import { Store, ArrowRight, ShieldCheck, Mail, Phone } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';

interface AuthPageProps {
  storeMode?: boolean;
  storeSlug?: string;
  onNavigate?: (page: string) => void;
}

type SignupPrefillState = {
  email?: string;
  password?: string;
  resumeReason?: 'account-not-found' | 'incomplete-account';
} | null;

export const AuthPage: React.FC<AuthPageProps> = ({
  storeMode = false,
  storeSlug,
  onNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupPrefill, setSignupPrefill] = useState<SignupPrefillState>(null);

  const storeDisplayName = useMemo(() => {
    if (!storeSlug) return 'المتجر';
    return decodeURIComponent(storeSlug).replace(/-/g, ' ');
  }, [storeSlug]);

  const title = mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب';
  const subtitle =
    mode === 'login'
      ? 'أدخل البريد الإلكتروني وكلمة المرور ثم أكمل التحقق المطلوب'
      : 'ابدأ ببيانات الحساب الأساسية ثم أكمل تحقق البريد والجوال';

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

            {mode === 'login' ? (
              <LoginForm onSwitchToSignup={handleSwitchToSignup} />
            ) : (
              <SignupForm
                onSwitchToLogin={handleSwitchToLogin}
                initialData={signupPrefill ?? undefined}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md mx-auto">
        {mode === 'login' ? (
          <LoginForm onSwitchToSignup={handleSwitchToSignup} />
        ) : (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            initialData={signupPrefill ?? undefined}
          />
        )}
      </div>
    </div>
  );
};
