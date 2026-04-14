import React, { useEffect, useMemo, useState } from 'react';
import {
  Store as StoreIcon,
  User,
  LogOut,
  ShoppingCart,
  Package,
  Filter,
  Share2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StorefrontPageProps {
  storeSlug: string;
  onNavigate: (page: string) => void;
}

export const StorefrontPage: React.FC<StorefrontPageProps> = ({ storeSlug, onNavigate }) => {
  const { user, profile, signOut } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchStoreAndProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug, sortBy]);

  const storeImageUrl = useMemo(() => getStoreImageUrl(store), [store]);

  useEffect(() => {
    if (!store) return;

    const canonicalUrl = `${window.location.origin}/s/${encodeURIComponent(storeSlug)}`;
    const pageTitle = `${store.name} | رقمي`;
    const pageDescription =
      store.description || `تصفح منتجات متجر ${store.name} على منصة رقمي.`;

    document.title = pageTitle;
    updateMetaTag('name', 'description', pageDescription);
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', pageDescription);
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', pageDescription);

    if (storeImageUrl) {
      updateMetaTag('property', 'og:image', storeImageUrl);
      updateMetaTag('name', 'twitter:image', storeImageUrl);
    }

    updateCanonicalUrl(canonicalUrl);
  }, [store, storeSlug, storeImageUrl]);

  const updateMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;

    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }

    element.setAttribute('content', content);
  };

  const updateCanonicalUrl = (href: string) => {
    let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      document.head.appendChild(element);
    }

    element.setAttribute('href', href);
  };

  const fetchProductsForStore = async (storeRecord: any, source: 'stores' | 'merchants') => {
    let query = supabase.from('products').select('*').eq('is_active', true);

    if (source === 'stores') {
      query = query.eq('store_id', storeRecord.id);
    } else {
      const merchantUserId = storeRecord.user_id || storeRecord.id;
      query = query.or(`user_id.eq.${merchantUserId},merchant_id.eq.${merchantUserId}`);
    }

    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'price_low') {
      query = query.order('price', { ascending: true });
    } else if (sortBy === 'price_high') {
      query = query.order('price', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('sales_count', { ascending: false });
    }

    return query;
  };

  const fetchStoreAndProducts = async () => {
    setLoading(true);

    try {
      let resolvedStore: any = null;
      let source: 'stores' | 'merchants' = 'stores';

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (!storeError && storeData) {
        resolvedStore = storeData;
        source = 'stores';
      }

      if (!resolvedStore) {
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('slug', storeSlug)
          .maybeSingle();

        if (!merchantError && merchantData) {
          resolvedStore = {
            ...merchantData,
            name:
              merchantData.store_name ||
              merchantData.business_name ||
              merchantData.name ||
              'متجر رقمي',
            description: merchantData.description || merchantData.bio || '',
            category: merchantData.category || 'متجر رقمي',
            email: merchantData.email || '',
            slug: merchantData.slug,
          };
          source = 'merchants';
        }
      }

      if (!resolvedStore) {
        setStore(null);
        setProducts([]);
        return;
      }

      setStore(resolvedStore);

      const { data: productsData, error: productsError } = await fetchProductsForStore(
        resolvedStore,
        source
      );

      if (productsError) {
        console.error('Error fetching store products:', productsError);
        setProducts([]);
        return;
      }

      const rawProducts = productsData || [];

      if (rawProducts.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = rawProducts.map((product: any) => product.id);

      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id, image_url, is_primary, display_order')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false })
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching storefront product images:', imagesError);
      }

      const imageMap = new Map<string, string>();
      (imagesData || []).forEach((img: any) => {
        if (!imageMap.has(img.product_id) && img.image_url) {
          imageMap.set(img.product_id, img.image_url);
        }
      });

      const enrichedProducts = rawProducts.map((product: any) => ({
        ...product,
        display_name: product.title || product.name || 'منتج رقمي',
        thumbnail_url:
          product.thumbnail_url && String(product.thumbnail_url).trim() !== ''
            ? product.thumbnail_url
            : imageMap.get(product.id) ?? null,
      }));

      setProducts(enrichedProducts);
    } catch (error) {
      console.error('Error fetching store:', error);
      setStore(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShareStore = async () => {
    const shareUrl = `${window.location.origin}/s/${encodeURIComponent(storeSlug)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: store?.name || 'متجر رقمي',
          text: store?.description || `تصفح متجر ${store?.name || 'رقمي'}`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert('تم نسخ رابط المتجر');
    } catch (error) {
      console.error('Error sharing store:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">المتجر غير موجود</h2>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على هذا المتجر</p>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  {storeImageUrl ? (
                    <img
                      src={storeImageUrl}
                      alt={store?.name || 'صورة المتجر'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
                  <p className="text-xs text-gray-500">{store.category}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleShareStore}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة</span>
              </button>

              {user && profile ? (
                <>
                  <button
                    onClick={() => onNavigate('cart')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>السلة</span>
                  </button>
                  <button
                    onClick={() => onNavigate('profile')}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{profile.name}</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    إنشاء حساب
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-right w-full">
              <h1 className="text-4xl font-bold mb-2">{store.name}</h1>
              {store.description && <p className="text-lg text-blue-50 mb-4">{store.description}</p>}
              <div className="flex flex-wrap items-center gap-4">
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  {products.length} منتج
                </span>
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm hover:bg-white/30"
                  >
                    تواصل معنا
                  </a>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center">
                {storeImageUrl ? (
                  <img
                    src={storeImageUrl}
                    alt={store?.name || 'صورة المتجر'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <StoreIcon className="w-16 h-16 md:w-20 md:h-20 text-white" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">المنتجات المتاحة</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">الأحدث</option>
              <option value="popular">الأكثر مبيعاً</option>
              <option value="price_low">السعر: من الأقل للأعلى</option>
              <option value="price_high">السعر: من الأعلى للأقل</option>
            </select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات متاحة</h3>
            <p className="text-gray-600">لا يوجد منتجات في هذا المتجر حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.display_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-blue-600 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {product.display_name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.description || 'منتج رقمي'}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {product.price} {product.currency}
                    </span>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      عرض التفاصيل
                    </button>
                  </div>
                  {product.slug && (
                    <div className="mt-3 text-xs text-gray-500" dir="ltr">
                      /p/{product.slug}
                    </div>
                  )}
                  {Number(product.sales_count || 0) > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      تم بيع {product.sales_count} مرة
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAuthModal && (
        <StorefrontAuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            fetchStoreAndProducts();
          }}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        />
      )}
    </div>
  );
};

function getStoreImageUrl(storeRecord: any): string | null {
  if (!storeRecord) return null;

  const candidates = [
    storeRecord.store_image_url,
    storeRecord.image_url,
    storeRecord.logo_url,
    storeRecord.thumbnail_url,
    storeRecord.avatar_url,
    storeRecord.cover_image_url,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return null;
}

interface StorefrontAuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: () => void;
}

const StorefrontAuthModal: React.FC<StorefrontAuthModalProps> = ({
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('users_profile').insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            role: 'customer',
          });

          if (profileError) throw profileError;
        }

        onSuccess();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;

        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'حدث خطأ أثناء المعالجة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              dir="ltr"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchMode}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'login' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب؟ سجل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
};
