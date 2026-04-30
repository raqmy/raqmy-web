import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Package,
  Store as StoreIcon,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface CartPageProps {
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
  name?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
  merchant_id?: string | null;
  currency?: string | null;
  price?: number | string | null;
  quantity_limit?: number | null;
  quantity_sold?: number | null;
  is_active?: boolean | null;
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

  const productOwnerId = product.user_id || product.merchant_id || null;
  return productOwnerId === scope.merchantUserId;
};

const getProductName = (product: ProductWithMeta | null | undefined) => {
  return product?.name || product?.title || 'منتج';
};

const getQuantityLimit = (product: ProductWithMeta | null | undefined) => {
  const limit = Number(product?.quantity_limit);

  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  return Math.floor(limit);
};

const getQuantitySold = (product: ProductWithMeta | null | undefined) => {
  const sold = Number(product?.quantity_sold || 0);

  if (!Number.isFinite(sold) || sold < 0) {
    return 0;
  }

  return Math.floor(sold);
};

const getRemainingQuantity = (product: ProductWithMeta | null | undefined) => {
  const limit = getQuantityLimit(product);

  if (limit === null) {
    return null;
  }

  const sold = getQuantitySold(product);
  return Math.max(limit - sold, 0);
};

const isProductSoldOut = (product: ProductWithMeta | null | undefined) => {
  const remaining = getRemainingQuantity(product);
  return remaining !== null && remaining <= 0;
};

