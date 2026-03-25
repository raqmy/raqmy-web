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
import { VerifyPhonePage } from './pages/VerifyPhonePage';
import { MerchantBankDetailsPage } from './pages/MerchantBankDetailsPage';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [hasBankDetails, setHasBankDetails] = useState<boolean | null>(null);
  const [isHandlingPaymentReturn, setIsHandlingPaymentReturn] = useState(false);

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

      const hasPaymobParams =
        searchParams.has('id') ||
        searchParams.has('success') ||
        searchParams.has('pending') ||
        searchParams.has('txn_response_code') ||
        searchParams.has('amount_cents') ||
        searchParams.has('is_voided') ||
        searchParams.has('is_refunded') ||
        searchParams.has('is_capture');

      if (!pendingOrderId || expectedReturn !== 'true' || !hasPaymobParams) {
        return;
      }

      setIsHandlingPaymentReturn(true);

      try {
        const paymobReturnParams = Object.fromEntries(searchParams.entries());

        const { data, error } = await supabase.functions.invoke('verify-paymob-transaction', {
          body: {
            order_id: pendingOrderId,
            transaction_id: searchParams.get('id'),
            paymob_return_params: paymobReturnParams,
          },
        });

        if (error) {
          console.error('verify-paymob-transaction error:', error);
          setCurrentPage(`payment-failed-${pendingOrderId}`);
        } else if (
          data?.success &&
          (
            data?.verified === true ||
            data?.paid === true ||
            data?.status === 'paid' ||
            data?.status === 'success' ||
            data?.order?.status === 'paid'
          )
        ) {
          setCurrentPage(`payment-success-${pendingOrderId}`);
        } else {
          setCurrentPage(`payment-failed-${pendingOrderId}`);
        }
      } catch (err) {
        console.error('Error handling Paymob return:', err);
        setCurrentPage(`payment-failed-${pendingOrderId}`);
      } finally {
        localStorage.removeItem('pending_payment_order_id');
        localStorage.removeItem('pending_payment_started_at');
        localStorage.removeItem('pending_payment_return_expected');

        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setIsHandlingPaymentReturn(false);
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

      if (profile.phone_verified && profile.role === 'seller' && hasBankDetails === false && currentPage !== 'merchant-bank-details') {
        setCurrentPage('merchant-bank-details');
        return;
      }

      if (currentPage === 'auth') {
        if (profile.role === 'admin' || profile.role === 'superadmin') {
          setCurrentPage('admin');
        } else if (profile.role === 'seller') {
          setCurrentPage('seller-dashboard');
        } else {
          setCurrentPage('home');
        }
      }
    }
  }, [user, profile, loading, currentPage, hasBankDetails, isHandlingPaymentReturn]);

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
        return <TermsPage />;
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
