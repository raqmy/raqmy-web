import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download, Star, Store as StoreIcon, Tag } from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';

interface ProductWithDetails extends Product {
  store?: Store | null;
  seller?: UserProfile | null;

  // سنملأها من product_images
  thumbnail_url?: string | null;

  // نحتفظ بها لو احتجتها لاحقًا
  product_images?: Array<{
    image_url: string;
    is_primary: boolean | null;
    display_order: number | null;
  }>;
}

interface MarketplacePageProps {
  onNavigate: (page: string) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log('🔍 Starting to fetch products...');

      const orderColumn =
        sortBy === 'newest' ? 'created_at' :
        sortBy === 'popular' ? 'sales_count' :
        'price';

      const ascending =
        sortBy === 'price_low' ? true :
        sortBy === 'price_high' ? false :
        false;

      // ✅ نجلب المنتجات + صورها (product_images)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            image_url,
            is_primary,
            display_order
          )
        `)
        .eq('is_active', true)
        .eq('visibility', 'marketplace')
        .order(orderColumn, { ascending });

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No products found');
        setProducts([]);
        return;
      }

      console.log('✅ Found', data.length, 'products');

      const enrichedProducts = await Promise.all(
        data.map(async (product: any) => {
          let store: Store | null = null;
          let seller: UserProfile | null = null;

          // ✅ استخرج صورة الغلاف من product_images
          const imgs = (product.product_images ?? []) as Array<{
            image_url: string;
            is_primary: boolean | null;
            display_order: number | null;
          }>;

          const primary =
            imgs.find(i => i.is_primary) ??
            [...imgs].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];

          const thumbnail_url = primary?.image_url ?? null;

          if (product.store_id) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('id, name, slug, category')
              .eq('id', product.store_id)
              .maybeSingle();
            store = storeData ?? null;
          }

          // ملاحظة: عندك في products يظهر أن العمود الأساسي هو merchant_id غالبًا
          // لكن نخلي user_id مثل ما كان عندك حتى لا نكسر شيء آخر
          if (product.user_id) {
            const { data: userData } = await supabase
              .from('users_profile')
              .select('id, name')
              .eq('id', product.user_id)
              .maybeSingle();
            seller = userData ?? null;
          }

          return {
            ...product,
            store,
            seller,
            thumbnail_url, // ✅ صار الآن موجود ويشتغل مع نفس الكارد
          } as ProductWithDetails;
        })
      );

      console.log('✅ Enriched products:', enrichedProducts);
      setProducts(enrichedProducts);
    } catch (error) {
      console.error('💥 Exception:', error);
      setProducts([]);
    } finally {
      setLoading(false);
      console.log('✅ Loading complete');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const name = (product.name || (product as any).title || '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">السوق العام</h1>
          <p className="text-lg text-gray-600">
            اكتشف آلاف المنتجات الرقمية
            {!loading && <span className="text-blue-600 font-semibold"> ({filteredProducts.length} منتج متاح)</span>}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">ترتيب حسب:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">الأحدث</option>
                <option value="popular">الأكثر مبيعاً</option>
                <option value="price_low">السعر: من الأقل للأعلى</option>
                <option value="price_high">السعر: من الأعلى للأقل</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-600">جرب البحث بكلمات مختلفة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
                onClick={() => onNavigate(`product-${product.id}`)}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.name || (product as any).title || 'product'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // لو صار خطأ بالرابط، نخليها ترجع للأيقونة
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Download className="w-16 h-16 text-blue-600" />
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {product.store ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <StoreIcon className="w-4 h-4" />
                        <span className="font-medium">{product.store.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span className="font-medium">{product.seller?.name}</span>
                      </div>
                    )}

                    {product.category && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        <Tag className="w-3 h-3 inline mr-1" />
                        {product.category}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                    {product.name || (product as any).title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                    {product.description || 'منتج رقمي عالي الجودة'}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
                      </div>
                      {product.is_subscription && (
                        <span className="text-xs text-gray-500">
                          / {product.subscription_period === 'monthly' ? 'شهرياً' : product.subscription_period === 'yearly' ? 'سنوياً' : 'أسبوعياً'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">4.8</span>
                      </div>
                      <span className="text-xs text-gray-500">{product.sales_count} مبيعات</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
