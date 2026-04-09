import React, { useEffect, useState } from 'react';
import { Search, Filter, Download, Star, Store as StoreIcon, Tag } from 'lucide-react';
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

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] =
    useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const orderColumn =
        sortBy === 'newest'
          ? 'created_at'
          : sortBy === 'popular'
          ? 'sales_count'
          : 'price';

      const ascending = sortBy === 'price_low';

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'marketplace')
        .order(orderColumn, { ascending });

      if (error || !data || data.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = data.map((p: any) => p.id);

      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, is_primary, display_order')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false })
        .order('display_order', { ascending: true });

      const imageMap = new Map<string, string>();
      (imagesData || []).forEach((img: any) => {
        if (!imageMap.has(img.product_id) && img.image_url) {
          imageMap.set(img.product_id, img.image_url);
        }
      });

      const enrichedProducts = await Promise.all(
        data.map(async (product: any) => {
          let store: Store | null = null;
          let seller: UserProfile | null = null;

          if (product.store_id) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('id, name, slug, category')
              .eq('id', product.store_id)
              .maybeSingle();
            store = storeData || null;
          }

          const sellerId = product.user_id ?? product.merchant_id ?? null;

          if (sellerId) {
            const { data: userData } = await supabase
              .from('users_profile')
              .select('id, name')
              .eq('id', sellerId)
              .maybeSingle();
            seller = userData || null;
          }

          const displayName = product.title ?? product.name ?? 'منتج رقمي';

          const finalThumbnail =
            product.thumbnail_url && product.thumbnail_url.trim() !== ''
              ? product.thumbnail_url
              : imageMap.get(product.id) ?? null;

          return {
            ...product,
            store,
            seller,
            display_name: displayName,
            thumbnail_url: finalThumbnail,
          };
        })
      );

      setProducts(enrichedProducts as any);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const name = (product.display_name ?? '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="text-center py-20">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl overflow-hidden shadow cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
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
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-3">
                    {product.display_name}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="text-blue-600 font-bold text-xl">
                      {product.price} ريال
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
