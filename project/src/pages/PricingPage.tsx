import React, { useEffect, useMemo, useState } from 'react';
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
  currency?: string | null;
  is_popular?: boolean;
  sort_order?: number;
  marketplace_commission_percent?: number;
  direct_commission_percent?: number;
  commission_percent?: number;
  product_limit?: number | null;
  storage_limit_mb?: number | null;
  features?: string[] | string | null;
};

type PaymentFeeSetting = {
  id?: string;
  provider?: string | null;
  currency?: string | null;
  method_key?: string | null;
  fee_rate?: number | string | null;
  fixed_fee?: number | string | null;
  is_active?: boolean | null;
};

const OFFICIAL_PAYMOB_KSA_FEES: PaymentFeeSetting[] = [
  {
    id: 'official-paymob-ksa-mada',
    provider: 'paymob',
    currency: 'SAR',
    method_key: 'mada',
    fee_rate: 1,
    fixed_fee: 1,
    is_active: true,
  },
  {
    id: 'official-paymob-ksa-visa-mastercard',
    provider: 'paymob',
    currency: 'SAR',
    method_key: 'visa_mastercard',
    fee_rate: 2.7,
    fixed_fee: 1,
    is_active: true,
  },
  {
    id: 'official-paymob-ksa-international',
    provider: 'paymob',
    currency: 'SAR',
    method_key: 'international_cards',
    fee_rate: 3.5,
    fixed_fee: 1,
    is_active: true,
  },
];

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();

  const [plans, setPlans] = useState<PlanWithExtras[]>([]);
  const [paymentFeeSettings, setPaymentFeeSettings] = useState<PaymentFeeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);

      const [plansResult, paymentFeesResult] = await Promise.all([
        supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('price', { ascending: true }),
        supabase
          .from('payment_fee_settings')
          .select('id,provider,currency,method_key,fee_rate,fixed_fee,is_active')
          .eq('is_active', true)
          .order('currency', { ascending: true })
          .order('method_key', { ascending: true }),
      ]);

      if (plansResult.error) {
        console.error('Error fetching plans:', plansResult.error);
        setPlans([]);
      } else {
        setPlans((plansResult.data || []) as PlanWithExtras[]);
      }

      if (paymentFeesResult.error) {
        console.warn('Could not load payment fee settings:', paymentFeesResult.error.message);
        setPaymentFeeSettings([]);
      } else {
        setPaymentFeeSettings((paymentFeesResult.data || []) as PaymentFeeSetting[]);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      setPlans([]);
      setPaymentFeeSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const currentPlanId = (profile as any)?.plan_id ?? null;
  const currentSubscriptionStatus = (profile as any)?.subscription_status ?? null;
  const currentSubscriptionExpiresAt = (profile as any)?.subscription_expires_at ?? null;

  const isSubscriptionActive = useMemo(() => {
    if (currentSubscriptionStatus !== 'active') return false;

    if (!currentSubscriptionExpiresAt) {
      return true;
    }

    const expiresAt = new Date(currentSubscriptionExpiresAt).getTime();

    if (Number.isNaN(expiresAt)) {
      return true;
    }

    return expiresAt > Date.now();
  }, [currentSubscriptionStatus, currentSubscriptionExpiresAt]);

  const currentPlan = useMemo(() => {
    if (!currentPlanId) return null;
    return plans.find((plan) => plan.id === currentPlanId) || null;
  }, [plans, currentPlanId]);

  const getPlanPrice = (plan?: PlanWithExtras | null) => {
    return Number(plan?.price || 0);
  };

  const getPlanSortOrder = (plan?: PlanWithExtras | null) => {
    if (!plan) return 0;
    return Number(plan.sort_order ?? getPlanPrice(plan));
  };

  const isCurrentPlan = (plan: PlanWithExtras) => {
    return currentPlanId === plan.id && isSubscriptionActive;
  };

  const isLowerOrSameActivePaidPlan = (plan: PlanWithExtras) => {
    if (!isSubscriptionActive || !currentPlan || currentPlan.id === plan.id) {
      return false;
    }

    const selectedPrice = getPlanPrice(plan);
    const activePrice = getPlanPrice(currentPlan);

    if (activePrice <= 0) {
      return false;
    }

    if (selectedPrice <= 0) {
      return true;
    }

    return selectedPrice <= activePrice;
  };

  const formatPlanPrice = (price: number | string | null | undefined) => {
    const numericPrice = Number(price || 0);
    return numericPrice <= 0 ? 'مجانا' : `SAR ${numericPrice}`;
  };

  const getPlanIntervalText = (plan: PlanWithExtras) => {
    const numericPrice = Number(plan.price || 0);

    if (numericPrice <= 0) {
      return 'خطة مجانية دائمة، ويمكنك الترقية في أي وقت';
    }

    return 'اشتراك شهري قابل للتجديد';
  };

  const normalizeCurrencyCode = (value?: string | null) => {
    const normalized = String(value || 'SAR').trim().toUpperCase();
    return normalized || 'SAR';
  };

  const normalizeProvider = (value?: string | null) => {
    const normalized = String(value || 'paymob').trim().toLowerCase();
    return normalized || 'paymob';
  };

  const toNumber = (value: number | string | null | undefined) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatCompactNumber = (value: number) => {
    const numeric = toNumber(value);

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
      maximumFractionDigits: 2,
    }).format(numeric);
  };

  const getCurrencyDisplay = (currency?: string | null) => {
    const code = normalizeCurrencyCode(currency);

    const currencyLabels: Record<string, string> = {
      SAR: 'ريال',
      USD: 'دولار',
      EUR: 'يورو',
      AED: 'درهم',
      KWD: 'دينار كويتي',
      BHD: 'دينار بحريني',
      QAR: 'ريال قطري',
      OMR: 'ريال عماني',
      SYP: 'ليرة سورية',
    };

    return currencyLabels[code] || code;
  };

  const formatFixedFee = (amount: number, currency?: string | null) => {
    return `${formatCompactNumber(amount)} ${getCurrencyDisplay(currency)}`;
  };

  const getPaymentMethodLabel = (methodKey?: string | null) => {
    const key = String(methodKey || 'unknown').trim().toLowerCase();

    const methodLabels: Record<string, string> = {
      mada_local: 'مدى',
      mada: 'مدى',
      visa_mastercard: 'فيزا وماستركارد',
      visa_mastercard_local: 'فيزا وماستركارد المحلية',
      local_visa_mastercard: 'فيزا وماستركارد المحلية',
      card_local: 'البطاقة المحلية',
      local_card: 'البطاقة المحلية',
      card_international: 'البطاقات الدولية',
      international_card: 'البطاقات الدولية',
      international_cards: 'البطاقات الدولية',
      credit_card: 'البطاقة الائتمانية',
      debit_card: 'البطاقة البنكية',
      card: 'البطاقة',
      cards: 'البطاقات',
      apple_pay: 'آبل باي',
      applepay: 'آبل باي',
      stc_pay: 'STC Pay',
      stcpay: 'STC Pay',
      tabby: 'تابي',
      tamara: 'تمارا',
      paymob: 'بوابة الدفع',
      default: 'بوابة الدفع',
      unknown: 'بوابة الدفع',
    };

    if (methodLabels[key]) {
      return methodLabels[key];
    }

    return (
      key
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'بوابة الدفع'
    );
  };

  const formatPaymentFeeFormula = (setting: PaymentFeeSetting) => {
    const feeRate = toNumber(setting.fee_rate);
    const fixedFee = toNumber(setting.fixed_fee);
    const parts: string[] = [];

    if (feeRate > 0) {
      parts.push(`${formatCompactNumber(feeRate)}%`);
    }

    if (fixedFee > 0) {
      parts.push(formatFixedFee(fixedFee, setting.currency));
    }

    return parts.length > 0 ? parts.join(' + ') : 'حسب إعدادات بوابة الدفع';
  };

  const paymentFeeRows = useMemo(() => {
    const activePaymobRows = paymentFeeSettings
      .filter((setting) => normalizeProvider(setting.provider) === 'paymob')
      .filter((setting) => setting.is_active !== false)
      .sort((a, b) => {
        const currencyCompare = normalizeCurrencyCode(a.currency).localeCompare(
          normalizeCurrencyCode(b.currency)
        );

        if (currencyCompare !== 0) {
          return currencyCompare;
        }

        return String(a.method_key || '').localeCompare(String(b.method_key || ''));
      });

    const sarRows = activePaymobRows.filter((setting) => normalizeCurrencyCode(setting.currency) === 'SAR');

    if (sarRows.length > 0) {
      return sarRows;
    }

    if (activePaymobRows.length > 0) {
      return activePaymobRows;
    }

    return OFFICIAL_PAYMOB_KSA_FEES;
  }, [paymentFeeSettings]);

  const paymentFeeFeatureLines = useMemo(() => {
    const feeLines = paymentFeeRows.map((setting) => {
      const methodLabel = getPaymentMethodLabel(setting.method_key);
      const formula = formatPaymentFeeFormula(setting);

      return `رسوم بوابة الدفع ${formula} عبر ${methodLabel}`;
    });

    return [
      ...feeLines,
      'رسوم بوابة الدفع تخصم من أرباح التاجر',
      'تسوية مدفوعات البطاقة المعالجة عبر رقمي خلال 72 ساعة',
    ];
  }, [paymentFeeRows]);

  const normalizeFeatureText = (text: string) =>
    text.replace(/\s+/g, ' ').replace(/٪/g, '%').trim();

  const getRawPlanFeatures = (plan: PlanWithExtras) => {
    if (Array.isArray(plan.features)) {
      return plan.features;
    }

    if (typeof plan.features === 'string') {
      try {
        const parsed = JSON.parse(plan.features);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item));
        }
      } catch (_error) {
        return plan.features
          .split(/\n|،|,/)
          .map((feature) => feature.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  const buildPlanFeatures = (plan: PlanWithExtras) => {
    const featureSet = new Set<string>();

    const addFeature = (value?: string | null) => {
      if (!value) return;

      const normalized = normalizeFeatureText(value);

      if (!normalized) {
        return;
      }

      const blockedTexts = [
        'تُفعّل لمدة شهر',
        'تفعل لمدة شهر',
        'تفعيل لمدة شهر',
        'تُفعّل لمدة شهرين',
        'تفعل لمدة شهرين',
        'تفعيل لمدة شهرين',
        'رسوم بوابة الدفع تُطبق حسب إعدادات مزود الدفع',
        'رسوم بوابة الدفع تطبق حسب إعدادات مزود الدفع',
        'رسوم بوابة الدفع تُطبق حسب طريقة الدفع والعملة',
        'رسوم بوابة الدفع تطبق حسب طريقة الدفع والعملة',
      ];

      const shouldSkip = blockedTexts.some((blockedText) => normalized.includes(blockedText));

      if (shouldSkip) {
        return;
      }

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

    getRawPlanFeatures(plan).forEach((feature) => addFeature(feature));

    paymentFeeFeatureLines.forEach((feature) => addFeature(feature));

    return Array.from(featureSet);
  };

  const clearPendingSubscriptionState = () => {
    try {
      localStorage.removeItem('pending_subscription_payment_id');
      localStorage.removeItem('pending_subscription_plan_id');
      localStorage.removeItem('pending_subscription_return_expected');
      localStorage.removeItem('pending_subscription_started_at');
    } catch (error) {
      console.error('Error clearing pending subscription state:', error);
    }
  };

  const persistPendingSubscriptionState = (subscriptionPaymentId: string, planId: string) => {
    try {
      localStorage.setItem('pending_subscription_payment_id', subscriptionPaymentId);
      localStorage.setItem('pending_subscription_plan_id', planId);
      localStorage.setItem('pending_subscription_return_expected', 'true');
      localStorage.setItem('pending_subscription_started_at', new Date().toISOString());
    } catch (error) {
      console.error('Error persisting pending subscription state:', error);
    }
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

    if (numericPrice <= 0) {
      alert('أنت على الباقة الأساسية المجانية أو لا يمكن الرجوع لها يدويًا أثناء وجود اشتراك نشط.');
      return;
    }

    if (isLowerOrSameActivePaidPlan(plan)) {
      alert(
        `لديك حالياً باقة نشطة: ${currentPlan?.name || 'مدفوعة'}. لا يمكنك الاشتراك في باقة أقل أو مساوية قبل انتهاء باقتك الحالية.`
      );
      return;
    }

    try {
      setSubmittingPlanId(plan.id);
      clearPendingSubscriptionState();

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
            current_plan_id: currentPlan?.id || null,
            current_plan_name: currentPlan?.name || null,
          },
        })
        .select('id')
        .single();

      if (insertError || !insertedPayment) {
        console.error('Error creating subscription payment:', insertError);
        alert('تعذر إنشاء طلب الاشتراك، حاول مرة أخرى.');
        return;
      }

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
        clearPendingSubscriptionState();
        alert('تعذر بدء عملية الدفع، حاول مرة أخرى.');
        return;
      }

      if (!functionData?.success || !functionData?.iframe_url) {
        console.error('Invalid function response:', functionData);
        clearPendingSubscriptionState();
        alert('لم يتم إنشاء رابط الدفع بشكل صحيح.');
        return;
      }

      persistPendingSubscriptionState(insertedPayment.id, plan.id);

      window.location.href = functionData.iframe_url;
    } catch (error) {
      console.error('Error selecting paid plan:', error);
      clearPendingSubscriptionState();
      alert('حدث خطأ غير متوقع أثناء بدء الاشتراك.');
    } finally {
      setSubmittingPlanId(null);
    }
  };

  const getPlanButtonLabel = (plan: PlanWithExtras, isSubmitting: boolean) => {
    const numericPrice = getPlanPrice(plan);

    if (isCurrentPlan(plan)) {
      return 'الباقة الحالية';
    }

    if (isSubmitting) {
      return 'جاري تحويلك للدفع...';
    }

    if (isLowerOrSameActivePaidPlan(plan)) {
      return 'غير متاحة أثناء باقتك الحالية';
    }

    if (numericPrice <= 0) {
      return 'الباقة المجانية';
    }

    const currentPrice = getPlanPrice(currentPlan);
    const selectedPrice = getPlanPrice(plan);

    if (isSubscriptionActive && currentPlan && selectedPrice > currentPrice) {
      return 'الترقية لهذه الباقة';
    }

    return 'اختيار هذه الباقة';
  };

  const getPlanButtonDisabled = (plan: PlanWithExtras, isSubmitting: boolean) => {
    return isCurrentPlan(plan) || isSubmitting || isLowerOrSameActivePaidPlan(plan);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الباقات...</p>
        </div>
      </div>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => {
    const sortA = getPlanSortOrder(a);
    const sortB = getPlanSortOrder(b);

    if (sortA !== sortB) {
      return sortA - sortB;
    }

    return getPlanPrice(a) - getPlanPrice(b);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            اختر الباقة المناسبة لك
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            ابدأ مجاناً، وإذا احتجت عمولات أقل يمكنك الترقية في أي وقت
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {sortedPlans.map((plan) => {
            const isPopular = !!plan.is_popular;
            const isSubmitting = submittingPlanId === plan.id;
            const features = buildPlanFeatures(plan);
            const numericPrice = Number(plan.price || 0);
            const buttonDisabled = getPlanButtonDisabled(plan, isSubmitting);
            const lowerOrSameBlocked = isLowerOrSameActivePaidPlan(plan);

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg transition-all hover:shadow-xl ${
                  isPopular ? 'ring-2 ring-blue-600 md:-mt-4' : ''
                } ${lowerOrSameBlocked ? 'opacity-80' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 right-1/2 translate-x-1/2 bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-semibold shadow-sm whitespace-nowrap">
                    الأكثر شعبية
                  </div>
                )}

                <div className="p-8">
                  <div className="text-center mb-7">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{plan.name}</h3>

                    {plan.description && (
                      <p className="text-gray-600 leading-7 min-h-[56px]">{plan.description}</p>
                    )}

                    <div className="mt-6 mb-2">
                      <span className="text-4xl font-extrabold text-gray-900">
                        {formatPlanPrice(plan.price)}
                      </span>

                      {numericPrice > 0 && <span className="text-gray-600 mr-2">/ شهرياً</span>}
                    </div>

                    <p className="text-sm text-gray-500">{getPlanIntervalText(plan)}</p>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={buttonDisabled}
                    className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 ${
                      buttonDisabled
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {getPlanButtonLabel(plan, isSubmitting)}
                  </button>

                  <ul className="space-y-3.5">
                    {features.map((feature, idx) => (
                      <li
                        key={`${plan.id}-feature-${idx}`}
                        className="flex items-start gap-2.5 text-right"
                      >
                        <Check className="w-4.5 h-4.5 text-green-600 flex-shrink-0 mt-1" />
                        <span className="text-gray-700 text-sm leading-7 min-w-0 break-words">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
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
