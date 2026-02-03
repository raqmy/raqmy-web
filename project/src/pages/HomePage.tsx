import React, { useEffect, useState } from 'react';
import { TrendingUp, Shield, Zap, Star, ArrowLeft, Download } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'marketplace')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error fetching featured products:', error);
        setFeaturedProducts([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setFeaturedProducts([]);
        setLoading(false);
        return;
      }

      const enrichedProducts = await Promise.all(
        data.map(async (product: any) => {
          let store = null;
          let seller = null;

          if (product.store_id) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('id, name, slug, category')
              .eq('id', product.store_id)
              .maybeSingle();
            store = storeData;
          }

          if (product.user_id) {
            const { data: userData } = await supabase
              .from('users_profile')
              .select('id, name')
              .eq('id', product.user_id)
              .maybeSingle();
            seller = userData;
          }

          return {
            ...product,
            store,
            seller,
          };
        })
      );

      setFeaturedProducts(enrichedProducts as any);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              منصة رقمي لبيع المنتجات الرقمية
            </h1>
            <p className="text-lg text-blue-100 mb-8">
              أنشئ متجرك الرقمي وابدأ البيع في دقائق
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('marketplace')}
                className="w-full sm:w-auto px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
              >
                تصفح المنتجات
              </button>
              <button
                onClick={() => onNavigate('auth')}
                className="w-full sm:w-auto px-8 py-3 bg-transparent text-white border-2 border-white rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all"
              >
                ابدأ البيع الآن
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل المنتجات...</p>
          </div>
        </section>
      ) : featuredProducts.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">المنتجات الرقمية</h2>
              <p className="text-gray-600">اكتشف أحدث المنتجات من السوق العام</p>
            </div>
            <button
              onClick={() => onNavigate('marketplace')}
              className="hidden md:inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
            >
              <span>عرض الكل</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => onNavigate(`product-${product.id}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Download className="w-16 h-16 text-blue-600" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {product.description || 'منتج رقمي عالي الجودة'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-blue-600">
                        {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          <div className="text-center mt-12 md:hidden">
            <button
              onClick={() => onNavigate('marketplace')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              <span>عرض جميع المنتجات</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center bg-gray-50 rounded-2xl p-12">
            <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">لا توجد منتجات حالياً</h3>
            <p className="text-gray-600 mb-6">كن أول من ينشر منتج في المتجر العام</p>
            <button
              onClick={() => onNavigate('auth')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              ابدأ البيع الآن
            </button>
          </div>
        </section>
      )}

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">جاهز للبدء؟</h2>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              انضم إلى آلاف التجار الذين يثقون في منصة رقمي
            </p>
            <button
              onClick={() => onNavigate('auth')}
              className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              أنشئ متجرك مجاناً
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
