import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
} from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';
import { formatProductPrice, getProductPriceInSar, useCurrency } from '../lib/currency';

interface ProductWithDetails extends Product {
  store?: Store | null;
  seller?: UserProfile | null;
  thumbnail_url?: string | null;
  display_name?: string;
  slug?: string;
  quantity_limit?: number | null;
  quantity_sold?: number | null;
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
    params.get('merchant_id')?.trim() ||
    params.get('owner_id')?.trim() ||
    '';

  return {
    sellerId,
    sellerFilterActive: !!sellerId,
  };
};

const getQuantityLimit = (product: ProductWithDetails | null | undefined) => {
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

const getQuantitySold = (product: ProductWithDetails | null | undefined) => {
  const sold = Number(product?.quantity_sold || 0);

  if (!Number.isFinite(sold) || sold < 0) {
    return 0;
  }

  return Math.floor(sold);
};

const getRemainingQuantity = (product: ProductWithDetails | null | undefined) => {
  const limit = getQuantityLimit(product);

  if (limit === null) {
    return null;
  }

  const sold = getQuantitySold(product);
  return Math.max(limit - sold, 0);
};

const isProductSoldOut = (product: ProductWithDetails | null | undefined) => {
  const remaining = getRemainingQuantity(product);
  return remaining !== null && remaining <= 0;
};

const MarketplaceSeoContent: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="mt-10 space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-purple-700 px-5 py-8 md:px-8 text-white">
          <div className="max-w-4xl">
            <p className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-semibold mb-4">
              منصة عربية لبيع المنتجات الرقمية
            </p>
            <h2 className="text-2xl md:text-4xl font-extrabold leading-relaxed mb-4">
              رقمي تساعدك على بيع منتجاتك الرقمية من رابط واحد
            </h2>
            <p className="text-blue-50 text-base md:text-lg leading-8">
              إذا كنت تبحث عن موقع عربي سهل أو منصة مجانية لبيع المنتجات الرقمية، فـ رقمي تمنحك طريقة عملية
              لإنشاء متجر رقمي، رفع منتجاتك، عرضها في السوق العام، ومشاركة رابط البيع مع جمهورك بدون تعقيد.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="rounded-xl bg-white text-blue-700 px-5 py-3 font-bold hover:bg-blue-50 transition-colors"
              >
                ابدأ البيع مجانًا
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="rounded-xl border border-white/40 text-white px-5 py-3 font-bold hover:bg-white/10 transition-colors"
              >
                تصفح المنتجات الرقمية
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900 mb-2">ابدأ مجانًا</h3>
              <p className="text-sm text-gray-600 leading-7">
                يمكنك إنشاء حساب وبدء رفع منتجاتك الرقمية بدون رسوم تأسيس، وهذا مناسب للتجار المبتدئين
                والطلاب وصناع المحتوى الذين يريدون اختبار البيع أولًا.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900 mb-2">منتجات ومتاجر غير محدودة</h3>
              <p className="text-sm text-gray-600 leading-7">
                ارفع منتجات رقمية متعددة وأنشئ متاجر رقمية مناسبة لتخصصاتك المختلفة، سواء كانت ملفات PDF،
                ملخصات، قوالب Canva، تصاميم، أو ملفات جاهزة.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900 mb-2">رابط بيع مباشر</h3>
              <p className="text-sm text-gray-600 leading-7">
                شارك رابط المنتج أو رابط متجرك مع جمهورك في واتساب، تيك توك، إنستغرام، X، تيليجرام أو أي منصة
                تواصل اجتماعي وابدأ استقبال الطلبات.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          ماذا يمكنك بيع في رقمي؟
        </h2>
        <p className="text-gray-600 leading-8 mb-6">
          السوق العام في رقمي مخصص للمنتجات الرقمية التي يمكن تسليمها إلكترونيًا. تستطيع بيع منتجات بسيطة
          أو متقدمة حسب خبرتك وجمهورك. المنصة مناسبة لمن يريد بيع منتج رقمي جاهز بدون الحاجة إلى متجر معقد أو
          حلول تقنية كثيرة.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-100 p-4 bg-blue-50">
            <h3 className="font-bold text-blue-800 mb-2">بيع ملفات PDF</h3>
            <p className="text-sm text-blue-900/80 leading-6">
              كتب إلكترونية، أدلة، ملفات تدريبية، خطط، جداول، كتيبات، وملفات جاهزة للتحميل.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 bg-purple-50">
            <h3 className="font-bold text-purple-800 mb-2">بيع قوالب Canva</h3>
            <p className="text-sm text-purple-900/80 leading-6">
              قوالب منشورات، عروض، سيرة ذاتية، جداول محتوى، هويات بصرية، وتصاميم قابلة للتعديل.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 bg-emerald-50">
            <h3 className="font-bold text-emerald-800 mb-2">بيع الملخصات</h3>
            <p className="text-sm text-emerald-900/80 leading-6">
              ملخصات دراسية، مذكرات، خرائط ذهنية، نماذج مراجعة، ومحتوى تعليمي رقمي.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 bg-amber-50">
            <h3 className="font-bold text-amber-800 mb-2">بيع التصاميم والملفات الجاهزة</h3>
            <p className="text-sm text-amber-900/80 leading-6">
              تصاميم سوشيال ميديا، ملفات قابلة للطباعة، نماذج أعمال، ملفات تنظيم، ومنتجات رقمية مساعدة.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          لمن تناسب منصة رقمي؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-gray-600 leading-8 mb-4">
              رقمي مناسبة لأي شخص لديه معرفة، ملف، تصميم، قالب، أو منتج رقمي ويريد تحويله إلى دخل. سواء كنت
              مبتدئًا أو عندك جمهور بسيط، يمكنك استخدام رقمي كبداية عملية للبيع بدون تعقيد.
            </p>

            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>الطلاب الذين يريدون بيع ملخصات أو ملفات PDF تعليمية.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>المصممون الذين يبيعون قوالب Canva أو تصاميم جاهزة.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>صناع المحتوى الذين يريدون بيع منتجات رقمية لجمهورهم.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>أصحاب الخبرات الذين يريدون تحويل معرفتهم إلى منتج رقمي قابل للبيع.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">
              لماذا يبحث التجار عن منصة مثل رقمي؟
            </h3>
            <p className="text-gray-600 leading-8">
              كثير من التجار وصناع المنتجات الرقمية يبحثون عن موقع سهل، عربي، مجاني أو منخفض التكلفة لبيع
              المنتجات الرقمية. رقمي يختصر عليهم البداية من خلال متجر رقمي، سوق عام، رابط بيع مباشر، وتجربة
              مناسبة للمنتجات الرقمية مثل PDF، قوالب Canva، الملخصات، التصاميم والملفات الجاهزة.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          كيف تبدأ بيع منتجك الرقمي؟
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
              1
            </div>
            <h3 className="font-bold text-gray-900 mb-2">أنشئ حسابك</h3>
            <p className="text-sm text-gray-600 leading-6">
              سجّل في رقمي وابدأ تجهيز حسابك كبائع للمنتجات الرقمية.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
              2
            </div>
            <h3 className="font-bold text-gray-900 mb-2">أنشئ متجرك</h3>
            <p className="text-sm text-gray-600 leading-6">
              جهّز اسم متجرك ووصفه ليعرف العملاء ماذا تبيع.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
              3
            </div>
            <h3 className="font-bold text-gray-900 mb-2">ارفع منتجك</h3>
            <p className="text-sm text-gray-600 leading-6">
              أضف المنتج الرقمي، السعر، الوصف، والصورة المناسبة.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
              4
            </div>
            <h3 className="font-bold text-gray-900 mb-2">شارك رابط البيع</h3>
            <p className="text-sm text-gray-600 leading-6">
              انشر رابط المنتج أو المتجر وابدأ استقبال الطلبات.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          أسئلة شائعة عن بيع المنتجات الرقمية
        </h2>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-2">
              هل أستطيع البدء مجانًا في رقمي؟
            </h3>
            <p className="text-gray-600 leading-7">
              نعم، يمكنك البدء مجانًا ورفع منتجاتك الرقمية وإنشاء متجرك. هذا يجعل رقمي خيارًا مناسبًا لمن يريد
              تجربة بيع المنتجات الرقمية بدون تكلفة عالية في البداية.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-2">
              هل رقمي مناسب لبيع ملفات PDF؟
            </h3>
            <p className="text-gray-600 leading-7">
              نعم، يمكنك استخدام رقمي لبيع ملفات PDF مثل الكتب الإلكترونية، الملخصات، الأدلة، الملفات التعليمية،
              الجداول، الكتيبات، والملفات الجاهزة للتحميل.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-2">
              هل أقدر أبيع قوالب Canva وتصاميم؟
            </h3>
            <p className="text-gray-600 leading-7">
              نعم، رقمي مناسب لبيع قوالب Canva، التصاميم، الملفات القابلة للتعديل، منتجات المصممين، وقوالب
              السوشيال ميديا أو العروض أو السير الذاتية.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 mb-2">
              هل أحتاج متجر معقد أو خبرة تقنية؟
            </h3>
            <p className="text-gray-600 leading-7">
              لا، الفكرة الأساسية في رقمي هي تسهيل البداية. تنشئ متجرك، ترفع منتجك، وتحصل على رابط بيع مباشر
              يمكنك مشاركته مع جمهورك.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { currencies, selectedCurrency } = useCurrency();

  const { sellerId, sellerFilterActive } = getMarketplaceFiltersFromUrl();

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const aPrice = getProductPriceInSar(a.price, a.currency, currencies);
      const bPrice = getProductPriceInSar(b.price, b.currency, currencies);

      const aSales = Number((a as any).sales_count ?? 0);
      const bSales = Number((b as any).sales_count ?? 0);

      const aCreatedAt = new Date((a as any).created_at ?? 0).getTime();
      const bCreatedAt = new Date((b as any).created_at ?? 0).getTime();

      const aSoldOut = isProductSoldOut(a);
      const bSoldOut = isProductSoldOut(b);

      if (aSoldOut !== bSoldOut) {
        return aSoldOut ? 1 : -1;
      }

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
  }, [products, searchQuery, sortBy, currencies]);

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sellerFilterActive ? 'منتجات التاجر' : 'السوق العام للمنتجات الرقمية'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {sellerFilterActive
                    ? 'تم عرض منتجات هذا التاجر فقط من خلال الرابط التسويقي'
                    : 'تصفح منتجات رقمية مثل ملفات PDF، قوالب Canva، الملخصات، التصاميم والملفات الجاهزة'}
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
                      : 'ابحث عن PDF، قالب Canva، ملخص، تصميم، متجر...'
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
                  <option value="popular">الأكثر مبيعاً</option>
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

                    {(product.store?.name || product.seller?.name) && (
                      <p className="text-sm text-gray-500 line-clamp-1 mb-3">
                        {product.store?.name || product.seller?.name}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="text-blue-600 font-bold text-xl">
                        {formatProductPrice(product.price, product.currency, selectedCurrency, currencies)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!sellerFilterActive && <MarketplaceSeoContent onNavigate={onNavigate} />}
      </div>
    </div>
  );
};
