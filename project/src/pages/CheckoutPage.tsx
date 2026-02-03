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

  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const [paypalData, setPaypalData] = useState({
    email: '',
    password: ''
  });

  const [formData, setFormData] = useState({
    shippingAddress: '',
    notes: ''
  });

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
        .eq('user_id', profile!.id);

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

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cartItems.length === 0) {
      setError('السلة فارغة');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardData.cardNumber || !cardData.expiryDate || !cardData.cvv || !cardData.cardholderName) {
        setError('الرجاء ملء جميع بيانات البطاقة');
        return;
      }
      if (cardData.cardNumber.replace(/\s/g, '').length !== 16) {
        setError('رقم البطاقة يجب أن يكون 16 رقم');
        return;
      }
    } else {
      if (!paypalData.email || !paypalData.password) {
        setError('الرجاء ملء بيانات PayPal');
        return;
      }
    }

    setProcessing(true);

    try {
      const { data: orderNumberData } = await supabase
        .rpc('generate_order_number');

      const totalAmount = calculateTotal();
      const sellerId = cartItems[0]?.product?.user_id;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumberData,
          user_id: profile!.id,
          seller_id: sellerId,
          total_amount: totalAmount,
          status: 'pending',
          customer_name: profile?.name || '',
          customer_email: profile?.email || '',
          customer_phone: profile?.phone || '',
          shipping_address: formData.shippingAddress,
          notes: formData.notes,
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product!.name,
        product_price: item.product!.price,
        quantity: item.quantity,
        subtotal: item.product!.price * item.quantity
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', profile!.id);

      onNavigate(`payment-${order.id}`);
    } catch (error: any) {
      console.error('Error creating order:', error);
      setError('حدث خطأ أثناء إنشاء الطلب. الرجاء المحاولة مرة أخرى.');
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

                {paymentMethod === 'card' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رقم البطاقة <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                          const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                          setCardData({ ...cardData, cardNumber: formatted });
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تاريخ الانتهاء <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardData.expiryDate}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            }
                            setCardData({ ...cardData, expiryDate: value });
                          }}
                          placeholder="MM/YY"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={cardData.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setCardData({ ...cardData, cvv: value });
                          }}
                          placeholder="123"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم على البطاقة <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cardData.cardholderName}
                        onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني PayPal <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={paypalData.email}
                        onChange={(e) => setPaypalData({ ...paypalData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={paypalData.password}
                        onChange={(e) => setPaypalData({ ...paypalData, password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان الشحن
                    </label>
                    <textarea
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ملاحظات إضافية
                    </label>
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
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {item.product?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × {item.product?.price} {item.product?.currency}
                        </p>
                        <p className="text-sm font-bold text-blue-600 mt-1">
                          {((item.product?.price || 0) * item.quantity).toFixed(2)} {item.product?.currency}
                        </p>
                      </div>
                    </div>
                  ))}
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
                    <p className="text-sm text-red-600">{error}</p>
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
