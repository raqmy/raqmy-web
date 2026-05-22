import React from 'react';
import { ArrowLeft, BadgeCheck, BookOpen, Building2, FileText, Globe2, GraduationCap, Layers3, Lightbulb, Link as LinkIcon, PackageCheck, ShieldCheck, Sparkles, Store, Users } from 'lucide-react';

interface AboutPageProps {
  onNavigate?: (page: string) => void;
}

const audiences = [
  ['الطلاب والطالبات', 'بيع الملخصات، المذكرات، ملفات المراجعة، الخرائط الذهنية، الجداول التعليمية، والملفات الدراسية الرقمية.', GraduationCap],
  ['المصممون', 'بيع قوالب Canva، التصاميم الجاهزة، قوالب السوشيال ميديا، العروض، السير الذاتية، والهويات المصغرة.', Layers3],
  ['صناع المحتوى', 'تحويل الخبرة والجمهور إلى منتجات رقمية مثل أدلة، قوالب، ملفات عمل، وخطط قابلة للتحميل.', Users],
  ['أصحاب الخبرات', 'تحويل المعرفة العملية إلى ملفات PDF، كتيبات، جداول، نماذج، قوائم تحقق، ومنتجات رقمية مفيدة.', Lightbulb],
] as const;

const productTypes = [
  'ملفات PDF', 'كتب إلكترونية', 'ملخصات دراسية', 'قوالب Canva', 'تصاميم جاهزة', 'ملفات قابلة للطباعة',
  'جداول تنظيم', 'نماذج أعمال', 'أدلة تدريبية', 'خطط محتوى', 'ملفات تعليمية', 'قوالب عروض',
  'سير ذاتية', 'قوائم تحقق', 'خرائط ذهنية', 'قوالب سوشيال ميديا', 'ملفات Excel أو Google Sheets',
  'نماذج إدارة مشاريع', 'ملفات تدريب', 'كتيبات إرشادية'
];

