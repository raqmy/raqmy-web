import React, { useEffect, useMemo, useState } from 'react';
import { Eye, ShoppingCart, Heart, ArrowLeft, Store as StoreIcon } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ViewedProductsPageProps {
  onNavigate: (page: string) => void;
}

interface ViewedProduct extends Product {
  viewed_at: string;
}

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

export const ViewedProductsPage: React.FC<ViewedProductsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  useEffect(() => {
    const loadScopeAndViewed = async () => {
      if (!user) return;
      const resolved = await resolveStoreScope();
      setScopeInfo(resolved);
      await loadViewedProducts(resolved);
    };

    loadScopeAndViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadViewedProducts = async (resolvedScope?: ScopeInfo | null) => {
    if (!user) return;

    try {
      setLoading(true);
      const scope = resolvedScope === undefined ? scopeInfo : resolvedScope;
      const { data, error } = await supabase
        .from('viewed_products')
        .select(`
          viewed_at,
          product_id,
          products (*)
        `)
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const products =
        data
          ?.map((view: any) => ({
            ...(view.products || {}),
            viewed_at: view.viewed_at,
          }))
          .filter((product: any) => product?.id && productMatchesScope(product, scope || null)) || [];

      setViewedProducts(products);
    } catch (error) {
      console.error('Error loading viewed products:', error);
      setViewedProducts([]);
    } finally {
      setLoading(false);
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
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
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

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const viewed = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - viewed.getTime()) / 1000);

    if (diffInSeconds < 60) return 'منذ لحظات';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return viewed.toLocaleDateString('ar-SA');
  };

  const openProduct = (product: ViewedProduct) => {
    if (product.slug) {
      onNavigate(`product-slug-${product.slug}`);
      return;
    }
    onNavigate(`product-${product.id}`);
  };

  const titleText = useMemo(() => {
    if (!scopeInfo) return 'المنتجات التي شاهدتها';
    return `المنتجات التي شاهدتها من متجر ${scopeInfo.name}`;
  }, [scopeInfo]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">يجب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-4">قم بتسجيل الدخول لعرض المنتجات التي شاهدتها</p>
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
        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة إلى الملف الشخصي</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Eye className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{titleText}</h1>
            {scopeInfo && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                <StoreIcon className="w-4 h-4" />
                <span>{scopeInfo.name}</span>
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {viewedProducts.length === 0
              ? scopeInfo
                ? `لم تشاهد أي منتج من متجر ${scopeInfo.name} بعد`
                : 'لم تشاهد أي منتج بعد'
              : scopeInfo
              ? `شاهدت ${viewedProducts.length} منتج من متجر ${scopeInfo.name}`
              : `شاهدت ${viewedProducts.length} منتج`}
          </p>
        </div>

        {viewedProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Eye className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لم تشاهد أي منتجات بعد</h3>
            <p className="text-gray-600 mb-6">ابدأ بتصفح المنتجات المتاحة</p>
            <button
              onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {viewedProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div onClick={() => openProduct(product)} className="cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name || product.title || 'منتج'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-blue-600 text-4xl font-bold">{(product.name || product.title || 'م').charAt(0)}</div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {getTimeAgo(product.viewed_at)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{product.name || product.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold text-blue-600">
                        {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3 h-3" />
                        <span>{(product as any).views_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>أضف للسلة</span>
                  </button>
                  <button
                    onClick={() => openProduct(product)}
                    className="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Heart className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
