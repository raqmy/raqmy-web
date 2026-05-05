import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
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
import { AdminAffiliateManagementPage } from './pages/AdminAffiliateManagementPage';
import { AffiliateDashboard } from './pages/AffiliateDashboard';
import { OrdersPage } from './pages/OrdersPage';
import { StoreDetailPage } from './pages/StoreDetailPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { CouponsManagementPage } from './pages/CouponsManagementPage';
import { AffiliateManagementPage } from './pages/AffiliateManagementPage';
import { MarketerAnalyticsPage } from './pages/MarketerAnalyticsPage';
import { MarketerAffiliateStatsPage } from './pages/MarketerAffiliateStatsPage';
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
import { TermsPage } from './pages/TermsPage';
import { VerifyPhonePage } from './pages/VerifyPhonePage';
import { MerchantBankDetailsPage } from './pages/MerchantBankDetailsPage';
import { supabase } from './lib/supabase';
import { handleAffiliateTracking } from './lib/affiliate';

const SELLER_DASHBOARD_TABS = new Set([
  'overview',
  'products',
  'stores',
  'marketing',
  'orders',
  'earnings',
  'bank-account',
  'identity',
  'settings',
]);

const ADMIN_DASHBOARD_TABS = new Set([
  'overview',
  'users',
  'stores',
  'products',
  'financial-transactions',
  'payment-settings',
  'merchant-verifications',
  'bank-account-verifications',
]);

const isLoginOrSignupRoute = (page: string) =>
  page === 'auth' || page === 'auth-login' || page === 'auth-signup';

const isAuthRoute = (page: string) =>
  page === 'auth' ||
  page === 'auth-login' ||
  page === 'auth-signup' ||
  page === 'auth-forgot-password' ||
  page === 'auth-reset-password';

