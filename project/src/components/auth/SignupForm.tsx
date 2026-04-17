import React, { useEffect, useRef, useState } from 'react';
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
  initialData?: {
    email?: string;
    password?: string;
    resumeReason?: 'account-not-found' | 'incomplete-account';
  };
}

type SignupStep =
  | 'basic-info'
  | 'email-verification'
  | 'phone-entry'
  | 'phone-verification'
  | 'completed';

type AccountStatusResponse =
  | {
      success: true;
      status: 'not_found' | 'email_not_confirmed' | 'signup_incomplete' | 'ready_for_login';
    }
  | {
      success: false;
      error?: string;
    };

const PHONE_OTP_DEMO_ENABLED =
  String(import.meta.env.VITE_PHONE_OTP_DEMO_ENABLED ?? 'true').toLowerCase() !== 'false';

const PHONE_OTP_DEMO_CODE = String(import.meta.env.VITE_PHONE_OTP_DEMO_CODE ?? '000000');

export const SignupForm: React.FC<SignupFormProps> = ({
  onSwitchToLogin,
  initialData,
}) => {
  const { refreshProfile } = useAuth();
  const autoResumeAttemptedRef = useRef(false);

  const [step, setStep] = useState<SignupStep>('basic-info');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState(initialData?.password ?? '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password ?? '');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailResendLoading, setEmailResendLoading] = useState(false);
  const [phoneResendLoading, setPhoneResendLoading] = useState(false);

  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  const normalizeEmail = (value: string): string => value.trim().toLowerCase();

  const validatePhone = (phoneNumber: string): boolean => {
    const cleanedPhone = phoneNumber.trim().replace(/\s+/g, '');
    return /^(\+9665\d{8}|05\d{8}|5\d{8})$/.test(cleanedPhone);
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('9665') && cleaned.length === 12) {
      return '+' + cleaned;
    }

    if (cleaned.startsWith('05') && cleaned.length === 10) {
      return '+966' + cleaned.substring(1);
    }

    if (cleaned.startsWith('5') && cleaned.length === 9) {
      return '+966' + cleaned;
    }

    return value.trim();
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

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

  const isRateLimitMessage = (message: string) => {
    const lowered = String(message || '').toLowerCase();

    return (
      lowered.includes('rate limit') ||
      lowered.includes('rate_limit') ||
      lowered.includes('email rate limit exceeded')
    );
  };

  const checkAccountStatus = async (
    normalizedEmail: string
  ): Promise<AccountStatusResponse | null> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'check-account-status',
        {
          body: { email: normalizedEmail },
        }
      );

      if (invokeError) {
        console.error('check-account-status invoke error:', invokeError);
        return null;
      }

      return (data as AccountStatusResponse) ?? null;
    } catch (err) {
      console.error('check-account-status unexpected error:', err);
      return null;
    }
  };

  const ensureProfileForUser = async (authUser: any) => {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('users_profile')
      .select('id, name, email, role, phone, phone_verified, signup_completed')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingProfileError) {
      throw new Error(`فشل قراءة بيانات الحساب: ${existingProfileError.message}`);
    }

    if (existingProfile) {
      return existingProfile;
    }

    const fallbackName =
      authUser.user_metadata?.name ||
      name.trim() ||
      authUser.email?.split('@')[0] ||
      'مستخدم جديد';

    const fallbackRole =
      authUser.user_metadata?.role === 'seller' ? 'seller' : role;

    const { error: createProfileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: authUser.id,
          name: fallbackName,
          email: normalizeEmail(authUser.email || email),
          role: fallbackRole,
          phone: null,
          phone_verified: false,
          signup_completed: false,
        } as any,
        { onConflict: 'id' }
      );

    if (createProfileError) {
      throw new Error(`فشل إنشاء بيانات الحساب الناقصة: ${createProfileError.message}`);
    }

    const { data: createdProfile, error: createdProfileError } = await supabase
      .from('users_profile')
      .select('id, name, email, role, phone, phone_verified, signup_completed')
      .eq('id', authUser.id)
      .maybeSingle();

    if (createdProfileError) {
      throw new Error(`فشل قراءة بيانات الحساب بعد إنشائها: ${createdProfileError.message}`);
    }

    return createdProfile;
  };

  const resumeExistingSignup = async (
    normalizedEmail: string,
    currentPassword: string,
    statusHint?: 'email_not_confirmed' | 'signup_incomplete' | 'ready_for_login'
  ) => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: currentPassword,
    });

    if (signInError) {
      if (
        isEmailNotConfirmedMessage(signInError.message || '') ||
        statusHint === 'email_not_confirmed'
      ) {
        setStep('email-verification');
        setInfoMessage(
          'هذا الحساب موجود مسبقًا لكنه لم يكمل التحقق من البريد الإلكتروني بعد. أكمل التحقق من البريد للمتابعة.'
        );
        setEmailResendCooldown(60);
        return;
      }

      if (isInvalidCredentialsMessage(signInError.message || '')) {
        if (statusHint === 'ready_for_login') {
          throw new Error(
            'هذا البريد الإلكتروني مسجل بالفعل، وكلمة المرور غير صحيحة. انتقل إلى تسجيل الدخول واستخدم كلمة المرور الصحيحة.'
          );
        }

        throw new Error(
          'هذا البريد الإلكتروني مسجل بالفعل، لكن كلمة المرور غير صحيحة. استخدم كلمة المرور الصحيحة لنفس الحساب لإكمال التسجيل.'
        );
      }

      throw signInError;
    }

    if (!data.user) {
      throw new Error('تعذر متابعة الحساب الحالي.');
    }

    if (!data.user.email_confirmed_at) {
      setStep('email-verification');
      setInfoMessage(
        'هذا الحساب موجود مسبقًا لكنه لم يكمل التحقق من البريد الإلكتروني بعد. أكمل التحقق من البريد للمتابعة.'
      );
      setEmailResendCooldown(60);
      return;
    }

    const profile = await ensureProfileForUser(data.user);
    await refreshProfile();

    const normalizedPhone = profile?.phone ? String(profile.phone) : '';

    if (profile?.signup_completed && profile?.phone_verified) {
      throw new Error(
        'هذا الحساب مكتمل بالفعل. انتقل إلى تسجيل الدخول واستخدم نفس البريد الإلكتروني وكلمة المرور.'
      );
    }

    setPhone(normalizedPhone);

    if (normalizedPhone && !profile?.phone_verified) {
      setStep('phone-verification');
      setInfoMessage(
        'هذا الحساب موجود مسبقًا وتم تأكيد البريد الإلكتروني، وبقي فقط تأكيد رقم الجوال.'
      );
      return;
    }

    setStep('phone-entry');
    setInfoMessage(
      'هذا الحساب موجود مسبقًا وتم تأكيد البريد الإلكتروني. أكمل الآن بإضافة رقم الجوال وتأكيده.'
    );
  };

  useEffect(() => {
    if (emailResendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setEmailResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [emailResendCooldown]);

  useEffect(() => {
    if (typeof initialData?.email === 'string') {
      setEmail(initialData.email);
    }

    if (typeof initialData?.password === 'string') {
      setPassword(initialData.password);
      setConfirmPassword(initialData.password);
    }

    if (initialData?.resumeReason === 'incomplete-account') {
      setInfoMessage(
        'هذا الحساب موجود لكنه غير مكتمل. سيتم نقلك مباشرة إلى الخطوة الناقصة.'
      );
    }

    if (initialData?.resumeReason === 'account-not-found') {
      setInfoMessage('أكمل إنشاء حساب جديد باستخدام بياناتك.');
    }
  }, [initialData]);

  useEffect(() => {
    const runAutoResume = async () => {
      if (autoResumeAttemptedRef.current) return;
      if (initialData?.resumeReason !== 'incomplete-account') return;

      const normalizedEmail = normalizeEmail(initialData?.email || '');
      const currentPassword = initialData?.password || '';

      if (!normalizedEmail || !currentPassword) return;

      autoResumeAttemptedRef.current = true;
      setLoading(true);
      setError('');

      try {
        const statusResult = await checkAccountStatus(normalizedEmail);

        if (!statusResult || !statusResult.success) {
          setInfoMessage(
            'تعذر تحديد الخطوة الناقصة تلقائيًا. أكمل من النموذج أدناه بنفس البيانات السابقة.'
          );
          return;
        }

        if (
          statusResult.status === 'email_not_confirmed' ||
          statusResult.status === 'signup_incomplete' ||
          statusResult.status === 'ready_for_login'
        ) {
          await resumeExistingSignup(
            normalizedEmail,
            currentPassword,
            statusResult.status
          );
        }
      } catch (err: any) {
        setError(err?.message || 'فشل تحديد الخطوة الناقصة للحساب.');
      } finally {
        setLoading(false);
      }
    };

    void runAutoResume();
  }, [initialData]);

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

      const statusResult = await checkAccountStatus(normalizedEmail);

      if (!statusResult || !statusResult.success) {
        throw new Error('تعذر التحقق من حالة الحساب الآن. حاول مرة أخرى بعد قليل.');
      }

      if (statusResult.status === 'email_not_confirmed') {
        await resumeExistingSignup(normalizedEmail, password, 'email_not_confirmed');
        return;
      }

      if (statusResult.status === 'signup_incomplete') {
        await resumeExistingSignup(normalizedEmail, password, 'signup_incomplete');
        return;
      }

      if (statusResult.status === 'ready_for_login') {
        await resumeExistingSignup(normalizedEmail, password, 'ready_for_login');
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signup`,
          data: {
            name: name.trim(),
            role,
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message || '';

        if (message.includes('User already registered')) {
          await resumeExistingSignup(normalizedEmail, password);
          return;
        }

        if (isRateLimitMessage(message)) {
          throw new Error(
            'تم تجاوز الحد المؤقت لمحاولات إرسال البريد. انتظر قليلًا ثم حاول مرة أخرى.'
          );
        }

        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء الحساب');
      }

      setInfoMessage('تم إنشاء الحساب الأساسي. الآن تحقق من بريدك الإلكتروني للمتابعة.');
      setStep('email-verification');
      setEmailResendCooldown(60);
    } catch (err: any) {
      const message = err?.message || 'فشل إنشاء الحساب';

      if (isRateLimitMessage(message)) {
        setError('تم تجاوز الحد المؤقت لمحاولات إرسال البريد. انتظر قليلًا ثم حاول مرة أخرى.');
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

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError('لا يوجد بريد إلكتروني لإعادة إرسال رابط التحقق.');
      return;
    }

    if (emailResendCooldown > 0) {
      setError(`انتظر ${emailResendCooldown} ثانية ثم حاول مرة أخرى.`);
      return;
    }

    setEmailResendLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signup`,
        },
      });

      if (resendError) {
        const message = resendError.message || '';

        if (isRateLimitMessage(message)) {
          throw new Error(
            'تم تجاوز الحد المؤقت لإرسال رسائل التحقق. انتظر قليلًا ثم حاول مرة أخرى.'
          );
        }

        throw resendError;
      }

      setInfoMessage(`تم إرسال رابط تحقق جديد إلى: ${normalizedEmail}`);
      setEmailResendCooldown(60);
    } catch (err: any) {
      const message = err?.message || 'فشل إعادة إرسال رابط التحقق';
      if (isRateLimitMessage(message)) {
        setError('تم تجاوز الحد المؤقت لإرسال رسائل التحقق. انتظر قليلًا ثم حاول مرة أخرى.');
      } else {
        setError(message);
      }
    } finally {
      setEmailResendLoading(false);
    }
  };

  const handleConfirmEmailAndContinue = async () => {
    setError('');
    setInfoMessage('');
    setEmailCheckLoading(true);

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

        if (isInvalidCredentialsMessage(signInError.message || '')) {
          throw new Error(
            'تعذر المتابعة لأن كلمة المرور غير صحيحة. استخدم نفس كلمة المرور التي أنشأت بها الحساب.'
          );
        }

        throw signInError;
      }

      if (!data.user?.email_confirmed_at) {
        setInfoMessage(
          'البريد الإلكتروني لم يتم تأكيده بعد. افتح الرسالة واضغط رابط التحقق ثم جرّب مرة أخرى.'
        );
        return;
      }

      const profile = await ensureProfileForUser(data.user);
      await refreshProfile();

      const normalizedPhone = profile?.phone ? String(profile.phone) : '';
      setPhone(normalizedPhone);

      if (normalizedPhone && !profile?.phone_verified) {
        setStep('phone-verification');
        setInfoMessage('تم تأكيد البريد الإلكتروني بنجاح. بقي فقط تأكيد رقم الجوال.');
        return;
      }

      if (profile?.signup_completed && profile?.phone_verified) {
        setStep('completed');
        setInfoMessage('هذا الحساب مكتمل بالفعل وتم التحقق من البريد والجوال.');
        return;
      }

      setStep('phone-entry');
      setInfoMessage('تم تأكيد البريد الإلكتروني بنجاح. الآن أضف رقم الجوال.');
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من البريد الإلكتروني');
    } finally {
      setEmailCheckLoading(false);
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
      setError('رقم الجوال غير صحيح. استخدم رقمًا سعوديًا مثل 0551234567');
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

      if (PHONE_OTP_DEMO_ENABLED) {
        setPhone(formattedPhone);
        setStep('phone-verification');
        setInfoMessage(
          `تم الانتقال إلى تحقق الجوال في الوضع التجريبي. استخدم الرمز: ${PHONE_OTP_DEMO_CODE}`
        );
        return;
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

      if (PHONE_OTP_DEMO_ENABLED) {
        if (otpCode.trim() !== PHONE_OTP_DEMO_CODE) {
          throw new Error('رمز التحقق التجريبي غير صحيح');
        }

        const { error: profileError } = await supabase
          .from('users_profile')
          .update({
            phone,
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
        return;
      }

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
          phone,
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
    setPhoneResendLoading(true);

    try {
      if (PHONE_OTP_DEMO_ENABLED) {
        setInfoMessage(`تمت إعادة إرسال الرمز التجريبي. استخدم: ${PHONE_OTP_DEMO_CODE}`);
        return;
      }

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
      setPhoneResendLoading(false);
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

      {loading && initialData?.resumeReason === 'incomplete-account' && step === 'basic-info' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          جاري تحديد الخطوة الناقصة لهذا الحساب...
        </div>
      )}

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
            disabled={emailCheckLoading || emailResendLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {emailCheckLoading ? 'جاري التحقق...' : 'تم التحقق من البريد'}
          </button>

          <button
            type="button"
            onClick={handleResendEmailVerification}
            disabled={emailResendLoading || emailCheckLoading || emailResendCooldown > 0}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${emailResendLoading ? 'animate-spin' : ''}`} />
            {emailResendLoading
              ? 'جاري إعادة الإرسال...'
              : emailResendCooldown > 0
              ? `إعادة الإرسال بعد ${emailResendCooldown}ث`
              : 'إعادة إرسال رابط التحقق'}
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
            disabled={phoneResendLoading}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${phoneResendLoading ? 'animate-spin' : ''}`} />
            {phoneResendLoading ? 'جاري إعادة الإرسال...' : 'إعادة إرسال الرمز'}
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
