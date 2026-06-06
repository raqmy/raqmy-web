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
    title: 'وش ناوي تبيع في رقمي؟',
    description: 'اختيارك يساعدنا نجهز لك خطوات مناسبة بدل لوحة عامة.',
    options: [
      {
        value: 'digital_products',
        title: 'منتجات رقمية جاهزة',
        description: 'PDF، قوالب Canva، ملخصات، ملفات، تصاميم جاهزة.',
        icon: <Package className="w-5 h-5" />,
      },
      {
        value: 'digital_services',
        title: 'خدمات رقمية حسب الطلب',
        description: 'تصميم، كتابة محتوى، تعديل ملف، تجهيز قالب أو خدمة مخصصة.',
        icon: <Wrench className="w-5 h-5" />,
      },
      {
        value: 'both',
        title: 'منتجات وخدمات معًا',
        description: 'أبي أبيع منتجات جاهزة وخدمات حسب الطلب.',
        icon: <Sparkles className="w-5 h-5" />,
      },
      {
        value: 'not_sure',
        title: 'لسه غير متأكد',
        description: 'أحتاج أفكار أو توجيه قبل ما أبدأ.',
        icon: <HelpCircle className="w-5 h-5" />,
      },
    ] as QuestionOption<SellingType>[],
  },
  {
    key: 'readiness_status',
    title: 'هل عندك شيء جاهز للبيع الآن؟',
    description: 'نبي نعرف هل نوجهك للإضافة مباشرة أو نبدأ معك من الفكرة.',
    options: [
      {
        value: 'ready',
        title: 'نعم، جاهز',
        description: 'عندي منتج أو خدمة وأقدر أبدأ رفعها الآن.',
        icon: <CheckCircle2 className="w-5 h-5" />,
      },
      {
        value: 'idea_only',
        title: 'عندي فكرة فقط',
        description: 'عندي فكرة لكن ما جهزت المنتج أو الخدمة.',
        icon: <Lightbulb className="w-5 h-5" />,
      },
      {
        value: 'needs_ideas',
        title: 'لا، أحتاج أفكار',
        description: 'أحتاج أبدأ بفكرة بسيطة ومناسبة.',
        icon: <HelpCircle className="w-5 h-5" />,
      },
      {
        value: 'many_products',
        title: 'عندي أكثر من منتج',
        description: 'أحتاج أرتب المنتجات داخل متجر بشكل واضح.',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
    ] as QuestionOption<ReadinessStatus>[],
  },
  {
    key: 'preferred_sales_channel',
    title: 'كيف تفضل تبدأ البيع؟',
    description: 'رقمي يدعم المتجر، السوق العام، والرابط المباشر.',
    options: [
      {
        value: 'store',
        title: 'من متجر خاص',
        description: 'أبي يكون عندي متجر مستقل أعرض فيه منتجاتي وخدماتي.',
        icon: <Store className="w-5 h-5" />,
      },
      {
        value: 'marketplace',
        title: 'من السوق العام',
        description: 'أبي منتجاتي تظهر داخل السوق العام في رقمي.',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        value: 'direct_link',
        title: 'برابط مباشر',
        description: 'أبي رابط أرسله للناس مباشرة بدون تعقيد.',
        icon: <LinkIcon className="w-5 h-5" />,
      },
      {
        value: 'all',
        title: 'كل الطرق المتاحة',
        description: 'أبي أكبر فرصة ظهور: متجر + سوق عام + رابط مباشر.',
        icon: <Rocket className="w-5 h-5" />,
      },
    ] as QuestionOption<PreferredSalesChannel>[],
  },
  {
    key: 'audience_source',
    title: 'وين تقدر تشارك رابطك أول مرة؟',
    description: 'هذه الخطوة تساعدنا نعطيك مهمة تسويق مناسبة لأول بيع.',
    options: [
      {
        value: 'social_accounts',
        title: 'حساباتي في التواصل الاجتماعي',
        description: 'مثل X، إنستغرام، تيك توك، سناب أو غيرها.',
        icon: <Share2 className="w-5 h-5" />,
      },
      {
        value: 'groups',
        title: 'قروب واتساب أو تيليجرام',
        description: 'عندي قروب أو مجتمعات أقدر أشارك فيها الرابط.',
        icon: <Users className="w-5 h-5" />,
      },
      {
        value: 'previous_customers',
        title: 'معارف أو عملاء سابقين',
        description: 'أقدر أرسل الرابط لأشخاص مهتمين مباشرة.',
        icon: <Target className="w-5 h-5" />,
      },
      {
        value: 'none',
        title: 'ما عندي مكان أنشر فيه حاليًا',
        description: 'أحتاج أبدأ بخطوة بسيطة بدون جمهور كبير.',
        icon: <HelpCircle className="w-5 h-5" />,
      },
    ] as QuestionOption<AudienceSource>[],
  },
  {
    key: 'first_goal',
    title: 'وش هدفك الأول في رقمي؟',
    description: 'بنرتب لك المهام حسب الهدف الأقرب لك الآن.',
    options: [
      {
        value: 'first_sale',
        title: 'أبي أول عملية بيع',
        description: 'أهم شيء عندي أبدأ البيع بأسرع طريقة ممكنة.',
        icon: <Rocket className="w-5 h-5" />,
      },
      {
        value: 'professional_store',
        title: 'أبي أرتب متجر احترافي',
        description: 'أبي صفحة متجر مرتبة قبل التسويق.',
        icon: <Store className="w-5 h-5" />,
      },
      {
        value: 'try_platform',
        title: 'أبي أجرب المنصة',
        description: 'أبي أفهم طريقة العمل وأجرب منتج بسيط.',
        icon: <Sparkles className="w-5 h-5" />,
      },
      {
        value: 'multiple_products',
        title: 'أبي أجهز أكثر من منتج لاحقًا',
        description: 'أبي أبدأ بأول منتج ثم أوسع المنتجات تدريجيًا.',
        icon: <Package className="w-5 h-5" />,
      },
    ] as QuestionOption<FirstGoal>[],
  },
] as const;

