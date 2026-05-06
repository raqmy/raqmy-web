import React from 'react';
import { Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center mb-4"
              aria-label="الذهاب إلى الرئيسية"
            >
              <img
                src="/raqmy-logo.png"
                alt="رقمي Raqmy"
                className="h-14 w-auto object-contain rounded-xl"
                onError={(event) => {
                  const target = event.currentTarget;
                  target.style.display = 'none';

                  const fallback = target.parentElement?.querySelector('[data-footer-logo-fallback]');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'inline-flex';
                  }
                }}
              />

              <span
                data-footer-logo-fallback
                className="hidden text-2xl font-bold text-white"
              >
                رقمي
              </span>
            </button>

            <p className="text-gray-400 mb-4 max-w-md">
              منصة رقمي هي الحل الأمثل لبيع وشراء المنتجات الرقمية. انضم إلى آلاف التجار والعملاء الذين يثقون بنا.
            </p>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm">support.raqmy@gmail.com</span>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">الرئيسية</button>
              </li>
              <li>
                <button onClick={() => onNavigate('marketplace')} className="hover:text-white transition-colors">المتجر العام</button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors">الباقات</button>
              </li>
              <li>
                <button onClick={() => onNavigate('support')} className="hover:text-white transition-colors">الدعم</button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">قانوني</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('privacy-policy')} className="hover:text-white transition-colors">سياسة الخصوصية</button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">الشروط والأحكام</button>
              </li>
              <li>
                <button onClick={() => onNavigate('refund-policy')} className="hover:text-white transition-colors">سياسة الاسترجاع</button>
              </li>
              <li>
                <button onClick={() => onNavigate('affiliate-policy')} className="hover:text-white transition-colors">اتفاقية التسويق بالعمولة</button>
              </li>
              <li>
                <button onClick={() => onNavigate('merchant-agreement')} className="hover:text-white transition-colors">اتفاقية التاجر</button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">© 2026 رقمي. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};
