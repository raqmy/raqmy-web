import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Download,
  Star,
  Store as StoreIcon,
  User,
  CheckCircle,
  ArrowLeft,
  Share2,
  Heart,
  FileText,
  Lock,
} from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProductDetailPageProps {
  productId?: string;
  productSlug?: string;
  onNavigate: (page: string) => void;
}

interface ProductWithDetails extends Product {
  slug?: string;
  store?: Store | null;
  seller?: UserProfile | null;
}

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductAttachment {
  id: string;
  title: string;
  attachment_type: 'file' | 'image' | 'text';
  file_url?: string;
  text_content?: string;
  file_size?: number;
}

const getStoreContextSlug = (): string | null => {
  const queryStoreSlug = new URLSearchParams(window.location.search).get('store');
  if (queryStoreSlug) return queryStoreSlug;

  try {
    const source = sessionStorage.getItem('store_mode_source');
    const slug = sessionStorage.getItem('active_store_slug');
    const pendingSource = localStorage.getItem('pending_payment_store_source');
    const pendingSlug = localStorage.getItem('pending_payment_store_slug');

    if (source === 'storefront' && slug) return slug;
    if (pendingSource === 'storefront' && pendingSlug) return pendingSlug;
  } catch (error) {
    console.error('Error reading store product context:', error);
  }

  return null;
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  productSlug,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(productId || null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [realViewsCount, setRealViewsCount] = useState<number | null>(null);

  const storeContextSlug = useMemo(() => getStoreContextSlug(), [productId, productSlug]);
  const isStoreContext = !!storeContextSlug;

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, productSlug]);

  useEffect(() => {
    if (resolvedProductId) {
      fetchProductImages();
      fetchRealViewsCount(resolvedProductId);
      incrementViewCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedProductId, user?.id]);

  useEffect(() => {
    if (user && resolvedProductId) {
      checkFavoriteStatus();
      checkPurchaseStatus();
    } else {
      setHasPurchased(false);
      setIsFavorite(false);
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resolvedProductId]);

  useEffect(() => {
    if (resolvedProductId && (isOwner || hasPurchased)) {
      fetchAttachments();
    } else {
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedProductId, isOwner, hasPurchased]);

  useEffect(() => {
    if (!product) return;

    const slugOrId = product.slug || resolvedProductId || productId || productSlug || '';
    const canonicalUrl = product.slug
      ? `${window.location.origin}/p/${encodeURIComponent(product.slug)}`
      : `${window.location.origin}/p/${encodeURIComponent(slugOrId)}`;
    const pageTitle = `${product.name} | رقمي`;
    const pageDescription =
      product.description || `اشترِ الآن ${product.name} من خلال منصة رقمي.`;

    document.title = pageTitle;
    updateMetaTag('name', 'description', pageDescription);
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', pageDescription);
    updateMetaTag('property', 'og:type', 'product');
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', pageDescription);
    if (product.thumbnail_url) {
      updateMetaTag('property', 'og:image', product.thumbnail_url);
      updateMetaTag('name', 'twitter:image', product.thumbnail_url);
    }
    updateCanonicalUrl(canonicalUrl);
  }, [product, resolvedProductId, productId, productSlug]);

  useEffect(() => {
    if (!productSlug && productId && product?.slug) {
      onNavigate(`product-slug-${product.slug}`);
    }
  }, [productSlug, productId, product?.slug, onNavigate]);

  useEffect(() => {
    if (!product?.store?.slug) return;

    if (isStoreContext) {
      try {
        sessionStorage.setItem('active_store_slug', product.store.slug);
        sessionStorage.setItem('store_mode_source', 'storefront');
      } catch (error) {
        console.error('Error saving store product context:', error);
      }
    }
  }, [product?.store?.slug, isStoreContext]);

  const clearStoreContext = () => {
    try {
      sessionStorage.removeItem('active_store_slug');
      sessionStorage.removeItem('store_mode_source');
      localStorage.removeItem('pending_payment_store_slug');
      localStorage.removeItem('pending_payment_store_source');
    } catch (error) {
      console.error('Error clearing store context:', error);
    }
  };

  const persistStoreContext = () => {
    const explicitStoreSlug = new URLSearchParams(window.location.search).get('store');

    if (!isStoreContext || !explicitStoreSlug) {
      clearStoreContext();
      return;
    }

    try {
      sessionStorage.setItem('active_store_slug', explicitStoreSlug);
      sessionStorage.setItem('store_mode_source', 'storefront');
    } catch (error) {
      console.error('Error persisting store context:', error);
    }
  };

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

  const fetchRealViewsCount = async (targetProductId: string) => {
    try {
      const { count, error } = await supabase
        .from('viewed_products')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', targetProductId);

      if (error) {
        console.error('Error fetching real viewed products count:', error);
        return;
      }

      setRealViewsCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching real views count:', error);
    }
  };

  const fetchProduct = async () => {
    setLoading(true);

    try {
      let data: Product | null = null;
      let fetchError: any = null;

      if (productSlug) {
        const { data: slugData, error: slugError } = await supabase
          .from('products')
          .select('*')
          .eq('slug', productSlug)
          .maybeSingle();

        if (slugError) {
          console.error('Error fetching product by slug:', slugError);
          fetchError = slugError;
        } else if (slugData) {
          data = slugData as Product;
        } else {
          const { data: idFallbackData, error: idFallbackError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productSlug)
            .maybeSingle();

          if (idFallbackError) {
            console.error('Error fetching product by slug fallback id:', idFallbackError);
            fetchError = idFallbackError;
          } else if (idFallbackData) {
            data = idFallbackData as Product;
          }
        }
      } else if (productId) {
        const { data: idData, error: idError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        if (idError) {
          console.error('Error fetching product by id:', idError);
          fetchError = idError;
        } else if (idData) {
          data = idData as Product;
        } else {
          const { data: slugFallbackData, error: slugFallbackError } = await supabase
            .from('products')
            .select('*')
            .eq('slug', productId)
            .maybeSingle();

          if (slugFallbackError) {
            console.error('Error fetching product by id fallback slug:', slugFallbackError);
            fetchError = slugFallbackError;
          } else if (slugFallbackData) {
            data = slugFallbackData as Product;
          }
        }
      } else {
        setProduct(null);
        setResolvedProductId(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      if (fetchError && !data) {
        setProduct(null);
        setResolvedProductId(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      if (!data) {
        setProduct(null);
        setResolvedProductId(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const finalProductId = data.id;
      setResolvedProductId(finalProductId);

      let store = null;
      let seller = null;

      if (data.store_id) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, name, slug, category')
          .eq('id', data.store_id)
          .maybeSingle();

        if (storeError) {
          console.error('Error fetching store:', storeError);
        } else {
          store = storeData;
        }
      }

      const sellerId = (data as any).user_id ?? (data as any).merchant_id ?? null;

      if (sellerId) {
        const { data: userData, error: userError } = await supabase
          .from('users_profile')
          .select('id, name')
          .eq('id', sellerId)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching seller profile:', userError);
        } else {
          seller = userData;
        }
      }

      const enrichedProduct = {
        ...data,
        store,
        seller,
      };

      setProduct(enrichedProduct as ProductWithDetails);
      setIsOwner(!!user && !!sellerId && sellerId === user.id);
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
      setResolvedProductId(null);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async () => {
    if (!resolvedProductId) return;

    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', resolvedProductId)
        .order('display_order');

      if (!error && data) {
        setImages(data);
        const primaryIndex = data.findIndex((img) => img.is_primary);
        setSelectedImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
      }
    } catch (error) {
      console.error('Error fetching product images:', error);
    }
  };

  const fetchAttachments = async () => {
    if (!resolvedProductId) return;

    try {
      const { data, error } = await supabase
        .from('product_attachments')
        .select('*')
        .eq('product_id', resolvedProductId)
        .order('display_order');

      if (error) {
        console.error('Error fetching attachments:', error);
        setAttachments([]);
        return;
      }

      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAttachments([]);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!user || !resolvedProductId) return;

    try {
      const validStatuses = ['paid', 'completed', 'delivered'];

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .in('status', validStatuses);

      if (ordersError) {
        console.error('Error fetching user paid orders:', ordersError);
        setHasPurchased(false);
        return;
      }

      const orderIds = (ordersData || []).map((order) => order.id);

      if (orderIds.length === 0) {
        setHasPurchased(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', resolvedProductId)
        .in('order_id', orderIds)
        .limit(1);

      if (itemsError) {
        console.error('Error checking purchase status:', itemsError);
        setHasPurchased(false);
        return;
      }

      setHasPurchased(!!itemsData && itemsData.length > 0);
    } catch (error) {
      console.error('Error checking purchase status:', error);
      setHasPurchased(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      persistStoreContext();
      onNavigate('auth');
      return;
    }

    if (!resolvedProductId) {
      alert('تعذر تحديد المنتج');
      return;
    }

    if (isOwner) {
      alert('لا يمكنك شراء منتجك الخاص');
      return;
    }

    setPurchasing(true);

    try {
      persistStoreContext();

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', resolvedProductId)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: resolvedProductId,
          quantity: 1,
        });

        if (error) throw error;
      }

      onNavigate('checkout');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('حدث خطأ أثناء نقل المنتج إلى السلة');
    } finally {
      setPurchasing(false);
    }
  };

  const incrementViewCount = async () => {
    if (!resolvedProductId || !user?.id) {
      return;
    }

    try {
      const nowIso = new Date().toISOString();

      const { data: existingView, error: existingViewError } = await supabase
        .from('viewed_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', resolvedProductId)
        .maybeSingle();

      if (existingViewError) {
        console.error('Error checking existing viewed product row:', existingViewError);
        return;
      }

      if (existingView?.id) {
        const { error: updateViewError } = await supabase
          .from('viewed_products')
          .update({
            viewed_at: nowIso,
          })
          .eq('id', existingView.id);

        if (updateViewError) {
          console.error('Error updating viewed product row:', updateViewError);
          return;
        }
      } else {
        const { error: insertViewError } = await supabase
          .from('viewed_products')
          .insert({
            user_id: user.id,
            product_id: resolvedProductId,
            viewed_at: nowIso,
          });

        if (insertViewError) {
          console.error('Error inserting viewed product row:', insertViewError);
          return;
        }
      }

      await fetchRealViewsCount(resolvedProductId);
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !resolvedProductId) return;

    try {
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', resolvedProductId)
        .maybeSingle();

      if (!favError && favData) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      persistStoreContext();
      onNavigate('auth');
      return;
    }

    if (!resolvedProductId) {
      alert('تعذر تحديد المنتج');
      return;
    }

    setFavoriteLoading(true);

    try {
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_user_id: user.id,
        p_product_id: resolvedProductId,
      });

      if (error) throw error;

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('حدث خطأ أثناء تحديث المفضلة');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      persistStoreContext();
      onNavigate('auth');
      return;
    }

    if (!resolvedProductId) {
      alert('تعذر تحديد المنتج');
      return;
    }

    if (isOwner) {
      alert('لا يمكنك إضافة منتجك الخاص إلى السلة');
      return;
    }

    try {
      persistStoreContext();

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', resolvedProductId)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: resolvedProductId,
          quantity: 1,
        });

        if (error) throw error;
      }

      alert('تم إضافة المنتج إلى السلة بنجاح');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('حدث خطأ أثناء إضافة المنتج للسلة');
    }
  };

  const handleShareProduct = async () => {
    if (!product) return;

    const slugOrId = product.slug || resolvedProductId || productId || productSlug;
    const shareUrl = isStoreContext && storeContextSlug
      ? `${window.location.origin}/p/${encodeURIComponent(slugOrId || '')}?store=${encodeURIComponent(storeContextSlug)}`
      : `${window.location.origin}/p/${encodeURIComponent(slugOrId || '')}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description || `تصفح ${product.name} على منصة رقمي`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert('تم نسخ رابط المنتج');
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const handleBack = () => {
    if (isStoreContext && storeContextSlug) {
      onNavigate(`storefront-${storeContextSlug}`);
      return;
    }

    onNavigate('marketplace');
  };

  const handleOpenStore = () => {
    const targetStoreSlug = product?.store?.slug || storeContextSlug;
    if (!targetStoreSlug) return;

    try {
      sessionStorage.setItem('active_store_slug', targetStoreSlug);
      sessionStorage.setItem('store_mode_source', 'storefront');
    } catch (error) {
      console.error('Error setting store context before opening storefront:', error);
    }

    onNavigate(`storefront-${targetStoreSlug}`);
  };

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

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">المنتج غير موجود</h2>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            العودة إلى السوق
          </button>
        </div>
      </div>
    );
  }

  const canAccessAttachments = isOwner || hasPurchased;
  const productTitle = product.name || (product as any).title || 'منتج رقمي';
  const productDescription =
    product.description?.trim() || 'لا يوجد وصف لهذا المنتج حالياً.';
  const displayedViewsCount =
    realViewsCount !== null ? realViewsCount : Number((product as any).views_count ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{isStoreContext ? 'العودة إلى المتجر' : 'العودة إلى السوق'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                {images.length > 0 ? (
                  <img
                    src={images[selectedImageIndex]?.image_url}
                    alt={productTitle}
                    className="w-full h-full object-cover"
                  />
                ) : product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={productTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Download className="w-24 h-24 text-blue-600" />
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 ${
                      selectedImageIndex === index
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${productTitle} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                {product.store?.slug ? (
                  <button
                    onClick={handleOpenStore}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2"
                  >
                    <StoreIcon className="w-4 h-4" />
                    <span className="font-medium">{product.store.name}</span>
                  </button>
                ) : product.store ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <StoreIcon className="w-4 h-4" />
                    <span className="font-medium">{product.store.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{product.seller?.name}</span>
                  </div>
                )}
                {product.slug && (
                  <div className="text-xs text-gray-500" dir="ltr">
                    {isStoreContext && storeContextSlug ? `/p/${product.slug}?store=${storeContextSlug}` : `/p/${product.slug}`}
                  </div>
                )}
              </div>

              <button
                onClick={handleShareProduct}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة</span>
              </button>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {productTitle}
            </h1>

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-semibold">4.8</span>
                <span className="text-gray-500">(24 تقييم)</span>
              </div>
              <div className="text-gray-500">|</div>
              <div className="text-gray-600">{product.sales_count} مبيعات</div>
              <div className="text-gray-500">|</div>
              <div className="text-gray-600">{displayedViewsCount} مشاهدة</div>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
              </div>
              {product.is_subscription && (
                <span className="text-gray-500">
                  /{' '}
                  {product.subscription_period === 'monthly'
                    ? 'شهرياً'
                    : product.subscription_period === 'yearly'
                    ? 'سنوياً'
                    : 'أسبوعياً'}
                </span>
              )}
            </div>

            <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">وصف المنتج</h2>
              <p className="text-gray-700 leading-8 whitespace-pre-line">
                {productDescription}
              </p>
            </div>

            {hasPurchased && !isOwner && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 mb-1">تم شراء المنتج سابقًا</p>
                    <p className="text-sm text-green-700">
                      يمكنك الوصول إلى المحتوى الآن، وما زال بإمكانك شراء المنتج مرة أخرى إذا رغبت.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={handleBuyNow}
                disabled={purchasing || isOwner}
                className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isOwner ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>هذا منتجك</span>
                  </>
                ) : purchasing ? (
                  <span>جاري المعالجة...</span>
                ) : hasPurchased ? (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>شراء مرة أخرى</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>اشترِ الآن</span>
                  </>
                )}
              </button>

              {!isOwner && (
                <button
                  onClick={handleAddToCart}
                  className="px-6 py-4 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{hasPurchased ? 'أضف مرة أخرى إلى السلة' : 'أضف إلى السلة'}</span>
                </button>
              )}

              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`px-6 py-4 border rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isFavorite
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                <span>{isFavorite ? 'في المفضلة' : 'أضف للمفضلة'}</span>
              </button>
            </div>

            <div className="border-t pt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>النوع</span>
                <span className="font-medium text-gray-900">منتج رقمي</span>
              </div>
              <div className="flex items-center justify-between">
                <span>التوصيل</span>
                <span className="font-medium text-gray-900">فوري بعد الدفع</span>
              </div>
              <div className="flex items-center justify-between">
                <span>الترخيص</span>
                <span className="font-medium text-gray-900">حسب وصف المنتج</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            {canAccessAttachments ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Lock className="w-6 h-6 text-gray-400" />
            )}
            <h2 className="text-2xl font-bold text-gray-900">محتوى المنتج</h2>
          </div>

          {canAccessAttachments ? (
            attachments.length > 0 ? (
              <div className="space-y-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{attachment.title}</h3>
                        <p className="text-sm text-gray-500">
                          {attachment.attachment_type === 'text'
                            ? 'محتوى نصي'
                            : attachment.attachment_type === 'image'
                            ? 'صورة'
                            : 'ملف قابل للتحميل'}
                        </p>
                      </div>
                    </div>

                    {attachment.attachment_type === 'text' ? (
                      <button
                        onClick={() => alert(attachment.text_content || 'لا يوجد محتوى نصي')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                      >
                        عرض
                      </button>
                    ) : attachment.file_url ? (
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                      >
                        تحميل
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">غير متاح</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                لا توجد ملفات أو مرفقات متاحة لهذا المنتج حالياً.
              </div>
            )
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">المحتوى محمي</h3>
              <p className="text-gray-600 mb-6">
                ستتمكن من الوصول إلى ملفات ومرفقات المنتج مباشرة بعد إتمام الشراء.
              </p>
              <button
                onClick={handleBuyNow}
                disabled={purchasing || isOwner}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                اشترِ للوصول إلى المحتوى
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
