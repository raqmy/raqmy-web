import React, { useEffect, useState } from 'react';
import { CheckCircle, Package, Home, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PaymentSuccessPageProps {
  onNavigate: (page: string) => void;
  orderId: string;
}

interface ProductLite {
  id: string;
  name?: string | null;
  title?: string | null;
  price?: number | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  created_at?: string | null;
  payment_reference?: string | null;
}

interface RawOrderItem {
  id: string;
  product_id: string;
  quantity?: number | null;
  product_name?: string | null;
  product_price?: number | null;
  subtotal?: number | null;
  price?: number | null;
}

interface OrderItemView {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onNavigate, orderId }) => {
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && orderId) {
      fetchOrderDetails();
    }
  }, [profile, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const ownerFilter = `user_id.eq.${profile!.id},customer_id.eq.${profile!.id}`;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .or(ownerFilter)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const rawItems = (itemsData || []) as RawOrderItem[];
      const productIds = [...new Set(rawItems.map((item) => item.product_id).filter(Boolean))];

      let productsMap = new Map<string, ProductLite>();

      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, title, price')
          .in('id', productIds);

        if (productsError) {
          console.error('Error fetching products for success page:', productsError);
        } else if (productsData) {
          productsMap = new Map(
            (productsData as ProductLite[]).map((product) => [product.id, product])
          );
        }
      }

      const normalizedItems: OrderItemView[] = rawItems.map((item) => {
        const product = productsMap.get(item.product_id);

        const quantity = Number(item.quantity ?? 1) || 1;
        const unitPrice =
          Number(item.product_price ?? item.price ?? product?.price ?? 0) || 0;
        const subtotal = Number(item.subtotal ?? unitPrice * quantity) || 0;
        const productName =
          item.product_name ||
          product?.title ||
          product?.name ||
          'منتج';

        return {
          id: item.id,
          product_id: item.product_id,
          product_name: productName,
          product_price: unitPrice,
          quantity,
          subtotal,
        };
      });

      setOrder(orderData as Order);
      setOrderItems(normalizedItems);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setOrder(null);
      setOrderItems([]);
    } finally {
      setLoading(false);
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

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <p className="text-gray-600 mb-6">لم يتم العثور على الطلب</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">تم الدفع بنجاح!</h1>
            <p className="text-green-100 text-lg">تم تسجيل طلبك ويمكنك الوصول إلى مشترياتك</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-blue-600 font-medium mb-1">رقم الطلب</p>
                <p className="text-2xl font-bold text-blue-900">{order.order_number}</p>
              </div>

              {order.payment_reference && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 mb-1">رقم مرجع الدفع</p>
                  <p className="text-sm font-mono text-blue-800">{order.payment_reference}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">معلومات العميل</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">الاسم</p>
                  <p className="font-semibold text-gray-900">{order.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">رقم الهاتف</p>
                  <p className="font-semibold text-gray-900" dir="ltr">
                    {order.customer_phone || '—'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">البريد الإلكتروني</p>
                  <p className="font-semibold text-gray-900" dir="ltr">
                    {order.customer_email || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                المنتجات المطلوبة
              </h3>

              <div className="space-y-3">
                {orderItems.length > 0 ? (
                  orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                        <p className="text-sm text-gray-600">
                          الكمية: {item.quantity} × {item.product_price.toFixed(2)} ريال
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-blue-600">
                          {item.subtotal.toFixed(2)} ريال
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">لا توجد عناصر مرتبطة بهذا الطلب</div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="font-semibold text-gray-900">
                  {Number(order.total_amount || 0).toFixed(2)} ريال
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-xl font-bold text-gray-900">المجموع الكلي</span>
                <span className="text-2xl font-bold text-green-600">
                  {Number(order.total_amount || 0).toFixed(2)} ريال
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">ماذا بعد؟</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>تم تسجيل الطلب بنجاح داخل حسابك</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>يمكنك الدخول إلى صفحة "مشترياتي" للوصول إلى ملفات المنتجات المدفوعة</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>إذا كان المنتج رقميًا فستظهر مرفقاته بعد التحقق من حالة الشراء</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('orders')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>الذهاب إلى مشترياتي</span>
              </button>

              <button
                onClick={() => onNavigate('marketplace')}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>متابعة التسوق</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
