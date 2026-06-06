import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Link as LinkIcon,
  Package,
  Rocket,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Users,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MerchantOnboardingPageProps {
  onNavigate: (page: string) => void;
}

type SellingType = 'digital_products' | 'digital_services' | 'both' | 'not_sure';
type ReadinessStatus = 'ready' | 'idea_only' | 'needs_ideas' | 'many_products';
type PreferredSalesChannel = 'store' | 'marketplace' | 'direct_link' | 'all';
type AudienceSource = 'social_accounts' | 'groups' | 'previous_customers' | 'none';
type FirstGoal = 'first_sale' | 'professional_store' | 'try_platform' | 'multiple_products';

interface OnboardingAnswers {
  selling_type: SellingType;
  readiness_status: ReadinessStatus;
  preferred_sales_channel: PreferredSalesChannel;
  audience_source: AudienceSource;
  first_goal: FirstGoal;
}

interface QuestionOption<T extends string> {
  value: T;
  title: string;
  description: string;
  emoji: string;
  icon: React.ReactNode;
}

const defaultAnswers: OnboardingAnswers = {
  selling_type: 'digital_products',
  readiness_status: 'ready',
  preferred_sales_channel: 'all',
  audience_source: 'social_accounts',
  first_goal: 'first_sale',
};

const questions = [
  {
    key: 'selling_type',
    badge: 'الخطوة الأولى',
    title: 'وش ناوي تبيع في رقمي؟',
    description: 'اختيارك يساعدنا نجهز لك خطوات مناسبة بدل لوحة عامة.',
    options: [
      {
        value: 'digital_products',
        title: 'منتجات رقمية جاهزة',
        description: 'PDF، قوالب Canva، ملخصات، ملفات، تصاميم جاهزة.',
        emoji: '📦',
        icon: <Package className="w-5 h-5" />,
      },
      {
        value: 'digital_services',
        title: 'خدمات رقمية حسب الطلب',
        description: 'تصميم، كتابة محتوى، تعديل ملف، تجهيز قالب أو خدمة مخصصة.',
        emoji: '🛠️',
        icon: <Wrench className="w-5 h-5" />,
      },
      {
        value: 'both',
        title: 'منتجات وخدمات معًا',
        description: 'أبي أبيع منتجات جاهزة وخدمات حسب الطلب.',
        emoji: '✨',
        icon: <Sparkles className="w-5 h-5" />,
      },
      {
        value: 'not_sure',
        title: 'لسه غير متأكد',
        description: 'أحتاج أفكار أو توجيه قبل ما أبدأ.',
        emoji: '💡',
        icon: <HelpCircle className="w-5 h-5" />,
      },
    ] as QuestionOption<SellingType>[],
  },
  {
    key: 'readiness_status',
    badge: 'جاهزية البيع',
    title: 'هل عندك شيء جاهز للبيع الآن؟',
    description: 'نبي نعرف هل نوجهك للإضافة مباشرة أو نبدأ معك من الفكرة.',
    options: [
      {
        value: 'ready',
        title: 'نعم، جاهز',
        description: 'عندي منتج أو خدمة وأقدر أبدأ رفعها الآن.',
        emoji: '✅',
        icon: <CheckCircle2 className="w-5 h-5" />,
      },
      {
        value: 'idea_only',
        title: 'عندي فكرة فقط',
        description: 'عندي فكرة لكن ما جهزت المنتج أو الخدمة.',
        emoji: '💭',
        icon: <Lightbulb className="w-5 h-5" />,
      },
      {
        value: 'needs_ideas',
        title: 'لا، أحتاج أفكار',
        description: 'أحتاج أبدأ بفكرة بسيطة ومناسبة.',
        emoji: '🧠',
        icon: <HelpCircle className="w-5 h-5" />,
      },
      {
        value: 'many_products',
        title: 'عندي أكثر من منتج',
        description: 'أحتاج أرتب المنتجات داخل متجر بشكل واضح.',
        emoji: '🛍️',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
    ] as QuestionOption<ReadinessStatus>[],
  },
  {
    key: 'preferred_sales_channel',
    badge: 'طريقة البيع',
    title: 'كيف تفضل تبدأ البيع؟',
    description: 'رقمي يدعم المتجر، السوق العام، والرابط المباشر.',
    options: [
      {
        value: 'store',
        title: 'من متجر خاص',
        description: 'أبي يكون عندي متجر مستقل أعرض فيه منتجاتي وخدماتي.',
        emoji: '🏪',
        icon: <Store className="w-5 h-5" />,
      },
      {
        value: 'marketplace',
        title: 'من السوق العام',
        description: 'أبي منتجاتي تظهر داخل السوق العام في رقمي.',
        emoji: '🛒',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        value: 'direct_link',
        title: 'برابط مباشر',
        description: 'أبي رابط أرسله للناس مباشرة بدون تعقيد.',
        emoji: '🔗',
        icon: <LinkIcon className="w-5 h-5" />,
      },
      {
        value: 'all',
        title: 'كل الطرق المتاحة',
        description: 'أبي أكبر فرصة ظهور: متجر + سوق عام + رابط مباشر.',
        emoji: '🚀',
        icon: <Rocket className="w-5 h-5" />,
      },
    ] as QuestionOption<PreferredSalesChannel>[],
  },
  {
    key: 'audience_source',
    badge: 'أول جمهور',
    title: 'وين تقدر تشارك رابطك أول مرة؟',
    description: 'هذه الخطوة تساعدنا نعطيك مهمة تسويق مناسبة لأول بيع.',
    options: [
      {
        value: 'social_accounts',
        title: 'حساباتي في التواصل الاجتماعي',
        description: 'مثل X، إنستغرام، تيك توك، سناب أو غيرها.',
        emoji: '📣',
        icon: <Share2 className="w-5 h-5" />,
      },
      {
        value: 'groups',
        title: 'قروب واتساب أو تيليجرام',
        description: 'عندي قروب أو مجتمعات أقدر أشارك فيها الرابط.',
        emoji: '👥',
        icon: <Users className="w-5 h-5" />,
      },
      {
        value: 'previous_customers',
        title: 'معارف أو عملاء سابقين',
        description: 'أقدر أرسل الرابط لأشخاص مهتمين مباشرة.',
        emoji: '🎯',
        icon: <Target className="w-5 h-5" />,
      },
      {
        value: 'none',
        title: 'ما عندي مكان أنشر فيه حاليًا',
        description: 'أحتاج أبدأ بخطوة بسيطة بدون جمهور كبير.',
        emoji: '🌱',
        icon: <HelpCircle className="w-5 h-5" />,
      },
    ] as QuestionOption<AudienceSource>[],
  },
  {
    key: 'first_goal',
    badge: 'هدفك الأول',
    title: 'وش هدفك الأول في رقمي؟',
    description: 'بنرتب لك المهام حسب الهدف الأقرب لك الآن.',
    options: [
      {
        value: 'first_sale',
        title: 'أبي أول عملية بيع',
        description: 'أهم شيء عندي أبدأ البيع بأسرع طريقة ممكنة.',
        emoji: '🚀',
        icon: <Rocket className="w-5 h-5" />,
      },
      {
        value: 'professional_store',
        title: 'أبي أرتب متجر احترافي',
        description: 'أبي صفحة متجر مرتبة قبل التسويق.',
        emoji: '🏪',
        icon: <Store className="w-5 h-5" />,
      },
      {
        value: 'try_platform',
        title: 'أبي أجرب المنصة',
        description: 'أبي أفهم طريقة العمل وأجرب منتج بسيط.',
        emoji: '🧪',
        icon: <Sparkles className="w-5 h-5" />,
      },
      {
        value: 'multiple_products',
        title: 'أبي أجهز أكثر من منتج لاحقًا',
        description: 'أبي أبدأ بأول منتج ثم أوسع المنتجات تدريجيًا.',
        emoji: '📦',
        icon: <Package className="w-5 h-5" />,
      },
    ] as QuestionOption<FirstGoal>[],
  },
] as const;

const stepLabels = ['نوع البيع', 'الجاهزية', 'طريقة البيع', 'مكان النشر', 'الهدف'];

export const MerchantOnboardingPage: React.FC<MerchantOnboardingPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  const progress = Math.round(((step + 1) / questions.length) * 100);

  const selectedValue = answers[currentQuestion.key as keyof OnboardingAnswers];

  const selectedOption = useMemo(() => {
    return currentQuestion.options.find((option) => option.value === selectedValue);
  }, [currentQuestion.options, selectedValue]);

  useEffect(() => {
    fetchExistingOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchExistingOnboarding = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('merchant_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setAnswers({
          selling_type: data.selling_type || defaultAnswers.selling_type,
          readiness_status: data.readiness_status || defaultAnswers.readiness_status,
          preferred_sales_channel: data.preferred_sales_channel || defaultAnswers.preferred_sales_channel,
          audience_source: data.audience_source || defaultAnswers.audience_source,
          first_goal: data.first_goal || defaultAnswers.first_goal,
        });
      }
    } catch (err: any) {
      console.error('Error fetching merchant onboarding:', err);
      setError('تعذر تحميل بيانات التهيئة. حاول تحديث الصفحة.');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (key: keyof OnboardingAnswers, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }

    setStep((prev) => Math.min(prev + 1, questions.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    if (!user?.id) {
      setError('يجب تسجيل الدخول أولًا.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: upsertError } = await supabase
        .from('merchant_onboarding')
        .upsert(
          {
            user_id: user.id,
            selling_type: answers.selling_type,
            readiness_status: answers.readiness_status,
            preferred_sales_channel: answers.preferred_sales_channel,
            audience_source: answers.audience_source,
            first_goal: answers.first_goal,
            completed_at: new Date().toISOString(),
            skipped_at: null,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      onNavigate('seller-dashboard');
    } catch (err: any) {
      console.error('Error saving merchant onboarding:', err);
      setError(err?.message || 'تعذر حفظ الإجابات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) {
      onNavigate('seller-dashboard');
      return;
    }

    const confirmed = window.confirm(
      'هل تريد تخطي أسئلة البداية الآن؟ الأفضل إكمالها لأنها تساعد في ترتيب مهامك داخل لوحة التاجر.'
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const { error: upsertError } = await supabase
        .from('merchant_onboarding')
        .upsert(
          {
            user_id: user.id,
            selling_type: answers.selling_type,
            readiness_status: answers.readiness_status,
            preferred_sales_channel: answers.preferred_sales_channel,
            audience_source: answers.audience_source,
            first_goal: answers.first_goal,
            skipped_at: new Date().toISOString(),
            completed_at: null,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      onNavigate('seller-dashboard');
    } catch (err: any) {
      console.error('Error skipping merchant onboarding:', err);
      setError(err?.message || 'تعذر تخطي التهيئة. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4" dir="rtl">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Rocket className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-700 font-semibold">جاري تجهيز أسئلة البداية...</p>
          <p className="text-gray-500 text-sm mt-1">ثواني ونرتب لك المسار المناسب</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Rocket className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">تسجيل الدخول مطلوب</h1>
          <p className="text-gray-600 mb-6">
            يجب تسجيل الدخول حتى نقدر نجهز لك خطوات التاجر.
          </p>
          <button
            onClick={() => onNavigate('auth-login')}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            تخطي الآن
          </button>

          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              الخطوة {step + 1} من {questions.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="relative overflow-hidden px-6 md:px-10 pt-8 pb-7 border-b border-gray-100">
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-70 -translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-100 rounded-full blur-3xl opacity-70 translate-x-16 translate-y-16" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                  <Rocket className="w-7 h-7" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    بداية ذكية للتاجر
                  </div>
                  <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                    خلّنا نجهز طريقك لأول بيع
                  </h1>
                  <p className="text-gray-500 mt-2 leading-7">
                    جاوب على {questions.length} أسئلة سريعة، وبعدها بنرتب لك المهام المناسبة داخل لوحة التاجر.
                  </p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl px-5 py-4 shadow-sm min-w-[170px]">
                <div className="text-3xl font-extrabold text-blue-600">{progress}%</div>
                <div className="text-sm text-gray-500 mt-1">اكتمل من الإعداد</div>
              </div>
            </div>

            <div className="relative mt-7">
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="hidden md:grid grid-cols-5 gap-2 mt-4">
                {stepLabels.map((label, index) => {
                  const isDone = index < step;
                  const isCurrent = index === step;

                  return (
                    <div
                      key={label}
                      className={`rounded-xl px-3 py-2 text-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                          : isDone
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-100'
                      }`}
                    >
                      {isDone ? '✓ ' : ''}
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-7">
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-bold mb-4">
                {currentQuestion.badge}
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                {currentQuestion.title}
              </h2>
              <p className="text-gray-500 leading-7">{currentQuestion.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedValue === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateAnswer(
                        currentQuestion.key as keyof OnboardingAnswers,
                        option.value
                      )
                    }
                    className={`group relative text-right rounded-3xl border p-5 transition-all duration-300 overflow-hidden ${
                      isSelected
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 ring-4 ring-blue-100 shadow-lg scale-[1.01]'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 hover:-translate-y-1 hover:shadow-md'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-600 to-purple-600" />
                    )}

                    <div className="flex items-start gap-4">
                      <div
                        className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                        }`}
                      >
                        <span className="absolute -top-2 -right-2 text-xl">{option.emoji}</span>
                        {option.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-extrabold text-gray-900 text-lg">{option.title}</h3>
                          {isSelected && (
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2 leading-7">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedOption && (
              <div className="mt-6 rounded-2xl bg-gradient-to-l from-blue-50 to-purple-50 border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{selectedOption.emoji}</div>
                  <div>
                    <div className="font-bold text-gray-900">
                      اختيارك الحالي: {selectedOption.title}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-6">
                      ممتاز، بنستخدم هذا الاختيار لاحقًا لترتيب المهام المناسبة لك داخل لوحة التاجر.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0 || saving}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-100 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {saving ? 'جاري الحفظ...' : isLastStep ? 'إنهاء وتجهيز المهام' : 'التالي'}
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-5">
          <p className="text-xs text-gray-400">
            بعد الإنهاء ستظهر لك المهام داخل لوحة التاجر بناءً على إجاباتك وبياناتك الفعلية في الموقع.
          </p>
        </div>
      </div>
    </div>
  );
};
