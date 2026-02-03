import React, { useEffect, useState } from 'react';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FavoritesPageProps {
  onNavigate: (page: string) => void;
}

interface FavoriteProduct extends Product {
  favorite_id: string;
  added_at: string;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          created_at,
          product_id,
          products (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const favoriteProducts = data?.map((fav: any) => ({
        ...fav.products,
        favorite_id: fav.id,
        added_at: fav.created_at,
      })) || [];

      setFavorites(favoriteProducts);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter((f) => f.favorite_id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('حدث خطأ أثناء إزالة المنتج من المفضلة');
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">يجب تسجيل الدخول</h2>
          <p className="text-gray-600 mb-4">قم بتسجيل الدخول لعرض قائمة المفضلة</p>
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
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">المنتجات المفضلة</h1>
          </div>
          <p className="text-gray-600">
            {favorites.length === 0
              ? 'لم تقم بإضافة أي منتج للمفضلة بعد'
              : `لديك ${favorites.length} منتج في المفضلة`}
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">قائمة المفضلة فارغة</h3>
            <p className="text-gray-600 mb-6">ابدأ بإضافة المنتجات التي تعجبك إلى المفضلة</p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product) => (
              <div
                key={product.favorite_id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  onClick={() => onNavigate(`product-${product.id}`)}
                  className="cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
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
                      <span className="text-xs text-gray-500">
                        {new Date(product.added_at).toLocaleDateString('ar-SA')}
                      </span>
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
                    onClick={() => handleRemoveFavorite(product.favorite_id)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 className="w-4 h-4" />
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
