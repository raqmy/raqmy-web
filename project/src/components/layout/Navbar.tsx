import React from 'react';
import { User, LogOut, LayoutDashboard, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const getScopedStoreSlug = (page: string): string | null => {
  const prefixes = [
    'storefront-',
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

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, profile, signOut } = useAuth();

  const scopedStoreSlug = getScopedStoreSlug(currentPage);
  const avatarUrl = ((profile as any)?.avatar_url as string) || '';
  const isSeller = !!user && profile?.role === 'seller';

  const clearStoreContext = () => {
    try {
      sessionStorage.removeItem('active_store_slug');
      sessionStorage.removeItem('store_mode_source');
    } catch (error) {
      console.error('Error clearing store context:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      clearStoreContext();
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleHomeNavigate = () => {
    if (scopedStoreSlug) {
      onNavigate(`storefront-${scopedStoreSlug}`);
      return;
    }

    onNavigate('home');
  };

  const handleProfileNavigate = () => {
    if (scopedStoreSlug) {
      onNavigate(`store-profile-${scopedStoreSlug}`);
      return;
    }

    onNavigate('profile');
  };

  const handleAuthNavigate = (target: 'login' | 'signup' = 'login') => {
    if (scopedStoreSlug) {
      try {
        sessionStorage.setItem('active_store_slug', scopedStoreSlug);
        sessionStorage.setItem('store_mode_source', 'storefront');
      } catch (error) {
        console.error('Error saving store context before auth:', error);
      }
    }

    onNavigate(target === 'signup' ? 'auth-signup' : 'auth-login');
  };

  const renderProfileAvatar = () => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={profile?.name || 'الصورة الشخصية'}
          className="w-full h-full rounded-full object-cover"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';

            const fallback = target.parentElement?.querySelector('[data-avatar-fallback]');
            if (fallback) {
              (fallback as HTMLElement).style.display = 'flex';
            }
          }}
        />
      );
    }

    return null;
  };

  const fallbackLetter = (profile?.name?.trim()?.charAt(0) || 'U').toUpperCase();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-8">
            <button
              onClick={handleHomeNavigate}
              className="flex items-center justify-center"
              aria-label="الذهاب إلى الرئيسية"
            >
              <img
                src="/raqmy-logo.png"
                alt="رقمي Raqmy"
                className="h-14 w-14 rounded-xl object-contain shadow-sm"
                onError={(event) => {
                  const target = event.currentTarget;
                  target.style.display = 'none';

                  const fallback = target.parentElement?.querySelector('[data-logo-fallback]');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'inline-flex';
                  }
                }}
              />

              <span
                data-logo-fallback
                className="hidden text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                رقمي
              </span>
            </button>

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={handleHomeNavigate}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'home'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                الرئيسية
              </button>

              <button
                onClick={() => onNavigate('marketplace')}
                className={`text-sm font-medium transition-colors ${
                  currentPage === 'marketplace'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                المتجر العام
              </button>

              {isSeller && (
                <button
                  onClick={() => onNavigate('pricing')}
                  className={`text-sm font-medium transition-colors ${
                    currentPage === 'pricing'
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  الباقات
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && profile ? (
              <>
                <button
                  onClick={() => onNavigate('cart')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>السلة</span>
                </button>

                {(profile.role === 'admin' || profile.role === 'seller') && (
                  <button
                    onClick={() =>
                      onNavigate(profile.role === 'admin' ? 'admin' : 'seller-dashboard')
                    }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>لوحة التحكم</span>
                  </button>
                )}

                <button
                  onClick={handleProfileNavigate}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center relative">
                    {renderProfileAvatar()}

                    <div
                      data-avatar-fallback
                      className={`absolute inset-0 items-center justify-center text-white ${
                        avatarUrl ? 'hidden' : 'flex'
                      }`}
                    >
                      {avatarUrl ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold">{fallbackLetter}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                    <p className="text-xs text-gray-500">
                      {profile.role === 'admin'
                        ? 'مدير'
                        : profile.role === 'seller'
                        ? 'تاجر'
                        : 'عميل'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAuthNavigate('login')}
                  className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  تسجيل الدخول
                </button>

                <button
                  onClick={() => handleAuthNavigate('signup')}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  ابدأ الآن
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
