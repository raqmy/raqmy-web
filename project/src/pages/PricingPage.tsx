import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { supabase, Plan } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

type PlanWithExtras = Plan & {
  slug?: string;
  description?: string;
  interval?: string;
  is_popular?: boolean;
  sort_order?: number;
  marketplace_commission_percent?: number;
  direct_commission_percent?: number;
  commission_percent?: number;
  product_limit?: number | null;
  storage_limit_mb?: number | null;
  features?: string[] | null;
};

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<PlanWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      setPlans((data || []) as PlanWithExtras[]);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPlanId = (profile as any)?.plan_id ?? null;
  const currentSubscriptionStatus = (profile as any)?.subscription_status ?? null;

  const isCurrentPlan = (plan: PlanWithExtras) => {
    return currentPlanId === plan.id && currentSubscriptionStatus === 'active';
  };

  const formatPlanPrice = (price: number | string | null | undefined) => {
    const numericPrice = Number(price || 0);
    return numericPrice <= 0 ? 'مجانا' : `SAR ${numericPrice}`;
  };

  const getPlanIntervalText = (plan: PlanWithExtras) => {
    const numericPrice = Number(plan.price || 0);
    if (numericPrice <= 0) {
      return 'تُفعّل لمدة شهر ويمكن الترقية لاحقًا';
    }
    return 'اشتراك شهري قابل للتجديد';
  };

  const normalizeFeatureText = (text: string) =>
    text.replace(/\s+/g, ' ').replace(/٪/g, '%').trim();

  const buildPlanFeatures = (plan: PlanWithExtras) => {
    const featureSet = new Set<string>();

    const addFeature = (value?: string | null) => {
      if (!value) return;
      const normalized = normalizeFeatureText(value);
      if (!normalized) return;
      if (!featureSet.has(normalized)) {
        featureSet.add(normalized);
      }
    };

    addFeature('منتجات غير محدودة');
    addFeature('متاجر غير محدودة');

    if (typeof plan.marketplace_commission_percent === 'number') {
      addFeature(`عمولة السوق العام ${plan.marketplace_commission_percent}%`);
    }

    if (typeof plan.direct_commission_percent === 'number') {
      addFeature(`عمولة البيع المباشر ${plan.direct_commission_percent}%`);
    }

    if (Array.isArray(plan.features)) {
      plan.features.forEach((feature) => addFeature(feature));
    }

    return Array.from(featureSet);
  };

  const handleSelectPlan = async (plan: PlanWithExtras) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    if (isCurrentPlan(plan)) {
      return;
    }

    const numericPrice = Number(plan.price || 0);

    // حاليًا لا نفعّل الرجوع المجاني تلقائيًا
    if (numericPrice <= 0) {
      alert('هذه هي الباقة الأساسية الافتراضية حاليًا، والرجوع إليها تلقائيًا غير مفعّل بعد.');
      return;
    }

    try {
      setSubmittingPlanId(plan.id);

      // 1) إنشاء سجل دفع اشتراك pending
      const { data: insertedPayment, error: insertError } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount: numericPrice,
          currency: plan.currency || 'SAR',
          interval: plan.interval || 'monthly',
          status: 'pending',
          payment_provider: 'paymob',
          metadata: {
            source: 'pricing_page',
            plan_name: plan.name,
            plan_slug: plan.slug || null,
          },
        })
        .select('id')
        .single();

      if (insertError || !insertedPayment) {
        console.error('Error creating subscription payment:', insertError);
        alert('تعذر إنشاء طلب الاشتراك، حاول مرة أخرى.');
        return;
      }

      // 2) استدعاء Edge Function لإنشاء رابط الدفع
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'create-paymob-subscription-payment',
        {
          body: {
            subscription_payment_id: insertedPayment.id,
          },
        }
      );

      if (functionError) {
        console.error('Error invoking subscription payment function:', functionError);
        alert('تعذر بدء عملية الدفع، حاول مرة أخرى.');
        return;
      }

      if (!functionData?.success || !functionData?.iframe_url) {
        console.error('Invalid function response:', functionData);
        alert('لم يتم إنشاء رابط الدفع بشكل صحيح.');
        return;
      }

      // 3) تحويل المستخدم إلى صفحة دفع Paymob
      window.location.href = functionData.iframe_url;
    } catch (error) {
      console.error('Error selecting paid plan:', error);
      alert('حدث خطأ غير متوقع أثناء بدء الاشتراك.');
    } finally {
      setSubmittingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الباقات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">اختر الباقة المناسبة لك</h1>
          <p className="text-xl text-gray-600">ابدأ مجاناً وقم بالترقية في أي وقت</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const current = isCurrentPlan(plan);
            const isPopular = !!plan.is_popular;
            const isSubmitting = submittingPlanId === plan.id;
            const features = buildPlanFeatures(plan);
            const numericPrice = Number(plan.price || 0);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  isPopular ? 'ring-2 ring-blue-600 scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="bg-blue-600 text-white text-center py-2 text-sm font-semibold">
                    الأكثر شعبية
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                  {plan.description && (
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                  )}

                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPlanPrice(plan.price)}
                    </span>
                    {numericPrice > 0 && (
                      <span className="text-gray-600 mr-2">/ شهرياً</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mb-6">{getPlanIntervalText(plan)}</p>

                  <ul className="space-y-4 mb-8">
                    {features.map((feature, idx) => (
                      <li key={`${plan.id}-feature-${idx}`} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={current || isSubmitting}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      current
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {current
                      ? 'الباقة الحالية'
                      : isSubmitting
                      ? 'جاري تحويلك للدفع...'
                      : numericPrice > 0
                      ? 'الترقية لهذه الباقة'
                      : 'اختيار هذه الباقة'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">هل لديك أسئلة حول الباقات؟</p>
          <button
            onClick={() => onNavigate('support')}
            className="text-blue-600 font-semibold hover:text-blue-700"
          >
            تواصل مع فريق الدعم
          </button>
        </div>
      </div>
    </div>
  );
};
