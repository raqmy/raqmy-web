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
} from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (page: string) => void;
}

interface ProductWithDetails extends Product {
  store?: Store | null;
  seller?: UserProfile;
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

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (user && productId) {
      recordView();
      checkFavoriteStatus();
    }
  }, [user, productId]);

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

      setProduct(enrichedProduct as any);
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      onNavigate('auth');
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
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });
      }

      onNavigate('checkout');
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const recordView = async () => {
    if (!user || !productId) return;

    try {
      // تسجيل المشاهدة باستخدام الدالة المساعدة
      const { error } = await supabase.rpc('record_product_view', {
        p_user_id: user.id,
        p_product_id: productId,
      });

      if (error) {
        console.error('Error recording view:', error);
      }

      // تحديث عداد المشاهدات
      await supabase
        .from('products')
        .update({ views_count: (product?.views_count || 0) + 1 })
        .eq('id', productId);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !productId) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!error && data) {
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
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

      // data يحتوي على true إذا تمت الإضافة، false إذا تم الحذف
      setIsFavorite(data);
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
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });
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
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              {product.thumbnail_url ? (
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
              <div className="text-gray-600">{product.views_count} مشاهدة</div>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
              </div>
              {product.is_subscription && (
                <span className="text-gray-500">
                  / {product.subscription_period === 'monthly' ? 'شهرياً' : product.subscription_period === 'yearly' ? 'سنوياً' : 'أسبوعياً'}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleBuyNow}
                disabled={purchasing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري المعالجة...</span>
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
                className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>أضف إلى السلة</span>
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
                  {product.delivery_method === 'instant' ? 'تسليم فوري بعد الدفع' : 'يتم الإرسال بالبريد الإلكتروني'}
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
                  هذا المنتج يتطلب اشتراك {product.subscription_period === 'monthly' ? 'شهري' : product.subscription_period === 'yearly' ? 'سنوي' : 'أسبوعي'}.
                  سيتم تجديد الاشتراك تلقائياً ما لم تقم بإلغائه.
                </p>
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
