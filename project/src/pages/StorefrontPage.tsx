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


type StorefrontThemeKey = 'default' | 'clean' | 'dark' | 'creator' | 'creative' | 'premium';

type StorefrontThemeConfig = {
  key: StorefrontThemeKey;
  pageBg: string;
  nav: string;
  mainBg: string;
  panel: string;
  input: string;
  filterButton: string;
  emptyBox: string;
  productCard: string;
  productImage: string;
  textPrimary: string;
  textMuted: string;
  accentText: string;
  buttonPrimary: string;
  footerBg: string;
  footerText: string;
  footerMuted: string;
  footerImage: string;
};

const STOREFRONT_THEMES: Record<StorefrontThemeKey, StorefrontThemeConfig> = {
  default: {
    key: 'default',
    pageBg: 'bg-[#08152f]',
    nav: 'bg-white border-b border-gray-200',
    mainBg: 'bg-[#f6f7fb]',
    panel: 'bg-white border-gray-200 shadow-sm',
    input: 'border-gray-200 bg-gray-50 text-gray-900 focus:ring-blue-500',
    filterButton: 'border-gray-200 bg-gray-50 text-gray-500',
    emptyBox: 'bg-gray-50 border-gray-200 text-gray-900',
    productCard: 'bg-white border-gray-100 shadow hover:shadow-lg',
    productImage: 'bg-white border-gray-100',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-500',
    accentText: 'text-blue-600',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
    footerBg: 'bg-[#08152f]',
    footerText: 'text-white',
    footerMuted: 'text-white/75',
    footerImage: 'bg-white/10 border-white/10',
  },
  clean: {
    key: 'clean',
    pageBg: 'bg-slate-100',
    nav: 'bg-white/95 border-b border-slate-200 backdrop-blur',
    mainBg: 'bg-slate-50',
    panel: 'bg-white border-slate-200 shadow-sm',
    input: 'border-slate-200 bg-white text-slate-900 focus:ring-slate-500',
    filterButton: 'border-slate-200 bg-white text-slate-500',
    emptyBox: 'bg-slate-50 border-slate-200 text-slate-900',
    productCard: 'bg-white border-slate-200 shadow-sm hover:shadow-md',
    productImage: 'bg-slate-50 border-slate-100',
    textPrimary: 'text-slate-950',
    textMuted: 'text-slate-500',
    accentText: 'text-slate-900',
    buttonPrimary: 'bg-slate-900 hover:bg-slate-800 text-white',
    footerBg: 'bg-slate-950',
    footerText: 'text-white',
    footerMuted: 'text-slate-300',
    footerImage: 'bg-white/10 border-white/10',
  },
  dark: {
    key: 'dark',
    pageBg: 'bg-slate-950',
    nav: 'bg-white border-b border-slate-200',
    mainBg: 'bg-slate-950',
    panel: 'bg-slate-900 border-white/10 shadow-2xl',
    input: 'border-white/10 bg-slate-950 text-white placeholder:text-slate-500 focus:ring-cyan-400',
    filterButton: 'border-white/10 bg-slate-950 text-slate-300',
    emptyBox: 'bg-slate-950/70 border-white/10 text-white',
    productCard: 'bg-slate-950 border-white/10 shadow-xl hover:shadow-2xl',
    productImage: 'bg-slate-900 border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-slate-400',
    accentText: 'text-cyan-300',
    buttonPrimary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
    footerBg: 'bg-black',
    footerText: 'text-white',
    footerMuted: 'text-slate-300',
    footerImage: 'bg-white/10 border-white/10',
  },
  creator: {
    key: 'creator',
    pageBg: 'bg-amber-950',
    nav: 'bg-white border-b border-amber-100',
    mainBg: 'bg-amber-50',
    panel: 'bg-white border-amber-100 shadow-sm',
    input: 'border-amber-200 bg-amber-50/60 text-stone-950 focus:ring-amber-500',
    filterButton: 'border-amber-200 bg-amber-50/60 text-amber-700',
    emptyBox: 'bg-amber-50 border-amber-200 text-stone-950',
    productCard: 'bg-white border-amber-100 shadow-sm hover:shadow-lg',
    productImage: 'bg-amber-50 border-amber-100',
    textPrimary: 'text-stone-950',
    textMuted: 'text-stone-500',
    accentText: 'text-amber-700',
    buttonPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
    footerBg: 'bg-stone-950',
    footerText: 'text-white',
    footerMuted: 'text-amber-100/75',
    footerImage: 'bg-amber-400/10 border-amber-200/10',
  },
  creative: {
    key: 'creative',
    pageBg: 'bg-fuchsia-950',
    nav: 'bg-white border-b border-fuchsia-100',
    mainBg: 'bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50',
    panel: 'bg-white/90 border-fuchsia-100 shadow-sm',
    input: 'border-fuchsia-200 bg-white/80 text-slate-950 focus:ring-fuchsia-500',
    filterButton: 'border-fuchsia-200 bg-white/80 text-fuchsia-700',
    emptyBox: 'bg-white/70 border-fuchsia-200 text-slate-950',
    productCard: 'bg-white border-fuchsia-100 shadow-sm hover:shadow-xl',
    productImage: 'bg-gradient-to-br from-fuchsia-50 to-indigo-50 border-fuchsia-100',
    textPrimary: 'text-slate-950',
    textMuted: 'text-slate-500',
    accentText: 'text-fuchsia-600',
    buttonPrimary: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
    footerBg: 'bg-gradient-to-l from-fuchsia-950 via-slate-950 to-indigo-950',
    footerText: 'text-white',
    footerMuted: 'text-fuchsia-100/80',
    footerImage: 'bg-white/10 border-white/10',
  },
  premium: {
    key: 'premium',
    pageBg: 'bg-zinc-950',
    nav: 'bg-white border-b border-zinc-200',
    mainBg: 'bg-zinc-100',
    panel: 'bg-white border-zinc-200 shadow-md',
    input: 'border-zinc-200 bg-zinc-50 text-zinc-950 focus:ring-zinc-700',
    filterButton: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    emptyBox: 'bg-zinc-50 border-zinc-200 text-zinc-950',
    productCard: 'bg-white border-zinc-200 shadow-md hover:shadow-xl',
    productImage: 'bg-zinc-50 border-zinc-200',
    textPrimary: 'text-zinc-950',
    textMuted: 'text-zinc-500',
    accentText: 'text-zinc-900',
    buttonPrimary: 'bg-zinc-950 hover:bg-zinc-800 text-white',
    footerBg: 'bg-[#11100d]',
    footerText: 'text-white',
    footerMuted: 'text-zinc-300',
    footerImage: 'bg-yellow-500/10 border-yellow-200/10',
  },
};

