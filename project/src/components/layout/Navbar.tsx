import React from 'react';
import { Store, User, LogOut, LayoutDashboard, ShoppingBag, Share2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-2xl font-bold"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                رقمي
              </span>
            </button>

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
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
                      onNavigate(
                        profile.role === 'admin'
                          ? 'admin'
                          : 'seller-dashboard'
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>لوحة التحكم</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('profile')}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
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
                  onClick={() => onNavigate('auth')}
                  className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => onNavigate('auth')}
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
