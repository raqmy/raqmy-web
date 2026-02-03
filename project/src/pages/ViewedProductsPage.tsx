import React, { useEffect, useState } from 'react';
import { Eye, ShoppingCart, Heart, ArrowLeft } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ViewedProductsPageProps {
  onNavigate: (page: string) => void;
}

interface ViewedProduct extends Product {
  viewed_at: string;
}

export const ViewedProductsPage: React.FC<ViewedProductsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadViewedProducts();
    }
  }, [user]);

  const loadViewedProducts = async () => {
    if (!user) return;

    try {
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

      const products = data?.map((view: any) => ({
        ...view.products,
        viewed_at: view.viewed_at,
      })) || [];

      setViewedProducts(products);
    } catch (error) {
      console.error('Error loading viewed products:', error);
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
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">المنتجات التي شاهدتها</h1>
          </div>
          <p className="text-gray-600">
            {viewedProducts.length === 0
              ? 'لم تشاهد أي منتج بعد'
              : `شاهدت ${viewedProducts.length} منتج`}
          </p>
        </div>

        {viewedProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Eye className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لم تشاهد أي منتجات بعد</h3>
            <p className="text-gray-600 mb-6">ابدأ بتصفح المنتجات المتاحة في السوق</p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {viewedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  onClick={() => onNavigate(`product-${product.id}`)}
                  className="cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-blue-600 text-4xl font-bold">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {getTimeAgo(product.viewed_at)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold text-blue-600">
                        {product.price} {product.currency === 'SAR' ? 'ريال' : product.currency}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3 h-3" />
                        <span>{product.views_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>أضف للسلة</span>
                  </button>
                  <button
                    onClick={() => onNavigate(`product-${product.id}`)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    عرض
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
