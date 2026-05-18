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
  Sparkles,
  ShieldCheck,
  BookOpen,
  Palette,
  Crown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StorefrontPageProps {
  storeSlug: string;
  onNavigate: (page: string) => void;
}

type StorefrontTheme = 'default' | 'clean' | 'dark' | 'creator' | 'creative' | 'premium';

const STOREFRONT_THEMES: Record<StorefrontTheme, {
  label: string;
  pageBg: string;
  surfaceBg: string;
  navBg: string;
  navText: string;
  sectionBg: string;
  sectionBorder: string;
  headingText: string;
  mutedText: string;
  inputBg: string;
  productCard: string;
  productImageBg: string;
  priceText: string;
  buttonAccent: string;
  footerBg: string;
  footerText: string;
  footerMuted: string;
  emptyBg: string;
  emptyBorder: string;
}> = {
  default: {
    label: 'الافتراضي',
    pageBg: 'bg-[#08152f]',
    surfaceBg: 'bg-[#f6f7fb]',
    navBg: 'bg-white border-b border-gray-200',
    navText: 'text-gray-900',
    sectionBg: 'bg-white',
    sectionBorder: 'border border-gray-200 shadow-sm',
    headingText: 'text-gray-900',
    mutedText: 'text-gray-500',
    inputBg: 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400',
    productCard: 'bg-white border border-gray-100 shadow hover:shadow-lg',
    productImageBg: 'bg-white border-b border-gray-100',
    priceText: 'text-blue-600',
    buttonAccent: 'bg-blue-600 hover:bg-blue-700 text-white',
    footerBg: 'bg-[#08152f]',
    footerText: 'text-white',
    footerMuted: 'text-white/75',
    emptyBg: 'bg-gray-50',
    emptyBorder: 'border border-dashed border-gray-200',
  },
  clean: {
    label: 'النظيف',
    pageBg: 'bg-white',
    surfaceBg: 'bg-white',
    navBg: 'bg-white/95 backdrop-blur border-b border-gray-100',
    navText: 'text-gray-950',
    sectionBg: 'bg-white',
    sectionBorder: 'border border-gray-100 shadow-sm',
    headingText: 'text-gray-950',
    mutedText: 'text-gray-500',
    inputBg: 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400',
    productCard: 'bg-white border border-gray-100 shadow-sm hover:shadow-md',
    productImageBg: 'bg-gray-50 border-b border-gray-100',
    priceText: 'text-gray-950',
    buttonAccent: 'bg-gray-950 hover:bg-gray-800 text-white',
    footerBg: 'bg-gray-950',
    footerText: 'text-white',
    footerMuted: 'text-white/70',
    emptyBg: 'bg-gray-50',
    emptyBorder: 'border border-dashed border-gray-200',
  },
  dark: {
    label: 'الداكن الرقمي',
    pageBg: 'bg-[#050816]',
    surfaceBg: 'bg-[#070b1a]',
    navBg: 'bg-[#070b1a]/95 backdrop-blur border-b border-white/10',
    navText: 'text-white',
    sectionBg: 'bg-[#0d1326]',
    sectionBorder: 'border border-white/10 shadow-2xl shadow-black/20',
    headingText: 'text-white',
    mutedText: 'text-slate-400',
    inputBg: 'bg-[#111a33] border-white/10 text-white placeholder:text-slate-500',
    productCard: 'bg-[#111a33] border border-white/10 shadow-xl hover:shadow-blue-950/30',
    productImageBg: 'bg-[#070b1a] border-b border-white/10',
    priceText: 'text-cyan-300',
    buttonAccent: 'bg-cyan-500 hover:bg-cyan-400 text-[#061020]',
    footerBg: 'bg-[#050816]',
    footerText: 'text-white',
    footerMuted: 'text-slate-300',
    emptyBg: 'bg-[#111a33]',
    emptyBorder: 'border border-dashed border-white/10',
  },
  creator: {
    label: 'التعليمي',
    pageBg: 'bg-[#f7f4ef]',
    surfaceBg: 'bg-[#f7f4ef]',
    navBg: 'bg-[#fffaf1]/95 backdrop-blur border-b border-amber-100',
    navText: 'text-stone-950',
    sectionBg: 'bg-[#fffaf1]',
    sectionBorder: 'border border-amber-100 shadow-sm',
    headingText: 'text-stone-950',
    mutedText: 'text-stone-500',
    inputBg: 'bg-white border-amber-100 text-stone-900 placeholder:text-stone-400',
    productCard: 'bg-white border border-amber-100 shadow-sm hover:shadow-lg',
    productImageBg: 'bg-[#f7f0df] border-b border-amber-100',
    priceText: 'text-amber-700',
    buttonAccent: 'bg-amber-700 hover:bg-amber-800 text-white',
    footerBg: 'bg-[#2f2418]',
    footerText: 'text-white',
    footerMuted: 'text-amber-50/75',
    emptyBg: 'bg-[#f7f0df]',
    emptyBorder: 'border border-dashed border-amber-200',
  },
  creative: {
    label: 'الإبداعي',
    pageBg: 'bg-[#fbf7ff]',
    surfaceBg: 'bg-gradient-to-br from-purple-50 via-white to-pink-50',
    navBg: 'bg-white/90 backdrop-blur border-b border-purple-100',
    navText: 'text-slate-950',
    sectionBg: 'bg-white/85 backdrop-blur',
    sectionBorder: 'border border-purple-100 shadow-xl shadow-purple-100/40',
    headingText: 'text-slate-950',
    mutedText: 'text-slate-500',
    inputBg: 'bg-white border-purple-100 text-slate-900 placeholder:text-slate-400',
    productCard: 'bg-white border border-purple-100 shadow-md shadow-purple-100/40 hover:shadow-xl hover:shadow-purple-200/50',
    productImageBg: 'bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100',
    priceText: 'text-purple-700',
    buttonAccent: 'bg-purple-600 hover:bg-purple-700 text-white',
    footerBg: 'bg-gradient-to-br from-[#2d0b59] via-[#54138a] to-[#86198f]',
    footerText: 'text-white',
    footerMuted: 'text-purple-50/80',
    emptyBg: 'bg-purple-50/70',
    emptyBorder: 'border border-dashed border-purple-200',
  },
  premium: {
    label: 'الفخم',
    pageBg: 'bg-[#11100d]',
    surfaceBg: 'bg-[#f5f0e6]',
    navBg: 'bg-[#11100d] border-b border-yellow-900/30',
    navText: 'text-[#f7e7b0]',
    sectionBg: 'bg-[#fffaf0]',
    sectionBorder: 'border border-[#e9d7a6] shadow-xl shadow-stone-300/40',
    headingText: 'text-[#20170a]',
    mutedText: 'text-stone-600',
    inputBg: 'bg-white border-[#e9d7a6] text-stone-900 placeholder:text-stone-400',
    productCard: 'bg-[#fffaf0] border border-[#e9d7a6] shadow-md hover:shadow-xl',
    productImageBg: 'bg-[#f2e5c8] border-b border-[#e9d7a6]',
    priceText: 'text-[#8a650d]',
    buttonAccent: 'bg-[#11100d] hover:bg-[#2a2112] text-[#f7e7b0]',
    footerBg: 'bg-[#11100d]',
    footerText: 'text-[#f7e7b0]',
    footerMuted: 'text-[#f7e7b0]/70',
    emptyBg: 'bg-[#f2e5c8]/60',
    emptyBorder: 'border border-dashed border-[#e9d7a6]',
  },
};

