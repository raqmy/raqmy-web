import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { PricingPage } from './pages/PricingPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { SellerDashboard } from './pages/SellerDashboard';
import { SupportPage } from './pages/SupportPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AffiliateDashboard } from './pages/AffiliateDashboard';
import { OrdersPage } from './pages/OrdersPage';
import { StoreDetailPage } from './pages/StoreDetailPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { CouponsManagementPage } from './pages/CouponsManagementPage';
import { AffiliateManagementPage } from './pages/AffiliateManagementPage';
import { MarketerAnalyticsPage } from './pages/MarketerAnalyticsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { OrdersManagementPage } from './pages/OrdersManagementPage';
import { PaymentSettingsPage } from './pages/PaymentSettingsPage';
import { BankAccountPage } from './pages/BankAccountPage';
import { WithdrawalRequestsPage } from './pages/WithdrawalRequestsPage';
import { AdminWithdrawalsPage } from './pages/AdminWithdrawalsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { AdminVerificationApisPage } from './pages/AdminVerificationApisPage';
import { MerchantWithdrawPage } from './pages/MerchantWithdrawPage';
import { AdminAnnouncementsPage } from './pages/AdminAnnouncementsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ViewedProductsPage } from './pages/ViewedProductsPage';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { AffiliatePolicyPage } from './pages/AffiliatePolicyPage';
import { MerchantAgreementPage } from './pages/MerchantAgreementPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    if (user && !loading && profile) {
      if (currentPage === 'auth') {
        if (profile.role === 'admin' || profile.role === 'superadmin') {
          setCurrentPage('admin');
        } else if (profile.role === 'seller') {
          setCurrentPage('seller-dashboard');
        } else {
          // العملاء يذهبون للصفحة الرئيسية
          setCurrentPage('home');
        }
      }
    }
  }, [user, profile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (currentPage.startsWith('product-')) {
      const productId = currentPage.replace('product-', '');
      return <ProductDetailPage productId={productId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('store-detail-')) {
      const storeId = currentPage.replace('store-detail-', '');
      return <StoreDetailPage storeId={storeId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('storefront-')) {
      const storeSlug = currentPage.replace('storefront-', '');
      return <StorefrontPage storeSlug={storeSlug} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('marketer-analytics-')) {
      const marketerId = currentPage.replace('marketer-analytics-', '');
      return <MarketerAnalyticsPage marketerId={marketerId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('payment-success-')) {
      const orderId = currentPage.replace('payment-success-', '');
      return <PaymentSuccessPage orderId={orderId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('payment-failed-')) {
      const orderId = currentPage.replace('payment-failed-', '');
      return <PaymentFailedPage orderId={orderId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('payment-')) {
      const orderId = currentPage.replace('payment-', '');
      return <PaymentPage orderId={orderId} onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'auth':
        return <AuthPage />;
      case 'pricing':
        return <PricingPage onNavigate={setCurrentPage} />;
      case 'marketplace':
        return <MarketplacePage onNavigate={setCurrentPage} />;
      case 'seller-dashboard':
        return profile?.role === 'seller' || profile?.role === 'admin' ? (
          <SellerDashboard onNavigate={setCurrentPage} />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case 'user-dashboard':
        return <UserDashboardPlaceholder onNavigate={setCurrentPage} />;
      case 'admin':
        return profile?.role === 'admin' ? (
          <AdminDashboard onNavigate={setCurrentPage} />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case 'affiliate-dashboard':
        return profile?.role === 'seller' || profile?.role === 'admin' || profile?.role === 'superadmin' ? (
          <AffiliateDashboard onNavigate={setCurrentPage} />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case 'coupons-management':
        return profile?.role === 'seller' || profile?.role === 'admin' || profile?.role === 'superadmin' ? (
          <CouponsManagementPage onNavigate={setCurrentPage} />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case 'affiliate-management':
        return profile?.role === 'seller' || profile?.role === 'admin' || profile?.role === 'superadmin' ? (
          <AffiliateManagementPage onNavigate={setCurrentPage} />
        ) : (
          <HomePage onNavigate={setCurrentPage} />
        );
      case 'cart':
        return <CartPage onNavigate={setCurrentPage} />;
      case 'checkout':
        return <CheckoutPage onNavigate={setCurrentPage} />;
      case 'payment-failed':
        return <PaymentFailedPage onNavigate={setCurrentPage} />;
      case 'orders':
        return <OrdersPage onNavigate={setCurrentPage} />;
      case 'orders-management':
        return <OrdersManagementPage onNavigate={setCurrentPage} />;
      case 'payment-settings':
        return <PaymentSettingsPage onNavigate={setCurrentPage} />;
      case 'bank-account':
        return <BankAccountPage onNavigate={setCurrentPage} />;
      case 'withdrawal-requests':
        return <WithdrawalRequestsPage onNavigate={setCurrentPage} />;
      case 'admin-withdrawals':
        return <AdminWithdrawalsPage onNavigate={setCurrentPage} />;
      case 'transactions':
        return <TransactionsPage onNavigate={setCurrentPage} />;
      case 'admin-management':
        return <AdminManagementPage onNavigate={setCurrentPage} />;
      case 'admin-verification-apis':
        return <AdminVerificationApisPage onNavigate={setCurrentPage} />;
      case 'merchant-withdraw':
        return <MerchantWithdrawPage onNavigate={setCurrentPage} />;
      case 'admin-announcements':
        return <AdminAnnouncementsPage onNavigate={setCurrentPage} />;
      case 'favorites':
        return <FavoritesPage onNavigate={setCurrentPage} />;
      case 'viewed-products':
        return <ViewedProductsPage onNavigate={setCurrentPage} />;
      case 'support':
        return <SupportPage />;
      case 'profile':
        return <ProfilePage onNavigate={setCurrentPage} />;
      case 'privacy-policy':
        return <PrivacyPolicyPage />;
      case 'refund-policy':
        return <RefundPolicyPage />;
      case 'affiliate-policy':
        return <AffiliatePolicyPage />;
      case 'merchant-agreement':
        return <MerchantAgreementPage />;
      case 'privacy':
        return <PrivacyPolicyPage />;
      case 'terms':
        return <PrivacyPolicyPage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <AnnouncementBanner />
      <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="flex-1">{renderPage()}</main>
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}

function UserDashboardPlaceholder({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">مرحباً {profile?.name}</h1>
          <p className="text-gray-600">لوحة تحكم العميل</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">طلباتي</h3>
            <p className="text-gray-600 text-sm mb-4">تتبع جميع مشترياتك</p>
            <button
              onClick={() => onNavigate('orders')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              عرض الطلبات
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">السوق العام</h3>
            <p className="text-gray-600 text-sm mb-4">تصفح آلاف المنتجات</p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              تصفح المنتجات
            </button>
          </div>

        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">هل تريد البيع على منصتنا؟</h2>
          <p className="text-blue-100 mb-6">انضم كبائع وابدأ ببيع منتجاتك الرقمية الآن</p>
          <button
            onClick={() => onNavigate('profile')}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            ترقية الحساب
          </button>
        </div>
      </div>
    </div>
  );
}


function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">سياسة الخصوصية</h1>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">مقدمة</h2>
              <p className="leading-relaxed">
                نحن في منصة رقمي نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">البيانات التي نجمعها</h2>
              <p className="leading-relaxed mb-3">نقوم بجمع المعلومات التالية:</p>
              <ul className="list-disc pr-6 space-y-2">
                <li>معلومات الحساب (الاسم، البريد الإلكتروني، رقم الجوال)</li>
                <li>معلومات الدفع والمعاملات المالية</li>
                <li>بيانات المنتجات والمتاجر</li>
                <li>معلومات الاستخدام والتحليلات</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">استخدام البيانات</h2>
              <p className="leading-relaxed mb-3">نستخدم بياناتك لـ:</p>
              <ul className="list-disc pr-6 space-y-2">
                <li>تقديم وتحسين خدماتنا</li>
                <li>معالجة المعاملات المالية</li>
                <li>التواصل معك بخصوص حسابك</li>
                <li>تحليل وتطوير المنصة</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">حماية البيانات</h2>
              <p className="leading-relaxed">
                نستخدم أحدث تقنيات الأمان لحماية بياناتك، بما في ذلك التشفير والمصادقة متعددة العوامل. جميع المعاملات المالية تتم عبر بوابات دفع آمنة ومعتمدة.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">مشاركة البيانات</h2>
              <p className="leading-relaxed">
                لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية: معالجة الدفع، الامتثال للقوانين، أو بموافقتك الصريحة.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">حقوقك</h2>
              <p className="leading-relaxed mb-3">لديك الحق في:</p>
              <ul className="list-disc pr-6 space-y-2">
                <li>الوصول إلى بياناتك الشخصية</li>
                <li>تصحيح أو تحديث بياناتك</li>
                <li>حذف حسابك وبياناتك</li>
                <li>الاعتراض على معالجة بياناتك</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">تواصل معنا</h2>
              <p className="leading-relaxed">
                لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر البريد الإلكتروني: privacy@raqami.com
              </p>
            </section>

            <p className="text-sm text-gray-500 mt-8">آخر تحديث: ديسمبر 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">الشروط والأحكام</h1>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">القبول والموافقة</h2>
              <p className="leading-relaxed">
                باستخدامك لمنصة رقمي، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">حقوق والتزامات المستخدم</h2>
              <p className="leading-relaxed mb-3">يحق لك:</p>
              <ul className="list-disc pr-6 space-y-2">
                <li>إنشاء حساب وبيع منتجاتك الرقمية</li>
                <li>تصفح وشراء المنتجات المتاحة</li>
                <li>استخدام أدوات المنصة المتاحة حسب باقتك</li>
              </ul>
              <p className="leading-relaxed mt-4 mb-3">يجب عليك:</p>
              <ul className="list-disc pr-6 space-y-2">
                <li>تقديم معلومات صحيحة ودقيقة</li>
                <li>الحفاظ على سرية بيانات حسابك</li>
                <li>عدم انتهاك حقوق الملكية الفكرية للآخرين</li>
                <li>الامتثال لجميع القوانين واللوائح المعمول بها</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">المنتجات والمبيعات</h2>
              <ul className="list-disc pr-6 space-y-2">
                <li>التاجر مسؤول بالكامل عن محتوى وجودة منتجاته</li>
                <li>يجب أن تكون المنتجات قانونية ولا تنتهك حقوق الآخرين</li>
                <li>المنصة ليست مسؤولة عن جودة المنتجات المباعة</li>
                <li>التاجر يتحمل مسؤولية خدمة ما بعد البيع</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">الرسوم والعمولات</h2>
              <ul className="list-disc pr-6 space-y-2">
                <li>تختلف نسبة العمولة حسب الباقة المشترك بها</li>
                <li>يتم خصم العمولة تلقائياً من كل عملية بيع</li>
                <li>للمنصة الحق في تعديل الأسعار والعمولات بإشعار مسبق</li>
                <li>جميع الأسعار بالريال السعودي ما لم يُذكر خلاف ذلك</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">المدفوعات والاسترداد</h2>
              <ul className="list-disc pr-6 space-y-2">
                <li>جميع المدفوعات تتم عبر بوابات دفع آمنة</li>
                <li>سياسة الاسترداد تخضع لتقدير البائع</li>
                <li>المنصة تحتفظ بالحق في حجب الأموال في حالة الاشتباه بالاحتيال</li>
                <li>يتم تحويل أرباح التجار خلال 3-5 أيام عمل من طلب السحب</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">الملكية الفكرية</h2>
              <p className="leading-relaxed">
                جميع حقوق الملكية الفكرية للمنصة محفوظة لـ رقمي. المحتوى والمنتجات المرفوعة تظل ملكاً لأصحابها، مع منح المنصة ترخيصاً لعرضها وتسويقها.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">إنهاء الحساب</h2>
              <p className="leading-relaxed">
                نحتفظ بالحق في تعليق أو إنهاء حسابك في حالة انتهاك هذه الشروط. يمكنك إغلاق حسابك في أي وقت من إعدادات الحساب.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">تحديد المسؤولية</h2>
              <p className="leading-relaxed">
                المنصة تُقدم "كما هي" دون أي ضمانات. نحن غير مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">التعديلات</h2>
              <p className="leading-relaxed">
                نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">القانون المطبق</h2>
              <p className="leading-relaxed">
                تخضع هذه الشروط لقوانين المملكة العربية السعودية ويتم تفسيرها وفقاً لها.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">تواصل معنا</h2>
              <p className="leading-relaxed">
                لأي استفسارات حول الشروط والأحكام، يرجى التواصل معنا عبر: legal@raqami.com
              </p>
            </section>

            <p className="text-sm text-gray-500 mt-8">آخر تحديث: ديسمبر 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
