import React, { useEffect, useRef, useState } from 'react';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Store,
  Eye,
  EyeOff,
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

type SignupStep = 'basic-info' | 'email-verification' | 'completed';
type AccountRole = 'customer' | 'seller';

type AccountStatusResponse =
  | {
      success: true;
      status: 'not_found' | 'email_not_confirmed' | 'signup_incomplete' | 'ready_for_login';
    }
  | {
      success: false;
      error?: string;
    };

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

const TERMS_VERSION = 'v1';
const PRIVACY_VERSION = 'v1';
const CONSENT_STORAGE_PREFIX = 'raqmy_signup_consent';
const MERCHANT_REFERRAL_STORAGE_KEY = 'raqmy_merchant_referral';

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
};

type EmailValidationResult =
  | {
      valid: true;
      normalizedEmail: string;
    }
  | {
      valid: false;
      message: string;
      suggestedEmail?: string;
    };

const normalizeAccountRole = (value?: string | null): AccountRole => {
  if (value === 'seller' || value === 'merchant') {
    return 'seller';
  }

  return 'customer';
};

export const SignupForm: React.FC<SignupFormProps> = ({
  onSwitchToLogin,
  initialData,
}) => {
  const { refreshProfile } = useAuth();
  const autoResumeAttemptedRef = useRef(false);
  const sessionRecoveryAttemptedRef = useRef(false);

  const [step, setStep] = useState<SignupStep>('basic-info');

  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState(initialData?.password ?? '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password ?? '');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] = useState<AccountRole>('customer');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailResendLoading, setEmailResendLoading] = useState(false);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  const normalizeEmail = (value: string): string => value.trim().toLowerCase();

  const getConsentStorageKey = (normalizedEmail: string) => {
    return `${CONSENT_STORAGE_PREFIX}_${normalizedEmail}`;
  };

  const rememberPendingConsent = (normalizedEmail: string) => {
    if (typeof window === 'undefined') return;

    const acceptedAt = new Date().toISOString();

    window.localStorage.setItem(
      getConsentStorageKey(normalizedEmail),
      JSON.stringify({
        terms_accepted_at: acceptedAt,
        privacy_accepted_at: acceptedAt,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
      })
    );
  };

  const getPendingConsent = (normalizedEmail: string) => {
    if (typeof window === 'undefined') return null;

    try {
      const rawValue = window.localStorage.getItem(getConsentStorageKey(normalizedEmail));
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);

      if (!parsed?.terms_accepted_at || !parsed?.privacy_accepted_at) {
        return null;
      }

      return {
        terms_accepted_at: parsed.terms_accepted_at as string,
        privacy_accepted_at: parsed.privacy_accepted_at as string,
        terms_version: (parsed.terms_version as string) || TERMS_VERSION,
        privacy_version: (parsed.privacy_version as string) || PRIVACY_VERSION,
      };
    } catch (err) {
      console.error('Failed to read pending consent:', err);
      return null;
    }
  };

  const clearPendingConsent = (normalizedEmail: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(getConsentStorageKey(normalizedEmail));
  };


  const getStoredMerchantReferral = () => {
    if (typeof window === 'undefined') return null;

    try {
      const rawValue = window.localStorage.getItem(MERCHANT_REFERRAL_STORAGE_KEY);
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);
      const code = String(parsed?.code || '').trim().toUpperCase();
      const capturedAt = String(parsed?.captured_at || '');
      const expiresAt = String(parsed?.expires_at || '');

      if (!code || !capturedAt || !expiresAt) {
        window.localStorage.removeItem(MERCHANT_REFERRAL_STORAGE_KEY);
        return null;
      }

      const expiresTime = new Date(expiresAt).getTime();

      if (!Number.isFinite(expiresTime) || expiresTime <= Date.now()) {
        window.localStorage.removeItem(MERCHANT_REFERRAL_STORAGE_KEY);
        return null;
      }

      return {
        code,
        captured_at: capturedAt,
        expires_at: expiresAt,
      };
    } catch (err) {
      console.error('Failed to read merchant referral code:', err);
      window.localStorage.removeItem(MERCHANT_REFERRAL_STORAGE_KEY);
      return null;
    }
  };

  const clearStoredMerchantReferral = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(MERCHANT_REFERRAL_STORAGE_KEY);
  };

  const attachMerchantReferralIfSeller = async (authUser: any, accountRole: AccountRole) => {
    if (accountRole !== 'seller') return;

    const storedReferral = getStoredMerchantReferral();
    if (!storedReferral?.code) return;

    try {
      const { data, error: referralError } = await supabase.rpc(
        'create_merchant_referral_if_eligible',
        {
          p_seller_user_id: authUser.id,
          p_ref_code: storedReferral.code,
          p_registered_at: new Date().toISOString(),
        } as any
      );

      if (referralError) {
        console.error('create_merchant_referral_if_eligible error:', referralError);
        return;
      }

      const referralResult = data as any;
      const shouldClearReferral =
        referralResult?.success === true ||
        referralResult?.reason === 'merchant_referral_created' ||
        referralResult?.reason === 'merchant_already_has_referral' ||
        referralResult?.reason === 'merchant_referral_already_exists';

      if (shouldClearReferral) {
        clearStoredMerchantReferral();
      }
    } catch (err) {
      console.error('create_merchant_referral_if_eligible unexpected error:', err);
    }
  };

  const clearAuthHashFromUrl = () => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash) return;

    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  const validateEmail = (value: string): EmailValidationResult => {
    const normalizedEmail = normalizeEmail(value);

    if (!normalizedEmail) {
      return {
        valid: false,
        message: 'البريد الإلكتروني مطلوب',
      };
    }

    if (normalizedEmail.includes(' ')) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. احذف المسافات وحاول مرة أخرى.',
      };
    }

    const atCount = (normalizedEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. يجب أن يحتوي على علامة @ مرة واحدة فقط.',
      };
    }

    const [localPart = '', domainPart = ''] = normalizedEmail.split('@');

    if (!localPart || !domainPart) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. تأكد من كتابة البريد كاملًا.',
      };
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return {
        valid: false,
        message: 'يرجى إدخال بريد إلكتروني صحيح.',
      };
    }

    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. اسم النطاق غير مكتمل.',
      };
    }

    if (!domainPart.includes('.')) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. يجب أن يحتوي النطاق على نقطة مثل gmail.com',
      };
    }

    const domainParts = domainPart.split('.');
    const tld = domainParts[domainParts.length - 1] || '';

    if (tld.length < 2) {
      return {
        valid: false,
        message: 'البريد الإلكتروني غير صحيح. امتداد النطاق قصير جدًا.',
      };
    }

    const suggestedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domainPart];
    if (suggestedDomain) {
      return {
        valid: false,
        message: `يبدو أن البريد الإلكتروني يحتوي على خطأ. هل تقصد ${localPart}@${suggestedDomain} ؟`,
        suggestedEmail: `${localPart}@${suggestedDomain}`,
      };
    }

    return {
      valid: true,
      normalizedEmail,
    };
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);

    if (error) {
      setError('');
    }
  };

  const handleEmailBlur = () => {
    const validation = validateEmail(email);

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setEmail(validation.normalizedEmail);

    if (error && error.includes('البريد')) {
      setError('');
    }
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
      const normalizedExistingRole = normalizeAccountRole(existingProfile.role);

      if (existingProfile.role !== normalizedExistingRole) {
        const { error: normalizeRoleError } = await supabase
          .from('users_profile')
          .update({ role: normalizedExistingRole })
          .eq('id', authUser.id);

        if (normalizeRoleError) {
          throw new Error(`فشل تصحيح نوع الحساب: ${normalizeRoleError.message}`);
        }

        return {
          ...existingProfile,
          role: normalizedExistingRole,
        };
      }

      return existingProfile;
    }

    const fallbackName =
      authUser.user_metadata?.name ||
      name.trim() ||
      authUser.email?.split('@')[0] ||
      'مستخدم جديد';

    const fallbackRole = normalizeAccountRole(authUser.user_metadata?.role ?? role);
    const normalizedAuthEmail = normalizeEmail(authUser.email || email);
    const pendingConsent = getPendingConsent(normalizedAuthEmail);

    const { error: createProfileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: authUser.id,
          name: fallbackName,
          email: normalizedAuthEmail,
          role: fallbackRole,
          phone: null,
          phone_verified: false,
          signup_completed: false,
          ...(pendingConsent
            ? {
                terms_accepted_at: pendingConsent.terms_accepted_at,
                privacy_accepted_at: pendingConsent.privacy_accepted_at,
                terms_version: pendingConsent.terms_version,
                privacy_version: pendingConsent.privacy_version,
              }
            : {}),
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

    return createdProfile
      ? {
          ...createdProfile,
          role: normalizeAccountRole(createdProfile.role),
        }
      : createdProfile;
  };

  const markSignupCompleted = async (authUser: any) => {
    const profile = await ensureProfileForUser(authUser);
    const normalizedProfileRole = normalizeAccountRole(profile?.role ?? authUser.user_metadata?.role ?? role);
    const normalizedEmail = normalizeEmail(authUser.email || email);
    const pendingConsent = getPendingConsent(normalizedEmail);

    const shouldUpdateProfile =
      !profile?.signup_completed || profile?.role !== normalizedProfileRole || !!pendingConsent;

    if (shouldUpdateProfile) {
      const updatePayload: Record<string, any> = {
        role: normalizedProfileRole,
        signup_completed: true,
      };

      if (pendingConsent) {
        updatePayload.terms_accepted_at = pendingConsent.terms_accepted_at;
        updatePayload.privacy_accepted_at = pendingConsent.privacy_accepted_at;
        updatePayload.terms_version = pendingConsent.terms_version;
        updatePayload.privacy_version = pendingConsent.privacy_version;
      }

      const { error: updateProfileError } = await supabase
        .from('users_profile')
        .update(updatePayload)
        .eq('id', authUser.id);

      if (updateProfileError) {
        throw new Error(`فشل إكمال بيانات الحساب: ${updateProfileError.message}`);
      }
    }

    await refreshProfile();
    await attachMerchantReferralIfSeller(authUser, normalizedProfileRole);

    setEmail(normalizedEmail);
    setName((prev) => prev || profile?.name || authUser.user_metadata?.name || '');
    setRole(normalizedProfileRole);

    if (pendingConsent) {
      clearPendingConsent(normalizedEmail);
    }

    clearAuthHashFromUrl();
    setStep('completed');
    setInfoMessage('تم إنشاء الحساب والتحقق من البريد الإلكتروني بنجاح.');
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

    await markSignupCompleted(data.user);
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

  useEffect(() => {
    const recoverFromConfirmedEmailSession = async () => {
      if (sessionRecoveryAttemptedRef.current) return;
      sessionRecoveryAttemptedRef.current = true;

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('recover session error:', sessionError);
          return;
        }

        const sessionUser = session?.user;
        if (!sessionUser) return;
        if (!sessionUser.email_confirmed_at) return;

        const { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('signup_completed')
          .eq('id', sessionUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('recover profile error:', profileError);
          return;
        }

        if (profileData?.signup_completed) {
          return;
        }

        await markSignupCompleted(sessionUser);
      } catch (err) {
        console.error('recoverFromConfirmedEmailSession error:', err);
      }
    };

    void recoverFromConfirmedEmailSession();
  }, []);

  const handleBasicSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!name.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }

    const emailValidation = validateEmail(email);

    if (!emailValidation.valid) {
      setError(emailValidation.message);
      if (emailValidation.suggestedEmail) {
        setEmail(emailValidation.suggestedEmail);
      }
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

    if (!termsAccepted) {
      setError('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = emailValidation.normalizedEmail;
      const normalizedRole = normalizeAccountRole(role);

      setEmail(normalizedEmail);
      setRole(normalizedRole);
      rememberPendingConsent(normalizedEmail);

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

      const consentAcceptedAt = new Date().toISOString();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signup`,
          data: {
            name: name.trim(),
            role: normalizedRole,
            account_type: normalizedRole,
            terms_accepted_at: consentAcceptedAt,
            privacy_accepted_at: consentAcceptedAt,
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
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

    const emailValidation = validateEmail(email);

    if (!emailValidation.valid) {
      setError(emailValidation.message);
      if (emailValidation.suggestedEmail) {
        setEmail(emailValidation.suggestedEmail);
      }
      return;
    }

    const normalizedEmail = emailValidation.normalizedEmail;

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

      setEmail(normalizedEmail);
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
      const emailValidation = validateEmail(email);

      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      const normalizedEmail = emailValidation.normalizedEmail;
      setEmail(normalizedEmail);

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

      await markSignupCompleted(data.user);
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من البريد الإلكتروني');
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const renderStepHeader = () => {
    const steps = [
      { key: 'basic-info', label: 'المعلومات الأساسية' },
      { key: 'email-verification', label: 'تحقق البريد' },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          {steps.map((item, index) => {
            const order: SignupStep[] = [
              'basic-info',
              'email-verification',
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
            تم إنشاء الحساب والتحقق من البريد الإلكتروني بنجاح.
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
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
                required
                dir="ltr"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
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

          <div
            className={`rounded-xl border p-4 transition-all ${
              termsAccepted
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (error.includes('الشروط') || error.includes('الخصوصية')) {
                    setError('');
                  }
                }}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />

              <span className="text-sm text-gray-700 leading-7">
                أوافق على{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  الشروط والأحكام
                </a>{' '}
                و{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  سياسة الخصوصية
                </a>{' '}
                الخاصة بمنصة رقمي.
              </span>
            </label>
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
