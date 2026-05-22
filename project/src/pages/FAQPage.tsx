import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle, Search, Sparkles } from 'lucide-react';

interface FAQPageProps {
  onNavigate?: (page: string) => void;
}

type FAQCategory = 'all' | 'seller' | 'buyer' | 'products' | 'payments' | 'trust';

const categories: { id: FAQCategory; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'seller', label: 'للبائعين' },
  { id: 'buyer', label: 'للمشترين' },
  { id: 'products', label: 'المنتجات الرقمية' },
  { id: 'payments', label: 'الدفع والأرباح' },
  { id: 'trust', label: 'الثقة والسياسات' },
];

const faqs: { category: FAQCategory; question: string; answer: string }[] = [
  { category: 'seller', question: 'ما هي منصة رقمي؟', answer: 'رقمي منصة عربية لبيع وشراء المنتجات الرقمية. تساعد البائع على إنشاء متجر رقمي، رفع منتجاته مثل ملفات PDF وقوالب Canva والملخصات والتصاميم، ثم مشاركة رابط البيع مع العملاء. كما تساعد المشتري على تصفح منتجات رقمية جاهزة في السوق العام.' },
  { category: 'seller', question: 'هل أقدر أبدأ البيع في رقمي مجانًا؟', answer: 'نعم، يمكن البدء في رقمي مجانًا. الهدف من البداية المجانية هو تسهيل دخول البائعين الجدد إلى سوق المنتجات الرقمية بدون تكلفة تأسيس عالية. ومع نمو البائع يمكنه الاستفادة من الباقات أو المزايا الإضافية المتاحة لاحقًا حسب احتياجه.' },
  { category: 'seller', question: 'هل رقمي مناسب لمن يبحث عن موقع رخيص لبيع المنتجات الرقمية؟', answer: 'نعم، رقمي مناسبة لمن يبحث عن موقع عربي سهل ومنخفض التكلفة أو مجاني للبداية في بيع المنتجات الرقمية. الفكرة أن تبدأ بسرعة، ترفع منتجك، تنشر الرابط، ثم تطور منتجاتك ومتجرك مع الوقت.' },
  { category: 'seller', question: 'هل أحتاج خبرة تقنية لإنشاء متجر في رقمي؟', answer: 'لا تحتاج خبرة تقنية متقدمة. رقمي مصممة لتسهيل البداية، بحيث يستطيع البائع إنشاء حساب، تجهيز متجره، رفع المنتج الرقمي، إضافة الوصف والسعر والصورة، ثم مشاركة رابط البيع.' },
  { category: 'seller', question: 'هل أستطيع إنشاء أكثر من متجر؟', answer: 'نعم، رقمي تدعم فكرة المتاجر المتعددة حسب احتياجك. هذا يفيد البائع الذي لديه أكثر من تخصص، مثل متجر للملخصات ومتجر للتصاميم ومتجر لقوالب Canva.' },
  { category: 'seller', question: 'هل أستطيع رفع عدد غير محدود من المنتجات؟', answer: 'نعم، يمكنك رفع منتجات رقمية متعددة داخل رقمي. هذا مناسب لمن يريد بناء مكتبة منتجات رقمية تشمل ملفات PDF، قوالب، ملخصات، تصاميم، كتب إلكترونية، ملفات تنظيم، أو منتجات تعليمية.' },
  { category: 'products', question: 'ما المقصود بالمنتجات الرقمية؟', answer: 'المنتجات الرقمية هي منتجات يتم تسليمها إلكترونيًا بدون شحن مادي. مثل ملفات PDF، الكتب الإلكترونية، قوالب Canva، التصاميم، الملخصات، الجداول، الأدلة، ملفات الطباعة، قوالب العروض، السير الذاتية، ونماذج العمل الجاهزة.' },
  { category: 'products', question: 'هل أقدر أبيع ملفات PDF في رقمي؟', answer: 'نعم، ملفات PDF من أكثر أنواع المنتجات الرقمية المناسبة للبيع في رقمي. يمكنك بيع كتاب إلكتروني، دليل، ملخص، كتيب، ملف تدريبي، جدول، خطة، أو أي ملف PDF يقدم فائدة واضحة للمشتري.' },
  { category: 'products', question: 'هل أقدر أبيع قوالب Canva؟', answer: 'نعم، تستطيع بيع قوالب Canva مثل قوالب منشورات السوشيال ميديا، العروض التقديمية، السير الذاتية، جداول المحتوى، الهويات البصرية المصغرة، وقوالب التصميم القابلة للتعديل.' },
  { category: 'products', question: 'هل أقدر أبيع ملخصات دراسية؟', answer: 'نعم، يمكن بيع الملخصات الدراسية والملفات التعليمية إذا كانت من إعدادك أو لديك الحق في بيعها، وكانت لا تخالف الحقوق أو الأنظمة. الملخصات، الخرائط الذهنية، الجداول، ومذكرات المراجعة من المنتجات الرقمية المطلوبة.' },
  { category: 'products', question: 'هل أقدر أبيع تصاميم جاهزة؟', answer: 'نعم، يمكن بيع التصاميم الجاهزة مثل تصاميم السوشيال ميديا، ملفات قابلة للطباعة، قوالب إعلانات، عناصر تصميم، أو ملفات قابلة للتعديل إذا كنت تملك حقوق بيعها.' },
  { category: 'products', question: 'ما أفضل منتج رقمي أبدأ به؟', answer: 'أفضل منتج تبدأ به هو المنتج الذي يحل مشكلة واضحة لجمهور محدد. مثال: ملخص لمادة مطلوبة، قالب Canva يوفر وقت المصمم، ملف PDF يشرح خطوة عملية، جدول تنظيم، أو قالب جاهز يحتاجه أصحاب المشاريع.' },
  { category: 'seller', question: 'كيف أبدأ بيع أول منتج رقمي؟', answer: 'ابدأ بفكرة بسيطة، جهز الملف، اكتب وصفًا واضحًا يشرح الفائدة، ضع سعرًا مناسبًا، أضف صورة جذابة، ثم ارفع المنتج في رقمي وشارك رابط البيع مع جمهورك في واتساب، إنستغرام، تيك توك، X أو تيليجرام.' },
  { category: 'seller', question: 'هل أحتاج جمهور كبير حتى أبيع؟', answer: 'لا يشترط وجود جمهور كبير، لكنه يساعد. يمكنك البدء بجمهور صغير أو مجموعات مهتمة أو محتوى بسيط يشرح فائدة منتجك. المهم أن يكون المنتج واضح القيمة وموجهًا لشخص يحتاجه فعلًا.' },
  { category: 'seller', question: 'هل رقمي تساعدني على التسويق؟', answer: 'رقمي تعطيك أساسًا مهمًا للتسويق: صفحة منتج، متجر، سوق عام، ورابط مباشر. لكن نجاح البيع يعتمد أيضًا على جودة المنتج، وضوح الوصف، التسعير، الصور، ونشاطك في التسويق عبر حساباتك وقنواتك.' },
  { category: 'seller', question: 'هل وجود المنتج في السوق العام يعني مبيعات تلقائية؟', answer: 'لا يمكن ضمان المبيعات تلقائيًا. السوق العام يساعد على الاكتشاف، لكن المبيعات تعتمد على جودة المنتج، الطلب عليه، السعر، الصورة، الوصف، الثقة، وتسويق البائع. رقمي توفر البنية، والبائع يحتاج أن يسوق بذكاء.' },
  { category: 'buyer', question: 'كيف أشتري منتجًا رقميًا من رقمي؟', answer: 'يمكنك تصفح السوق العام أو فتح رابط منتج أرسله لك البائع، قراءة الوصف والسعر، ثم إتمام عملية الشراء حسب الخطوات المتاحة داخل المنصة.' },
  { category: 'buyer', question: 'متى أحصل على المنتج الرقمي بعد الشراء؟', answer: 'المنتجات الرقمية غالبًا تكون قابلة للوصول أو التحميل بعد إتمام عملية الشراء بنجاح، حسب طريقة عرض المنتج داخل المنصة.' },
  { category: 'buyer', question: 'هل المنتجات الرقمية تحتاج شحن؟', answer: 'لا، المنتجات الرقمية لا تحتاج شحنًا ماديًا. هي ملفات أو روابط أو محتوى إلكتروني يتم الوصول إليه عبر المنصة أو من خلال طريقة التسليم المحددة.' },
  { category: 'buyer', question: 'هل أقدر أطلب دعم إذا واجهت مشكلة؟', answer: 'نعم، إذا واجهت مشكلة في الشراء أو الوصول للمنتج يمكنك التواصل مع دعم رقمي عبر وسائل التواصل أو البريد المخصص للدعم حسب المعلومات الموجودة في الموقع.' },
  { category: 'payments', question: 'كيف تصل أرباح البائع؟', answer: 'تُسجل أرباح البائع داخل المنصة وفق نظام المحفظة والطلبات. وبعد تحقق الشروط المطلوبة مثل التحقق من الهوية والحساب البنكي، يمكن للبائع طلب السحب حسب سياسات المنصة.' },
  { category: 'payments', question: 'هل أحتاج سجل تجاري للبدء في رقمي؟', answer: 'لا يُطلب سجل تجاري للبدء في استخدام رقمي كبائع. لكن قد يتم طلب توثيق الهوية والحساب البنكي قبل سحب الأرباح، وعلى البائع الالتزام بالأنظمة والحقوق المتعلقة بالمنتجات التي يبيعها.' },
  { category: 'payments', question: 'هل أحتاج توثيق الهوية؟', answer: 'قد لا تحتاج توثيق الهوية لبدء رفع المنتجات، لكن توثيق الهوية والحساب البنكي مطلوب قبل سحب الأرباح، وذلك لتنظيم عمليات السحب وحماية المنصة والمستخدمين.' },
  { category: 'payments', question: 'هل رقمي تأخذ عمولة؟', answer: 'قد تعتمد العمولة أو الرسوم على الباقة أو نوع البيع داخل المنصة. الهدف أن تكون البداية سهلة وواضحة، مع وجود خيارات مناسبة للبائعين حسب مستوى استخدامهم ونموهم.' },
  { category: 'trust', question: 'هل أستطيع بيع أي ملف أجده في الإنترنت؟', answer: 'لا. يجب أن تبيع منتجات تملك حقوقها أو لديك إذن ببيعها. بيع ملفات منسوخة أو مخالفة للحقوق قد يسبب حذف المنتج أو اتخاذ إجراءات على الحساب.' },
  { category: 'trust', question: 'ما المنتجات غير المناسبة للبيع؟', answer: 'أي منتج يخالف الأنظمة أو حقوق الملكية أو يحتوي على محتوى مضلل أو ضار أو غير قانوني غير مناسب للبيع. يجب أن تكون المنتجات واضحة، مفيدة، ومملوكة للبائع أو مرخصة له.' },
  { category: 'trust', question: 'كيف أبني ثقة المشتري في منتجي؟', answer: 'اكتب عنوانًا واضحًا، وصفًا صادقًا، صورة مناسبة، اشرح محتويات المنتج، لمن يناسب، ماذا سيحصل المشتري، وما الفائدة المتوقعة. الوضوح يقلل التردد ويرفع فرصة الشراء.' },
  { category: 'trust', question: 'هل رقمي مناسبة للسعودية والعالم العربي؟', answer: 'نعم، رقمي منصة عربية تستهدف السوق السعودي والعربي، وتناسب من يبيع منتجات رقمية باللغة العربية أو لجمهور عربي يبحث عن ملفات وقوالب ومنتجات رقمية مفيدة.' },
  { category: 'seller', question: 'هل أقدر أستخدم رقمي بدل إنشاء متجر خاص؟', answer: 'نعم، إذا كنت في البداية ولا تريد بناء متجر خاص من الصفر، يمكن أن تكون رقمي طريقة أسهل للانطلاق. ومع الوقت تستطيع تطوير حضورك ومنتجاتك وقنواتك التسويقية.' },
  { category: 'seller', question: 'ما الذي يجعل صفحة المنتج تبيع أكثر؟', answer: 'العنوان الواضح، الصورة الجيدة، وصف الفائدة، توضيح محتويات المنتج، تحديد الجمهور المستهدف، سعر مناسب، وتجربة شراء سهلة. المنتج الجيد يحتاج عرضًا جيدًا حتى يفهمه العميل بسرعة.' },
  { category: 'products', question: 'هل المنتجات الرقمية مربحة؟', answer: 'يمكن أن تكون مربحة إذا كان المنتج يحل مشكلة حقيقية ويوجد جمهور يحتاجه. الميزة في المنتج الرقمي أنه يمكن بيعه أكثر من مرة، لكن النجاح يحتاج جودة، تسويق، ثقة، وصبر.' },
  { category: 'seller', question: 'كيف أحدد سعر منتجي الرقمي؟', answer: 'ابدأ بسعر يناسب قيمة المنتج وحجم الفائدة والجمهور المستهدف. راقب تفاعل الناس، جرّب عروضًا مختلفة، وقارن بين سعر المنتج والوقت الذي يوفره أو المشكلة التي يحلها للمشتري.' },
];

