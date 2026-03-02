import React, { useEffect, useState } from 'react';
import {
  Users,
  Store as StoreIcon,
  Package,
  TrendingUp,
  AlertCircle,
  Trash2,
  Search,
  Settings,
  DollarSign,
  Receipt,
  Shield,
  Save,
  CheckCircle,
  TestTube,
  Megaphone,
} from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalUsers: number;
  totalSellers: number;
  totalStores: number;
  totalProducts: number;
  totalRevenue: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'stores' | 'products' | 'payment-settings'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    totalStores: 0,
    totalProducts: 0,
    totalRevenue: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paymentKeys, setPaymentKeys] = useState({
    api_key: '',
    integration_id: '',
    hmac_secret: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      fetchDashboardData();
      if (activeTab === 'payment-settings') {
        loadPaymentKeys();
      }
    }
  }, [profile, activeTab]);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, storesRes, productsRes] = await Promise.all([
        supabase.from('users_profile').select('*'),
        supabase.from('stores').select('*'),
        supabase.from('products').select('*'),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (storesRes.data) setStores(storesRes.data);
      if (productsRes.data) setProducts(productsRes.data);

      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalSellers: usersRes.data?.filter((u) => u.role === 'seller').length || 0,
        totalStores: storesRes.data?.length || 0,
        totalProducts: productsRes.data?.length || 0,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_provider_keys')
        .select('*')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPaymentKeys({
          api_key: data.api_key || '',
          integration_id: data.integration_id || '',
          hmac_secret: data.hmac_secret || '',
        });
      }
    } catch (err: any) {
      console.error('Load keys error:', err);
    }
  };

  const handleSavePaymentKeys = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!paymentKeys.api_key || !paymentKeys.integration_id || !paymentKeys.hmac_secret) {
        throw new Error('جميع الحقول مطلوبة');
      }

      const { data: existing } = await supabase
        .from('payment_provider_keys')
        .select('id')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('payment_provider_keys')
          .update({
            api_key: paymentKeys.api_key,
            integration_id: paymentKeys.integration_id,
            hmac_secret: paymentKeys.hmac_secret,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_provider_keys')
          .insert({
            provider: 'paymob',
            api_key: paymentKeys.api_key,
            integration_id: paymentKeys.integration_id,
            hmac_secret: paymentKeys.hmac_secret,
            is_active: true,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'تم حفظ إعدادات الدفع بنجاح' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      if (!paymentKeys.api_key || !paymentKeys.integration_id || !paymentKeys.hmac_secret) {
        throw new Error('جميع الحقول مطلوبة للاختبار');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('غير مصرح');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-paymob-connection`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentKeys),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: '✔ تم الاتصال بنجاح! المفاتيح صحيحة.',
        });
      } else {
        setMessage({
          type: 'error',
          text: `✘ ${result.error || 'خطأ في المفاتيح أو الاتصال'}`,
        });
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setMessage({
        type: 'error',
        text: `✘ ${err.message || 'خطأ في الاتصال'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته.')) {
      return;
    }

    try {
      const { error } = await supabase.from('users_profile').delete().eq('id', userId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المستخدم بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف جميع منتجاته.')) {
      return;
    }

    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المتجر بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المنتج بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleToggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !currentStatus })
        .eq('id', storeId);
      if (error) throw error;
      await fetchDashboardData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);
      if (error) throw error;
      await fetchDashboardData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  // ✅ السماح للـ admin و superadmin
  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
          <p className="text-gray-600 mb-4">ليس لديك صلاحية الوصول إلى هذه الصفحة</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // ✅ فلترة آمنة بدون كسر الصفحة لو name/slug فاضي
  const q = (searchQuery || '').toLowerCase().trim();

  const filteredUsers = users.filter((user) => {
    const name = (user.name ?? '').toString().toLowerCase();
    const email = (user.email ?? '').toString().toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const filteredStores = stores.filter((store) => {
    const name = (store.name ?? '').toString().toLowerCase();
    const slug = (store.slug ?? '').toString().toLowerCase();
    return name.includes(q) || slug.includes(q);
  });

  const filteredProducts = products.filter((product) => {
    // لو عندك في الداتا title بدل name، نخليها fallback
    const name = ((product as any).name ?? (product as any).title ?? '').toString().toLowerCase();
    return name.includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم الإدارة</h1>
          <p className="text-gray-600">إدارة كاملة للمنصة والمستخدمين</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>المستخدمين</span>
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stores' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span>المتاجر</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>
            <button
              onClick={() => setActiveTab('payment-settings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'payment-settings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>إعدادات الدفع</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalUsers}</div>
                <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSellers}</div>
                <p className="text-sm text-gray-600">التجار</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <StoreIcon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalStores}</div>
                <p className="text-sm text-gray-600">المتاجر</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalProducts}</div>
                <p className="text-sm text-gray-600">المنتجات</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-2">مرحباً بك في لوحة الإدارة</h2>
              <p className="text-blue-100">من هنا يمكنك إدارة جميع المستخدمين والمتاجر والمنتجات في المنصة</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={() => onNavigate('payment-settings')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">إعدادات الدفع</h3>
                <p className="text-sm text-gray-600">إدارة مفاتيح Paymob وبوابة الدفع</p>
              </button>

              <button
                onClick={() => onNavigate('admin-withdrawals')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">طلبات السحب</h3>
                <p className="text-sm text-gray-600">إدارة ومراجعة طلبات سحب التجار</p>
              </button>

              <button
                onClick={() => onNavigate('transactions')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">المعاملات المالية</h3>
                <p className="text-sm text-gray-600">عرض جميع المعاملات والإحصائيات</p>
              </button>

              {profile?.role === 'superadmin' && (
                <button
                  onClick={() => onNavigate('admin-management')}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">إدارة المسؤولين</h3>
                  <p className="text-sm text-gray-600">إضافة وتعديل حسابات المسؤولين</p>
                </button>
              )}

              <button
                onClick={() => onNavigate('admin-verification-apis')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <TestTube className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">مزودي خدمات التحقق</h3>
                <p className="text-sm text-gray-600">إدارة مزودي SMS والبريد الإلكتروني</p>
              </button>

              <button
                onClick={() => onNavigate('admin-announcements')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Megaphone className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">الرسائل العامة</h3>
                <p className="text-sm text-gray-600">إدارة الإعلانات للمستخدمين</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مستخدم..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ التسجيل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                        {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : user.role === 'seller'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'مدير' : user.role === 'seller' ? 'تاجر' : 'عميل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('ar-SA')}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={user.role === 'admin'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن متجر..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <div key={store.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <StoreIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{store.name || '—'}</h3>
                      <p className="text-sm text-gray-500">{store.slug || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                        store.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {store.is_active ? 'نشط' : 'معطل'}
                    </button>
                    <button
                      onClick={() => handleDeleteStore(store.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const displayName = ((product as any).name ?? (product as any).title ?? '—') as string;
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Package className="w-12 h-12 text-blue-600" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{displayName}</h3>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-blue-600">
                          {product.price} {product.currency}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          {product.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'payment-settings' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">إعدادات بوابة الدفع Paymob</h2>
              <p className="text-gray-600">قم بإدخال مفاتيح Paymob API الخاصة بك</p>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_API_KEY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.api_key}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, api_key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل API Key من Paymob"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_INTEGRATION_ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.integration_id}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, integration_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل Integration ID"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_HMAC_SECRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.hmac_secret}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, hmac_secret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل HMAC Secret"
                    dir="ltr"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">💡 يمكنك الحصول على هذه المفاتيح من لوحة تحكم Paymob → Settings → API Keys</p>
                </div>

                <button
                  onClick={handleSavePaymentKeys}
                  disabled={saving}
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">اختبار الاتصال</h3>
              <p className="text-sm text-gray-600 mb-4">اختبر الاتصال ببوابة Paymob للتأكد من صحة المفاتيح</p>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <TestTube className="w-5 h-5" />
                {testing ? 'جاري الاختبار...' : 'اختبار الاتصال ببوابة Paymob'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
