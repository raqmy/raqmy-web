import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
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
  CheckCircle,
  Download,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

type ProfileStats = {
  favorites_count: number;
  viewed_products_count: number;
};

type ProfileOrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_price: number;
  subtotal: number;
  product_slug?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
};

type ProfileOrder = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  currency?: string | null;
  items: ProfileOrderItem[];
};

type FavoriteProduct = {
  id: string;
  name?: string | null;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
  slug?: string | null;
  store_id?: string | null;
  user_id?: string | null;
  favorite_id: string;
  added_at: string;
};

type ViewedProduct = {
  id: string;
  name?: string | null;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
  slug?: string | null;
  store_id?: string | null;
  user_id?: string | null;
  viewed_at: string;
};

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const normalizeProductName = (product: any) => product?.name || product?.title || 'منتج';

const productMatchesScope = (product: any, scope: ScopeInfo | null) => {
  if (!scope) return true;

  if (scope.source === 'stores') {
    return product?.store_id === scope.storeId;
  }

  return (product?.user_id || product?.merchant_id) === scope.merchantUserId;
};

const resolveStoreScope = async (): Promise<ScopeInfo | null> => {
  const slug = getActiveStoreScopeSlug();
  if (!slug) return null;

  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id, slug, name, user_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!storeError && storeData) {
    return {
      slug,
      name: storeData.name || 'المتجر',
      source: 'stores',
      storeId: storeData.id,
      merchantUserId: storeData.user_id || null,
    };
  }

  const { data: merchantData, error: merchantError } = await supabase
    .from('merchants')
    .select('id, slug, user_id, store_name, business_name, name')
    .eq('slug', slug)
    .maybeSingle();

  if (!merchantError && merchantData) {
    return {
      slug,
      name:
        merchantData.store_name || merchantData.business_name || merchantData.name || 'المتجر',
      source: 'merchants',
      storeId: null,
      merchantUserId: merchantData.user_id || merchantData.id,
    };
  }

  return null;
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'stores' | 'products' | 'analytics' | 'settings'
  >('overview');
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [scopeLoading, setScopeLoading] = useState(true);

  const [stats, setStats] = useState<ProfileStats>({
    favorites_count: 0,
    viewed_products_count: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const [bankDetails, setBankDetails] = useState<any>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState('');

  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    setName(profile?.name || '');
  }, [profile?.name]);

  useEffect(() => {
    const loadScope = async () => {
      setScopeLoading(true);
      try {
        const resolved = await resolveStoreScope();
        setScopeInfo(resolved);
      } catch (error) {
        console.error('Error resolving store scope:', error);
        setScopeInfo(null);
      } finally {
        setScopeLoading(false);
      }
    };

    loadScope();
  }, []);

  const fetchProfileStats = async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const [favoritesRes, viewedRes] = await Promise.all([
        supabase
          .from('favorites')
          .select('id, product_id, products(id, store_id, user_id)')
          .eq('user_id', user.id),
        supabase
          .from('viewed_products')
          .select('product_id, products(id, store_id, user_id)')
          .eq('user_id', user.id),
      ]);

      if (favoritesRes.error) {
        console.error('Error fetching favorites stats:', favoritesRes.error);
      }

      if (viewedRes.error) {
        console.error('Error fetching viewed stats:', viewedRes.error);
      }

      const favoritesCount = (favoritesRes.data || []).filter((row: any) =>
        row?.products ? productMatchesScope(row.products, scopeInfo) : false
      ).length;

      const viewedCount = (viewedRes.data || []).filter((row: any) =>
        row?.products ? productMatchesScope(row.products, scopeInfo) : false
      ).length;

      setStats({
        favorites_count: favoritesCount,
        viewed_products_count: viewedCount,
      });
    } catch (e) {
      console.error('Error fetching profile stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    if (!user || profile?.role !== 'seller') return;

    try {
      const { data, error } = await supabase
        .from('merchant_payout_accounts')
        .select('*')
        .eq('merchant_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bank details:', error);
        return;
      }

      if (data) {
        setBankDetails(data);
        setBankAccountHolderName(data.account_holder_name || '');
        setBankIban(data.iban || '');
        setBankName(data.bank_name || '');
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    setOrdersLoading(true);
    setOrdersError('');

    try {
      const ownerFilter = `user_id.eq.${user.id},customer_id.eq.${user.id}`;

      const { data: ordersData, error: ordersDbError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, currency')
        .or(ownerFilter)
        .order('created_at', { ascending: false });

      if (ordersDbError) throw ordersDbError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map((order) => order.id);

      const { data: rawItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, price, subtotal')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      }

      const safeItems = rawItems || [];
      const productIds = [...new Set(safeItems.map((item: any) => item.product_id).filter(Boolean))];

      let productsMap = new Map<string, any>();

      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, title, name, price, currency, thumbnail_url, slug, store_id, user_id')
          .in('id', productIds);

        if (productsError) {
          console.error('Error fetching products for orders:', productsError);
        } else {
          productsMap = new Map((productsData || []).map((product: any) => [product.id, product]));
        }
      }

      const itemsByOrderId = new Map<string, ProfileOrderItem[]>();

      for (const item of safeItems as any[]) {
        const product = productsMap.get(item.product_id);
        if (!product || !productMatchesScope(product, scopeInfo)) continue;

        const resolvedPrice = Number(item.price ?? product?.price ?? 0);
        const resolvedQuantity = Number(item.quantity ?? 1);

        const normalizedItem: ProfileOrderItem = {
          id: item.id,
          product_id: item.product_id,
          quantity: resolvedQuantity,
          product_name: normalizeProductName(product),
          product_price: resolvedPrice,
          subtotal: Number(item.subtotal ?? resolvedPrice * resolvedQuantity),
          product_slug: product?.slug || null,
          thumbnail_url: product?.thumbnail_url || null,
          store_id: product?.store_id || null,
          user_id: product?.user_id || null,
        };

        if (!itemsByOrderId.has(item.order_id)) {
          itemsByOrderId.set(item.order_id, []);
        }

        itemsByOrderId.get(item.order_id)!.push(normalizedItem);
      }

      const normalizedOrders: ProfileOrder[] = ordersData
        .map((order: any) => {
          const scopedItems = itemsByOrderId.get(order.id) || [];
          if (scopedItems.length === 0) return null;

          return {
            id: order.id,
            order_number: order.order_number || order.id,
            total_amount: scopedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
            status: order.status || 'pending',
            created_at: order.created_at,
            currency: order.currency || 'SAR',
            items: scopedItems,
          } as ProfileOrder;
        })
        .filter(Boolean) as ProfileOrder[];

      setOrders(normalizedOrders);
    } catch (error) {
      console.error('Error fetching profile orders:', error);
      setOrders([]);
      setOrdersError('حدث خطأ أثناء تحميل المشتريات');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!scopeLoading && user?.id) {
      fetchProfileStats();
      fetchBankDetails();
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.role, scopeLoading, scopeInfo?.slug]);

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

  const handleUpdateBankDetails = async () => {
    if (!user) return;

    setBankLoading(true);
    setBankMessage('');

    try {
      const normalizedIBAN = bankIban.replace(/\s+/g, '').toUpperCase();

      if (!normalizedIBAN.startsWith('SA') || normalizedIBAN.length !== 24) {
        setBankMessage('رقم الآيبان غير صحيح. يجب أن يبدأ بـ SA ويتكون من 24 حرفاً');
        setBankLoading(false);
        return;
      }

      const { error } = await supabase
        .from('merchant_payout_accounts')
        .upsert({
          merchant_id: user.id,
          account_holder_name: bankAccountHolderName.trim(),
          iban: normalizedIBAN,
          bank_name: bankName || null,
          country_code: 'SA',
          currency: 'SAR',
          payout_method: 'bank_transfer',
          is_default: true,
        });

      if (error) {
        console.error('Error updating bank details:', error);
        setBankMessage('فشل تحديث بيانات الحساب البنكي');
        setBankLoading(false);
        return;
      }

      setBankMessage('تم تحديث بيانات الحساب البنكي بنجاح');
      setEditingBank(false);
      await fetchBankDetails();
    } catch (err) {
      console.error('Error updating bank details:', err);
      setBankMessage('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setBankLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (profile?.role === 'seller') return;

    const confirm = window.confirm('هل تريد ترقية حسابك إلى حساب تاجر؟ ستتمكن من إنشاء متاجر وبيع المنتجات.');
    if (!confirm) return;

    setLoading(true);
    try {
      await updateProfile({ role: 'seller' } as any);
      setMessage('تم ترقية حسابك إلى تاجر بنجاح! يمكنك الآن إنشاء متجرك الأول.');
      setTimeout(() => {
        onNavigate('seller-dashboard');
      }, 1200);
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

  const canAccessFiles = (status: string) => ['paid', 'completed', 'delivered'].includes(status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
      case 'pending_payment':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'refunded':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'تم الدفع';
      case 'completed':
        return 'مكتمل';
      case 'delivered':
        return 'تم التسليم';
      case 'pending':
        return 'جاري المعالجة';
      case 'pending_payment':
        return 'بانتظار الدفع';
      case 'failed':
        return 'فشل';
      case 'cancelled':
        return 'ملغي';
      case 'refunded':
        return 'مسترجع';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const openScopedProduct = (item: ProfileOrderItem) => {
    if (item.product_slug) {
      onNavigate(`product-slug-${item.product_slug}`);
      return;
    }
    onNavigate(`product-${item.product_id}`);
  };

  const scopeBadgeText = useMemo(() => {
    if (!scopeInfo) return 'عرض عام من كل المتاجر';
    return `عرض داخل متجر: ${scopeInfo.name}`;
  }, [scopeInfo]);

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

  const isMerchant = profile.role === 'seller';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute -bottom-16 right-8">
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white flex items-center justify-center text-4xl font-bold text-blue-600">
                  {(profile.name?.charAt(0) || '?').toUpperCase()}
                </div>
                <button className="absolute bottom-0 left-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-20 pb-6 px-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                <p className="text-gray-600">
                  {user.email}
                  {' • '}
                  <span
                    className={`font-semibold ${
                      profile.role === 'admin'
                        ? 'text-red-600'
                        : isMerchant
                        ? 'text-blue-600'
                        : 'text-green-600'
                    }`}
                  >
                    {profile.role === 'admin' ? 'مدير' : isMerchant ? 'تاجر' : 'عميل'}
                  </span>
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                  <StoreIcon className="w-4 h-4" />
                  <span>{scopeBadgeText}</span>
                </div>
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

              {isMerchant && !scopeInfo && (
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
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">نظرة عامة</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">هذه الأرقام تخص متجر {scopeInfo.name} فقط</p>
                      )}
                    </div>
                    <button
                      onClick={fetchProfileStats}
                      disabled={statsLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {statsLoading ? 'جاري التحديث...' : 'تحديث الأرقام'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{orders.length}</div>
                      <p className="text-sm text-gray-600">إجمالي المشتريات</p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Heart className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{stats.favorites_count}</div>
                      <p className="text-sm text-gray-600">المنتجات المفضلة</p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{stats.viewed_products_count}</div>
                      <p className="text-sm text-gray-600">المنتجات المشاهدة</p>
                    </div>
                  </div>

                  {isMerchant && !scopeInfo && (
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
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">مشترياتي</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">تظهر هنا فقط مشترياتك من متجر {scopeInfo.name}</p>
                      )}
                    </div>
                    <button
                      onClick={fetchOrders}
                      disabled={ordersLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {ordersLoading ? 'جاري التحديث...' : 'تحديث المشتريات'}
                    </button>
                  </div>

                  {ordersLoading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">جاري تحميل المشتريات...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {ordersError}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد مشتريات</h3>
                      <p className="text-gray-600 mb-6">
                        {scopeInfo ? `لا توجد مشتريات من متجر ${scopeInfo.name} بعد` : 'ابدأ بتصفح المنتجات وشراء ما يعجبك'}
                      </p>
                      <button
                        onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      >
                        {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-5">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">الطلب #{order.order_number}</h3>
                                <p className="text-xs text-gray-500">
                                  {new Date(order.created_at).toLocaleDateString('ar-SA', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>

                              <div className="text-left">
                                <div className="text-xl font-bold text-blue-600 mb-2">
                                  {Number(order.total_amount).toFixed(2)} {order.currency === 'SAR' || !order.currency ? 'ريال' : order.currency}
                                </div>
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  <span>{getStatusText(order.status)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                              <h4 className="text-sm font-bold text-gray-700 mb-3">عناصر الطلب</h4>
                              <div className="space-y-3">
                                {order.items.map((item) => (
                                  <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-white">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                          {item.thumbnail_url ? (
                                            <img src={item.thumbnail_url} alt={item.product_name} className="w-full h-full object-cover" />
                                          ) : (
                                            <Package className="w-6 h-6 text-blue-600" />
                                          )}
                                        </div>
                                        <div>
                                          <h5 className="font-semibold text-gray-900">{item.product_name || 'منتج'}</h5>
                                          <p className="text-sm text-gray-500">الكمية: {item.quantity} × {Number(item.product_price).toFixed(2)} ريال</p>
                                        </div>
                                      </div>
                                      <div className="text-left font-bold text-gray-900">{Number(item.subtotal).toFixed(2)} ريال</div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                      {canAccessFiles(order.status) && (
                                        <button
                                          onClick={() => openScopedProduct(item)}
                                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>فتح الملفات</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => openScopedProduct(item)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                      >
                                        <Package className="w-4 h-4" />
                                        <span>عرض المنتج</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stores' && !scopeInfo && (
                <div className="text-center py-10">
                  <StoreIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">إدارة المتاجر</h3>
                  <p className="text-gray-600 mb-6">تم نقل إدارة المتاجر إلى لوحة التاجر المتخصصة.</p>
                  <button
                    onClick={() => onNavigate('seller-dashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    الذهاب إلى لوحة التاجر
                  </button>
                </div>
              )}

              {activeTab === 'products' && !scopeInfo && (
                <div className="text-center py-10">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">إدارة المنتجات</h3>
                  <p className="text-gray-600 mb-6">تم نقل إدارة المنتجات إلى لوحة التاجر المتخصصة.</p>
                  <button
                    onClick={() => onNavigate('seller-dashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    الذهاب إلى لوحة التاجر
                  </button>
                </div>
              )}

              {activeTab === 'analytics' && !scopeInfo && (
                <div className="text-center py-10">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">التحليلات</h3>
                  <p className="text-gray-600 mb-6">تم نقل التحليلات إلى لوحة التاجر المتخصصة.</p>
                  <button
                    onClick={() => onNavigate('seller-dashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    الذهاب إلى لوحة التاجر
                  </button>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">الإعدادات</h2>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">المعلومات الشخصية</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={handleUpdateProfile}
                          disabled={loading}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Save className="w-5 h-5" />
                          <span>حفظ التغييرات</span>
                        </button>
                      </div>
                    </div>

                    {isMerchant && !scopeInfo && (
                      <div className="pt-8 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                          <h3 className="text-lg font-bold text-gray-900">الحساب البنكي</h3>
                          {bankDetails && (
                            <button
                              onClick={() => setEditingBank((prev) => !prev)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {editingBank ? 'إلغاء' : 'تعديل'}
                            </button>
                          )}
                        </div>

                        {bankMessage && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                            {bankMessage}
                          </div>
                        )}

                        <div className="space-y-4">
                          <input
                            type="text"
                            value={bankAccountHolderName}
                            onChange={(e) => setBankAccountHolderName(e.target.value)}
                            placeholder="اسم صاحب الحساب"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="اسم البنك"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={bankIban}
                            onChange={(e) => setBankIban(e.target.value)}
                            placeholder="SA..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleUpdateBankDetails}
                            disabled={bankLoading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            {bankLoading ? 'جاري الحفظ...' : 'حفظ بيانات الحساب البنكي'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-8 mt-8 border-t border-gray-200">
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 mb-1">منطقة الخطر</h3>
                          <p className="text-sm text-red-700">
                            حذف الحساب نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك
                            {isMerchant && ' ومتاجرك ومنتجاتك'}.
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