export const FAQPage: React.FC<FAQPageProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(faqs[0]?.question ?? null);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const combinedText = `${faq.question} ${faq.answer}`.toLowerCase();
      const matchesSearch = query === '' || combinedText.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <section className="bg-gradient-to-l from-blue-700 via-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-22">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold mb-6">
              <HelpCircle className="w-4 h-4" />
              الأسئلة الشائعة
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-relaxed mb-6">
              أسئلة شائعة عن رقمي وبيع المنتجات الرقمية
            </h1>
            <p className="text-lg md:text-xl leading-9 text-blue-50 mb-8">
              هنا تجد إجابات واضحة عن بيع المنتجات الرقمية، إنشاء متجر رقمي، بيع ملفات PDF، قوالب Canva،
              الملخصات، التصاميم، الدفع، الأرباح، التوثيق، وتجربة الشراء داخل رقمي.
            </p>
            <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50 transition-colors">
              ابدأ البيع الآن
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 relative">
              <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="ابحث عن سؤال مثل: بيع PDF، قوالب Canva، السحب، التوثيق..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-5 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h2 className="font-extrabold text-gray-900 mb-2">لا توجد نتائج مطابقة</h2>
                <p className="text-gray-500">جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر.</p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openQuestion === faq.question;

                return (
                  <div key={faq.question} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenQuestion(isOpen ? null : faq.question)}
                      className="w-full flex items-center justify-between gap-4 p-5 text-right hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-extrabold text-gray-900 leading-7">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-gray-600 leading-8 border-t border-gray-50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <aside className="lg:col-span-4">
            <div className="sticky top-6 space-y-5">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-extrabold text-gray-900 mb-3">لم تجد إجابتك؟</h2>
                <p className="text-gray-600 leading-7 mb-5">
                  إذا كان لديك سؤال عن البيع، الشراء، المنتجات الرقمية، التوثيق، أو استخدام رقمي، يمكنك
                  التواصل مع الدعم أو تجربة إنشاء حساب والبدء بخطوات بسيطة.
                </p>
                <button type="button" onClick={() => onNavigate?.('auth')} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
                  إنشاء حساب
                </button>
              </div>

              <div className="bg-gray-900 rounded-3xl p-6 text-white">
                <h2 className="text-xl font-extrabold mb-3">كلمات مهمة عن رقمي</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    'بيع المنتجات الرقمية',
                    'بيع PDF',
                    'قوالب Canva',
                    'ملخصات',
                    'تصاميم',
                    'متجر رقمي',
                    'منصة عربية',
                    'رابط بيع مباشر',
                    'منتجات غير محدودة',
                    'متاجر غير محدودة',
                  ].map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