const getPersonalizedPreviewTasks = (answers: OnboardingAnswers) => {
  const tasks: Array<{ title: string; description: string }> = [];

  tasks.push({
    title: 'جهّز مسارك في رقمي',
    description: 'إجاباتك هنا تساعدنا نعرض لك خطوات مناسبة داخل لوحة التاجر.',
  });

  if (
    answers.preferred_sales_channel === 'store' ||
    answers.preferred_sales_channel === 'all' ||
    answers.readiness_status === 'many_products' ||
    answers.first_goal === 'professional_store'
  ) {
    tasks.push({
      title: 'أنشئ متجرك',
      description: 'اسم المتجر، الصورة، الوصف، ورابط المتجر تكون داخل مهمة واحدة.',
    });
  }

  if (answers.selling_type === 'digital_services') {
    tasks.push({
      title: 'أضف أول خدمة رقمية',
      description: 'اكتب الخدمة والسعر ومدة التنفيذ ومتطلبات العميل داخل نفس المهمة.',
    });
  } else if (answers.selling_type === 'both') {
    tasks.push({
      title: 'أضف أول منتج أو خدمة',
      description: 'ابدأ بعرض واحد فقط حتى لا تتعطل بالبداية.',
    });
  } else if (answers.selling_type === 'not_sure' || answers.readiness_status === 'needs_ideas') {
    tasks.push({
      title: 'اختر فكرة بسيطة للبداية',
      description: 'نساعدك تبدأ بفكرة قابلة للبيع بدل انتظار الكمال.',
    });
  } else {
    tasks.push({
      title: 'أضف أول منتج رقمي',
      description: 'العنوان، الوصف، الصورة، السعر وملف المنتج تكون ضمن نفس المهمة.',
    });
  }

  tasks.push({
    title: 'اضبط الظهور وشارك الرابط',
    description: 'اختر المتجر أو السوق العام أو الرابط المباشر ثم انسخ الرابط.',
  });

  if (answers.audience_source === 'social_accounts') {
    tasks.push({
      title: 'سوّق لأول عملية بيع',
      description: 'شارك رابط المنتج في حساباتك وراقب أول الطلبات.',
    });
  } else if (answers.audience_source === 'groups') {
    tasks.push({
      title: 'سوّق لأول عملية بيع',
      description: 'شارك الرابط في قروب مناسب بطريقة طبيعية وغير مزعجة.',
    });
  } else if (answers.audience_source === 'previous_customers') {
    tasks.push({
      title: 'سوّق لأول عملية بيع',
      description: 'أرسل الرابط لأول 5 أشخاص مهتمين أو عملاء سابقين.',
    });
  } else {
    tasks.push({
      title: 'سوّق لأول عملية بيع',
      description: 'ابدأ بمشاركة الرابط يدويًا مع أشخاص مهتمين أو في حساب بسيط.',
    });
  }

  tasks.push({
    title: 'أكمل التوثيق والحساب البنكي',
    description: 'هذه تظهر بعد أول بيع أو عند وجود أرباح حتى تقدر تسحبها.',
  });

  return tasks.slice(0, 6);
};

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

  const previewTasks = useMemo(() => getPersonalizedPreviewTasks(answers), [answers]);

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
      'هل تريد تخطي أسئلة التهيئة الآن؟ يمكنك المتابعة، لكن وجودها يساعدنا نعرض لك مهام مناسبة لأول بيع.'
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
            ...answers,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تجهيز أسئلة البداية...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
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

  const selectedValue = answers[currentQuestion.key as keyof OnboardingAnswers];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            تخطي الآن
          </button>

          <div className="text-sm text-gray-500">
            الخطوة {step + 1} من {questions.length}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  خلّنا نجهز طريقك لأول بيع
                </h1>
                <p className="text-gray-500 mt-1">
                  جاوب على كم سؤال سريع، وبعدها بنعرض لك خطوات مناسبة داخل لوحة التاجر.
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0">
            <div className="p-6 md:p-8">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentQuestion.title}
                </h2>
                <p className="text-gray-500">{currentQuestion.description}</p>
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
                      className={`text-right rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {option.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-bold text-gray-900">{option.title}</h3>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-2 leading-6">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 0 || saving}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : isLastStep ? 'إنهاء وتجهيز المهام' : 'التالي'}
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <aside className="bg-gray-50 border-t lg:border-t-0 lg:border-r border-gray-100 p-6 md:p-8">
              <div className="sticky top-8">
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    معاينة خطواتك
                  </h3>
                  <p className="text-sm text-gray-500 leading-6">
                    هذه ليست مهام نهائية الآن، لكنها توضح كيف سنرتب لك الخطوات داخل لوحة التاجر.
                  </p>
                </div>

                <div className="space-y-3">
                  {previewTasks.map((task, index) => (
                    <div
                      key={`${task.title}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-500 mt-1 leading-6">
                            {task.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-sm text-blue-800 leading-6">
                    الهدف من هذه الخطوات هو تقليل الضياع بعد التسجيل، وتحويل التاجر من مجرد حساب جديد إلى تاجر عنده منتج منشور ورابط قابل للبيع.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
