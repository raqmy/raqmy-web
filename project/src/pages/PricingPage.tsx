import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { supabase, Plan } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (!error && data) {
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      onNavigate('auth');
      return;
    }
    console.log('Selected plan:', plan.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
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
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                index === 1 ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {index === 1 && (
                <div className="bg-blue-600 text-white text-center py-2 text-sm font-semibold">
                  الأكثر شعبية
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 mr-2">ريال / شهرياً</span>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {plan.max_products} منتج كحد أقصى
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {plan.max_subscription_products} منتج اشتراك
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {plan.max_stores} {plan.max_stores === 1 ? 'متجر' : 'متاجر'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      عمولة {plan.commission_rate}% على المنتجات
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      عمولة {plan.marketplace_commission_rate}% في السوق العام
                    </span>
                  </li>
                  {plan.features && plan.features.length > 0 && (
                    <>
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={profile?.plan_id === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    profile?.plan_id === plan.id
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : index === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {profile?.plan_id === plan.id ? 'الباقة الحالية' : 'اختر هذه الباقة'}
                </button>
              </div>
            </div>
          ))}
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
