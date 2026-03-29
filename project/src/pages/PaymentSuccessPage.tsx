import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Package, Home, ShoppingBag, Store as StoreIcon, ArrowLeft } from 'lucide-react';
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

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

const RETRY_COUNT = 8;
const RETRY_DELAY_MS = 1500;

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const resolveStoreScope = async (): Promise<ScopeInfo | null> => {
  const slug = getActiveStoreScopeSlug();
  if (!slug) return null;

  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .select('id, slug, name, user_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!storeError && storeData) {
    return {
      slug,
      name: storeData.name || 'المتجر',
      source: 'stores',
      storeId: storeData.id,
      merchantUserId: storeData.user_id || null,
    };
  }

  const { data: merchantData, error: merchantError } = await supabase
    .from('merchants')
    .select('id, slug, user_id, store_name, business_name, name')
    .eq('slug', slug)
    .maybeSingle();

  if (!merchantError && merchantData) {
    return {
      slug,
      name:
        merchantData.store_name || merchantData.business_name || merchantData.name || 'المتجر',
      source: 'merchants',
      storeId: null,
      merchantUserId: merchantData.user_id || merchantData.id,
    };
  }

  return null;
};

const StoreScopedBanner: React.FC<{ scopeInfo: ScopeInfo; onNavigate: (page: string) => void }> = ({
  scopeInfo,
  onNavigate,
}) => {
  return (
    <button
      onClick={() => onNavigate(`storefront-${scopeInfo.slug}`)}
      className="w-full mb-6 text-right bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-5 hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/80">تم الدفع داخل متجر</p>
            <h2 className="text-2xl font-bold">{scopeInfo.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium bg-white/15 px-4 py-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
          <span>العودة إلى المتجر</span>
        </div>
      </div>
    </button>
  );
};

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onNavigate, orderId }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  useEffect(() => {
    localStorage.removeItem('pending_payment_order_id');
    localStorage.removeItem('pending_payment_started_at');
    localStorage.removeItem('pending_payment_return_expected');
  }, []);

  useEffect(() => {
    const loadScope = async () => {
      const resolved = await resolveStoreScope();
      setScopeInfo(resolved);
    };

    void loadScope();
  }, []);

  useEffect(() => {
    if (!orderId) {
      setErrorMessage('رقم الطلب غير موجود');
      setLoading(false);
      return;
    }

    void fetchOrderDetailsWithRetry();
  }, [orderId]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchOrderDetailsWithRetry = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      let foundOrder: Order | null = null;

      for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total_amount,
            status,
            customer_name,
            customer_email,
            customer_phone,
            created_at,
            payment_reference
          `)
          .eq('id', orderId)
          .maybeSingle();

        if (orderError) {
          console.error(`Error fetching order on attempt ${attempt}:`, orderError);
        }

        if (orderData) {
          foundOrder = orderData as Order;

          if (foundOrder.status === 'paid' || foundOrder.status === 'completed') {
            break;
          }
        }

        if (attempt < RETRY_COUNT) {
          await sleep(RETRY_DELAY_MS);
        }
      }

      if (!foundOrder) {
        setOrder(null);
        setOrderItems([]);
        setErrorMessage('لم يتم العثور على الطلب');
        return;
      }

      if (foundOrder.status !== 'paid' && foundOrder.status !== 'completed') {
        setOrder(null);
        setOrderItems([]);
        setErrorMessage(`تم العثور على الطلب لكن حالته الحالية هي: ${foundOrder.status}`);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        throw itemsError;
      }

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
        const unitPrice = Number(item.product_price ?? item.price ?? product?.price ?? 0) || 0;
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

      setOrder(foundOrder);
      setOrderItems(normalizedItems);
      setErrorMessage('');
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setOrder(null);
      setOrderItems([]);
      setErrorMessage(error?.message || 'حدث خطأ أثناء جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  };

  const ordersTarget = scopeInfo ? `store-orders-${scopeInfo.slug}` : 'orders';
  const continueShoppingTarget = scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace';

  const nextStepsText = useMemo(() => {
    if (scopeInfo) {
      return [
        'تم تسجيل الطلب بنجاح داخل حسابك',
        `يمكنك الدخول إلى صفحة "مشترياتي" داخل متجر ${scopeInfo.name} للوصول إلى ملفات المنتجات المدفوعة`,
        'إذا كان المنتج رقميًا فستظهر مرفقاته بعد التحقق من حالة الشراء',
      ];
    }

    return [
      'تم تسجيل الطلب بنجاح داخل حسابك',
      'يمكنك الدخول إلى صفحة "مشترياتي" للوصول إلى ملفات المنتجات المدفوعة',
      'إذا كان المنتج رقميًا فستظهر مرفقاته بعد التحقق من حالة الشراء',
    ];
  }, [scopeInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من حالة الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <p className="text-gray-600 mb-6">{errorMessage || 'لم يتم العثور على الطلب'}</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigate(ordersTarget)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              الذهاب إلى مشترياتي
            </button>

            <button
              onClick={() => onNavigate(continueShoppingTarget)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'متابعة التسوق'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">تم الدفع بنجاح!</h1>
            <p className="text-green-100 text-lg">
              {scopeInfo
                ? `تم تسجيل طلبك داخل متجر ${scopeInfo.name}`
                : 'تم تسجيل طلبك ويمكنك الوصول إلى مشترياتك'}
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-blue-600 font-medium mb-1">رقم الطلب</p>
                <p className="text-2xl font-bold text-blue-900">{order.order_number || order.id}</p>
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
                {nextStepsText.map((text, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate(ordersTarget)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>{scopeInfo ? 'الذهاب إلى مشترياتي داخل المتجر' : 'الذهاب إلى مشترياتي'}</span>
              </button>

              <button
                onClick={() => onNavigate(continueShoppingTarget)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>{scopeInfo ? 'العودة إلى المتجر' : 'متابعة التسوق'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
