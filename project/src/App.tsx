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
import { TermsPage } from './pages/TermsPage'; // ✅ أضفنا هذا السطر
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [hasBankDetails, setHasBankDetails] = useState<boolean | null>(null);

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
        } else {
          setCurrentPage('home');
        }
      }
    }
  }, [user, profile, loading, currentPage, hasBankDetails]);

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

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'privacy':
        return <PrivacyPolicyPage />;
      case 'terms':
        return <TermsPage />; // ✅ الآن سيعمل بدون شاشة بيضاء
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
