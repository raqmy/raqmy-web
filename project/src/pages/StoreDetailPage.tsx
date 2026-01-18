import React, { useEffect, useState } from 'react';
import { Store, TrendingUp, Package, DollarSign, Eye, ShoppingCart, ArrowLeft, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EditStoreModal } from '../components/store/EditStoreModal';

interface StoreDetailPageProps {
  storeId: string;
  onNavigate: (page: string) => void;
}

export const StoreDetailPage: React.FC<StoreDetailPageProps> = ({ storeId, onNavigate }) => {
  const { user } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchStoreDetails();
  }, [storeId]);

  const fetchStoreDetails = async () => {
    setLoading(true);
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (!storeData) {
        onNavigate('seller-dashboard');
        return;
      }

      setStore(storeData);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (productsData) {
        setProducts(productsData);

        const totalSales = productsData.reduce((sum, p) => sum + (p.sales_count || 0), 0);
        const totalRevenue = productsData.reduce(
          (sum, p) => sum + (p.sales_count || 0) * parseFloat(p.price || 0),
          0
        );
        const totalViews = productsData.reduce((sum, p) => sum + (p.views_count || 0), 0);

        setStats({
          totalProducts: productsData.length,
          totalSales,
          totalRevenue,
          totalViews,
        });
      }
    } catch (error) {
      console.error('Error fetching store details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل المتجر...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">المتجر غير موجود</h2>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على هذا المتجر</p>
          <button
            onClick={() => onNavigate('seller-dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate('seller-dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>العودة إلى لوحة التحكم</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            <span>تعديل المتجر</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{store.name}</h1>
                <p className="text-gray-600">{store.description || 'متجر رقمي'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {store.category}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      store.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {store.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">إجمالي المنتجات</h3>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">إجمالي المبيعات</h3>
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSales}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">الإيرادات</h3>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalRevenue.toFixed(2)} {store.default_currency || 'SAR'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">المشاهدات</h3>
              <Eye className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalViews}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">منتجات المتجر</h2>
            <span className="text-sm text-gray-600">{products.length} منتج</span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-600 mb-6">قم بإضافة منتجات إلى هذا المتجر</p>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                إضافة منتجات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onNavigate(`product-${product.id}`)}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {product.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description || 'منتج رقمي'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-blue-600">
                      {product.price} {product.currency}
                    </span>
                    <div className="text-sm text-gray-500">
                      {product.sales_count} مبيعات
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {product.views_count} مشاهدة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditStoreModal
          isOpen={showEditModal}
          storeId={storeId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchStoreDetails();
          }}
          onDelete={() => {
            setShowEditModal(false);
            onNavigate('seller-dashboard');
          }}
        />
      )}
    </div>
  );
};