const values = [
  ['سهولة البداية', 'نؤمن أن البائع لا يحتاج إلى تعقيد تقني كبير حتى يبيع أول منتج رقمي. لذلك صُممت رقمي لتكون واضحة ومباشرة من البداية.'],
  ['دعم السوق العربي', 'رقمي موجّه للعرب أولًا، باللغة العربية، وبأسلوب يناسب التجار والمشترين في السعودية والعالم العربي.'],
  ['تحويل المعرفة إلى دخل', 'الكثير من الناس لديهم ملفات ومعرفة وخبرات جاهزة، لكن لا يعرفون كيف يحولونها إلى منتج رقمي قابل للبيع.'],
  ['تجربة مناسبة للبائع والمشتري', 'هدفنا أن تكون تجربة البائع سهلة في رفع المنتج ومشاركة الرابط، وتجربة المشتري واضحة في التصفح والشراء.'],
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <section className="bg-gradient-to-l from-blue-700 via-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              من نحن
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-relaxed mb-6">
              رقمي منصة عربية تساعدك على بيع وشراء المنتجات الرقمية بسهولة
            </h1>
            <p className="text-lg md:text-xl leading-9 text-blue-50 mb-8">
              رقمي هي منصة عربية للمنتجات الرقمية تهدف إلى تمكين الطلاب، المصممين، صناع المحتوى،
              أصحاب الخبرات، والتجار من تحويل ملفاتهم ومعرفتهم إلى منتجات رقمية قابلة للبيع عبر متجر
              رقمي ورابط بيع مباشر. في رقمي يمكن عرض منتجات مثل ملفات PDF، قوالب Canva، الملخصات،
              التصاميم، الملفات الجاهزة، الكتب الإلكترونية، والقوالب القابلة للتحميل.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-blue-700 hover:bg-blue-50 transition-colors">
                ابدأ البيع الآن
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onNavigate?.('marketplace')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold text-white hover:bg-white/10 transition-colors">
                تصفح السوق العام
                <Store className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-8">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">فكرة رقمي ببساطة</h2>
              <div className="space-y-4 text-gray-700 leading-8">
                <p>
                  كثير من الناس لديهم ملفات مفيدة أو معرفة قابلة للبيع، لكنهم لا يملكون مكانًا واضحًا
                  يعرضون فيه منتجاتهم الرقمية. البعض يبيع يدويًا عبر الرسائل، والبعض يستخدم روابط متفرقة،
                  والبعض يؤجل الفكرة لأنه يظن أن إنشاء متجر رقمي يحتاج خبرة تقنية أو تكلفة عالية.
                </p>
                <p>
                  رقمي جاءت لتبسيط هذا المسار. الفكرة أن يحصل البائع على مكان عربي واضح يرفع فيه منتجه،
                  يكتب وصفه، يحدد السعر، ثم يشارك رابط البيع مع جمهوره. وفي نفس الوقت يستطيع المشتري
                  تصفح السوق العام والوصول إلى منتجات رقمية متنوعة في مكان واحد.
                </p>
                <p>
                  نحن لا ننظر إلى المنتجات الرقمية كملفات فقط، بل كفرصة لتحويل المعرفة والخبرة والوقت
                  إلى دخل رقمي قابل للنمو. منتج بسيط مثل ملخص، قالب، جدول، دليل، أو تصميم جاهز قد يكون
                  مفيدًا لشخص آخر ومستعدًا لشرائه.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-gray-50 border border-gray-100 p-6">
              <h3 className="text-xl font-extrabold text-gray-900 mb-5">ما الذي توفره رقمي؟</h3>
              <div className="space-y-4">
                {[
                  ['متجر رقمي للبائع', 'مساحة يعرض فيها البائع منتجاته الرقمية وروابطه بطريقة منظمة.', Store],
                  ['سوق عام للمنتجات الرقمية', 'مكان يساعد المشترين على اكتشاف منتجات رقمية من بائعين مختلفين.', Globe2],
                  ['رابط بيع مباشر', 'يمكن مشاركة الرابط في واتساب، إنستغرام، تيك توك، X، تيليجرام أو أي قناة تسويق.', LinkIcon],
                  ['منتجات ومتاجر غير محدودة', 'ارفع عددًا كبيرًا من المنتجات الرقمية وأنشئ متاجر متعددة حسب احتياجك وتخصصاتك.', PackageCheck],
                ].map(([title, desc, Icon]) => (
                  <div key={String(title)} className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      {React.createElement(Icon as any, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{title}</h4>
                      <p className="text-sm text-gray-600 leading-6">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">لمن صُممت رقمي؟</h2>
          <p className="text-gray-600 leading-8 mb-8 max-w-4xl">
            رقمي مناسبة لكل شخص أو جهة تريد بيع منتج رقمي بطريقة بسيطة ومنظمة. سواء كنت تريد بيع ملف
            PDF، ملخص، قالب Canva، تصميم جاهز، كتاب إلكتروني، أو ملف قابل للتحميل، تستطيع استخدام رقمي
            كبداية عملية لبناء حضورك في سوق المنتجات الرقمية.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {audiences.map(([title, desc, Icon]) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4">
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
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">المنتجات الرقمية التي يمكن بيعها</h2>
              <p className="text-gray-600 leading-8">
                يمكن للمنتجات الرقمية أن تكون بسيطة جدًا أو متقدمة. المهم أن تكون مفيدة، واضحة، قابلة
                للتحميل، وتقدم قيمة حقيقية للمشتري.
              </p>
            </div>
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-3">
                {productTypes.map((item) => (
                  <span key={item} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">قيم رقمي</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {values.map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-gray-900">{title}</h3>
                </div>
                <p className="text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900 rounded-3xl p-6 md:p-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">رقمي مشروع جديد بطموح كبير</h2>
              <p className="text-gray-300 leading-8">
                نحن نعمل على تطوير رقمي باستمرار لتكون منصة أقوى وأسهل وأكثر فائدة للبائعين والمشترين.
                الهدف أن تصبح رقمي وجهة عربية موثوقة للمنتجات الرقمية، وأن تساعد أصحاب الملفات والخبرات
                على بناء دخل رقمي من منتجاتهم.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['منصة عربية', 'محتوى وتجربة تناسب المستخدم العربي.', Building2],
                ['نمو تدريجي', 'نعمل على تحسين المنصة وإضافة مزايا جديدة مع الوقت.', ShieldCheck],
                ['تعليم وتمكين', 'مساعدة البائع على فهم البيع الرقمي والبدء بطريقة عملية.', BookOpen],
                ['منتجات متنوعة', 'PDF، Canva، ملخصات، تصاميم، ملفات تعليمية وأكثر.', FileText],
              ].map(([title, desc, Icon]) => (
                <div key={String(title)} className="rounded-2xl bg-white/10 p-5">
                  {React.createElement(Icon as any, { className: 'w-7 h-7 text-blue-300 mb-3' })}
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm text-gray-300 leading-6">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