const normalizeStorefrontTheme = (value: unknown): StorefrontThemeKey => {
  const theme = String(value || 'default') as StorefrontThemeKey;
  return theme in STOREFRONT_THEMES ? theme : 'default';
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

  const currentTheme = STOREFRONT_THEMES[normalizeStorefrontTheme(store.storefront_theme)];

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.pageBg}`}>
      <div className={currentTheme.mainBg}>
        <nav className={`${currentTheme.nav} sticky top-0 z-50`}>
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
          <section className={`rounded-3xl border p-5 md:p-6 min-h-[980px] lg:min-h-[860px] ${currentTheme.panel}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
              <div>
                <h3 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>المنتجات المتاحة</h3>
                <p className={`text-sm mt-1 ${currentTheme.textMuted}`}>
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
                  className={`w-full h-14 rounded-2xl border pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${currentTheme.input}`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${currentTheme.filterButton}`}>
                  <Filter className="w-5 h-5 text-gray-500" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full h-14 rounded-2xl border px-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${currentTheme.input}`}
                >
                  <option value="newest">الأحدث</option>
                  <option value="popular">الأكثر مبيعاً</option>
                  <option value="price_low">السعر: من الأقل للأعلى</option>
                  <option value="price_high">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className={`text-center py-16 rounded-3xl border border-dashed ${currentTheme.emptyBox}`}>
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className={`text-xl font-bold mb-2 ${currentTheme.textPrimary}`}>لا توجد منتجات مطابقة</h3>
                <p className={currentTheme.textMuted}>
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
                      className={`rounded-xl overflow-hidden cursor-pointer transition-shadow border ${currentTheme.productCard}`}
                      onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
                    >
                      <div className={`relative h-72 sm:h-80 flex items-center justify-center overflow-hidden border-b ${currentTheme.productImage}`}>
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
                        <h3 className={`font-bold text-lg line-clamp-1 mb-2 ${currentTheme.textPrimary}`}>
                          {product.display_name}
                        </h3>

                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className={`font-bold text-xl ${currentTheme.accentText}`}>
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

      <footer className={`mt-0 flex-1 ${currentTheme.footerBg} ${currentTheme.footerText}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 min-h-[220px]">
          <div
            dir="rtl"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 items-start text-right"
          >
            <div className="w-full">
              <div className="flex flex-row items-center justify-start gap-4 mb-5">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden border flex items-center justify-center shrink-0 ${currentTheme.footerImage}`}>
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
                  <h2 className={`text-2xl font-extrabold truncate ${currentTheme.footerText}`}>
                    {store.name}
                  </h2>
                </div>
              </div>

              {storeDescription && (
                <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${currentTheme.footerMuted}`}>
                  {storeDescription}
                </p>
              )}
            </div>

            {showContactSection && (
              <div className="w-full">
                <h3 className={`text-2xl font-extrabold mb-5 ${currentTheme.footerText}`}>
                  {contactSectionTitle}
                </h3>

                {contactSectionContent && (
                  <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${currentTheme.footerMuted}`}>
                    {contactSectionContent}
                  </p>
                )}
              </div>
            )}

            {showCustomSection && (
              <div className="w-full">
                {customSectionTitle && (
                  <h3 className={`text-2xl font-extrabold mb-5 ${currentTheme.footerText}`}>
                    {customSectionTitle}
                  </h3>
                )}

                {customSectionContent && (
                  <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${currentTheme.footerMuted}`}>
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
