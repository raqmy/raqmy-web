import React, { useEffect, useMemo, useState } from 'react';
import {
  Store as StoreIcon,
  User,
  LogOut,
  ShoppingCart,
  Package,
  Filter,
  Share2,
  Search,
  Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StorefrontPageProps {
  storeSlug: string;
  onNavigate: (page: string) => void;
}

const getQuantityLimit = (product: any) => {
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

const getQuantitySold = (product: any) => {
  const sold = Number(product?.quantity_sold || 0);

  if (!Number.isFinite(sold) || sold < 0) {
    return 0;
  }

  return Math.floor(sold);
};

const getRemainingQuantity = (product: any) => {
  const limit = getQuantityLimit(product);

  if (limit === null) {
    return null;
  }

  const sold = getQuantitySold(product);
  return Math.max(limit - sold, 0);
};

const isProductSoldOut = (product: any) => {
  const remaining = getRemainingQuantity(product);
  return remaining !== null && remaining <= 0;
};

const getCleanStoreText = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const shouldShowOptionalStoreSection = (
  enabled: unknown,
  title: unknown,
  content: unknown
) => {
  return Boolean(enabled) && (getCleanStoreText(title) !== '' || getCleanStoreText(content) !== '');
};

export const StorefrontPage: React.FC<StorefrontPageProps> = ({ storeSlug, onNavigate }) => {
  const { user, profile, signOut } = useAuth();

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStoreAndProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug, sortBy]);

  const storeImageUrl = useMemo(() => getStoreImageUrl(store), [store]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const title = String(product.display_name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      const category = String(product.category || '').toLowerCase();

      return !query || title.includes(query) || description.includes(query) || category.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const aSoldOut = isProductSoldOut(a);
      const bSoldOut = isProductSoldOut(b);

      if (aSoldOut !== bSoldOut) {
        return aSoldOut ? 1 : -1;
      }

      return 0;
    });
  }, [products, searchQuery]);

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
    let element = document.head.querySelector(
      `meta[${attribute}="${key}"]`
    ) as HTMLMetaElement | null;

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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
            <StoreIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">المتجر غير موجود</h2>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على هذا المتجر</p>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  const storeDescription = getCleanStoreText(store.description);
  const contactSectionTitle = getCleanStoreText(store.contact_section_title) || 'للتواصل';
  const contactSectionContent = getCleanStoreText(store.contact_section_content);
  const customSectionTitle = getCleanStoreText(store.custom_section_title);
  const customSectionContent = getCleanStoreText(store.custom_section_content);

  const showContactSection = shouldShowOptionalStoreSection(
    store.contact_section_enabled,
    contactSectionTitle,
    contactSectionContent
  );

  const showCustomSection = shouldShowOptionalStoreSection(
    store.custom_section_enabled,
    customSectionTitle,
    customSectionContent
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#08152f]">
      <div className="bg-[#f6f7fb]">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center min-h-[72px] gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm shrink-0 border border-gray-200">
                  {storeImageUrl ? (
                    <img
                      src={storeImageUrl}
                      alt={store?.name || 'صورة المتجر'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="w-6 h-6 text-gray-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{store.name}</h1>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{store.category || 'متجر رقمي'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>{filteredProducts.length} منتج</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <button
                  onClick={handleShareStore}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">مشاركة</span>
                </button>

                {user && profile ? (
                  <>
                    <button
                      onClick={() => onNavigate('cart')}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="hidden sm:inline">السلة</span>
                    </button>

                    <button
                      onClick={() => onNavigate('profile')}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="hidden md:inline text-sm font-semibold text-gray-900 max-w-[120px] truncate">
                        {profile.name}
                      </span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="تسجيل الخروج"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setShowAuthModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                    >
                      إنشاء حساب
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 md:p-6 min-h-[980px] lg:min-h-[860px]">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">المنتجات المتاحة</h3>
                <p className="text-sm text-gray-500 mt-1">
                  تصفح منتجات المتجر وابحث فيها بسهولة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-8">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج داخل المتجر..."
                  className="w-full h-14 rounded-2xl border border-gray-200 bg-gray-50 pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                  <Filter className="w-5 h-5 text-gray-500" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">الأحدث</option>
                  <option value="popular">الأكثر مبيعاً</option>
                  <option value="price_low">السعر: من الأقل للأعلى</option>
                  <option value="price_high">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 rounded-3xl bg-gray-50 border border-dashed border-gray-200">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد منتجات مطابقة</h3>
                <p className="text-gray-500">
                  {products.length === 0
                    ? 'لا يوجد منتجات في هذا المتجر حالياً'
                    : 'جرّب تغيير البحث أو الترتيب لعرض نتائج أخرى'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
                {filteredProducts.map((product) => {
                  const soldOut = isProductSoldOut(product);

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl overflow-hidden shadow cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
                      onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
                    >
                      <div className="relative h-72 sm:h-80 bg-white flex items-center justify-center overflow-hidden border-b border-gray-100">
                        {soldOut && (
                          <div className="absolute top-3 right-3 z-10 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                            نفدت الكمية
                          </div>
                        )}

                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.display_name}
                            className={`max-w-full max-h-full object-contain p-3 transition-transform duration-300 hover:scale-[1.03] ${soldOut ? 'opacity-70 grayscale' : ''}`}
                          />
                        ) : (
                          <Download className="w-12 h-12 text-gray-400" />
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-2">
                          {product.display_name}
                        </h3>

                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="text-blue-600 font-bold text-xl">
                            {Number(product.price ?? 0)} {product.currency || 'ريال'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="mt-12 bg-[#08152f] text-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 min-h-[260px]">
          <div
            dir="rtl"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 items-start text-right"
          >
            <div className="w-full">
              <div className="flex flex-row items-center justify-start gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  {storeImageUrl ? (
                    <img
                      src={storeImageUrl}
                      alt={store?.name || 'صورة المتجر'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="w-8 h-8 text-white/60" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold text-white truncate">
                    {store.name}
                  </h2>
                </div>
              </div>

              {storeDescription && (
                <p className="text-sm leading-8 text-white/75 whitespace-pre-line max-w-sm">
                  {storeDescription}
                </p>
              )}
            </div>

            {showContactSection && (
              <div className="w-full">
                <h3 className="text-2xl font-extrabold text-white mb-5">
                  {contactSectionTitle}
                </h3>

                {contactSectionContent && (
                  <p className="text-sm leading-8 text-white/75 whitespace-pre-line max-w-sm">
                    {contactSectionContent}
                  </p>
                )}
              </div>
            )}

            {showCustomSection && (
              <div className="w-full">
                {customSectionTitle && (
                  <h3 className="text-2xl font-extrabold text-white mb-5">
                    {customSectionTitle}
                  </h3>
                )}

                {customSectionContent && (
                  <p className="text-sm leading-8 text-white/75 whitespace-pre-line max-w-sm">
                    {customSectionContent}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>

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

const getFriendlyStorefrontAuthError = (message?: string) => {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'فشل تسجيل الدخول. تأكد من صحة البريد الإلكتروني وكلمة المرور، أو أنشئ حسابًا جديدًا إذا لم يكن لديك حساب.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'يجب تأكيد البريد الإلكتروني أولًا قبل تسجيل الدخول.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'هذا البريد الإلكتروني مسجل مسبقًا. سجّل الدخول بدل إنشاء حساب جديد.';
  }

  return message || 'حدث خطأ أثناء المعالجة';
};

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
      setError(getFriendlyStorefrontAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
