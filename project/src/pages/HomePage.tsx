import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Shield,
  Zap,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { supabase, Product } from '../lib/supabase';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

interface FeaturedProduct extends Product {
  thumbnail_url?: string | null;
  store?: any;
  seller?: any;
  quantity_limit?: number | null;
  quantity_sold?: number | null;
}

const getQuantityLimit = (product: FeaturedProduct | null | undefined) => {
  const rawLimit = product?.quantity_limit;

  if (rawLimit === null || rawLimit === undefined) {
    return null;
  }

  const limit = Number(rawLimit);

  if (!Number.isFinite(limit) || limit < 0) {
    return null;
  }

  return Math.floor(limit);
};

const getQuantitySold = (product: FeaturedProduct | null | undefined) => {
  const sold = Number(product?.quantity_sold || 0);

  if (!Number.isFinite(sold) || sold < 0) {
    return 0;
  }

  return Math.floor(sold);
};

const getRemainingQuantity = (product: FeaturedProduct | null | undefined) => {
  const limit = getQuantityLimit(product);

  if (limit === null) {
    return null;
  }

  const sold = getQuantitySold(product);
  return Math.max(limit - sold, 0);
};

const isProductSoldOut = (product: FeaturedProduct | null | undefined) => {
  const remaining = getRemainingQuantity(product);
  return remaining !== null && remaining <= 0;
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const MAX_VISIBLE_PRODUCTS = 8;
      const INITIAL_CANDIDATES_LIMIT = 24;
      const MAX_PRODUCTS_PER_SELLER = 2;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'marketplace')
        .order('created_at', { ascending: false })
        .limit(INITIAL_CANDIDATES_LIMIT);

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

      const storeIds = Array.from(
        new Set(
          data
            .map((product: any) => product.store_id)
            .filter((storeId: any) => !!storeId)
        )
      );

      const sellerIds = Array.from(
        new Set(
          data
            .map((product: any) => product.user_id ?? product.merchant_id)
            .filter((sellerId: any) => !!sellerId)
        )
      );

      const [storesResponse, sellersResponse] = await Promise.all([
        storeIds.length > 0
          ? supabase
              .from('stores')
              .select('id, name, slug, category')
              .in('id', storeIds)
          : Promise.resolve({ data: [], error: null } as any),
        sellerIds.length > 0
          ? supabase
              .from('users_profile')
              .select('id, name')
              .in('id', sellerIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (storesResponse.error) {
        console.error('Error fetching stores for homepage:', storesResponse.error);
      }

      if (sellersResponse.error) {
        console.error('Error fetching sellers for homepage:', sellersResponse.error);
      }

      const storeMap = new Map<string, any>();
      (storesResponse.data || []).forEach((store: any) => {
        storeMap.set(store.id, store);
      });

      const sellerMap = new Map<string, any>();
      (sellersResponse.data || []).forEach((seller: any) => {
        sellerMap.set(seller.id, seller);
      });

      const enrichedProducts: FeaturedProduct[] = data.map((product: any) => {
        const sellerId = product.user_id ?? product.merchant_id ?? null;
        const finalThumbnail =
          product.thumbnail_url && String(product.thumbnail_url).trim() !== ''
            ? product.thumbnail_url
            : imageMap.get(product.id) ?? null;

        return {
          ...product,
          thumbnail_url: finalThumbnail,
          store: product.store_id ? storeMap.get(product.store_id) ?? null : null,
          seller: sellerId ? sellerMap.get(sellerId) ?? null : null,
        };
      });

      const validProducts = enrichedProducts.filter((product: any) => {
        const title = String(product.title ?? product.name ?? '').trim();
        const price = Number(product.price ?? 0);

        return title.length > 0 && price > 0;
      });

      const scoredProducts = validProducts
        .map((product: any, index: number) => {
          const hasImage = !!product.thumbnail_url;
          const hasStore = !!product.store;
          const hasSeller = !!product.seller;
          const soldOut = isProductSoldOut(product);
          const createdAtValue = product.created_at
            ? new Date(product.created_at).getTime()
            : 0;

          return {
            ...product,
            __sortIndex: index,
            __score:
              (soldOut ? -5000000000000 : 0) +
              (hasImage ? 1000 : 0) +
              (hasStore ? 50 : 0) +
              (hasSeller ? 25 : 0) +
              createdAtValue,
          };
        })
        .sort((a: any, b: any) => {
          if (b.__score !== a.__score) return b.__score - a.__score;
          return a.__sortIndex - b.__sortIndex;
        });

      const selectedProducts: FeaturedProduct[] = [];
      const sellerCountMap = new Map<string, number>();

      for (const product of scoredProducts) {
        if (selectedProducts.length >= MAX_VISIBLE_PRODUCTS) break;

        const sellerId = String(product.user_id ?? product.merchant_id ?? 'unknown-seller');
        const currentSellerCount = sellerCountMap.get(sellerId) ?? 0;

        if (currentSellerCount >= MAX_PRODUCTS_PER_SELLER) {
          continue;
        }

        selectedProducts.push(product);
        sellerCountMap.set(sellerId, currentSellerCount + 1);
      }

      if (selectedProducts.length < MAX_VISIBLE_PRODUCTS) {
        const selectedIds = new Set(selectedProducts.map((product: any) => product.id));

        for (const product of scoredProducts) {
          if (selectedProducts.length >= MAX_VISIBLE_PRODUCTS) break;
          if (selectedIds.has(product.id)) continue;

          selectedProducts.push(product);
          selectedIds.add(product.id);
        }
      }

      const cleanedProducts = selectedProducts.map(({ __score, __sortIndex, ...product }: any) => product);

      setFeaturedProducts(cleanedProducts);
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
              <p className="text-gray-600">منتجات مختارة من السوق العام بشكل أذكى وأكثر تنوعًا</p>
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
              const soldOut = isProductSoldOut(product);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-gray-100"
                  onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
                    {soldOut && (
                      <div className="absolute top-3 right-3 z-10 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                        نفدت الكمية
                      </div>
                    )}

                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={displayName}
                        className={`w-full h-full object-cover ${soldOut ? 'opacity-70 grayscale' : ''}`}
                      />
                    ) : (
                      <Download className="w-16 h-16 text-blue-600" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 line-clamp-1">
                      {displayName}
                    </h3>

                    <div className="flex items-center justify-between gap-3 mb-4">
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center bg-gray-50 rounded-2xl p-12">
            <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">لا توجد منتجات حالياً</h3>
            <p className="text-gray-600 mb-6">كن أول من ينشر منتج في المتجر العام</p>
            <button
              onClick={() => onNavigate('auth-signup')}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              ابدأ البيع الآن
            </button>
          </div>
        </section>
      )}

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">نمو مستدام</h3>
              <p className="text-gray-600">أدوات تساعدك على تنمية متجرك الرقمي وتحقيق المزيد من المبيعات</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ثقة وأمان</h3>
              <p className="text-gray-600">منصة موثوقة لحماية المنتجات الرقمية وتقديم تجربة شراء احترافية</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">سرعة ومرونة</h3>
              <p className="text-gray-600">ابدأ البيع بسرعة واستفد من تجربة سلسة للتاجر والعميل في كل خطوة</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">جاهز للبدء؟</h2>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              انضم إلى آلاف التجار الذين يثقون في منصة رقمي
            </p>
            <button
              onClick={() => onNavigate('auth-signup')}
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