const isCartItemQuantityInvalid = (item: CartItem) => {
  if (!item.product) return true;

  const remaining = getRemainingQuantity(item.product);

  if (remaining === null) return false;

  return remaining <= 0 || item.quantity > remaining;
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

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [cartWarning, setCartWarning] = useState('');

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
        console.error('Error loading cart scope:', error);
        setScopeInfo(null);
        await fetchCartItems(null);
      }
    };

    loadScopeAndCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchCartItems = async (resolvedScope?: ScopeInfo | null) => {
    try {
      if (!profile?.id) {
        setCartItems([]);
        return;
      }

      const scope = resolvedScope === undefined ? scopeInfo : resolvedScope;

      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (cartError) {
        console.error('cart_items fetch error:', cartError);
        setCartItems([]);
        return;
      }

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map((item) => item.product_id).filter(Boolean);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) {
          console.error('products fetch error:', productsError);
          setCartItems([]);
          return;
        }

        const allProducts = (productsData || []) as ProductWithMeta[];

        const storeIds = Array.from(
          new Set(allProducts.map((p) => p.store_id).filter(Boolean))
        ) as string[];

        const userIds = Array.from(
          new Set(allProducts.map((p) => p.user_id || p.merchant_id).filter(Boolean))
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

        if (storesRes.error) {
          console.error('stores fetch error:', storesRes.error);
        }

        if (merchantsRes.error) {
          console.error('merchants fetch error:', merchantsRes.error);
        }

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
            const productOwnerId = product.user_id || product.merchant_id || null;
            const merchantRecord = productOwnerId ? merchantsMap.get(productOwnerId) : null;

            const storeName =
              storeRecord?.name ||
              merchantRecord?.store_name ||
              merchantRecord?.business_name ||
              merchantRecord?.name ||
              'متجر';
            const storeSlug = storeRecord?.slug || merchantRecord?.slug || null;

            return {
              ...item,
              quantity: Math.max(Number(item.quantity || 1), 1),
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
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    if (!item) return;

    const remaining = getRemainingQuantity(item.product);
    const productName = getProductName(item.product);

    if (remaining !== null) {
      if (remaining <= 0) {
        setCartWarning(`المنتج "${productName}" نفدت كميته ولا يمكن زيادة العدد.`);
        return;
      }

      if (newQuantity > remaining) {
        setCartWarning(`المتبقي من المنتج "${productName}" هو ${remaining} فقط.`);
        return;
      }
    }

    try {
      setCartWarning('');
      const { error } = await supabase.from('cart_items').update({ quantity: newQuantity }).eq('id', itemId);

      if (error) {
        console.error('Error updating quantity:', error);
        setCartWarning('حدث خطأ أثناء تحديث الكمية. حاول مرة أخرى.');
        return;
      }

      fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setCartWarning('حدث خطأ أثناء تحديث الكمية. حاول مرة أخرى.');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setCartWarning('');
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);

      if (error) {
        console.error('Error removing item:', error);
        setCartWarning('حدث خطأ أثناء حذف المنتج من السلة.');
        return;
      }

      fetchCartItems();
    } catch (error) {
      console.error('Error removing item:', error);
      setCartWarning('حدث خطأ أثناء حذف المنتج من السلة.');
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + Number(item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const invalidCartItems = useMemo(() => {
    return cartItems.filter(isCartItemQuantityInvalid);
  }, [cartItems]);

  const canCheckout = cartItems.length > 0 && invalidCartItems.length === 0;

  const checkoutBlockMessage = useMemo(() => {
    if (invalidCartItems.length === 0) return '';

    const firstInvalid = invalidCartItems[0];
    const productName = getProductName(firstInvalid.product);
    const remaining = getRemainingQuantity(firstInvalid.product);

    if (!firstInvalid.product) {
      return 'يوجد منتج غير متاح في السلة. احذفه ثم حاول إتمام الطلب مرة أخرى.';
    }

    if (remaining !== null && remaining <= 0) {
      return `المنتج "${productName}" نفدت كميته. احذفه من السلة لإتمام الطلب.`;
    }

    if (remaining !== null && firstInvalid.quantity > remaining) {
      return `الكمية المطلوبة من المنتج "${productName}" أكبر من المتبقي. المتبقي حالياً ${remaining} فقط.`;
    }

    return 'يوجد منتج غير متاح أو كمية غير صالحة في السلة.';
  }, [invalidCartItems]);

  const handleCheckout = () => {
    if (!canCheckout) {
      setCartWarning(checkoutBlockMessage || 'لا يمكن إتمام الطلب حالياً. راجع المنتجات داخل السلة.');
      return;
    }

    setCartWarning('');
    onNavigate('checkout');
  };

  const openProduct = (item: CartItem) => {
    const product = item.product;
    if (!product) return;

    if (product.slug) {
      onNavigate(`product-slug-${product.slug}`);
      return;
    }

    onNavigate(`product-${item.product_id}`);
  };

  const groupedByStore = useMemo(() => {
    const map = new Map<string, CartItem[]>();

    cartItems.forEach((item) => {
      const key = item.store_name || 'متجر';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    return Array.from(map.entries());
  }, [cartItems]);

  const renderQuantityStatus = (item: CartItem) => {
    const product = item.product;
    const remaining = getRemainingQuantity(product);
    const soldOut = isProductSoldOut(product);

    if (!product) {
      return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>المنتج غير متاح</span>
        </div>
      );
    }

    if (remaining === null) {
      return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>متاح بدون حد</span>
        </div>
      );
    }

    if (soldOut) {
      return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>نفدت الكمية</span>
        </div>
      );
    }

    const isOverLimit = item.quantity > remaining;

    return (
      <div
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isOverLimit ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}
      >
        {isOverLimit ? <AlertTriangle className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
        <span>{isOverLimit ? `المتبقي ${remaining} فقط` : `المتبقي ${remaining}`}</span>
      </div>
    );
  };

  const renderCartItem = (item: CartItem) => {
    const remaining = getRemainingQuantity(item.product);
    const soldOut = isProductSoldOut(item.product);
    const isInvalid = isCartItemQuantityInvalid(item);
    const disablePlus = remaining !== null && item.quantity >= remaining;

    return (
      <div key={item.id} className={`bg-white rounded-xl p-6 shadow-sm ${isInvalid ? 'ring-1 ring-red-200' : ''}`}>
        <div className="flex gap-4">
          <div
            onClick={() => openProduct(item)}
            className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
          >
            {item.product?.thumbnail_url ? (
              <img
                src={item.product.thumbnail_url}
                alt={getProductName(item.product)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-12 h-12 text-blue-600" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <StoreIcon className="w-4 h-4" />
                  <span>{item.store_name}</span>
                </div>
                <h3
                  onClick={() => openProduct(item)}
                  className="text-lg font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {getProductName(item.product)}
                </h3>
                <p className="text-gray-600">
                  {item.product?.price} {item.product?.currency || 'SAR'}
                </p>

                {renderQuantityStatus(item)}
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="text-red-600 hover:text-red-700 transition-colors"
                title="حذف من السلة"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {isInvalid && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {soldOut
                  ? 'هذا المنتج نفدت كميته. احذفه من السلة حتى تتمكن من إتمام الطلب.'
                  : remaining !== null
                  ? `الكمية في السلة أكبر من المتبقي. المتبقي حالياً ${remaining} فقط.`
                  : 'هذا المنتج غير متاح حالياً.'}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="تقليل الكمية"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>

                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={disablePlus || soldOut || !item.product}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={disablePlus ? 'وصلت للحد المتاح من هذا المنتج' : 'زيادة الكمية'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-left">
                <p className="text-sm text-gray-600 mb-1">المجموع الفرعي</p>
                <p className="text-xl font-bold text-blue-600">
                  {(Number(item.product?.price || 0) * item.quantity).toFixed(2)}{' '}
                  {item.product?.currency || 'SAR'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            سلة التسوق
          </h1>
          <p className="text-gray-600">
            {cartItems.length > 0
              ? scopeInfo
                ? `لديك ${cartItems.length} منتج في السلة من متجر ${scopeInfo.name}`
                : `لديك ${cartItems.length} منتج في السلة`
              : scopeInfo
              ? `لا توجد منتجات من متجر ${scopeInfo.name} في السلة`
              : 'سلة التسوق فارغة'}
          </p>
        </div>

        {cartWarning && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm leading-6">{cartWarning}</div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">سلة التسوق فارغة</h3>
            <p className="text-gray-600 mb-6">
              {scopeInfo
                ? `لا توجد منتجات من متجر ${scopeInfo.name} في السلة حالياً`
                : 'ابدأ بإضافة منتجات إلى سلة التسوق'}
            </p>
            <button
              onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {scopeInfo
                ? cartItems.map((item) => renderCartItem(item))
                : groupedByStore.map(([storeName, items]) => (
                    <div key={storeName} className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <StoreIcon className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-900">{storeName}</h2>
                      </div>

                      {items.map((item) => renderCartItem(item))}
                    </div>
                  ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>عدد المنتجات</span>
                    <span>{totalItemsCount}</span>
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

                {!canCheckout && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 leading-6">
                    {checkoutBlockMessage || 'راجع كميات المنتجات قبل إتمام الطلب.'}
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={!canCheckout}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>إتمام الطلب</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
                  className="w-full mt-3 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {scopeInfo ? 'العودة إلى المتجر' : 'متابعة التسوق'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
