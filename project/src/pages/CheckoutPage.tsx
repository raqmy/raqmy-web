import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Package,
  AlertCircle,
  CreditCard,
  Store as StoreIcon,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

interface ScopeInfo {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
}

interface ProductWithMeta extends Product {
  slug?: string | null;
  title?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: ProductWithMeta | null;
  store_name?: string | null;
  store_slug?: string | null;
}

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

const productMatchesScope = (product: ProductWithMeta | null | undefined, scope: ScopeInfo | null) => {
  if (!scope) return true;
  if (!product) return false;

  if (scope.source === 'stores') {
    return product.store_id === scope.storeId;
  }

  return (product.user_id as string | null) === scope.merchantUserId;
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
            <p className="text-sm text-white/80">أنت داخل متجر</p>
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

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  const [formData, setFormData] = useState({
    shippingAddress: '',
    notes: '',
  });

  useEffect(() => {
    const loadScopeAndCart = async () => {
      if (!profile) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resolvedScope = await resolveStoreScope();
        setScopeInfo(resolvedScope);
        await fetchCartItems(resolvedScope);
      } catch (error) {
        console.error('Error loading checkout scope:', error);
        setScopeInfo(null);
        await fetchCartItems(null);
      }
    };

    loadScopeAndCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchCartItems = async (resolvedScope?: ScopeInfo | null) => {
    try {
      const scope = resolvedScope === undefined ? scopeInfo : resolvedScope;

      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile!.id);

      if (cartError) throw cartError;

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map((item) => item.product_id).filter(Boolean);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) throw productsError;

        const allProducts = (productsData || []) as ProductWithMeta[];

        const storeIds = Array.from(
          new Set(allProducts.map((p) => p.store_id).filter(Boolean))
        ) as string[];

        const userIds = Array.from(
          new Set(allProducts.map((p) => p.user_id).filter(Boolean))
        ) as string[];

        const [storesRes, merchantsRes] = await Promise.all([
          storeIds.length > 0
            ? supabase.from('stores').select('id, slug, name').in('id', storeIds)
            : Promise.resolve({ data: [], error: null } as any),
          userIds.length > 0
            ? supabase
                .from('merchants')
                .select('id, user_id, slug, store_name, business_name, name')
                .in('user_id', userIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const storesMap = new Map<string, any>(
          ((storesRes.data || []) as any[]).map((store) => [store.id, store])
        );

        const merchantsMap = new Map<string, any>(
          ((merchantsRes.data || []) as any[]).map((merchant) => [merchant.user_id, merchant])
        );

        const enrichedItems: CartItem[] = cartData
          .map((item) => {
            const product = allProducts.find((p) => p.id === item.product_id) || null;
            if (!product || !productMatchesScope(product, scope || null)) return null;

            const storeRecord = product.store_id ? storesMap.get(product.store_id) : null;
            const merchantRecord = product.user_id ? merchantsMap.get(product.user_id) : null;

            const storeName =
              storeRecord?.name ||
              merchantRecord?.store_name ||
              merchantRecord?.business_name ||
              merchantRecord?.name ||
              'متجر';
            const storeSlug = storeRecord?.slug || merchantRecord?.slug || null;

            return {
              ...item,
              product,
              store_name: storeName,
              store_slug: storeSlug,
            } as CartItem;
          })
          .filter(Boolean) as CartItem[];

        setCartItems(enrichedItems);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('حدث خطأ أثناء تحميل السلة');
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.product?.price || 0) * item.quantity);
    }, 0);
  };

  const uniqueSellerIds = useMemo(() => {
    return Array.from(
      new Set(cartItems.map((item) => item.product?.user_id).filter((id): id is string => !!id))
    );
  }, [cartItems]);

  const hasMultipleSellers = uniqueSellerIds.length > 1;
  const singleSellerId = uniqueSellerIds.length === 1 ? uniqueSellerIds[0] : null;

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

    const missingSeller = cartItems.find((i) => !i.product?.user_id);
    if (missingSeller) {
      setError('حدث خطأ: تعذر تحديد التاجر لأحد المنتجات.');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      setError('المبلغ الإجمالي غير صالح');
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
        seller_id: singleSellerId,
        merchant_id: singleSellerId,
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
        sale_source: scopeInfo ? 'storefront' : 'marketplace',
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
        const price = Number(item.product!.price);
        const sellerId = item.product!.user_id!;

        return {
          order_id: order.id,
          product_id: item.product_id,
          seller_id: sellerId,
          quantity: item.quantity,
          price,
          product_price: price,
          subtotal: Number((price * item.quantity).toFixed(2)),
          product_name:
            (item.product as any)?.title ??
            (item.product as any)?.name ??
            'منتج',
        };
      });

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);

      if (orderItemsError) {
        console.error('Order items insert error:', orderItemsError);
        throw orderItemsError;
      }

      if (scopeInfo) {
        const scopedProductIds = cartItems.map((item) => item.product_id);

        const { error: cartDeleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', profile.id)
          .in('product_id', scopedProductIds);

        if (cartDeleteError) {
          console.error('Scoped cart delete error:', cartDeleteError);
        }
      } else {
        const { error: cartDeleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', profile.id);

        if (cartDeleteError) {
          console.error('Cart delete error:', cartDeleteError);
        }
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
          {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">السلة فارغة</h3>
            <p className="text-gray-600 mb-6">
              {scopeInfo
                ? `لا توجد منتجات من متجر ${scopeInfo.name} لإتمام الطلب`
                : 'لا يمكن إتمام الطلب بدون منتجات'}
            </p>
            <button
              onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إتمام الطلب</h1>
          <p className="text-gray-600">
            {scopeInfo
              ? `أكمل بيانات الدفع لإتمام الشراء من متجر ${scopeInfo.name}`
              : 'أكمل بيانات الدفع لإتمام عملية الشراء'}
          </p>
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

                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  {scopeInfo
                    ? `أنت الآن تُتم طلبًا خاصًا بمتجر ${scopeInfo.name} فقط.`
                    : hasMultipleSellers
                    ? 'السلة الحالية تحتوي منتجات من عدة تجار، وسيتم توزيع الأرباح تلقائيًا على كل تاجر حسب المنتجات الموجودة في الطلب.'
                    : 'يمكنك إتمام الطلب بشكل طبيعي، وسيتم ربط الأرباح بالتاجر الخاص بهذا المنتج.'}
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
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product?.thumbnail_url ? (
                            <img
                              src={item.product.thumbnail_url}
                              alt={productTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-blue-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          {!scopeInfo && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <StoreIcon className="w-3 h-3" />
                              <span>{item.store_name || 'متجر'}</span>
                            </div>
                          )}

                          <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {productTitle}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × {item.product?.price} {item.product?.currency || 'SAR'}
                          </p>
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {((Number(item.product?.price || 0)) * item.quantity).toFixed(2)}{' '}
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
