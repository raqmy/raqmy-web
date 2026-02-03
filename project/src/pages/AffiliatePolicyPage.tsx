import React from 'react';
import { Users } from 'lucide-react';

export const AffiliatePolicyPage: React.FC = () => {
  const sections = [
    { title: 'تمهيد', content: 'تهدف منصة «رقمي» لتوسيع نطاق الوصول للمنتجات عبر برنامج تسويق بالعمولة (Affiliate Program) الذي يتيح للأفراد أو الكيانات المسجلة («المسوِّق» أو «الشريك») الحصول على عمولة مقابل إحالة زبائن/مشتريات ناجحة عبر روابط تتبع فريدة.' },
    { title: '1. التعاريف', content: '<strong>المنصة:</strong> منصة «رقمي».<br/><strong>الشريك / المسوّق:</strong> الشخص أو الكيان الذي يشارك في برنامج العمولة.<br/><strong>العمولة:</strong> النسبة أو المبلغ الذي يتقاضاه المسوّق عن كل إحالة ناجحة وفق قواعد البرنامج.<br/><strong>الارتباط / الرابط التتبعي:</strong> الرابط الذي يحتوي معرّف تتبع المسوّق.<br/><strong>الإحالة الناجحة:</strong> شراء مكتمل (مبلغ مدفوع ولم يتم استرداده لاحقاً) يُنسب للمسوّق عبر رابط التتبع خلال فترة الصلاحية.' },
    { title: '2. الاشتراك في البرنامج', content: '<strong>2.1</strong> للانضمام يجب على المسوّق التسجيل عبر نموذج الانضمام والموافقة على هذه الاتفاقية.<br/><strong>2.2</strong> تحتفظ المنصة بحق قبول أو رفض أي طلب شريك دون إبداء الأسباب.' },
    { title: '3. ضوابط التتبع والمدة', content: '<strong>3.1 مدة تتبع الكوكيز الافتراضية:</strong> 30 يوماً ما لم تُحدّد المنصة مدة أخرى لحملة ترويجية محددة.<br/><strong>3.2</strong> كل إحالة تُحسب فقط إذا تمت عملية الشراء ضمن فترة تتبع الرابط.<br/><strong>3.3</strong> يحق للمنصة تعديل مدة الكوكيز وإشعار الشركاء بذلك.' },
    { title: '4. نسب العمولة وأحكامها', content: '<strong>4.1 نسب العمولة الأساسية:</strong><ul class="list-disc pr-6 mt-2"><li>على مبيعات المتجر المباشر: 10% من سعر البيع قبل خصم رسوم مزود الدفع</li><li>على مبيعات السوق العام: 20% من سعر البيع قبل خصم رسوم مزود الدفع</li></ul><br/><strong>4.2 تأثير الباقات:</strong> باقة 40 ريال تخفض العمولة للنصف، باقة 180 ريال قد تلغي العمولة.<br/><strong>4.3</strong> المنصة تحتفظ بالحق في تعديل نسب العمولات مع إخطار مسبق.' },
    { title: '5. كيفية احتساب العمولة ودفعها', content: '<strong>5.1</strong> العمولة تُحتسب على مبيعات مُتحققة (مؤكدة ودفعت فعلياً ولم يتم إرجاعها).<br/><strong>5.2 فترة الاستحقاق:</strong> دورة محاسبية شهرية/ربع سنوية، صرف خلال 30 يوم عمل من نهاية الدورة.<br/><strong>5.3 الحد الأدنى:</strong> 100 ريال للسحب.<br/><strong>5.4 طريقة الدفع:</strong> حساب بنكي، محفظة داخلية، أو PayPal.' },
    { title: '6. السلوك المحظور', content: '<strong>6.1 يمنع:</strong><ul class="list-disc pr-6 mt-2"><li>تقديم دعاوى كاذبة للزيادة في النقرات أو المبيعات (click fraud)</li><li>استخدام وسائل سبام أو إعلانات مضللة</li><li>الترويج عبر انتهاك العلامات التجارية</li><li>مواقع محتوى مع برمجيات خبيثة</li></ul><br/><strong>6.2</strong> يحق للمنصة إلغاء المدفوعات عند اكتشاف نشاط احتيالي.' },
    { title: '7. حقوق الملكية الفكرية', content: '<strong>7.1</strong> تمنح المنصة ترخيصاً محدوداً وغير حصري لاستخدام المواد التسويقية الرسمية.<br/><strong>7.2</strong> يلتزم الشريك بعدم تعديل العلامات والمواد بطريقة مضللة.' },
    { title: '8. التقارير والتسويات', content: '<strong>8.1</strong> توفر المنصة لوحة متابعة للمسوق لعرض الزيارات، النقرات، المبيعات.<br/><strong>8.2</strong> أي اعتراض يجب تقديمه خلال 3 أيام من تاريخ التقرير.' },
    { title: '9. إنهاء الاشتراك', content: '<strong>9.1</strong> يحق لأيٍ من الطرفين إنهاء علاقة الشراكة بإخطار كتابي قبل 3 أيام.<br/><strong>9.2</strong> بعد الإنهاء، يحتفظ الشريك بحق صرف العمولات المستحقة.' },
    { title: '10. المسؤولية', content: '<strong>10.1</strong> المنصة غير مسؤولة عن خسائر غير مباشرة من فشل حملات المسوّق.<br/><strong>10.2</strong> يوافق الشريك على تعويض المنصة عن مطالبات ناتجة عن نشاطه الخارجي.' },
    { title: '11. السرية', content: '<strong>11.1</strong> يلتزم الطرفان بالحفاظ على سرية المعلومات الحساسة.' },
    { title: '12. التعديلات', content: '<strong>12.1</strong> للمنصة الحق في تعديل بنود الاتفاقية مع إشعار الشركاء.<br/><strong>12.2</strong> يخضع الاتفاق لقوانين المملكة العربية السعودية.' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-900">اتفاقية برنامج التسويق بالعمولة</h1>
          </div>
          <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
            {sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              </section>
            ))}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">معلومات التواصل</h2>
              <p className="text-orange-600 font-semibold">raqmy.app@gmail.com</p>
            </section>
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">آخر تحديث: ديسمبر 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