const parsePathToPage = (pathname: string, search: string = window.location.search) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);
  const searchParams = new URLSearchParams(search);
  const requestedTab = searchParams.get('tab');

  if (segments.length === 0) return 'home';

  if (segments[0] === 'affiliate-report' && segments[1]) {
    return 'affiliate-report';
  }

  if (segments[0] === 'subscription-success' && segments[1]) {
    return `subscription-success-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 'subscription-failed' && segments[1]) {
    return `subscription-failed-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 's' && segments[1]) {
    const storeSlug = decodeURIComponent(segments[1]);

    if (segments[2] === 'profile') {
      if (requestedTab === 'orders') {
        return `store-profile-orders-tab-${storeSlug}`;
      }
      return `store-profile-${storeSlug}`;
    }

    if (segments[2] === 'orders') {
      return `store-orders-${storeSlug}`;
    }

    if (segments[2] === 'favorites') {
      return `store-favorites-${storeSlug}`;
    }

    if (segments[2] === 'viewed-products') {
      return `store-viewed-products-${storeSlug}`;
    }

    return `storefront-${storeSlug}`;
  }

  if (segments[0] === 'p' && segments[1]) {
    return `product-slug-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 'payment' && segments[1]) {
    return `payment-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 'payment-success' && segments[1]) {
    return `payment-success-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 'payment-failed' && segments[1]) {
    return `payment-failed-${decodeURIComponent(segments[1])}`;
  }

  if (segments[0] === 'profile') {
    if (segments[1] === 'orders') return 'orders';
    if (segments[1] === 'favorites') return 'favorites';
    if (segments[1] === 'viewed-products') return 'viewed-products';
    if (requestedTab === 'orders') return 'profile-orders-tab';
    return 'profile';
  }

  if (segments[0] === 'auth') {
    if (segments[1] === 'login') return 'auth-login';
    if (segments[1] === 'signup') return 'auth-signup';
    if (segments[1] === 'forgot-password') return 'auth-forgot-password';
    if (segments[1] === 'reset-password') return 'auth-reset-password';
    return 'auth-login';
  }

  if (segments[0] === 'seller-dashboard') {
    const tab = segments[1];

    if (!tab || tab === 'overview') {
      return 'seller-dashboard';
    }

    if (SELLER_DASHBOARD_TABS.has(tab)) {
      return `seller-dashboard-${tab}`;
    }

    return 'seller-dashboard';
  }

  if (segments[0] === 'admin-dashboard') {
    const tab = segments[1];

    if (!tab || tab === 'overview') {
      return 'admin-dashboard';
    }

    if (tab === 'affiliate') {
      return 'admin-affiliate-management';
    }

    if (ADMIN_DASHBOARD_TABS.has(tab)) {
      return `admin-dashboard-${tab}`;
    }

    return 'admin-dashboard';
  }

  const staticRoutes: Record<string, string> = {
    pricing: 'pricing',
    marketplace: 'marketplace',
    'seller-dashboard': 'seller-dashboard',
    'user-dashboard': 'user-dashboard',
    admin: 'admin-dashboard',
    'admin-affiliate-management': 'admin-affiliate-management',
    'affiliate-dashboard': 'affiliate-dashboard',
    'coupons-management': 'coupons-management',
    'affiliate-management': 'affiliate-management',
    cart: 'cart',
    checkout: 'checkout',
    orders: 'orders',
    'orders-management': 'orders-management',
    'payment-settings': 'payment-settings',
    'bank-account': 'bank-account',
    'withdrawal-requests': 'withdrawal-requests',
    'admin-withdrawals': 'admin-withdrawals',
    transactions: 'transactions',
    'admin-management': 'admin-management',
    'admin-verification-apis': 'admin-verification-apis',
    'merchant-withdraw': 'merchant-withdraw',
    'admin-announcements': 'admin-announcements',
    favorites: 'favorites',
    'viewed-products': 'viewed-products',
    support: 'support',
    profile: 'profile',
    'privacy-policy': 'privacy-policy',
    'refund-policy': 'refund-policy',
    'affiliate-policy': 'affiliate-policy',
    'merchant-agreement': 'merchant-agreement',
    privacy: 'privacy',
    terms: 'terms',
    'verify-phone': 'verify-phone',
    'merchant-bank-details': 'merchant-bank-details',
  };

  return staticRoutes[segments[0]] || 'home';
};

const getStoredStoreContext = () => {
  try {
    return {
      slug: sessionStorage.getItem('active_store_slug'),
      source: sessionStorage.getItem('store_mode_source'),
      pendingSlug: localStorage.getItem('pending_payment_store_slug'),
      pendingSource: localStorage.getItem('pending_payment_store_source'),
    };
  } catch {
    return {
      slug: null as string | null,
      source: null as string | null,
      pendingSlug: null as string | null,
      pendingSource: null as string | null,
    };
  }
};

const getStoreSlugFromScopedPage = (page: string): string | null => {
  const prefixes = [
    'storefront-',
    'store-profile-orders-tab-',
    'store-profile-',
    'store-orders-',
    'store-favorites-',
    'store-viewed-products-',
  ];

  for (const prefix of prefixes) {
    if (page.startsWith(prefix)) {
      return page.replace(prefix, '') || null;
    }
  }

  return null;
};

const isStorePaymentPage = (page: string) =>
  page === 'cart' ||
  page === 'checkout' ||
  page.startsWith('payment-') ||
  page.startsWith('payment-success-') ||
  page.startsWith('payment-failed-');

const getActiveStoreSlugFromContext = (page: string): string | null => {
  const directStoreSlug = getStoreSlugFromScopedPage(page);
  if (directStoreSlug) return directStoreSlug;

  const queryStoreSlug = new URLSearchParams(window.location.search).get('store');
  if (queryStoreSlug) return queryStoreSlug;

  const { slug, source, pendingSlug, pendingSource } = getStoredStoreContext();

  if (
    (isLoginOrSignupRoute(page) ||
      page.startsWith('product-slug-') ||
      page.startsWith('product-') ||
      page === 'profile' ||
      page === 'profile-orders-tab' ||
      page.startsWith('store-profile-orders-tab-') ||
      page === 'orders' ||
      page === 'favorites' ||
      page === 'viewed-products' ||
      isStorePaymentPage(page)) &&
    source === 'storefront' &&
    slug
  ) {
    return slug;
  }

  if (isStorePaymentPage(page) && pendingSource === 'storefront' && pendingSlug) {
    return pendingSlug;
  }

  return null;
};

const isStorefrontPage = (page: string) => page.startsWith('storefront-');

const isStoreProductPage = (page: string) =>
  (page.startsWith('product-slug-') || page.startsWith('product-')) &&
  !!getActiveStoreSlugFromContext(page);

const isStoreAuthPage = (page: string) =>
  isLoginOrSignupRoute(page) && !!getActiveStoreSlugFromContext(page);

const isStoreCustomerScopedPage = (page: string) =>
  page.startsWith('store-profile-') ||
  page.startsWith('store-orders-') ||
  page.startsWith('store-favorites-') ||
  page.startsWith('store-viewed-products-');

const isStoreCartFlowPage = (page: string) =>
  isStorePaymentPage(page) && !!getActiveStoreSlugFromContext(page);

const isStoreContextPage = (page: string) =>
  isStorefrontPage(page) ||
  isStoreProductPage(page) ||
  isStoreAuthPage(page) ||
  isStoreCustomerScopedPage(page) ||
  isStoreCartFlowPage(page);

const getMarketplaceSearchParamsForSync = () => {
  if (typeof window === 'undefined') return '';

  const currentPathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPathname !== '/marketplace') return '';

  const params = new URLSearchParams(window.location.search);
  const nextParams = new URLSearchParams();

  const keysToKeep = ['seller', 'seller_id', 'merchant_id', 'owner_id', 'ref'];

  keysToKeep.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) {
      nextParams.set(key, value);
    }
  });

  const query = nextParams.toString();
  return query ? `?${query}` : '';
};

const getPublicPathFromPage = (page: string) => {
  const activeStoreSlug = getActiveStoreSlugFromContext(page);

  if (page === 'affiliate-report') {
    return null;
  }

  if (page.startsWith('subscription-success-')) {
    const paymentId = encodeURIComponent(page.replace('subscription-success-', ''));
    return `/subscription-success/${paymentId}`;
  }

  if (page.startsWith('subscription-failed-')) {
    const paymentId = encodeURIComponent(page.replace('subscription-failed-', ''));
    return `/subscription-failed/${paymentId}`;
  }

  if (page.startsWith('storefront-')) {
    return `/s/${encodeURIComponent(page.replace('storefront-', ''))}`;
  }

  if (page.startsWith('store-profile-orders-tab-')) {
    return `/s/${encodeURIComponent(page.replace('store-profile-orders-tab-', ''))}/profile?tab=orders`;
  }

  if (page.startsWith('store-profile-')) {
    return `/s/${encodeURIComponent(page.replace('store-profile-', ''))}/profile`;
  }

  if (page.startsWith('store-orders-')) {
    return `/s/${encodeURIComponent(page.replace('store-orders-', ''))}/orders`;
  }

  if (page.startsWith('store-favorites-')) {
    return `/s/${encodeURIComponent(page.replace('store-favorites-', ''))}/favorites`;
  }

  if (page.startsWith('store-viewed-products-')) {
    return `/s/${encodeURIComponent(page.replace('store-viewed-products-', ''))}/viewed-products`;
  }

  if (page.startsWith('product-slug-')) {
    const slug = encodeURIComponent(page.replace('product-slug-', ''));
    if (activeStoreSlug) {
      return `/p/${slug}?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return `/p/${slug}`;
  }

  if (page === 'cart') {
    if (activeStoreSlug) {
      return `/cart?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return '/cart';
  }

  if (page === 'checkout') {
    if (activeStoreSlug) {
      return `/checkout?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return '/checkout';
  }

  if (page.startsWith('payment-success-')) {
    const orderId = encodeURIComponent(page.replace('payment-success-', ''));
    if (activeStoreSlug) {
      return `/payment-success/${orderId}?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return `/payment-success/${orderId}`;
  }

  if (page.startsWith('payment-failed-')) {
    const orderId = encodeURIComponent(page.replace('payment-failed-', ''));
    if (activeStoreSlug) {
      return `/payment-failed/${orderId}?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return `/payment-failed/${orderId}`;
  }

  if (page.startsWith('payment-')) {
    const orderId = encodeURIComponent(page.replace('payment-', ''));
    if (activeStoreSlug) {
      return `/payment/${orderId}?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return `/payment/${orderId}`;
  }

  if (page === 'profile-orders-tab') return '/profile?tab=orders';
  if (page === 'profile') return '/profile';
  if (page === 'orders') return '/profile/orders';
  if (page === 'favorites') return '/profile/favorites';
  if (page === 'viewed-products') return '/profile/viewed-products';

  if (page === 'auth' || page === 'auth-login') return '/auth/login';
  if (page === 'auth-signup') return '/auth/signup';
  if (page === 'auth-forgot-password') return '/auth/forgot-password';
  if (page === 'auth-reset-password') return '/auth/reset-password';

  if (page === 'seller-dashboard') return '/seller-dashboard';
  if (page === 'seller-dashboard-overview') return '/seller-dashboard';
  if (page.startsWith('seller-dashboard-')) {
    const tab = page.replace('seller-dashboard-', '');
    return tab === 'overview' ? '/seller-dashboard' : `/seller-dashboard/${encodeURIComponent(tab)}`;
  }

  if (page === 'admin' || page === 'admin-dashboard' || page === 'admin-dashboard-overview') {
    return '/admin-dashboard';
  }

  if (page === 'admin-affiliate-management') {
    return '/admin-dashboard/affiliate';
  }

  if (page.startsWith('admin-dashboard-')) {
    const tab = page.replace('admin-dashboard-', '');
    return tab === 'overview' ? '/admin-dashboard' : `/admin-dashboard/${encodeURIComponent(tab)}`;
  }

  const publicRoutes: Record<string, string> = {
    home: '/',
    pricing: '/pricing',
    marketplace: `/marketplace${getMarketplaceSearchParamsForSync()}`,
    support: '/support',
    'privacy-policy': '/privacy-policy',
    'refund-policy': '/refund-policy',
    'affiliate-policy': '/affiliate-policy',
    'merchant-agreement': '/merchant-agreement',
    privacy: '/privacy',
    terms: '/terms',
    'affiliate-dashboard': '/affiliate-dashboard',
    'coupons-management': '/coupons-management',
    'affiliate-management': '/affiliate-management',
    'orders-management': '/orders-management',
    'payment-settings': '/payment-settings',
    'bank-account': '/bank-account',
    'withdrawal-requests': '/withdrawal-requests',
    'admin-withdrawals': '/admin-withdrawals',
    transactions: '/transactions',
    'admin-management': '/admin-management',
    'admin-verification-apis': '/admin-verification-apis',
    'merchant-withdraw': '/merchant-withdraw',
    'admin-announcements': '/admin-announcements',
    'verify-phone': '/verify-phone',
    'merchant-bank-details': '/merchant-bank-details',
  };

  return publicRoutes[page] || null;
};

const hasPotentialPaymobParams = () => {
  const searchParams = new URLSearchParams(window.location.search);

  return (
    searchParams.has('id') ||
    searchParams.has('success') ||
    searchParams.has('pending') ||
    searchParams.has('txn_response_code') ||
    searchParams.has('amount_cents') ||
    searchParams.has('is_voided') ||
    searchParams.has('is_refunded') ||
    searchParams.has('is_capture') ||
    searchParams.has('order') ||
    searchParams.has('order_id') ||
    searchParams.has('merchant_order_id')
  );
};

type SubscriptionPaymentStatusRow = {
  id: string;
  status?: string | null;
  plan_id?: string | null;
  amount?: number | null;
  currency?: string | null;
};

const SubscriptionStatusPage: React.FC<{
  status: 'success' | 'failed';
  paymentId?: string;
  onNavigate: (page: string) => void;
}> = ({ status, paymentId, onNavigate }) => {
  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
        <div
          className={`w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center ${
            isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : (
            <XCircle className="w-10 h-10" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {isSuccess ? 'تم دفع الاشتراك بنجاح' : 'تعذر إتمام دفع الاشتراك'}
        </h1>

        <p className="text-gray-600 leading-7 mb-3">
          {isSuccess
            ? 'تم تأكيد عملية الاشتراك بنجاح. يمكنك الآن متابعة استخدام المنصة والرجوع إلى صفحة الباقات أو لوحة التحكم.'
            : 'لم تكتمل عملية دفع الاشتراك. يمكنك المحاولة مرة أخرى أو العودة إلى صفحة الباقات.'}
        </p>

        {paymentId && (
          <p className="text-sm text-gray-400 mb-8">
            رقم عملية الاشتراك: <span className="font-mono">{paymentId}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onNavigate('pricing')}
            className="flex-1 px-6 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            العودة إلى الباقات
          </button>

          <button
            onClick={() => onNavigate('seller-dashboard')}
            className="flex-1 px-6 py-3.5 rounded-2xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            الذهاب إلى لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => parsePathToPage(window.location.pathname, window.location.search));
  const [hasBankDetails, setHasBankDetails] = useState<boolean | null>(null);
  const [isHandlingPaymentReturn, setIsHandlingPaymentReturn] = useState(false);
  const hasInitializedRouteSync = useRef(false);

  const typedProfile = profile as (typeof profile & { signup_completed?: boolean }) | null;
  const signupCompleted = !!typedProfile?.signup_completed;

  const storeSlug = getActiveStoreSlugFromContext(currentPage);
  const isStoreMode = isStoreContextPage(currentPage);
  const shouldHidePlatformChrome = isStoreMode || currentPage === 'affiliate-report';

  useEffect(() => {
    handleAffiliateTracking();
  }, []);

  const navigateWithContext = (page: string) => {
    const activeStoreSlug = getActiveStoreSlugFromContext(currentPage);

    if (!activeStoreSlug) {
      setCurrentPage(page);
      return;
    }

    if (page === 'profile') {
      setCurrentPage(`store-profile-${activeStoreSlug}`);
      return;
    }

    if (page === 'profile-orders-tab') {
      setCurrentPage(`store-profile-orders-tab-${activeStoreSlug}`);
      return;
    }

    if (page === 'orders') {
      setCurrentPage(`store-orders-${activeStoreSlug}`);
      return;
    }

    if (page === 'favorites') {
      setCurrentPage(`store-favorites-${activeStoreSlug}`);
      return;
    }

    if (page === 'viewed-products') {
      setCurrentPage(`store-viewed-products-${activeStoreSlug}`);
      return;
    }

    if (page === 'marketplace' || page === 'home') {
      setCurrentPage(`storefront-${activeStoreSlug}`);
      return;
    }

    setCurrentPage(page);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(parsePathToPage(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      if (storeSlug && isStoreMode) {
        sessionStorage.setItem('active_store_slug', storeSlug);

        if (
          isStorefrontPage(currentPage) ||
          isStoreProductPage(currentPage) ||
          isStoreAuthPage(currentPage) ||
          isStoreCustomerScopedPage(currentPage) ||
          isStoreCartFlowPage(currentPage)
        ) {
          sessionStorage.setItem('store_mode_source', 'storefront');
        }

        localStorage.removeItem('pending_payment_store_slug');
        localStorage.removeItem('pending_payment_store_source');
        return;
      }

      if (!isStoreMode) {
        sessionStorage.removeItem('active_store_slug');
        sessionStorage.removeItem('store_mode_source');
      }
    } catch (error) {
      console.error('Error updating store context session:', error);
    }
  }, [storeSlug, isStoreMode, currentPage]);

  useEffect(() => {
    const handlePaymobReturn = async () => {
      if (loading) return;

      const pendingOrderId = localStorage.getItem('pending_payment_order_id');
      const expectedOrderReturn = localStorage.getItem('pending_payment_return_expected');

      const pendingSubscriptionPaymentId = localStorage.getItem('pending_subscription_payment_id');
      const expectedSubscriptionReturn = localStorage.getItem(
        'pending_subscription_return_expected'
      );

      const searchParams = new URLSearchParams(window.location.search);
      const paymobTransactionId = searchParams.get('id');
      const paymobOrderId =
        searchParams.get('order') ||
        searchParams.get('order_id') ||
        searchParams.get('merchant_order_id');
      const paymobSuccess = String(searchParams.get('success') || '').toLowerCase() === 'true';
      const hasPaymobParams = hasPotentialPaymobParams();

      const hasPendingOrderFlow = expectedOrderReturn === 'true' && !!pendingOrderId;
      const hasPendingSubscriptionFlow =
        expectedSubscriptionReturn === 'true' && !!pendingSubscriptionPaymentId;

      if (!hasPendingOrderFlow && !hasPendingSubscriptionFlow) {
        return;
      }

      const cleanupOrderPaymentReturn = () => {
        localStorage.removeItem('pending_payment_order_id');
        localStorage.removeItem('pending_payment_started_at');
        localStorage.removeItem('pending_payment_return_expected');

        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setIsHandlingPaymentReturn(false);
      };

      const cleanupSubscriptionPaymentReturn = () => {
        localStorage.removeItem('pending_subscription_payment_id');
        localStorage.removeItem('pending_subscription_plan_id');
        localStorage.removeItem('pending_subscription_started_at');
        localStorage.removeItem('pending_subscription_return_expected');

        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setIsHandlingPaymentReturn(false);
      };

      const goToSuccess = (resolvedOrderId?: string | null) => {
        const finalOrderId = resolvedOrderId || pendingOrderId;
        if (finalOrderId) {
          setCurrentPage(`payment-success-${finalOrderId}`);
        } else {
          setCurrentPage(storeSlug ? `store-orders-${storeSlug}` : 'orders');
        }
      };

      const goToFailed = (resolvedOrderId?: string | null) => {
        const finalOrderId = resolvedOrderId || pendingOrderId;
        if (finalOrderId) {
          setCurrentPage(`payment-failed-${finalOrderId}`);
        } else {
          setCurrentPage('payment-failed');
        }
      };

      const goToSubscriptionSuccess = (resolvedPaymentId?: string | null) => {
        const finalPaymentId = resolvedPaymentId || pendingSubscriptionPaymentId;
        if (finalPaymentId) {
          setCurrentPage(`subscription-success-${finalPaymentId}`);
        } else {
          setCurrentPage('pricing');
        }
      };

      const goToSubscriptionFailed = (resolvedPaymentId?: string | null) => {
        const finalPaymentId = resolvedPaymentId || pendingSubscriptionPaymentId;
        if (finalPaymentId) {
          setCurrentPage(`subscription-failed-${finalPaymentId}`);
        } else {
          setCurrentPage('pricing');
        }
      };

      const findOrderDirectly = async () => {
        if (paymobTransactionId) {
          const { data } = await supabase
            .from('orders')
            .select('id, status, payment_transaction_id, payment_provider_order_id')
            .eq('payment_transaction_id', String(paymobTransactionId))
            .maybeSingle();

          if (data) return data;
        }

        if (paymobOrderId) {
          const { data } = await supabase
            .from('orders')
            .select('id, status, payment_transaction_id, payment_provider_order_id')
            .eq('payment_provider_order_id', String(paymobOrderId))
            .maybeSingle();

          if (data) return data;
        }

        if (pendingOrderId) {
          const { data } = await supabase
            .from('orders')
            .select('id, status, payment_transaction_id, payment_provider_order_id')
            .eq('id', String(pendingOrderId))
            .maybeSingle();

          if (data) return data;
        }

        return null;
      };

      const pollDirectOrderStatus = async () => {
        for (let attempt = 1; attempt <= 8; attempt++) {
          const directOrder = await findOrderDirectly();

          if (
            directOrder?.status === 'paid' ||
            directOrder?.status === 'completed' ||
            directOrder?.status === 'failed' ||
            directOrder?.status === 'cancelled'
          ) {
            return directOrder;
          }

          if (attempt < 8) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        return await findOrderDirectly();
      };

      const findSubscriptionPaymentDirectly = async (): Promise<SubscriptionPaymentStatusRow | null> => {
        if (!pendingSubscriptionPaymentId) return null;

        const { data, error } = await supabase
          .from('subscription_payments')
          .select('id, status, plan_id, amount, currency')
          .eq('id', String(pendingSubscriptionPaymentId))
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription payment directly:', error);
          return null;
        }

        return (data as SubscriptionPaymentStatusRow | null) || null;
      };

      const pollSubscriptionPaymentStatus = async () => {
        for (let attempt = 1; attempt <= 8; attempt++) {
          const payment = await findSubscriptionPaymentDirectly();

          if (
            payment?.status === 'paid' ||
            payment?.status === 'completed' ||
            payment?.status === 'active' ||
            payment?.status === 'failed' ||
            payment?.status === 'cancelled'
          ) {
            return payment;
          }

          if (attempt < 8) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        return await findSubscriptionPaymentDirectly();
      };

      if (hasPendingOrderFlow) {
        setIsHandlingPaymentReturn(true);

        try {
          if (hasPaymobParams) {
            const paymobReturnParams = Object.fromEntries(searchParams.entries());

            const verifyOnce = async () => {
              const { data, error } = await supabase.functions.invoke('verify-paymob-transaction', {
                body: {
                  order_id: pendingOrderId,
                  transaction_id: paymobTransactionId,
                  paymob_order_id: paymobOrderId,
                  paymob_return_params: paymobReturnParams,
                },
              });

              return { data, error };
            };

            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

            let finalData: any = null;
            let finalError: any = null;

            for (let attempt = 1; attempt <= 8; attempt++) {
              const { data, error } = await verifyOnce();

              finalData = data;
              finalError = error;

              console.log('verify-paymob-transaction attempt:', attempt, {
                paymobTransactionId,
                paymobOrderId,
                pendingOrderId,
                data,
                error,
              });

              if (!error && data?.success) {
                const resolvedOrderId = data?.order?.id || pendingOrderId;
                const resolvedStatus = data?.status || data?.order?.status;

                if (data?.verified === true || data?.paid === true || resolvedStatus === 'paid') {
                  goToSuccess(resolvedOrderId);
                  cleanupOrderPaymentReturn();
                  return;
                }

                if (
                  data?.failed === true ||
                  resolvedStatus === 'failed' ||
                  resolvedStatus === 'cancelled'
                ) {
                  goToFailed(resolvedOrderId);
                  cleanupOrderPaymentReturn();
                  return;
                }
              }

              if (attempt < 8) {
                await sleep(paymobSuccess ? 2000 : 1200);
              }
            }

            console.error('Payment verification final result:', { finalData, finalError });
          }

          const directOrder = await pollDirectOrderStatus();

          if (directOrder?.status === 'paid' || directOrder?.status === 'completed') {
            goToSuccess(directOrder.id);
            cleanupOrderPaymentReturn();
            return;
          }

          if (directOrder?.status === 'failed' || directOrder?.status === 'cancelled') {
            goToFailed(directOrder.id);
            cleanupOrderPaymentReturn();
            return;
          }

          if (paymobSuccess) {
            goToSuccess(directOrder?.id || pendingOrderId);
            cleanupOrderPaymentReturn();
            return;
          }

          if (hasPaymobParams) {
            goToFailed(directOrder?.id || pendingOrderId);
            cleanupOrderPaymentReturn();
            return;
          }

          setCurrentPage(`payment-${pendingOrderId}`);
        } catch (err) {
          console.error('Error handling order Paymob return:', err);

          try {
            const directOrder = await pollDirectOrderStatus();

            if (directOrder?.status === 'paid' || directOrder?.status === 'completed') {
              goToSuccess(directOrder.id);
            } else if (directOrder?.status === 'failed' || directOrder?.status === 'cancelled') {
              goToFailed(directOrder.id);
            } else if (paymobSuccess) {
              goToSuccess(directOrder?.id || pendingOrderId);
            } else {
              goToFailed(directOrder?.id || pendingOrderId);
            }
          } catch (fallbackErr) {
            console.error('Fallback DB check after catch failed:', fallbackErr);

            if (paymobSuccess) {
              goToSuccess(pendingOrderId);
            } else {
              goToFailed(pendingOrderId);
            }
          }
        } finally {
          cleanupOrderPaymentReturn();
        }

        return;
      }

      if (hasPendingSubscriptionFlow) {
        setIsHandlingPaymentReturn(true);

        try {
          const subscriptionPayment = await pollSubscriptionPaymentStatus();

          if (
            subscriptionPayment?.status === 'paid' ||
            subscriptionPayment?.status === 'completed' ||
            subscriptionPayment?.status === 'active'
          ) {
            goToSubscriptionSuccess(subscriptionPayment.id);
            cleanupSubscriptionPaymentReturn();
            return;
          }

          if (
            subscriptionPayment?.status === 'failed' ||
            subscriptionPayment?.status === 'cancelled'
          ) {
            goToSubscriptionFailed(subscriptionPayment.id);
            cleanupSubscriptionPaymentReturn();
            return;
          }

          if (paymobSuccess) {
            goToSubscriptionSuccess(subscriptionPayment?.id || pendingSubscriptionPaymentId);
            cleanupSubscriptionPaymentReturn();
            return;
          }

          if (hasPaymobParams) {
            goToSubscriptionFailed(subscriptionPayment?.id || pendingSubscriptionPaymentId);
            cleanupSubscriptionPaymentReturn();
            return;
          }

          setCurrentPage('pricing');
        } catch (err) {
          console.error('Error handling subscription Paymob return:', err);

          try {
            const subscriptionPayment = await pollSubscriptionPaymentStatus();

            if (
              subscriptionPayment?.status === 'paid' ||
              subscriptionPayment?.status === 'completed' ||
              subscriptionPayment?.status === 'active'
            ) {
              goToSubscriptionSuccess(subscriptionPayment.id);
            } else if (
              subscriptionPayment?.status === 'failed' ||
              subscriptionPayment?.status === 'cancelled'
            ) {
              goToSubscriptionFailed(subscriptionPayment.id);
            } else if (paymobSuccess) {
              goToSubscriptionSuccess(subscriptionPayment?.id || pendingSubscriptionPaymentId);
            } else {
              goToSubscriptionFailed(subscriptionPayment?.id || pendingSubscriptionPaymentId);
            }
          } catch (fallbackErr) {
            console.error('Fallback subscription check after catch failed:', fallbackErr);

            if (paymobSuccess) {
              goToSubscriptionSuccess(pendingSubscriptionPaymentId);
            } else {
              goToSubscriptionFailed(pendingSubscriptionPaymentId);
            }
          }
        } finally {
          cleanupSubscriptionPaymentReturn();
        }
      }
    };

    handlePaymobReturn();
  }, [loading, storeSlug]);

  useEffect(() => {
    if (isHandlingPaymentReturn) return;

    const pendingOrderExpected = (() => {
      try {
        return localStorage.getItem('pending_payment_return_expected') === 'true';
      } catch {
        return false;
      }
    })();

    const pendingSubscriptionExpected = (() => {
      try {
        return localStorage.getItem('pending_subscription_return_expected') === 'true';
      } catch {
        return false;
      }
    })();

    if ((pendingOrderExpected || pendingSubscriptionExpected) && hasPotentialPaymobParams()) {
      return;
    }

    const targetPath = getPublicPathFromPage(currentPage);
    const currentPath = `${window.location.pathname.replace(/\/+$/, '') || '/'}${window.location.search || ''}`;

    if (!hasInitializedRouteSync.current) {
      hasInitializedRouteSync.current = true;

      if (targetPath) {
        if (currentPath !== targetPath) {
          window.history.replaceState({}, document.title, targetPath);
        }
      }
      return;
    }

    if (!targetPath) {
      return;
    }

    if (currentPath !== targetPath) {
      window.history.pushState({}, document.title, targetPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, isHandlingPaymentReturn]);

  useEffect(() => {
    if (isHandlingPaymentReturn) return;
    if (currentPage === 'auth-reset-password') return;
    if (!user || loading || !typedProfile) return;

    if (!signupCompleted) {
      if (currentPage !== 'auth-signup') {
        setCurrentPage('auth-signup');
      }
      return;
    }

    if (
      typedProfile.role === 'seller' &&
      hasBankDetails === false &&
      currentPage !== 'merchant-bank-details'
    ) {
      setCurrentPage('merchant-bank-details');
      return;
    }

    if (isAuthRoute(currentPage) && currentPage !== 'auth-reset-password') {
      if (typedProfile.role === 'admin' || typedProfile.role === 'superadmin') {
        setCurrentPage('admin-dashboard');
      } else if (typedProfile.role === 'seller') {
        setCurrentPage('seller-dashboard');
      } else if (storeSlug) {
        setCurrentPage(`store-profile-${storeSlug}`);
      } else {
        setCurrentPage('home');
      }
    }
  }, [
    user,
    typedProfile,
    signupCompleted,
    loading,
    currentPage,
    hasBankDetails,
    isHandlingPaymentReturn,
    storeSlug,
  ]);

  useEffect(() => {
    const checkBankDetails = async () => {
      if (!user || !typedProfile || typedProfile.role !== 'seller') {
        setHasBankDetails(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('merchant_payout_accounts')
          .select('id')
          .eq('merchant_id', typedProfile.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking bank details:', error);
          setHasBankDetails(null);
          return;
        }

        setHasBankDetails(!!data);
      } catch (err) {
        console.error('Error in checkBankDetails:', err);
        setHasBankDetails(null);
      }
    };

    if (user && typedProfile && signupCompleted) {
      checkBankDetails();
    }
  }, [user, typedProfile, signupCompleted]);

  if (loading || isHandlingPaymentReturn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">
            {isHandlingPaymentReturn ? 'جاري التحقق من حالة الدفع...' : 'جاري التحميل...'}
          </p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (currentPage === 'affiliate-report') {
      return <MarketerAffiliateStatsPage />;
    }

    if (currentPage.startsWith('subscription-success-')) {
      const paymentId = currentPage.replace('subscription-success-', '');
      return (
        <SubscriptionStatusPage
          status="success"
          paymentId={paymentId}
          onNavigate={navigateWithContext}
        />
      );
    }

    if (currentPage.startsWith('subscription-failed-')) {
      const paymentId = currentPage.replace('subscription-failed-', '');
      return (
        <SubscriptionStatusPage
          status="failed"
          paymentId={paymentId}
          onNavigate={navigateWithContext}
        />
      );
    }

    if (currentPage.startsWith('product-slug-')) {
      const productSlug = currentPage.replace('product-slug-', '');
      return <ProductDetailPage productSlug={productSlug} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('product-')) {
      const productId = currentPage.replace('product-', '');
      return <ProductDetailPage productId={productId} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-detail-')) {
      const storeId = currentPage.replace('store-detail-', '');
      return <StoreDetailPage storeId={storeId} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('storefront-')) {
      const storeSlugValue = currentPage.replace('storefront-', '');
      return <StorefrontPage storeSlug={storeSlugValue} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-profile-orders-tab-')) {
      return <ProfilePage onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-profile-')) {
      return <ProfilePage onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-orders-')) {
      return <OrdersPage onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-favorites-')) {
      return <FavoritesPage onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('store-viewed-products-')) {
      return <ViewedProductsPage onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('marketer-analytics-')) {
      const marketerId = currentPage.replace('marketer-analytics-', '');
      return <MarketerAnalyticsPage marketerId={marketerId} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('payment-success-')) {
      const orderId = currentPage.replace('payment-success-', '');
      return <PaymentSuccessPage orderId={orderId} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('payment-failed-')) {
      const orderId = currentPage.replace('payment-failed-', '');
      return <PaymentFailedPage orderId={orderId} onNavigate={navigateWithContext} />;
    }

    if (currentPage.startsWith('payment-')) {
      const orderId = currentPage.replace('payment-', '');
      return <PaymentPage orderId={orderId} onNavigate={navigateWithContext} />;
    }

    if (
      currentPage === 'seller-dashboard' ||
      currentPage === 'seller-dashboard-overview' ||
      currentPage.startsWith('seller-dashboard-')
    ) {
      return typedProfile?.role === 'seller' || typedProfile?.role === 'admin' ? (
        <SellerDashboard onNavigate={navigateWithContext} />
      ) : (
        <HomePage onNavigate={navigateWithContext} />
      );
    }

    if (
      currentPage === 'admin' ||
      currentPage === 'admin-dashboard' ||
      currentPage === 'admin-dashboard-overview' ||
      currentPage.startsWith('admin-dashboard-')
    ) {
      return typedProfile?.role === 'admin' || typedProfile?.role === 'superadmin' ? (
        <AdminDashboard onNavigate={navigateWithContext} />
      ) : (
        <HomePage onNavigate={navigateWithContext} />
      );
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigateWithContext} />;

      case 'auth':
      case 'auth-login':
        return (
          <AuthPage
            storeMode={!!storeSlug}
            storeSlug={storeSlug || undefined}
            onNavigate={navigateWithContext}
            initialMode="login"
          />
        );

      case 'auth-signup':
        return (
          <AuthPage
            storeMode={!!storeSlug}
            storeSlug={storeSlug || undefined}
            onNavigate={navigateWithContext}
            initialMode="signup"
          />
        );

      case 'auth-forgot-password':
        return (
          <AuthPage
            storeMode={false}
            onNavigate={navigateWithContext}
            initialMode="forgot-password"
          />
        );

      case 'auth-reset-password':
        return (
          <AuthPage
            storeMode={false}
            onNavigate={navigateWithContext}
            initialMode="reset-password"
          />
        );

      case 'verify-phone':
        return <VerifyPhonePage />;

      case 'merchant-bank-details':
        return <MerchantBankDetailsPage onNavigate={navigateWithContext} />;

      case 'pricing':
        return <PricingPage onNavigate={navigateWithContext} />;

      case 'marketplace':
        return <MarketplacePage onNavigate={navigateWithContext} />;

      case 'user-dashboard':
        return <ProfilePage onNavigate={navigateWithContext} />;

      case 'admin-affiliate-management':
        return typedProfile?.role === 'admin' || typedProfile?.role === 'superadmin' ? (
          <AdminAffiliateManagementPage onNavigate={navigateWithContext} />
        ) : (
          <HomePage onNavigate={navigateWithContext} />
        );

      case 'affiliate-dashboard':
        return typedProfile?.role === 'seller' ||
          typedProfile?.role === 'admin' ||
          typedProfile?.role === 'superadmin' ? (
          <AffiliateDashboard onNavigate={navigateWithContext} />
        ) : (
          <HomePage onNavigate={navigateWithContext} />
        );

      case 'coupons-management':
        return typedProfile?.role === 'seller' ||
          typedProfile?.role === 'admin' ||
          typedProfile?.role === 'superadmin' ? (
          <CouponsManagementPage onNavigate={navigateWithContext} />
        ) : (
          <HomePage onNavigate={navigateWithContext} />
        );

      case 'affiliate-management':
        return typedProfile?.role === 'seller' ||
          typedProfile?.role === 'admin' ||
          typedProfile?.role === 'superadmin' ? (
          <AffiliateManagementPage onNavigate={navigateWithContext} />
        ) : (
          <HomePage onNavigate={navigateWithContext} />
        );

      case 'cart':
        return <CartPage onNavigate={navigateWithContext} />;

      case 'checkout':
        return <CheckoutPage onNavigate={navigateWithContext} />;

      case 'payment-failed':
        return <PaymentFailedPage onNavigate={navigateWithContext} />;

      case 'orders':
        return <OrdersPage onNavigate={navigateWithContext} />;

      case 'orders-management':
        return <OrdersManagementPage onNavigate={navigateWithContext} />;

      case 'payment-settings':
        return <PaymentSettingsPage onNavigate={navigateWithContext} />;

      case 'bank-account':
        return <BankAccountPage onNavigate={navigateWithContext} />;

      case 'withdrawal-requests':
        return <WithdrawalRequestsPage onNavigate={navigateWithContext} />;

      case 'admin-withdrawals':
        return <AdminWithdrawalsPage onNavigate={navigateWithContext} />;

      case 'transactions':
        return <TransactionsPage onNavigate={navigateWithContext} />;

      case 'admin-management':
        return <AdminManagementPage onNavigate={navigateWithContext} />;

      case 'admin-verification-apis':
        return <AdminVerificationApisPage onNavigate={navigateWithContext} />;

      case 'merchant-withdraw':
        return <MerchantWithdrawPage onNavigate={navigateWithContext} />;

      case 'admin-announcements':
        return <AdminAnnouncementsPage onNavigate={navigateWithContext} />;

      case 'favorites':
        return <FavoritesPage onNavigate={navigateWithContext} />;

      case 'viewed-products':
        return <ViewedProductsPage onNavigate={navigateWithContext} />;

      case 'support':
        return <SupportPage />;

      case 'profile-orders-tab':
      case 'profile':
        return <ProfilePage onNavigate={navigateWithContext} />;

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
        return <MerchantAgreementPage />;

      default:
        return <HomePage onNavigate={navigateWithContext} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {!shouldHidePlatformChrome && <AnnouncementBanner />}
      {!shouldHidePlatformChrome && (
        <Navbar onNavigate={navigateWithContext} currentPage={currentPage} />
      )}
      <main className="flex-1">{renderPage()}</main>
      {!shouldHidePlatformChrome && <Footer onNavigate={navigateWithContext} />}
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
