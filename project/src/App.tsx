import { useState, useEffect, useRef } from 'react';
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
import { VerifyPhonePage } from './pages/VerifyPhonePage';
import { MerchantBankDetailsPage } from './pages/MerchantBankDetailsPage';
import { supabase } from './lib/supabase';

const parsePathToPage = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) return 'home';

  if (segments[0] === 's' && segments[1]) {
    return `storefront-${decodeURIComponent(segments[1])}`;
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

  const staticRoutes: Record<string, string> = {
    auth: 'auth',
    pricing: 'pricing',
    marketplace: 'marketplace',
    'seller-dashboard': 'seller-dashboard',
    'user-dashboard': 'user-dashboard',
    admin: 'admin',
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
    };
  } catch {
    return { slug: null as string | null, source: null as string | null };
  }
};

const getActiveStoreSlugFromContext = (page: string): string | null => {
  if (page.startsWith('storefront-')) {
    return page.replace('storefront-', '') || null;
  }

  const queryStoreSlug = new URLSearchParams(window.location.search).get('store');
  if (queryStoreSlug) return queryStoreSlug;

  const { slug, source } = getStoredStoreContext();
  if ((page === 'auth' || page.startsWith('product-slug-') || page.startsWith('product-')) && source === 'storefront' && slug) {
    return slug;
  }

  return null;
};

const isStorefrontPage = (page: string) => page.startsWith('storefront-');
const isStoreProductPage = (page: string) =>
  (page.startsWith('product-slug-') || page.startsWith('product-')) && !!getActiveStoreSlugFromContext(page);
const isStoreAuthPage = (page: string) => page === 'auth' && !!getActiveStoreSlugFromContext(page);
const isStoreContextPage = (page: string) => isStorefrontPage(page) || isStoreProductPage(page) || isStoreAuthPage(page);

