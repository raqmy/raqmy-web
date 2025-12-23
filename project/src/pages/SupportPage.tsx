import React from 'react';
import { Mail, MessageCircle, Phone, HelpCircle } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const faqs = [
    {
      question: 'كيف أبدأ البيع على منصة رقمي؟',
      answer: 'قم بإنشاء حساب تاجر، ثم أنشئ متجرك الأول، وابدأ بإضافة منتجاتك الرقمية. كل ذلك يتم في دقائق معدودة!',
    },
    {
      question: 'ما هي طرق الدفع المتاحة؟',
      answer: 'نوفر الدفع عبر HyperPay الذي يدعم جميع بطاقات الائتمان والخصم السعودية (مدى، فيزا، ماستركارد).',
    },
    {
      question: 'كيف أسحب أرباحي؟',
      answer: 'يمكنك طلب سحب أرباحك من لوحة التحكم. نقوم بتحويل الأموال إلى حسابك البنكي خلال 3-5 أيام عمل.',
    },
    {
      question: 'هل يمكنني ترقية باقتي؟',
      answer: 'نعم، يمكنك ترقية باقتك في أي وقت من إعدادات الحساب. سيتم احتساب الفرق فقط.',
    },
    {
      question: 'ما هي العمولة على المبيعات؟',
      answer: 'تختلف العمولة حسب الباقة. الباقة المجانية 5%، الباقة الاحترافية 2%، والباقة المتقدمة بدون عمولات.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">كيف يمكننا مساعدتك؟</h1>
          <p className="text-xl text-gray-600">نحن هنا للإجابة على جميع استفساراتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">البريد الإلكتروني</h3>
            <p className="text-gray-600 mb-4">راسلنا وسنرد خلال 24 ساعة</p>
            <a
              href="mailto:raqmy.app@gmail.com"
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              raqmy.app@gmail.com
            </a>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">الدردشة المباشرة</h3>
            <p className="text-gray-600 mb-4">تحدث مع فريق الدعم مباشرة</p>
            <button className="text-green-600 font-semibold hover:text-green-700">
              ابدأ المحادثة
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">مركز المساعدة</h3>
            <p className="text-gray-600 mb-4">اطلع على الأسئلة الشائعة والأدلة</p>
            <button className="text-purple-600 font-semibold hover:text-purple-700">
              زيارة المركز
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">الأسئلة الشائعة</h2>
            <p className="text-gray-600">إجابات سريعة لأكثر الأسئلة شيوعاً</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-6 pr-20">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
