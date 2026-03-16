import React, { useEffect, useState } from 'react';
import { ShoppingCart, Package, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const [formData, setFormData] = useState({
    shippingAddress: '',
    notes: '',
  });

  useEffect(() => {
    if (profile) {
      fetchCartItems();
    }
  }, [profile]);

  const fetchCartItems = async () => {
    try {
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile!.id);

      if (cartError) throw cartError;

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map((item) => item.product_id);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) throw productsError;

        const enrichedItems = cartData.map((item) => ({
          ...item,
          product: productsData?.find((p) => p.id === item.product_id),
        }));

        setCartItems(enrichedItems);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('حدث خطأ أثناء تحميل السلة');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('يجب تسجيل الدخول أولًا');
      return;
    }

    if (cartItems.length === 0) {
      setError('السلة فارغة');
      return;
    }

    const missingProduct = cartItems.find((i) => !i.product);
    if (missingProduct) {
      setError('حدث خطأ: بعض المنتجات غير موجودة. رجاءً حدّث الصفحة وحاول مرة أخرى.');
      return;
    }

    const missingPrice = cartItems.find((i) => (i.product?.price ?? null) === null);
    if (missingPrice) {
      setError('حدث خطأ: سعر أحد المنتجات غير موجود. رجاءً راجع بيانات المنتج.');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      setError('المبلغ الإجمالي غير صالح');
      return;
    }

    // حاليًا نفترض أن السلة تخص بائعًا واحدًا
    const sellerId = cartItems[0]?.product?.user_id;
    if (!sellerId) {
      setError('تعذر تحديد البائع لهذا الطلب');
      return;
    }

    setProcessing(true);

    try {
      const { data: orderNumberData, error: orderNumberError } = await supabase.rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      const orderNumber =
        typeof orderNumberData === 'string'
          ? orderNumberData
          : Array.isArray(orderNumberData)
          ? orderNumberData[0]
          : orderNumberData;

      if (!orderNumber) {
        throw new Error('تعذر إنشاء رقم الطلب');
      }

      const orderPayload = {
        order_number: orderNumber,
        user_id: profile.id,
        seller_id: sellerId,
        total_amount: totalAmount,
        status: 'pending_payment',
        currency: 'SAR',
        payment_method: paymentMethod,
        payment_provider: paymentMethod === 'card' ? 'paymob' : 'paypal',
        customer_name: profile?.name || '',
        customer_email: profile?.email || '',
        customer_phone: profile?.phone || '',
        shipping_address: formData.shippingAddress || '',
        notes: formData.notes || '',
        sale_source: 'marketplace',
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) {
        console.error('Order insert error:', orderError);
        throw orderError;
      }

      const orderItems = cartItems.map((item) => {
        const price = item.product!.price;

        return {
          order_id: order.id,
          product_id: item.product_id,
          seller_id: item.product!.user_id || sellerId,
          quantity: item.quantity,
          price,
        };
      });

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);

      if (orderItemsError) {
        console.error('Order items insert error:', orderItemsError);
        throw orderItemsError;
      }

      const { error: cartDeleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', profile.id);

      if (cartDeleteError) {
        console.error('Cart delete error:', cartDeleteError);
      }

      onNavigate(`payment-${order.id}`);
    } catch (error: any) {
      console.error('Error creating order / starting payment:', error);
      setError(error?.message || 'حدث خطأ أثناء إنشاء الطلب. الرجاء المحاولة مرة أخرى.');
    } finally {
      setProcessing(false);
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">السلة فارغة</h3>
            <p className="text-gray-600 mb-6">لا يمكن إتمام الطلب بدون منتجات</p>
            <button
              onClick={() => onNavigate('marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              تصفح المنتجات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إتمام الطلب</h1>
          <p className="text-gray-600">أكمل بيانات الدفع لإتمام عملية الشراء</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6">طريقة الدفع</h3>

                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      paymentMethod === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    بطاقة ائتمانية
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      paymentMethod === 'paypal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    PayPal
                  </button>
                </div>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  {paymentMethod === 'card'
                    ? 'سيتم تحويلك إلى صفحة الدفع الآمنة لإدخال بيانات البطاقة وإتمام العملية.'
                    : 'سيتم تحويلك إلى صفحة PayPal لإتمام العملية.'}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الشحن</label>
                    <textarea
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h3>

                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => {
                    const productTitle =
                      (item.product as any)?.title ??
                      (item.product as any)?.name ??
                      '';

                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-8 h-8 text-blue-600" />
                        </div>

                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {productTitle}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × {item.product?.price} {item.product?.currency || 'SAR'}
                          </p>
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {((item.product?.price || 0) * item.quantity).toFixed(2)}{' '}
                            {item.product?.currency || 'SAR'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">المجموع الفرعي</span>
                    <span className="font-semibold">{calculateTotal().toFixed(2)} ريال</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">المجموع الكلي</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotal().toFixed(2)} ريال
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 break-words">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>إتمام الدفع</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
