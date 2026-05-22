import React from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, CreditCard, FileArchive, FileText, Globe2, Layers3, Link as LinkIcon, Megaphone, PackagePlus, Search, ShieldCheck, ShoppingBag, Sparkles, Store, Users, Wallet } from 'lucide-react';

interface FeaturesPageProps {
  onNavigate?: (page: string) => void;
}

const sellerFeatures = [
  ['إنشاء متجر رقمي', 'أنشئ واجهة بسيطة لمنتجاتك الرقمية واعرض فيها ملفاتك وقوالبك وتصاميمك بشكل منظم يسهل مشاركته مع العملاء.', Store],
  ['رفع منتجات رقمية متنوعة', 'أضف ملفات PDF، كتب إلكترونية، قوالب Canva، ملخصات، تصاميم، ملفات جاهزة، جداول، أدلة، ونماذج قابلة للتحميل.', PackagePlus],
  ['منتجات ومتاجر غير محدودة', 'وسّع حضورك الرقمي بإضافة عدد كبير من المنتجات والمتاجر حسب تخصصاتك وجمهورك بدون حصر فكرتك في منتج واحد.', Layers3],
  ['رابط بيع مباشر', 'كل منتج ومتجر يمكن مشاركته عبر رابط مباشر في واتساب، تيك توك، إنستغرام، X، تيليجرام، البريد أو أي قناة تسويق.', LinkIcon],
  ['السوق العام', 'اعرض منتجاتك في السوق العام داخل رقمي ليتمكن الزوار من اكتشاف منتجات رقمية متنوعة من بائعين مختلفين.', Globe2],
  ['بداية مجانية', 'ابدأ في تجربة بيع المنتجات الرقمية بدون تكلفة تأسيس عالية، ثم طوّر حضورك ومنتجاتك مع نمو مشروعك.', Sparkles],
] as const;

const buyerFeatures = [
  ['تصفح منتجات رقمية جاهزة', 'يمكن للمشتري الوصول إلى منتجات رقمية مثل ملخصات، قوالب، ملفات PDF، تصاميم وملفات قابلة للتحميل.', Search],
  ['تجربة شراء واضحة', 'الهدف أن تكون عملية الوصول للمنتج الرقمي سهلة وواضحة من التصفح وحتى إتمام الطلب.', ShoppingBag],
  ['منتجات من بائعين مختلفين', 'السوق العام يساعد المشتري على اكتشاف منتجات رقمية متعددة بدل البحث في أماكن متفرقة.', Users],
] as const;

const platformBenefits = [
  'منصة عربية موجهة للمنتجات الرقمية',
  'مناسبة للمبتدئين في بيع الملفات الرقمية',
  'مناسبة للطلاب والمصممين وصناع المحتوى',
  'إمكانية بيع ملفات PDF والملخصات والكتب الإلكترونية',
  'إمكانية بيع قوالب Canva والتصاميم الجاهزة',
  'مناسبة لمن يبحث عن موقع سهل لبيع المنتجات الرقمية',
  'مناسبة لمن يريد رابط بيع مباشر لمنتجه الرقمي',
  'تجربة تساعد البائع على بناء متجر رقمي بسيط',
  'سوق عام يساعد على اكتشاف المنتجات',
  'قابلة للتطوير وإضافة مزايا جديدة مع الوقت',
];

