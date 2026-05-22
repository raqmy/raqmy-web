import React from 'react';
import { ArrowLeft, CheckCircle2, Clock, FileText, Globe2, Lightbulb, Link as LinkIcon, Rocket, ShieldCheck, Sparkles, Store, Target, Users, Zap } from 'lucide-react';

interface WhyRaqmyPageProps {
  onNavigate?: (page: string) => void;
}

const reasons = [
  ['لأنها عربية ومفهومة', 'كثير من أدوات البيع الرقمي عالمية ومعقدة أو لا تخاطب المستخدم العربي مباشرة. رقمي تسعى لتقديم تجربة عربية سهلة وواضحة للبائع والمشتري.', Globe2],
  ['لأن البداية مجانية', 'من أكبر عوائق البائع المبتدئ أنه لا يريد دفع تكلفة عالية قبل أن يتأكد أن منتجه مطلوب. في رقمي يمكن البدء مجانًا ثم التطور لاحقًا.', Sparkles],
  ['لأنها مناسبة للمنتجات الرقمية تحديدًا', 'رقمي تركز على بيع الملفات الرقمية والمنتجات القابلة للتحميل مثل PDF، قوالب Canva، الملخصات، التصاميم، والملفات الجاهزة.', FileText],
  ['لأنها تجمع المتجر والسوق العام', 'يمكن للبائع استخدام متجره الخاص ومشاركة روابطه، وفي نفس الوقت يمكن أن تظهر منتجاته في السوق العام حسب إعدادات الظهور المناسبة.', Store],
  ['لأن الرابط المباشر يسهّل التسويق', 'بدل الشرح الطويل للعميل، يستطيع البائع نشر رابط المنتج أو المتجر في حساباته ومجموعاته وقنواته التسويقية.', LinkIcon],
  ['لأنها منصة جديدة قابلة للتطور', 'رقمي مشروع في بداية نموه، وهذا يعني أن هناك مساحة كبيرة للتطوير وإضافة مزايا أفضل للتجار والمشترين مع الوقت.', Rocket],
] as const;

const comparisonRows = [
  ['البيع اليدوي عبر الرسائل', 'رقمي تساعدك على إنشاء صفحة منتج ورابط بيع واضح بدل الردود اليدوية المتكررة وإرسال الملفات بشكل عشوائي.'],
  ['الحاجة إلى متجر كامل من البداية', 'في رقمي تستطيع البدء بمنتج واحد أو مجموعة منتجات بدون بناء متجر تقني معقد من الصفر.'],
  ['صعوبة عرض المنتجات الرقمية', 'يمكنك عرض ملفات PDF، قوالب Canva، ملخصات، تصاميم وملفات جاهزة بطريقة مناسبة للمنتجات الرقمية.'],
  ['التشتت بين أدوات وروابط كثيرة', 'رقمي تجمع المتجر، المنتج، السوق، ورابط البيع في تجربة واحدة أوضح للبائع والمشتري.'],
];

const searchIntents = [
  'أبحث عن موقع لبيع المنتجات الرقمية',
  'أريد منصة عربية لبيع ملفات PDF',
  'أحتاج طريقة لبيع قوالب Canva',
  'أريد بيع ملخصات دراسية أونلاين',
  'أبحث عن متجر رقمي بسيط',
  'أريد رابط بيع مباشر لمنتجي',
  'أحتاج منصة مجانية أو منخفضة التكلفة للبداية',
  'أريد بيع تصاميم وملفات جاهزة',
  'أريد بدء مشروع منتجات رقمية',
  'أريد تحويل معرفتي إلى دخل رقمي',
];

const steps = [
  ['ابدأ بفكرة بسيطة', 'لا تحتاج إلى منتج ضخم. ابدأ بملف PDF، قالب، ملخص، جدول، دليل، أو تصميم جاهز يحل مشكلة واضحة.'],
  ['ارفع المنتج في رقمي', 'أضف اسم المنتج، وصفه، السعر، وصورة مناسبة تجعل العميل يفهم قيمة المنتج بسرعة.'],
  ['انشر الرابط', 'شارك رابط البيع في حساباتك ومجموعاتك وقنواتك، واجعل الجمهور يصل إلى المنتج مباشرة.'],
  ['طوّر بناءً على الطلب', 'بعد أول مبيعات أو تفاعل، حسّن المنتج، أضف منتجات مكملة، ووسّع متجرك تدريجيًا.'],
];

