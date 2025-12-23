import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface CartPageProps {
  onNavigate: (page: string) => void;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchCartItems();
    }
  }, [profile]);

  const fetchCartItems = async () => {
    try {
      const { data: cartData } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map(item => item.product_id);
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        const enrichedItems = cartData.map(item => ({
          ...item,
          product: productsData?.find(p => p.id === item.product_id)
        }));

        setCartItems(enrichedItems);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      fetchCartItems();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            سلة التسوق
          </h1>
          <p className="text-gray-600">
            {cartItems.length > 0 ? `لديك ${cartItems.length} منتج في السلة` : 'سلة التسوق فارغة'}
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">سلة التسوق فارغة</h3>
            <p className="text-gray-600 mb-6">ابدأ بإضافة منتجات إلى سلة التسوق</p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex gap-4">
                    <div
                      onClick={() => onNavigate(`product-${item.product_id}`)}
                      className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Package className="w-12 h-12 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3
                            onClick={() => onNavigate(`product-${item.product_id}`)}
                            className="text-lg font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            {item.product?.name}
                          </h3>
                          <p className="text-gray-600">
                            {item.product?.price} {item.product?.currency}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-lg font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-left">
                          <p className="text-sm text-gray-600 mb-1">المجموع الفرعي</p>
                          <p className="text-xl font-bold text-blue-600">
                            {((item.product?.price || 0) * item.quantity).toFixed(2)} {item.product?.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>عدد المنتجات</span>
                    <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>المجموع الفرعي</span>
                    <span>{calculateTotal().toFixed(2)} ريال</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">المجموع الكلي</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {calculateTotal().toFixed(2)} ريال
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('checkout')}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>إتمام الطلب</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onNavigate('marketplace')}
                  className="w-full mt-3 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
