import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Store as StoreIcon,
  DollarSign,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  ShoppingBag,
  Eye,
  Share2,
  Users,
  Link as LinkIcon,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Store, Product } from '../lib/supabase';
import { CreateStoreModal } from '../components/store/CreateStoreModal';
import { CreateProductModal } from '../components/product/CreateProductModal';
import { EditStoreModal } from '../components/store/EditStoreModal';
import { EditProductModal } from '../components/product/EditProductModal';

interface SellerDashboardProps {
  onNavigate: (page: string) => void;
}

interface AffiliateLink {
  id: string;
  user_id: string;
  product_id: string;
  code: string;
  created_at: string;
  affiliate?: {
    id: string;
    name: string;
  };
  clicks_count?: number;
  sales_count?: number;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'stores' | 'marketing' | 'analytics' | 'settings' | 'orders'>('overview');
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalViews: 0,
    activeProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', profile!.id);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', profile!.id);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('seller_amount, status')
        .eq('seller_id', profile!.id)
        .eq('status', 'completed');

      const productIds = productsData?.map((p) => p.id) || [];

      const { data: affiliateLinksData } = await supabase
        .from('affiliate_links')
        .select(`
          *,
          users_profile!affiliate_links_user_id_fkey(id, name)
        `)
        .in('product_id', productIds);

      const linksWithStats = await Promise.all(
        (affiliateLinksData || []).map(async (link: any) => {
          const { data: clicks } = await supabase
            .from('affiliate_clicks')
            .select('id')
            .eq('affiliate_link_id', link.id);

          const { data: sales } = await supabase
            .from('affiliate_sales')
            .select('id')
            .eq('affiliate_link_id', link.id);

          return {
            ...link,
            affiliate: link.users_profile,
            clicks_count: clicks?.length || 0,
            sales_count: sales?.length || 0,
          };
        })
      );

      setStores(storesData || []);
      setProducts(productsData || []);
      setAffiliateLinks(linksWithStats);

      const revenue = ordersData?.reduce((sum, order) => sum + Number(order.seller_amount), 0) || 0;
      const sales = ordersData?.length || 0;
      const views = productsData?.reduce((sum, p) => sum + p.views_count, 0) || 0;
      const active = productsData?.filter((p) => p.is_active).length || 0;

      setStats({
        totalRevenue: revenue,
        totalSales: sales,
        totalViews: views,
        activeProducts: active,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم التاجر</h1>
          <p className="text-gray-600">مرحباً {profile?.name}، إدارة متاجرك ومنتجاتك</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stores'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span>المتاجر</span>
            </button>
            <button
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'marketing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>التسويق</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>الطلبات</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>التحليلات</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>الإعدادات</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stats.totalRevenue.toFixed(2)} ريال
                </div>
                <p className="text-sm text-gray-600">إجمالي الأرباح</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSales}</div>
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalViews}</div>
                <p className="text-sm text-gray-600">إجمالي المشاهدات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.activeProducts}</div>
                <p className="text-sm text-gray-600">المنتجات النشطة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => onNavigate('merchant-withdraw')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">سحب الأرباح</h3>
                <p className="text-sm text-gray-600">إدارة أرباحك وطلبات السحب</p>
              </button>

              <button
                onClick={() => onNavigate('bank-account')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">الحسابات البنكية</h3>
                <p className="text-sm text-gray-600">إدارة حساباتك البنكية</p>
              </button>

              <button
                onClick={() => onNavigate('orders-management')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">إدارة الطلبات</h3>
                <p className="text-sm text-gray-600">عرض ومتابعة جميع الطلبات</p>
              </button>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">ابدأ البيع الآن!</h2>
              <p className="text-blue-100 mb-6">
                {stores.length === 0
                  ? 'أنشئ متجرك الأول وابدأ بإضافة المنتجات'
                  : 'أضف منتجات جديدة لزيادة مبيعاتك'}
              </p>
              <div className="flex flex-wrap gap-4">
                {stores.length === 0 ? (
                  <button
                    onClick={() => setShowCreateStoreModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>إنشاء متجر</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateProductModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>إضافة منتج</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">منتجاتي</h2>
              <button
                onClick={() => setShowCreateProductModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة منتج</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
                <p className="text-gray-600 mb-6">ابدأ بإضافة منتجك الأول</p>
                <button
                  onClick={() => setShowCreateProductModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إضافة منتج
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Package className="w-12 h-12 text-blue-600" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>{product.sales_count} مبيعات</span>
                        <span>{product.views_count} مشاهدة</span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-blue-600">
                          {product.price} {product.currency}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            product.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingProductId(product.id)}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        تعديل المنتج
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stores' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">متاجري</h2>
              <button
                onClick={() => setShowCreateStoreModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إنشاء متجر</span>
              </button>
            </div>

            {stores.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد متاجر</h3>
                <p className="text-gray-600 mb-6">أنشئ متجرك الأول لبدء البيع</p>
                <button
                  onClick={() => setShowCreateStoreModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إنشاء متجر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stores.map((store) => (
                  <div key={store.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <StoreIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{store.name}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">/{store.slug}</p>
                      </div>
                    </div>
                    {store.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{store.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          store.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onNavigate(`store-detail-${store.id}`)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        عرض التفاصيل
                      </button>
                      <button
                        onClick={() => setEditingStoreId(store.id)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        تعديل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'marketing' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">التسويق والعمولات</h2>
              <p className="text-gray-600">إدارة المسوقين والكوبونات وتتبع أداء الحملات التسويقية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">التسويق بالعمولة</h3>
                    <p className="text-blue-100">إدارة المسوقين والروابط</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">المسوقين النشطين</span>
                    <span className="text-2xl font-bold">{affiliateLinks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">إجمالي النقرات</span>
                    <span className="text-2xl font-bold">
                      {affiliateLinks.reduce((sum, link) => sum + (link.clicks_count || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">المبيعات من المسوقين</span>
                    <span className="text-2xl font-bold">
                      {affiliateLinks.reduce((sum, link) => sum + (link.sales_count || 0), 0)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('affiliate-management')}
                  className="w-full px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span>إدارة المسوقين والروابط</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">الكوبونات</h3>
                    <p className="text-purple-100">إدارة كوبونات الخصم</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <p className="text-purple-100">
                    قم بإنشاء وإدارة كوبونات الخصم لمنتجاتك ومتاجرك
                  </p>
                  <ul className="space-y-2 text-sm text-purple-100">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>خصم بالنسبة المئوية أو المبلغ الثابت</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>تحديد عدد مرات الاستخدام</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>تفعيل وإيقاف الكوبونات</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => onNavigate('coupons-management')}
                  className="w-full px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>إدارة الكوبونات</span>
                </button>
              </div>
            </div>

            {affiliateLinks.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">آخر الروابط التسويقية</h3>
                <div className="space-y-4">
                  {affiliateLinks.slice(0, 5).map((link) => {
                    const product = products.find((p) => p.id === link.product_id);
                    return (
                      <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <LinkIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {link.affiliate?.name || 'مسوق'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product?.name || 'منتج'} - {link.code}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {link.clicks_count || 0} نقرة
                          </p>
                          <p className="text-sm text-green-600">
                            {link.sales_count || 0} مبيعات
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة الطلبات</h2>
              <button
                onClick={() => onNavigate('orders-management')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                عرض جميع الطلبات
              </button>
            </div>
            <p className="text-gray-600">
              تتبع وإدارة طلبات عملائك، تحديث حالة الطلبات، والتواصل مع المشترين
            </p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">التحليلات قريباً</h3>
            <p className="text-gray-600">سيتم إضافة لوحة التحليلات قريباً</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">الإعدادات</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  defaultValue={profile?.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال
                </label>
                <input
                  type="tel"
                  defaultValue={profile?.phone}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                حفظ التغييرات
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateStoreModal
        isOpen={showCreateStoreModal}
        onClose={() => setShowCreateStoreModal(false)}
        onSuccess={fetchDashboardData}
      />

      <CreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSuccess={fetchDashboardData}
      />

      {editingStoreId && (
        <EditStoreModal
          isOpen={true}
          storeId={editingStoreId}
          onClose={() => setEditingStoreId(null)}
          onSuccess={fetchDashboardData}
          onDelete={fetchDashboardData}
        />
      )}

      {editingProductId && (
        <EditProductModal
          isOpen={true}
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
          onSuccess={fetchDashboardData}
          onDelete={fetchDashboardData}
        />
      )}
    </div>
  );
};