export const WhyRaqmyPage: React.FC<WhyRaqmyPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-l from-blue-900/60 via-purple-900/40 to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold mb-6">
              <Target className="w-4 h-4" />
              لماذا رقمي؟
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-relaxed mb-6">
              لأن بيع المنتجات الرقمية يحتاج منصة سهلة، عربية، ومناسبة للبداية
            </h1>
            <p className="text-lg md:text-xl leading-9 text-gray-200 mb-8">
              رقمي تساعدك إذا كنت تبحث عن موقع مجاني أو منخفض التكلفة لبيع المنتجات الرقمية، منصة عربية
              لبيع ملفات PDF، طريقة لبيع قوالب Canva، متجر رقمي بسيط، أو رابط مباشر تضعه في حساباتك
              لتبدأ استقبال الطلبات من جمهورك.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
                ابدأ مع رقمي
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onNavigate?.('features')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-bold text-white hover:bg-white/10 transition-colors">
                تعرف على المزايا
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-8">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">لماذا يحتاج البائع منصة مثل رقمي؟</h2>
          <p className="text-gray-600 leading-8 max-w-5xl mb-8">
            بيع المنتجات الرقمية يختلف عن بيع المنتجات التقليدية. البائع لا يبيع شحنًا أو منتجًا ملموسًا،
            بل يبيع ملفًا، قالبًا، معرفة، تصميمًا، أو محتوى قابلًا للتحميل. لذلك يحتاج إلى صفحة منتج واضحة،
            طريقة عرض مناسبة، رابط مشاركة، وتجربة تجعل المشتري يفهم قيمة المنتج بسهولة.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {reasons.map(([title, desc, Icon]) => (
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

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">رقمي بدل البيع العشوائي</h2>
              <p className="text-gray-600 leading-8">
                بعض البائعين يبدأون ببيع المنتجات الرقمية عبر الرسائل أو التحويل اليدوي أو إرسال الملفات
                بشكل فردي. هذه الطريقة قد تنجح في البداية لكنها تتعب مع الوقت. رقمي تساعدك على تحويل البيع
                إلى تجربة أوضح: منتج منشور، وصف واضح، رابط مباشر، وسوق يمكن للناس تصفحه.
              </p>
            </div>
            <div className="space-y-4">
              {comparisonRows.map(([problem, solution]) => (
                <div key={problem} className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-extrabold text-red-700 mb-2">{problem}</h3>
                  <p className="text-gray-600 leading-7">{solution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-l from-blue-700 to-purple-700 rounded-3xl p-6 md:p-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">رقمي تجيب على نية بحث البائع</h2>
              <p className="text-blue-50 leading-8">
                إذا كان البائع يبحث عن بداية سهلة أو منصة عربية أو موقع لبيع الملفات، فهذه هي الاحتياجات
                التي صُممت رقمي حولها.
              </p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchIntents.map((intent) => (
                <div key={intent} className="rounded-xl bg-white/10 border border-white/15 p-4 flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold leading-6">{intent}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">لماذا قد يختار التاجر رقمي؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ['لأنه يريد إطلاق سريع', 'التاجر لا يريد الانتظار طويلًا لبناء موقع أو متجر من الصفر. يريد مكانًا يرفع فيه منتجه ويبدأ التسويق مباشرة.', Clock],
              ['لأنه يريد تنظيمًا أوضح', 'بدل إرسال الملفات والروابط يدويًا، يستطيع التاجر تنظيم منتجاته في متجر رقمي وصفحات منتجات واضحة لعملائه.', ShieldCheck],
              ['لأنه يريد اختبار فكرة', 'البائع قد لا يعرف هل منتجه مطلوب أم لا. لذلك البداية المجانية والمنخفضة التعقيد تساعده على اختبار السوق قبل التوسع.', Lightbulb],
              ['لأنه يريد مخاطبة جمهور عربي', 'رقمي تستهدف السوق العربي، وهذا يجعلها مناسبة لمن يبيع منتجات رقمية باللغة العربية أو لجمهور عربي.', Users],
            ].map(([title, desc, Icon]) => (
              <div key={String(title)} className="rounded-2xl border border-gray-100 p-5">
                {React.createElement(Icon as any, { className: 'w-8 h-8 text-blue-600 mb-3' })}
                <h3 className="font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">طريقة التفكير الصحيحة مع رقمي</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {steps.map(([title, desc], index) => (
              <div key={title} className="rounded-2xl border border-gray-100 p-5">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold mb-4">{index + 1}</div>
                <h3 className="font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-900 rounded-3xl p-6 md:p-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-4">رقمي ليست مجرد سوق، بل بداية لبناء حضورك الرقمي</h2>
              <p className="text-gray-300 leading-8">
                مع الوقت يمكن للبائع أن يبني مكتبة منتجات، يختبر أفكارًا جديدة، يطور قوالبه وملفاته،
                ويربط جمهوره بمتجره الرقمي. لهذا السبب وجود منصة بسيطة وواضحة من البداية يساعد على تحويل
                الفكرة الصغيرة إلى مشروع قابل للنمو.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/10 p-6">
              <h3 className="font-extrabold text-xl mb-4">أفضل شيء تبدأ به الآن</h3>
              <p className="text-gray-300 leading-8 mb-5">
                اختر منتجًا رقميًا واحدًا تستطيع تجهيزه بسرعة، ارفعه في رقمي، واختبره مع جمهورك. لا تنتظر
                أن تكون كل المنتجات جاهزة. البداية أهم من الكمال.
              </p>
              <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-gray-900 hover:bg-gray-100 transition-colors">
                ابدأ الآن
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