const getQuantityLimit = (product: any) => {
  const rawLimit = product?.quantity_limit;
  if (rawLimit === null || rawLimit === undefined) return null;
  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit < 0) return null;
  return Math.floor(limit);
};

const getQuantitySold = (product: any) => {
  const sold = Number(product?.quantity_sold || 0);
  if (!Number.isFinite(sold) || sold < 0) return 0;
  return Math.floor(sold);
};

const getRemainingQuantity = (product: any) => {
  const limit = getQuantityLimit(product);
  if (limit === null) return null;
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

const normalizeStorefrontTheme = (value: unknown): StorefrontTheme => {
  const theme = String(value || 'default') as StorefrontTheme;
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
      if (aSoldOut !== bSoldOut) return aSoldOut ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery]);

  useEffect(() => {
    if (!store) return;

    const canonicalUrl = `${window.location.origin}/s/${encodeURIComponent(storeSlug)}`;
    const pageTitle = `${store.name} | رقمي`;
    const pageDescription = store.description || `تصفح منتجات متجر ${store.name} على منصة رقمي.`;

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

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'price_low') query = query.order('price', { ascending: true });
    else if (sortBy === 'price_high') query = query.order('price', { ascending: false });
    else if (sortBy === 'popular') query = query.order('sales_count', { ascending: false });

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
            name: merchantData.store_name || merchantData.business_name || merchantData.name || 'متجر رقمي',
            description: merchantData.description || merchantData.bio || '',
            category: merchantData.category || 'متجر رقمي',
            email: merchantData.email || '',
            slug: merchantData.slug,
            storefront_theme: 'default',
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

      const { data: productsData, error: productsError } = await fetchProductsForStore(resolvedStore, source);

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

      if (imagesError) console.error('Error fetching storefront product images:', imagesError);

      const imageMap = new Map<string, string>();
      (imagesData || []).forEach((img: any) => {
        if (!imageMap.has(img.product_id) && img.image_url) imageMap.set(img.product_id, img.image_url);
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
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  const themeKey = normalizeStorefrontTheme(store.storefront_theme);
  const theme = STOREFRONT_THEMES[themeKey];
  const storeDescription = getCleanStoreText(store.description);
  const contactSectionTitle = getCleanStoreText(store.contact_section_title) || 'للتواصل';
  const contactSectionContent = getCleanStoreText(store.contact_section_content);
  const customSectionTitle = getCleanStoreText(store.custom_section_title);
  const customSectionContent = getCleanStoreText(store.custom_section_content);

  const showContactSection = shouldShowOptionalStoreSection(store.contact_section_enabled, contactSectionTitle, contactSectionContent);
  const showCustomSection = shouldShowOptionalStoreSection(store.custom_section_enabled, customSectionTitle, customSectionContent);

  const renderStoreImage = (sizeClass = 'w-16 h-16', roundedClass = 'rounded-2xl') => (
    <div className={`${sizeClass} ${roundedClass} overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0`}>
      {storeImageUrl ? (
        <img src={storeImageUrl} alt={store?.name || 'صورة المتجر'} className="w-full h-full object-cover" />
      ) : (
        <StoreIcon className="w-8 h-8 text-current opacity-60" />
      )}
    </div>
  );

  const renderThemeHero = () => {
    if (themeKey === 'default') return null;

    if (themeKey === 'dark') {
      return (
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.20),_transparent_35%),linear-gradient(135deg,#0b1020,#121a35)] p-6 md:p-10 text-white shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-center">
            <div className="text-right order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-cyan-200 text-sm mb-5">
                <Sparkles className="w-4 h-4" /> متجر رقمي احترافي
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">{store.name}</h2>
              {storeDescription && <p className="text-lg leading-9 text-slate-300 max-w-2xl whitespace-pre-line">{storeDescription}</p>}
            </div>
            <div className="flex justify-center lg:justify-start order-1 lg:order-2">
              {renderStoreImage('w-40 h-40 md:w-56 md:h-56', 'rounded-[2rem]')}
            </div>
          </div>
        </section>
      );
    }

    if (themeKey === 'creator') {
      return (
        <section className="mb-8 rounded-[2rem] border border-amber-100 bg-[#fff7e6] p-6 md:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-center">
            <div className="flex justify-center lg:justify-start">{renderStoreImage('w-44 h-44', 'rounded-full')}</div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-amber-800 text-sm font-semibold mb-5">
                <BookOpen className="w-4 h-4" /> محتوى رقمي وتعليمي
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-stone-950 mb-4">{store.name}</h2>
              {storeDescription && <p className="text-lg leading-9 text-stone-600 max-w-3xl whitespace-pre-line">{storeDescription}</p>}
            </div>
          </div>
        </section>
      );
    }

    if (themeKey === 'creative') {
      return (
        <section className="mb-8 rounded-[2rem] bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-[1px] shadow-2xl shadow-purple-200/60">
          <div className="rounded-[2rem] bg-white/90 backdrop-blur p-6 md:p-10">
            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 text-center md:text-right">
              <div className="flex items-center gap-5 flex-row-reverse">
                {renderStoreImage('w-24 h-24 md:w-32 md:h-32', 'rounded-3xl')}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-purple-700 text-sm font-semibold mb-4">
                    <Palette className="w-4 h-4" /> متجر إبداعي
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-950">{store.name}</h2>
                </div>
              </div>
              {storeDescription && <p className="text-base md:text-lg leading-9 text-slate-600 max-w-xl whitespace-pre-line">{storeDescription}</p>}
            </div>
          </div>
        </section>
      );
    }

    if (themeKey === 'premium') {
      return (
        <section className="mb-8 rounded-none md:rounded-[2rem] overflow-hidden border border-[#e9d7a6] bg-[#11100d] text-[#f7e7b0] shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 md:p-12 text-right flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 text-sm font-semibold mb-6 text-[#e5c76b]">
                <Crown className="w-5 h-5" /> تجربة متجر فاخرة
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-5">{store.name}</h2>
              {storeDescription && <p className="text-lg leading-9 text-[#f7e7b0]/70 max-w-2xl whitespace-pre-line">{storeDescription}</p>}
            </div>
            <div className="bg-[#2a2112] min-h-[260px] flex items-center justify-center p-10">
              {renderStoreImage('w-44 h-44 md:w-64 md:h-64', 'rounded-[2rem]')}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-6 md:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 text-center md:text-right">
          <div className="flex items-center gap-5 flex-row-reverse">
            {renderStoreImage('w-24 h-24 md:w-32 md:h-32', 'rounded-3xl')}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-gray-700 text-sm font-semibold mb-4">
                <ShieldCheck className="w-4 h-4" /> متجر موثوق على رقمي
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-950">{store.name}</h2>
            </div>
          </div>
          {storeDescription && <p className="text-base md:text-lg leading-9 text-gray-600 max-w-xl whitespace-pre-line">{storeDescription}</p>}
        </div>
      </section>
    );
  };

  const renderProductCard = (product: any) => {
    const soldOut = isProductSoldOut(product);
    const isHorizontal = themeKey === 'creator';

    return (
      <div
        key={product.id}
        className={`${theme.productCard} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isHorizontal ? 'md:flex md:items-stretch' : ''}`}
        onClick={() => onNavigate(`product-slug-${product.slug || product.id}`)}
      >
        <div className={`relative ${isHorizontal ? 'md:w-44 h-56 md:h-auto' : 'h-72 sm:h-80'} ${theme.productImageBg} flex items-center justify-center overflow-hidden`}>
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
            <Download className={`w-12 h-12 ${theme.mutedText}`} />
          )}
        </div>

        <div className={`p-5 text-right ${isHorizontal ? 'flex-1 flex flex-col justify-between' : ''}`}>
          <div>
            <h3 className={`font-bold text-lg ${theme.headingText} line-clamp-2 mb-2`}>{product.display_name}</h3>
            {themeKey !== 'default' && product.description && (
              <p className={`text-sm ${theme.mutedText} line-clamp-2 leading-6 mb-4`}>{product.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className={`${theme.priceText} font-black text-xl`}>{Number(product.price ?? 0)} {product.currency || 'ريال'}</div>
            {themeKey !== 'default' && (
              <button type="button" className={`${theme.buttonAccent} rounded-xl px-4 py-2 text-sm font-bold`}>
                عرض المنتج
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const gridClass = themeKey === 'creator'
    ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 content-start'
    : themeKey === 'premium'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-8 content-start'
      : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start';

  return (
    <div className={`min-h-screen flex flex-col ${theme.pageBg}`}>
      <div className={theme.surfaceBg}>
        <nav className={`${theme.navBg} sticky top-0 z-50`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center min-h-[72px] gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm shrink-0 border border-gray-200">
                  {storeImageUrl ? <img src={storeImageUrl} alt={store?.name || 'صورة المتجر'} className="w-full h-full object-cover" /> : <StoreIcon className="w-6 h-6 text-gray-700" />}
                </div>
                <div className="min-w-0">
                  <h1 className={`text-lg md:text-xl font-bold truncate ${theme.navText}`}>{store.name}</h1>
                  <div className={`flex items-center gap-2 text-xs ${themeKey === 'dark' || themeKey === 'premium' ? 'text-white/60' : 'text-gray-500'}`}>
                    <span>{store.category || 'متجر رقمي'}</span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                    <span>{filteredProducts.length} منتج</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <button onClick={handleShareStore} className={`flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-xl transition-colors ${themeKey === 'dark' || themeKey === 'premium' ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">مشاركة</span>
                </button>

                {user && profile ? (
                  <>
                    <button onClick={() => onNavigate('cart')} className={`flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-xl transition-colors ${themeKey === 'dark' || themeKey === 'premium' ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}>
                      <ShoppingCart className="w-4 h-4" />
                      <span className="hidden sm:inline">السلة</span>
                    </button>
                    <button onClick={() => onNavigate('profile')} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${themeKey === 'dark' || themeKey === 'premium' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white" /></div>
                      <span className={`hidden md:inline text-sm font-semibold max-w-[120px] truncate ${theme.navText}`}>{profile.name}</span>
                    </button>
                    <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="تسجيل الخروج"><LogOut className="w-5 h-5" /></button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${themeKey === 'dark' || themeKey === 'premium' ? 'text-white/80 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'}`}>تسجيل الدخول</button>
                    <button onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${theme.buttonAccent}`}>إنشاء حساب</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {renderThemeHero()}

          <section className={`${theme.sectionBg} ${theme.sectionBorder} rounded-3xl p-5 md:p-6 min-h-[640px]`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
              <div className="text-right">
                <h3 className={`text-2xl font-black ${theme.headingText}`}>المنتجات المتاحة</h3>
                <p className={`text-sm ${theme.mutedText} mt-1`}>تصفح منتجات المتجر وابحث فيها بسهولة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-8">
              <div className="relative">
                <Search className={`w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 ${theme.mutedText}`} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن منتج داخل المتجر..." className={`w-full h-14 rounded-2xl border pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme.inputBg}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${theme.inputBg}`}><Filter className={`w-5 h-5 ${theme.mutedText}`} /></div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`w-full h-14 rounded-2xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme.inputBg}`}>
                  <option value="newest">الأحدث</option>
                  <option value="popular">الأكثر مبيعاً</option>
                  <option value="price_low">السعر: من الأقل للأعلى</option>
                  <option value="price_high">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className={`text-center py-16 rounded-3xl ${theme.emptyBg} ${theme.emptyBorder}`}>
                <Package className={`w-16 h-16 mx-auto mb-4 ${theme.mutedText}`} />
                <h3 className={`text-xl font-bold ${theme.headingText} mb-2`}>لا توجد منتجات مطابقة</h3>
                <p className={theme.mutedText}>{products.length === 0 ? 'لا يوجد منتجات في هذا المتجر حالياً' : 'جرّب تغيير البحث أو الترتيب لعرض نتائج أخرى'}</p>
              </div>
            ) : (
              <div className={gridClass}>{filteredProducts.map(renderProductCard)}</div>
            )}
          </section>
        </main>
      </div>

      <footer className={`mt-0 ${theme.footerBg} ${theme.footerText} flex-1`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 min-h-[220px]">
          <div dir="rtl" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 items-start text-right">
            <div className="w-full">
              <div className="flex flex-row items-center justify-start gap-4 mb-5">
                {renderStoreImage('w-16 h-16', themeKey === 'creator' ? 'rounded-full' : 'rounded-2xl')}
                <div className="min-w-0"><h2 className={`text-2xl font-extrabold truncate ${theme.footerText}`}>{store.name}</h2></div>
              </div>
              {storeDescription && <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${theme.footerMuted}`}>{storeDescription}</p>}
            </div>

            {showContactSection && (
              <div className="w-full">
                <h3 className={`text-2xl font-extrabold mb-5 ${theme.footerText}`}>{contactSectionTitle}</h3>
                {contactSectionContent && <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${theme.footerMuted}`}>{contactSectionContent}</p>}
              </div>
            )}

            {showCustomSection && (
              <div className="w-full">
                {customSectionTitle && <h3 className={`text-2xl font-extrabold mb-5 ${theme.footerText}`}>{customSectionTitle}</h3>}
                {customSectionContent && <p className={`text-sm leading-8 whitespace-pre-line max-w-sm ${theme.footerMuted}`}>{customSectionContent}</p>}
              </div>
            )}
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <StorefrontAuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => { setShowAuthModal(false); fetchStoreAndProducts(); }}
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