const productIdeas = [
  'كتاب إلكتروني PDF', 'ملخص مادة دراسية', 'قالب Canva لمنشورات إنستغرام', 'قالب سيرة ذاتية',
  'جدول تنظيم أسبوعي', 'خطة محتوى شهرية', 'دليل تدريبي مختصر', 'ملف قابل للطباعة',
  'قالب عرض تقديمي', 'قائمة تحقق لمشروع', 'تصاميم جاهزة للسوشيال ميديا', 'ملف تعليمي للطلاب',
  'قوالب إدارة مهام', 'نماذج عمل جاهزة', 'ملفات تنظيم مالية شخصية', 'خرائط ذهنية',
];

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 mb-6">
              <Sparkles className="w-4 h-4" />
              مزايا رقمي
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-relaxed mb-6">
              مزايا تساعدك على بيع المنتجات الرقمية بطريقة أسهل
            </h1>
            <p className="text-lg text-gray-600 leading-9 mb-8">
              رقمي تجمع أهم ما يحتاجه البائع لبدء بيع المنتجات الرقمية: متجر رقمي، سوق عام، رابط بيع مباشر،
              دعم للملفات الرقمية، بداية مجانية، وتجربة عربية مصممة للطلاب والمصممين وصناع المحتوى وأصحاب
              الخبرات الذين يريدون تحويل ملفاتهم إلى دخل رقمي.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
                ابدأ البيع مجانًا
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onNavigate?.('marketplace')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-800 hover:bg-gray-50 transition-colors">
                شاهد السوق العام
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-8">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">مزايا للبائعين والتجار</h2>
            <p className="text-gray-600 leading-8 max-w-3xl">
              إذا كنت تبحث عن منصة عربية لبيع المنتجات الرقمية أو موقع سهل ورخيص أو مجاني للبداية،
              فهذه أهم المزايا التي تجعل رقمي مناسبة للبائعين في بداية الطريق.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sellerFeatures.map(([title, desc, Icon]) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4">
                  {React.createElement(Icon as any, { className: 'w-6 h-6' })}
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-l from-gray-900 to-blue-950 rounded-3xl p-6 md:p-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">مزايا مهمة لمن يريد بيع منتج رقمي لأول مرة</h2>
              <p className="text-gray-300 leading-8 mb-6">
                البداية في المنتجات الرقمية لا تحتاج دائمًا إلى متجر ضخم أو نظام معقد. في كثير من الحالات
                يحتاج البائع إلى صفحة منتج واضحة، رابط بيع مباشر، وصف جيد، صورة مناسبة، وطريقة منظمة لاستقبال
                الطلبات. رقمي تركّز على هذه الأساسيات لتسهيل الانطلاقة.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['ابدأ بملف واحد', 'يمكنك البدء بمنتج بسيط مثل PDF أو قالب أو ملخص ثم التوسع لاحقًا.', FileText],
                  ['سوّق برابط واحد', 'شارك الرابط مع جمهورك بدل إرسال الملفات والبيانات يدويًا.', Megaphone],
                  ['اختبر الطلب', 'اعرف ما الذي يطلبه جمهورك ثم طوّر منتجاتك بناءً على النتائج.', BarChart3],
                  ['حوّل الملفات إلى دخل', 'المنتج الرقمي يمكن بيعه أكثر من مرة بدون تسليم يدوي متكرر.', Wallet],
                ].map(([title, desc, Icon]) => (
                  <div key={String(title)} className="rounded-2xl bg-white/10 p-5">
                    {React.createElement(Icon as any, { className: 'w-7 h-7 text-blue-300 mb-3' })}
                    <h3 className="font-bold mb-2">{title}</h3>
                    <p className="text-sm text-gray-300 leading-6">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white text-gray-900 p-6">
              <h3 className="text-xl font-extrabold mb-4">أمثلة على منتجات يمكنك البدء بها</h3>
              <div className="flex flex-wrap gap-3">
                {productIdeas.map((idea) => (
                  <span key={idea} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                    {idea}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">مزايا للمشترين</h2>
          <p className="text-gray-600 leading-8 mb-8 max-w-4xl">
            رقمي ليست للبائع فقط. المشتري أيضًا يحتاج مكانًا واضحًا للبحث عن منتجات رقمية عربية، ملفات جاهزة،
            قوالب، ملخصات، وتصاميم يمكن تحميلها واستخدامها بسهولة.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {buyerFeatures.map(([title, desc, Icon]) => (
              <div key={title} className="rounded-2xl border border-gray-100 p-5">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  {React.createElement(Icon as any, { className: 'w-5 h-5' })}
                </div>
                <h3 className="font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">كلمات يبحث عنها التجار وتخدمها رقمي</h2>
              <p className="text-gray-600 leading-8">
                كثير من البائعين يبحثون عن حلول عملية بعبارات مختلفة. رقمي تستهدف هذه الاحتياجات لأنها
                منصة مصممة حول بيع المنتجات الرقمية بطريقة سهلة.
              </p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {platformBenefits.map((benefit) => (
                <div key={benefit} className="flex gap-2 rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-gray-700 leading-6">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">مزايا تشغيلية مهمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              ['تجربة دفع داخل المنصة', 'تهدف رقمي إلى تسهيل تجربة الشراء داخل المنصة بدل تحويل العميل بين خطوات كثيرة.', CreditCard],
              ['ملفات رقمية منظمة', 'مناسبة للمنتجات التي يتم تسليمها إلكترونيًا مثل PDF والقوالب والملفات الجاهزة.', FileArchive],
              ['تحقق قبل السحب', 'يمكن للبائع البدء، بينما يتم تنظيم التحقق من الهوية والحساب البنكي عند طلب سحب الأرباح.', ShieldCheck],
              ['قابلية التطوير', 'رقمي منصة جديدة قابلة للنمو وإضافة مزايا أكبر للتجار والمشترين مع توسع السوق.', BarChart3],
            ].map(([title, desc, Icon]) => (
              <div key={String(title)} className="rounded-2xl border border-gray-100 p-5">
                {React.createElement(Icon as any, { className: 'w-8 h-8 text-blue-600 mb-3' })}
                <h3 className="font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
