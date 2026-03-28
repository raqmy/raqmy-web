import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Trash2, ShoppingCart, ArrowLeft, Store as StoreIcon } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FavoritesPageProps {
  onNavigate: (page: string) => void;
}

interface FavoriteProduct extends Product {
  favorite_id: string;
  added_at: string;
}

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const productMatchesScope = (product: any, scope: ScopeInfo | null) => {
  if (!scope) return true;
  if (scope.source === 'stores') return product?.store_id === scope.storeId;
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

const StoreScopedBanner: React.FC<{ scopeInfo: ScopeInfo; onNavigate: (page: string) => void }> = ({
  scopeInfo,
  onNavigate,
}) => {
  return (
    <button
      onClick={() => onNavigate(`storefront-${scopeInfo.slug}`)}
      className="w-full mb-6 text-right bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-5 hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/80">أنت داخل متجر</p>
            <h2 className="text-2xl font-bold">{scopeInfo.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium bg-white/15 px-4 py-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
          <span>العودة إلى المتجر</span>
        </div>
      </div>
    </button>
  );
};

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [productImageMap, setProductImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadScopeAndFavorites = async () => {
      if (!user) return;
      const resolved = await resolveStoreScope();
      setScopeInfo(resolved);
      await loadFavorites(resolved);
    };

    loadScopeAndFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteImages(favorites.map((p) => p.id));
    } else {
      setProductImageMap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const loadFavorites = async (resolvedScope?: ScopeInfo | null) => {
    if (!user) return;

    setLoading(true);
    try {
      const scope = resolvedScope === undefined ? scopeInfo : resolvedScope;
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          id,
          created_at,
          product_id,
          products (*)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const favoriteProducts =
        data
          ?.map((fav: any) => ({
            ...(fav.products || {}),
            favorite_id: fav.id,
            added_at: fav.created_at,
          }))
          .filter((p: any) => p && p.id && productMatchesScope(p, scope || null)) || [];

      setFavorites(favoriteProducts);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
      alert('حدث خطأ أثناء تحميل قائمة المفضلة');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteImages = async (productIds: string[]) => {
    try {
      const uniqueIds = Array.from(new Set(productIds)).filter(Boolean);
      if (uniqueIds.length === 0) return;

      const { data, error } = await supabase
        .from('product_images')
        .select('id, product_id, image_url, is_primary, display_order')
        .in('product_id', uniqueIds)
        .order('is_primary', { ascending: false })
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching favorite images:', error);
        return;
      }

      const rows = (data || []) as ProductImageRow[];
      const map: Record<string, string> = {};

      for (const row of rows) {
        if (!map[row.product_id] && row.image_url) {
          map[row.product_id] = row.image_url;
        }
      }

      setProductImageMap(map);
    } catch (err) {
      console.error('fetchFavoriteImages error:', err);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);
      if (error) throw error;

      setFavorites((prev) => prev.filter((f) => f.favorite_id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('حدث خطأ أثناء إزالة المنتج من المفضلة');
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) return;

    try {
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingItem) {
        await supabase
          .from('cart_items')
          .update({ quantity: (existingItem as any).quantity + 1 })
          .eq('id', (existingItem as any).id);
      } else {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });
      }

      alert('تم إضافة المنتج إلى السلة بنجاح');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('حدث خطأ أثناء إضافة المنتج للسلة');
    }
  };

  const getProductTitle = (product: any) => (product?.name ?? product?.title ?? '').toString().trim();

  const getCurrencyLabel = (currency?: string) => {
    const c = (currency || 'SAR').toString();
    return c === 'SAR' ? 'ريال' : c;
  };

  const getInitialLetter = (text: string) => {
    const t = (text || '').trim();
    return t.length > 0 ? t.charAt(0) : '؟';
  };

  const openProduct = (product: FavoriteProduct) => {
    if (product.slug) {
      onNavigate(`product-slug-${product.slug}`);
      return;
    }
    onNavigate(`product-${product.id}`);
  };

  const titleText = useMemo(() => {
    if (!scopeInfo) return 'المنتجات المفضلة';
    return `المفضلة من متجر ${scopeInfo.name}`;
  }, [scopeInfo]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">يجب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-4">قم بتسجيل الدخول لعرض قائمة المفضلة</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة إلى الملف الشخصي</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">{titleText}</h1>
            {scopeInfo && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                <StoreIcon className="w-4 h-4" />
                <span>{scopeInfo.name}</span>
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {favorites.length === 0
              ? scopeInfo
                ? `لم تضف أي منتج من متجر ${scopeInfo.name} إلى المفضلة بعد`
                : 'لم تقم بإضافة أي منتج للمفضلة بعد'
              : scopeInfo
              ? `لديك ${favorites.length} منتج في المفضلة من متجر ${scopeInfo.name}`
              : `لديك ${favorites.length} منتج في المفضلة`}
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">قائمة المفضلة فارغة</h3>
            <p className="text-gray-600 mb-6">
              {scopeInfo
                ? `ابدأ بإضافة منتجات من متجر ${scopeInfo.name} إلى المفضلة`
                : 'ابدأ بإضافة المنتجات التي تعجبك إلى المفضلة'}
            </p>
            <button
              onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product: any) => {
              const title = getProductTitle(product);
              const displayTitle = title || 'بدون اسم';
              const imgUrl =
                productImageMap[product.id] || product.thumbnail_url || product.image_url || '';

              return (
                <div
                  key={product.favorite_id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div onClick={() => openProduct(product)} className="cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt={displayTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-blue-600 text-4xl font-bold">
                          {getInitialLetter(displayTitle)}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {displayTitle}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-blue-600">
                          {product.price} {getCurrencyLabel(product.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>أضف للسلة</span>
                    </button>

                    <button
                      onClick={() => handleRemoveFavorite(product.favorite_id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
