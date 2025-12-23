import React, { useState } from 'react';
import {
  User,
  Mail,
  Camera,
  Save,
  ShoppingBag,
  Heart,
  Eye,
  Package,
  Store as StoreIcon,
  BarChart3,
  Settings as SettingsIcon,
  TrendingUp,
  DollarSign,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'stores' | 'products' | 'analytics' | 'settings'
  >('overview');
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage('');
    try {
      await updateProfile({ name });
      setMessage('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      setMessage('فشل تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (profile?.role === 'seller') return;

    const confirm = window.confirm('هل تريد ترقية حسابك إلى حساب تاجر؟ ستتمكن من إنشاء متاجر وبيع المنتجات.');
    if (!confirm) return;

    setLoading(true);
    try {
      await updateProfile({ role: 'seller' });
      setMessage('تم ترقية حسابك إلى تاجر بنجاح! يمكنك الآن إنشاء متجرك الأول.');
      setTimeout(() => {
        onNavigate('seller-dashboard');
      }, 2000);
    } catch (error) {
      setMessage('فشل ترقية الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = 'DELETE';
    const userInput = window.prompt(
      `تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\n` +
      `سيتم حذف:\n` +
      `- حسابك وجميع بياناتك الشخصية\n` +
      (profile?.role === 'seller' ? `- جميع متاجرك ومنتجاتك\n- جميع مبيعاتك وعمولاتك\n` : '') +
      `\nاكتب "${confirmText}" للتأكيد:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        setMessage('لم يتم حذف الحساب');
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      if (error) throw error;

      await supabase.auth.signOut();
      onNavigate('home');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setMessage('حدث خطأ أثناء حذف الحساب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول أولاً</p>
          <button
            onClick={() => onNavigate('auth')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute -bottom-16 right-8">
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white flex items-center justify-center text-4xl font-bold text-blue-600">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <button className="absolute bottom-0 left-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="pt-20 pb-6 px-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                <p className="text-gray-600">
                  {user.email}
                  {' • '}
                  <span
                    className={`font-semibold ${
                      profile.role === 'admin'
                        ? 'text-red-600'
                        : profile.role === 'seller'
                        ? 'text-blue-600'
                        : 'text-green-600'
                    }`}
                  >
                    {profile.role === 'admin' ? 'مدير' : profile.role === 'seller' ? 'تاجر' : 'عميل'}
                  </span>
                </p>
              </div>
              {profile.role === 'customer' && (
                <button
                  onClick={handleUpgradeToSeller}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  ترقية إلى حساب تاجر
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-5 h-5" />
                <span>نظرة عامة</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>مشترياتي</span>
              </button>

              <button
                onClick={() => onNavigate('favorites')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-600 hover:bg-gray-50"
              >
                <Heart className="w-5 h-5" />
                <span>المفضلة</span>
              </button>

              <button
                onClick={() => onNavigate('viewed-products')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-600 hover:bg-gray-50"
              >
                <Eye className="w-5 h-5" />
                <span>تمت مشاهدتها</span>
              </button>

              {profile.role === 'seller' && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={() => setActiveTab('stores')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === 'stores'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <StoreIcon className="w-5 h-5" />
                    <span>متاجري</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('products')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === 'products'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span>منتجاتي</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === 'analytics'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>التحليلات</span>
                  </button>
                </>
              )}

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span>الإعدادات</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">نظرة عامة</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
                      <p className="text-sm text-gray-600">إجمالي المشتريات</p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Heart className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
                      <p className="text-sm text-gray-600">المنتجات المفضلة</p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
                      <p className="text-sm text-gray-600">المنتجات المشاهدة</p>
                    </div>
                  </div>

                  {profile.role === 'seller' && (
                    <div className="mt-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">إحصائيات التاجر</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                          <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8" />
                          </div>
                          <div className="text-3xl font-bold mb-1">0 ريال</div>
                          <p className="text-blue-100">إجمالي الأرباح</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                          <div className="flex items-center justify-between mb-4">
                            <DollarSign className="w-8 h-8" />
                          </div>
                          <div className="text-3xl font-bold mb-1">0</div>
                          <p className="text-purple-100">إجمالي المبيعات</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">مشترياتي</h2>
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد مشتريات</h3>
                    <p className="text-gray-600 mb-6">ابدأ بتصفح المنتجات وشراء ما يعجبك</p>
                    <button
                      onClick={() => onNavigate('marketplace')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      تصفح المنتجات
                    </button>
                  </div>
                </div>
              )}


              {activeTab === 'stores' && profile.role === 'seller' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">متاجري</h2>
                    <button
                      onClick={() => onNavigate('seller-dashboard')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      إنشاء متجر جديد
                    </button>
                  </div>
                  <div className="text-center py-12">
                    <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد متاجر</h3>
                    <p className="text-gray-600">أنشئ متجرك الأول لبدء البيع</p>
                  </div>
                </div>
              )}

              {activeTab === 'products' && profile.role === 'seller' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">منتجاتي</h2>
                    <button
                      onClick={() => onNavigate('seller-dashboard')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      إضافة منتج جديد
                    </button>
                  </div>
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
                    <p className="text-gray-600">ابدأ بإضافة منتجاتك الرقمية</p>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && profile.role === 'seller' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">لوحة التحليلات</h2>
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد بيانات للتحليل</h3>
                    <p className="text-gray-600">ستظهر إحصائياتك هنا بعد بدء المبيعات</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">إعدادات الحساب</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                          dir="ltr"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">لا يمكن تعديل البريد الإلكتروني</p>
                    </div>

                    <button
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      <span>{loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                    </button>

                    <div className="pt-8 mt-8 border-t border-gray-200">
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 mb-1">منطقة الخطر</h3>
                          <p className="text-sm text-red-700">
                            حذف الحساب نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك
                            {profile?.role === 'seller' && ' ومتاجرك ومنتجاتك'}.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>حذف الحساب نهائياً</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
