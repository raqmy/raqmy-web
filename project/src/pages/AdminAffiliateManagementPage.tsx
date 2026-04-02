import React from 'react';

interface AdminAffiliateManagementPageProps {
  onNavigate: (page: string) => void;
}

export const AdminAffiliateManagementPage: React.FC<AdminAffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-l from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-lg mb-8">
          <div className="p-8 lg:p-10">
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">
              إدارة التسويق بالعمولة للمنصة
            </h1>
            <p className="text-white/90 max-w-3xl leading-7">
              من هنا ستدير نظام الأفلييت الخاص بمنصة رقمي نفسها، مثل تسويق الباقات
              والاشتراكات ودعوات التجار والحملات التابعة للمنصة.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            صفحة أفلييت الأدمن جاهزة
          </h2>

          <p className="text-gray-600 leading-7 mb-6">
            هذه صفحة مستقلة عن أفلييت التاجر. الخطوة القادمة ستكون ربطها داخل لوحة
            الأدمن ثم بناء الأقسام الداخلية الخاصة بالمنصة.
          </p>

          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            الرجوع للوحة الأدمن
          </button>
        </div>
      </div>
    </div>
  );
};
