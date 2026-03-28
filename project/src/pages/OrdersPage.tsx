import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Store as StoreIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface OrdersPageProps {
  onNavigate: (page: string) => void;
}

interface ProductLite {
  id: string;
  name?: string | null;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  store_id?: string | null;
  user_id?: string | null;
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
  quantity: number;
  product_name: string;
  product_price: number;
  subtotal: number;
  thumbnail_url?: string | null;
  product_slug?: string | null;
  store_id?: string | null;
  user_id?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  currency?: string | null;
  items?: OrderItemView[];
}

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const productMatchesScope = (product: any, scope: ScopeInfo | null) => {
  if (!scope) return true;
  if (scope.source === 'stores') return product?.store_id === scope.storeId;
  return (product?.user_id || product?.merchant_id) === scope.merchantUserId;
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

export const OrdersPage: React.FC<OrdersPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'failed' | 'completed'>('all');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  useEffect(() => {
    const loadScopeAndOrders = async () => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const resolved = await resolveStoreScope();
      setScopeInfo(resolved);
      await fetchOrders(resolved);
    };

    loadScopeAndOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const normalizeStatusForFilter = (status: string) => {
    if (status === 'pending_payment') return 'pending';
    return status;
  };

  const fetchOrders = async (resolvedScope?: ScopeInfo | null) => {
    try {
      setLoading(true);
      const scope = resolvedScope === undefined ? scopeInfo : resolvedScope;
      const ownerFilter = `user_id.eq.${user!.id},customer_id.eq.${user!.id}`;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, currency')
        .or(ownerFilter)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          const { data: rawItems, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
          }

          const itemsArray = (rawItems || []) as RawOrderItem[];
          const productIds = [...new Set(itemsArray.map((item) => item.product_id).filter(Boolean))];

          let productsMap = new Map<string, ProductLite>();

          if (productIds.length > 0) {
            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select('id, name, title, price, currency, thumbnail_url, slug, store_id, user_id')
              .in('id', productIds);

            if (productsError) {
              console.error('Error fetching products for order items:', productsError);
            } else if (productsData) {
              productsMap = new Map(
                (productsData as ProductLite[]).map((product) => [product.id, product])
              );
            }
          }

          const normalizedItems: OrderItemView[] = itemsArray
            .map((item) => {
              const product = productsMap.get(item.product_id);
              if (!product || !productMatchesScope(product, scope || null)) return null;

              const quantity = Number(item.quantity ?? 1) || 1;
              const unitPrice = Number(item.product_price ?? item.price ?? product?.price ?? 0) || 0;
              const subtotal = Number(item.subtotal ?? unitPrice * quantity) || 0;
              const productName = item.product_name || product?.title || product?.name || 'منتج';

              return {
                id: item.id,
                product_id: item.product_id,
                quantity,
                product_name: productName,
                product_price: unitPrice,
                subtotal,
                thumbnail_url: product?.thumbnail_url ?? null,
                product_slug: product?.slug ?? null,
                store_id: product?.store_id ?? null,
                user_id: product?.user_id ?? null,
              } as OrderItemView;
            })
            .filter(Boolean) as OrderItemView[];

          if (normalizedItems.length === 0) return null;

          return {
            ...order,
            total_amount: normalizedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
            items: normalizedItems,
          } as Order;
        })
      );

      setOrders((ordersWithItems.filter(Boolean) as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const canAccessFiles = (status: string) => {
    return ['paid', 'completed', 'delivered'].includes(status);
  };

  const handleOpenProductFiles = (item: OrderItemView) => {
    if (item.product_slug) {
      onNavigate(`product-slug-${item.product_slug}`);
      return;
    }
    onNavigate(`product-${item.product_id}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
      case 'pending_payment':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'refunded':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'تم الدفع';
      case 'completed':
        return 'مكتمل';
      case 'delivered':
        return 'تم التسليم';
      case 'pending':
        return 'جاري المعالجة';
      case 'pending_payment':
        return 'بانتظار الدفع';
      case 'failed':
        return 'فشل';
      case 'cancelled':
        return 'ملغي';
      case 'refunded':
        return 'مسترجع';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return normalizeStatusForFilter(order.status) === filter;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">يجب تسجيل الدخول</h2>
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">مشترياتي</h1>
            {scopeInfo && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                <StoreIcon className="w-4 h-4" />
                <span>{scopeInfo.name}</span>
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {scopeInfo ? `تتبع وإدارة مشترياتك من متجر ${scopeInfo.name}` : 'تتبع وإدارة جميع مشترياتك'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              الكل ({orders.length})
            </button>
            <button onClick={() => setFilter('paid')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'paid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              تم الدفع ({orders.filter((o) => normalizeStatusForFilter(o.status) === 'paid').length})
            </button>
            <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'completed' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              مكتملة ({orders.filter((o) => normalizeStatusForFilter(o.status) === 'completed').length})
            </button>
            <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              جاري المعالجة ({orders.filter((o) => normalizeStatusForFilter(o.status) === 'pending').length})
            </button>
            <button onClick={() => setFilter('failed')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'failed' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              فشلت ({orders.filter((o) => normalizeStatusForFilter(o.status) === 'failed').length})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-600 mb-6">
              {scopeInfo ? `لم تقم بشراء أي منتجات من متجر ${scopeInfo.name} بعد` : 'لم تقم بشراء أي منتجات بعد'}
            </p>
            <button
              onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">الطلب #{order.order_number}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-left">
                      <div className="text-xl font-bold text-blue-600 mb-2">
                        {Number(order.total_amount).toFixed(2)} {order.currency === 'SAR' || !order.currency ? 'ريال' : order.currency}
                      </div>
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">عناصر الطلب</h4>

                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {item.thumbnail_url ? (
                                    <img src={item.thumbnail_url} alt={item.product_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-6 h-6 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900">{item.product_name || 'منتج'}</h5>
                                  <p className="text-sm text-gray-500">
                                    الكمية: {item.quantity} × {Number(item.product_price).toFixed(2)} ريال
                                  </p>
                                </div>
                              </div>

                              <div className="text-left font-bold text-gray-900">{Number(item.subtotal).toFixed(2)} ريال</div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {canAccessFiles(order.status) && (
                                <button
                                  onClick={() => handleOpenProductFiles(item)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>فتح الملفات</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenProductFiles(item)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Package className="w-4 h-4" />
                                <span>عرض المنتج</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">لا توجد عناصر مرتبطة بهذا الطلب</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