const getPublicPathFromPage = (page: string) => {
  const activeStoreSlug = getActiveStoreSlugFromContext(page);

  if (page.startsWith('storefront-')) {
    return `/s/${encodeURIComponent(page.replace('storefront-', ''))}`;
  }

  if (page.startsWith('product-slug-')) {
    const slug = encodeURIComponent(page.replace('product-slug-', ''));
    if (activeStoreSlug) {
      return `/p/${slug}?store=${encodeURIComponent(activeStoreSlug)}`;
    }
    return `/p/${slug}`;
  }

  if (page.startsWith('payment-success-')) {
    return `/payment-success/${encodeURIComponent(page.replace('payment-success-', ''))}`;
  }

  if (page.startsWith('payment-failed-')) {
    return `/payment-failed/${encodeURIComponent(page.replace('payment-failed-', ''))}`;
  }

  if (page.startsWith('payment-')) {
    return `/payment/${encodeURIComponent(page.replace('payment-', ''))}`;
  }

  const publicRoutes: Record<string, string> = {
    home: '/',
    auth: '/auth',
    pricing: '/pricing',
    marketplace: '/marketplace',
    support: '/support',
    'privacy-policy': '/privacy-policy',
    'refund-policy': '/refund-policy',
    'affiliate-policy': '/affiliate-policy',
    'merchant-agreement': '/merchant-agreement',
    privacy: '/privacy',
    terms: '/terms',
  };

  return publicRoutes[page] || null;
};

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => parsePathToPage(window.location.pathname));
  const [hasBankDetails, setHasBankDetails] = useState<boolean | null>(null);
  const [isHandlingPaymentReturn, setIsHandlingPaymentReturn] = useState(false);
  const hasInitializedRouteSync = useRef(false);

  const storeSlug = getActiveStoreSlugFromContext(currentPage);
  const isStoreMode = isStoreContextPage(currentPage);
  const shouldHidePlatformChrome = isStoreMode;

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(parsePathToPage(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      if (storeSlug && isStoreMode) {
        sessionStorage.setItem('active_store_slug', storeSlug);
        if (isStorefrontPage(currentPage) || isStoreProductPage(currentPage) || isStoreAuthPage(currentPage)) {
          sessionStorage.setItem('store_mode_source', 'storefront');
        }
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
    if (isHandlingPaymentReturn) return;

    const targetPath = getPublicPathFromPage(currentPage);
    const currentPath = `${window.location.pathname.replace(/\/+$/, '') || '/'}${window.location.search || ''}`;

    if (!hasInitializedRouteSync.current) {
      hasInitializedRouteSync.current = true;

      if (targetPath) {
        const normalizedTargetPath = targetPath;

        if (currentPath !== normalizedTargetPath) {
          window.history.replaceState({}, document.title, normalizedTargetPath);
        }
      }
      return;
    }

    if (!targetPath) {
      return;
    }

    const normalizedTargetPath = targetPath;

    if (currentPath !== normalizedTargetPath) {
      window.history.pushState({}, document.title, normalizedTargetPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, isHandlingPaymentReturn]);

  useEffect(() => {
    const checkBankDetails = async () => {
      if (!user || !profile || profile.role !== 'seller') {
        setHasBankDetails(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('merchant_payout_accounts')
          .select('id')
          .eq('merchant_id', profile.id)
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

    if (user && profile) {
      checkBankDetails();
    }
  }, [user, profile]);

  useEffect(() => {
    const handlePaymobReturn = async () => {
      if (loading) return;

      const pendingOrderId = localStorage.getItem('pending_payment_order_id');
      const expectedReturn = localStorage.getItem('pending_payment_return_expected');
      const searchParams = new URLSearchParams(window.location.search);

      const paymobTransactionId = searchParams.get('id');
      const paymobOrderId =
        searchParams.get('order') ||
        searchParams.get('order_id') ||
        searchParams.get('merchant_order_id');
      const paymobSuccess = String(searchParams.get('success') || '').toLowerCase() === 'true';

      const hasPaymobParams =
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
        searchParams.has('merchant_order_id');

      if (expectedReturn !== 'true' || !hasPaymobParams) {
        return;
      }

      const cleanupPaymentReturn = () => {
        localStorage.removeItem('pending_payment_order_id');
        localStorage.removeItem('pending_payment_started_at');
        localStorage.removeItem('pending_payment_return_expected');

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
          setCurrentPage('orders');
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

      setIsHandlingPaymentReturn(true);

      try {
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
              cleanupPaymentReturn();
              return;
            }

            if (
              data?.failed === true ||
              resolvedStatus === 'failed' ||
              resolvedStatus === 'cancelled'
            ) {
              goToFailed(resolvedOrderId);
              cleanupPaymentReturn();
              return;
            }
          }

          if (attempt < 8) {
            await sleep(paymobSuccess ? 2000 : 1200);
          }
        }

        console.error('Payment verification final result:', { finalData, finalError });

        const directOrder = await findOrderDirectly();

        if (directOrder?.status === 'paid') {
          goToSuccess(directOrder.id);
          cleanupPaymentReturn();
          return;
        }

        if (directOrder?.status === 'failed' || directOrder?.status === 'cancelled') {
          goToFailed(directOrder.id);
          cleanupPaymentReturn();
          return;
        }

        if (paymobSuccess) {
          goToSuccess(directOrder?.id || pendingOrderId);
          cleanupPaymentReturn();
          return;
        }

        goToFailed(directOrder?.id || pendingOrderId);
      } catch (err) {
        console.error('Error handling Paymob return:', err);

        try {
          const directOrder = await findOrderDirectly();

          if (directOrder?.status === 'paid') {
            goToSuccess(directOrder.id);
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
        cleanupPaymentReturn();
      }
    };

    handlePaymobReturn();
  }, [loading]);

  useEffect(() => {
    if (isHandlingPaymentReturn) return;

    if (user && !loading && profile) {
      if (!profile.phone_verified && currentPage !== 'verify-phone') {
        setCurrentPage('verify-phone');
        return;
      }

      if (
        profile.phone_verified &&
        profile.role === 'seller' &&
        hasBankDetails === false &&
        currentPage !== 'merchant-bank-details'
      ) {
        setCurrentPage('merchant-bank-details');
        return;
      }

      if (currentPage === 'auth') {
        if (profile.role === 'admin' || profile.role === 'superadmin') {
          setCurrentPage('admin');
        } else if (profile.role === 'seller') {
          setCurrentPage('seller-dashboard');
        } else if (storeSlug) {
          setCurrentPage(`storefront-${storeSlug}`);
        } else {
          setCurrentPage('home');
        }
      }
    }
  }, [user, profile, loading, currentPage, hasBankDetails, isHandlingPaymentReturn, storeSlug]);

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
    if (currentPage.startsWith('product-slug-')) {
      const productSlug = currentPage.replace('product-slug-', '');
      return <ProductDetailPage productSlug={productSlug} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('product-')) {
      const productId = currentPage.replace('product-', '');
      return <ProductDetailPage productId={productId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('store-detail-')) {
      const storeId = currentPage.replace('store-detail-', '');
      return <StoreDetailPage storeId={storeId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('storefront-')) {
      const storeSlugValue = currentPage.replace('storefront-', '');
      return <StorefrontPage storeSlug={storeSlugValue} onNavigate={setCurrentPage} />;
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
        return <AuthPage storeMode={!!storeSlug} storeSlug={storeSlug || undefined} onNavigate={setCurrentPage} />;
      case 'verify-phone':
        return <VerifyPhonePage />;
      case 'merchant-bank-details':
        return <MerchantBankDetailsPage onNavigate={setCurrentPage} />;
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
        return <ProfilePage onNavigate={setCurrentPage} />;
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
        return <MerchantAgreementPage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {!shouldHidePlatformChrome && <AnnouncementBanner />}
      {!shouldHidePlatformChrome && <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />}
      <main className="flex-1">{renderPage()}</main>
      {!shouldHidePlatformChrome && <Footer onNavigate={setCurrentPage} />}
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
