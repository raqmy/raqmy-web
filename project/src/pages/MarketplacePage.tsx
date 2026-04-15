import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Star } from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';

interface ProductWithDetails extends Product {
  store?: Store | null;
  seller?: UserProfile | null;
  thumbnail_url?: string | null;
  display_name?: string;
  slug?: string;
}

interface MarketplacePageProps {
  onNavigate: (page: string) => void;
}

type SortOption = 'newest' | 'popular' | 'price_low' | 'price_high';

const getMarketplaceFiltersFromUrl = () => {
  if (typeof window === 'undefined') {
    return {
      sellerId: '',
      sellerFilterActive: false,
    };
  }

  const params = new URLSearchParams(window.location.search);

  const sellerId =
    params.get('seller')?.trim() ||
    params.get('seller_id')?.trim() ||
    '';

  return {
    sellerId,
    sellerFilterActive: !!sellerId,
  };
};

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const { sellerId, sellerFilterActive } = getMarketplaceFiltersFromUrl();

  useEffect(() => {
    fetchProducts();
  }, [sellerId]);

  const fetchProducts = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'marketplace');

      if (sellerFilterActive && sellerId) {
        query = query.or(`merchant_id.eq.${sellerId},user_id.eq.${sellerId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching marketplace products:', error);
        setProducts([]);
        return;
      }

      if (!data || data.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = data.map((p: any) => p.id);

      const storeIds = Array.from(
        new Set(
          data
            .map((p: any) => p.store_id)
            .filter((value: string | null | undefined) => !!value)
        )
      ) as string[];

      const sellerIds = Array.from(
        new Set(
          data
            .map((p: any) => p.user_id ?? p.merchant_id ?? null)
            .filter((value: string | null | undefined) => !!value)
        )
      ) as string[];

      const [{ data: imagesData }, { data: storesData }, { data: usersData }] = await Promise.all([
        supabase
          .from('product_images')
          .select('product_id, image_url, is_primary, display_order')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true }),

        storeIds.length > 0
          ? supabase.from('stores').select('id, name, slug, category').in('id', storeIds)
          : Promise.resolve({ data: [] as any[] }),

        sellerIds.length > 0
          ? supabase.from('users_profile').select('id, name').in('id', sellerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const imageMap = new Map<string, string>();
      (imagesData || []).forEach((img: any) => {
        if (!imageMap.has(img.product_id) && img.image_url) {
          imageMap.set(img.product_id, img.image_url);
        }
      });

      const storeMap = new Map<string, Store>();
      (storesData || []).forEach((store: any) => {
        storeMap.set(store.id, store);
      });

      const userMap = new Map<string, UserProfile>();
      (usersData || []).forEach((user: any) => {
        userMap.set(user.id, user);
      });

      const enrichedProducts: ProductWithDetails[] = data.map((product: any) => {
        const sellerUserId = product.user_id ?? product.merchant_id ?? null;
        const displayName = product.title ?? product.name ?? 'منتج رقمي';

        const finalThumbnail =
          product.thumbnail_url && String(product.thumbnail_url).trim() !== ''
            ? product.thumbnail_url
            : imageMap.get(product.id) ?? null;

        return {
          ...product,
          store: product.store_id ? storeMap.get(product.store_id) ?? null : null,
          seller: sellerUserId ? userMap.get(sellerUserId) ?? null : null,
          display_name: displayName,
          thumbnail_url: finalThumbnail,
        };
      });

      setProducts(enrichedProducts);
    } catch (e) {
      console.error('Unexpected error fetching marketplace products:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = products.filter((product) => {
      const displayName = (product.display_name ?? '').toLowerCase();
      const description = String((product as any).description ?? '').toLowerCase();
      const storeName = String(product.store?.name ?? '').toLowerCase();
      const sellerName = String(product.seller?.name ?? '').toLowerCase();

      return (
        query === '' ||
        displayName.includes(query) ||
        description.includes(query) ||
        storeName.includes(query) ||
        sellerName.includes(query)
      );
    });

    return [...result].sort((a, b) => {
      const aPrice = Number(a.price ?? 0);
      const bPrice = Number(b.price ?? 0);

      const aSales = Number((a as any).sales_count ?? 0);
      const bSales = Number((b as any).sales_count ?? 0);

      const aCreatedAt = new Date((a as any).created_at ?? 0).getTime();
      const bCreatedAt = new Date((b as any).created_at ?? 0).getTime();

      switch (sortBy) {
        case 'price_low':
          return aPrice - bPrice;
        case 'price_high':
          return bPrice - aPrice;
        case 'popular':
          return bSales - aSales;
        case 'newest':
        default:
          return bCreatedAt - aCreatedAt;
      }
    });
  }, [products, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sellerFilterActive ? 'منتجات التاجر' : 'السوق العام'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {sellerFilterActive
                    ? 'تم عرض منتجات هذا التاجر فقط من خلال الرابط التسويقي'
                    : 'ابحث في المنتجات الرقمية واستعرضها بسهولة'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8 relative">
                <Search className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    sellerFilterActive
                      ? 'ابحث داخل منتجات هذا التاجر...'
                      : 'ابحث عن منتج، وصف، متجر...'
                  }
                  className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="lg:col-span-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="newest">الأحدث</option>
                  <option value="popular">الأكثر شعبية</option>
                  <option value="price_low">السعر: من الأقل للأعلى</option>
                  <option value="price_high">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-600">جاري تحميل المنتجات...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-500">
              {sellerFilterActive
                ? 'هذا التاجر لا يملك منتجات ظاهرة في السوق العام حالياً'
                : 'جرّب تغيير كلمات البحث'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl overflow-hidden shadow cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
                onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Download className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-2">
                    {product.display_name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="text-blue-600 font-bold text-xl">
                      {Number(product.price ?? 0)} ريال
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
        )}
      </div>
    </div>
  );
};
