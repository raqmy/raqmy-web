import React, { useEffect, useState } from 'react';
import { TrendingUp, Shield, Zap, ArrowLeft, Download } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

interface FeaturedProduct extends Product {
  thumbnail_url?: string | null;
  store?: any;
  seller?: any;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
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

      const productIds = data.map((product: any) => product.id);

      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id, image_url, is_primary, display_order')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false })
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching featured product images:', imagesError);
      }

      const imageMap = new Map<string, string>();
      (imagesData || []).forEach((img: any) => {
        if (!imageMap.has(img.product_id) && img.image_url) {
          imageMap.set(img.product_id, img.image_url);
        }
      });

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

          const sellerId = product.user_id ?? product.merchant_id ?? null;

          if (sellerId) {
            const { data: userData } = await supabase
              .from('users_profile')
              .select('id, name')
              .eq('id', sellerId)
              .maybeSingle();
            seller = userData;
          }

          const finalThumbnail =
            product.thumbnail_url && String(product.thumbnail_url).trim() !== ''
              ? product.thumbnail_url
              : imageMap.get(product.id) ?? null;

          return {
            ...product,
            thumbnail_url: finalThumbnail,
            store,
            seller,
          };
        })
      );

      setFeaturedProducts(enrichedProducts as FeaturedProduct[]);
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
                onClick={() => onNavigate('auth-signup')}
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
            {featuredProducts.map((product: any) => {
              const displayName = product.title ?? product.name ?? 'منتج رقمي';

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Download className="w-16 h-16 text-blue-600" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 line-clamp-1">
                      {displayName}
                    </h3>

                    <div className="flex items-center justify-start">
                      <div className="text-2xl font-bold text-blue-600">
                        {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
        <section className="max
