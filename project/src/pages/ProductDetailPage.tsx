import React, { useEffect, useState } from 'react';
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
  productId: string;
  onNavigate: (page: string) => void;
}

interface ProductWithDetails extends Product {
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

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchProductImages();
    incrementViewCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (user && productId) {
      checkFavoriteStatus();
      checkPurchaseStatus();
    } else {
      setHasPurchased(false);
      setIsFavorite(false);
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  useEffect(() => {
    if (productId && (isOwner || hasPurchased)) {
      fetchAttachments();
    } else {
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isOwner, hasPurchased]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setProduct(null);
        setLoading(false);
        return;
      }

      let store = null;
      let seller = null;

      if (data.store_id) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id, name, slug, category')
          .eq('id', data.store_id)
          .maybeSingle();

        store = storeData;
      }

      if (data.user_id) {
        const { data: userData } = await supabase
          .from('users_profile')
          .select('id, name')
          .eq('id', data.user_id)
          .maybeSingle();

        seller = userData;
      }

      const enrichedProduct = {
        ...data,
        store,
        seller,
      };

      setProduct(enrichedProduct as ProductWithDetails);

      if (user && data.user_id === user.id) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async () => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
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
    try {
      const { data, error } = await supabase
        .from('product_attachments')
        .select('*')
        .eq('product_id', productId)
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
    if (!user) return;

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
        .eq('product_id', productId)
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
      onNavigate('auth');
      return;
    }

    if (isOwner) {
      alert('لا يمكنك شراء منتجك الخاص');
      return;
    }

    setPurchasing(true);

    try {
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!existingItem) {
        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
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
    if (!productId) return;

    try {
      const { error } = await supabase.rpc('increment_product_view', {
        p_product_id: productId,
      });

      if (error) {
        console.error('Error incrementing view:', error);
        return;
      }

      setProduct((prev) => {
        if (!prev) return prev;
        const current = Number((prev as any).views_count ?? 0) || 0;
        return { ...prev, views_count: current + 1 } as ProductWithDetails;
      });
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !productId) return;

    try {
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
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
      onNavigate('auth');
      return;
    }

    setFavoriteLoading(true);

    try {
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_user_id: user.id,
        p_product_id: productId,
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
      onNavigate('auth');
      return;
    }

    if (isOwner) {
      alert('لا يمكنك إضافة منتجك الخاص إلى السلة');
      return;
    }

    try {
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
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
          product_id: productId,
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('marketplace')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة إلى السوق</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                {images.length > 0 ? (
                  <img
                    src={images[selectedImageIndex]?.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
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
                      alt={`${product.name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="mb-4">
              {product.store ? (
                <button
                  onClick={() => onNavigate(`storefront-${product.store?.slug}`)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2"
                >
                  <StoreIcon className="w-4 h-4" />
                  <span className="font-medium">{product.store.name}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{product.seller?.name}</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-semibold">4.8</span>
                <span className="text-gray-500">(24 تقييم)</span>
              </div>
              <div className="text-gray-500">|</div>
              <div className="text-gray-600">{product.sales_count} مبيعات</div>
              <div className="text-gray-500">|</div>
              <div className="text-gray-600">{(product as any).views_count ?? 0} مشاهدة</div>
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

            {canAccessAttachments && !isOwner && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">تم التحقق من الشراء ويمكنك الوصول إلى الملفات</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleBuyNow}
                disabled={purchasing || isOwner}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري المعالجة...</span>
                  </>
                ) : isOwner ? (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>هذا منتجك</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>اشترِ الآن</span>
                  </>
                )}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={isOwner}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{isOwner ? 'لا يمكن إضافة منتجك للسلة' : 'أضف إلى السلة'}</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-lg font-medium transition-colors ${
                  isFavorite
                    ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}`} />
                <span>{isFavorite ? 'في المفضلة' : 'أضف للمفضلة'}</span>
              </button>

              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="w-5 h-5" />
                <span>مشاركة</span>
              </button>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {product.delivery_method === 'instant'
                    ? 'تسليم فوري بعد الدفع'
                    : 'يتم الإرسال بالبريد الإلكتروني'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">وصف المنتج</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {product.description || 'لا يوجد وصف متاح لهذا المنتج.'}
            </div>

            {product.is_subscription && (
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-bold text-blue-900 mb-2">منتج اشتراك</h3>
                <p className="text-blue-800">
                  هذا المنتج يتطلب اشتراك{' '}
                  {product.subscription_period === 'monthly'
                    ? 'شهري'
                    : product.subscription_period === 'yearly'
                    ? 'سنوي'
                    : 'أسبوعي'}
                  . سيتم تجديد الاشتراك تلقائياً ما لم تقم بإلغائه.
                </p>
              </div>
            )}

            {canAccessAttachments && attachments.length > 0 && (
              <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">مرفقات المنتج</h3>
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {attachment.attachment_type === 'text' ? (
                          <FileText className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Download className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{attachment.title}</p>
                        <p className="text-xs text-gray-500">
                          {attachment.attachment_type === 'text'
                            ? 'محتوى نصي'
                            : 'ملف قابل للتحميل'}
                          {attachment.file_size &&
                            ` • ${(attachment.file_size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>

                      {attachment.attachment_type === 'text' ? (
                        <button
                          onClick={() => alert(attachment.text_content || '')}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          عرض
                        </button>
                      ) : (
                        <a
                          href={attachment.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          تحميل
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!canAccessAttachments && (
              <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Lock className="w-5 h-5" />
                  <p className="text-sm">سيتم إتاحة المرفقات بعد إتمام عملية الشراء</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">معلومات البائع</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{product.seller?.name}</div>
                    <div className="text-sm text-gray-500">تاجر معتمد</div>
                  </div>
                </div>

                {product.store && (
                  <button
                    onClick={() => onNavigate(`storefront-${product.store?.slug}`)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    زيارة المتجر
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل إضافية</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">التصنيف:</span>
                  <span className="font-medium text-gray-900">{product.category || 'عام'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع المنتج:</span>
                  <span className="font-medium text-gray-900">
                    {product.is_subscription ? 'اشتراك' : 'منتج عادي'}
                  </span>
                </div>

                {product.file_size && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">حجم الملف:</span>
                    <span className="font-medium text-gray-900">
                      {(product.file_size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ النشر:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(product.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
