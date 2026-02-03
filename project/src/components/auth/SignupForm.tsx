import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle, Store, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = (phoneNumber: string): boolean => {
    const cleanedPhone = phoneNumber.trim().replace(/\s+/g, '');
    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    return phoneRegex.test(cleanedPhone);
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('966')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('05')) {
      return '+966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5')) {
      return '+966' + cleaned;
    }

    return value;
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }

    if (!phone.trim()) {
      setError('رقم الجوال مطلوب');
      return;
    }

    const formattedPhone = formatPhone(phone);
    if (!validatePhone(formattedPhone)) {
      setError('رقم الجوال غير صحيح. يجب أن يبدأ بـ +966 أو 05');
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
      console.log('Step 1: Starting auth signup...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء الحساب');
      }

      console.log('Step 2: Auth user created:', authData.user.id);
      console.log('Step 3: Creating profile for user:', authData.user.id);

      const { error: profileError } = await supabase
        .from('users_profile')
        .upsert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim(),
          role: role,
          phone: formattedPhone,
          phone_verified: false,
        });

      if (profileError) {
        console.error('Step 4 FAILED: Profile creation error:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        });
        throw new Error(`فشل حفظ بيانات الحساب: ${profileError.message}`);
      }

      console.log('Step 4: Profile created successfully');
      console.log('Step 5: Getting session...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('فشل الحصول على الجلسة');
      }

      if (!session) {
        console.error('No session found after signup');
        throw new Error('فشل تسجيل الدخول');
      }

      console.log('Step 6: Session obtained, sending OTP...');

      const otpResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: formattedPhone }),
        }
      );

      console.log('Step 7: OTP request sent, status:', otpResponse.status);

      const otpResult = await otpResponse.json();
      console.log('Step 8: OTP response:', otpResult);

      if (!otpResponse.ok || !otpResult.success) {
        console.error('Step 9 FAILED: OTP send error:', otpResult.error);
        throw new Error(otpResult.error || 'فشل إرسال رمز التحقق');
      }

      console.log('Step 9: OTP sent successfully, refreshing profile...');
      await refreshProfile();

      console.log('Step 10: Profile refreshed, signup complete!');
    } catch (err: any) {
      console.error('Signup error:', err);

      if (err.message?.includes('User already registered')) {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (err.message?.includes('email')) {
        setError('البريد الإلكتروني غير صحيح أو مستخدم بالفعل');
      } else {
        setError(err.message || 'فشل إنشاء الحساب');
      }

      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h2>
        <p className="text-gray-600">انضم إلى منصة رقمي اليوم</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                سيتطلب إكمال بيانات الحساب البنكي لاستلام الأرباح
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
          {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
        </button>
      </form>

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
