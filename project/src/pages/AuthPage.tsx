import React, { useMemo, useState } from 'react';
import { Store, ArrowRight } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';

interface AuthPageProps {
  storeMode?: boolean;
  storeSlug?: string;
  onNavigate?: (page: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  storeMode = false,
  storeSlug,
  onNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const storeDisplayName = useMemo(() => {
    if (!storeSlug) return 'المتجر';
    return decodeURIComponent(storeSlug).replace(/-/g, ' ');
  }, [storeSlug]);

  if (storeMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
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
                أنت الآن داخل واجهة المتجر، ويمكنك تسجيل الدخول أو إنشاء حساب بدون إظهار
                عناصر منصة رقمي العامة.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/75">
              <p>• تجربة دخول مخصصة للمتجر</p>
              <p>• نفس نظام الحسابات الحالي بدون كسر التدفقات الموجودة</p>
              <p>• جاهزة لاحقًا للربط الكامل مع واجهة متجر مستقلة</p>
            </div>
          </div>

          <div className="p-6 sm:p-10 flex flex-col justify-center bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">واجهة المتجر</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </h2>
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

            {mode === 'login' ? (
              <LoginForm onSwitchToSignup={() => setMode('signup')} />
            ) : (
              <SignupForm onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      {mode === 'login' ? (
        <LoginForm onSwitchToSignup={() => setMode('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setMode('login')} />
      )}
    </div>
  );
};
