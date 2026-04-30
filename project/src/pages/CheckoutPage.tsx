import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Package,
  AlertCircle,
  CreditCard,
  Store as StoreIcon,
  ArrowLeft,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  name?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
  merchant_id?: string | null;
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

interface AffiliateLocalData {
  ref_code?: string | null;
  attribution_id?: string | null;
  visitor_token?: string | null;
  created_at?: string | null;
}

interface ResolvedAffiliateAttribution {
  attribution_id: string | null;
  affiliate_link_id: string | null;
  affiliate_marketer_id: string | null;
  affiliate_rule_id: string | null;
  affiliate_ref_code: string | null;
}

interface DiscountCouponRow {
  id: string;
  user_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number;
  is_active: boolean | null;
  created_at?: string | null;
  affiliate_marketer_id?: string | null;
  affiliate_link_id?: string | null;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface AppliedCouponState {
  coupon: DiscountCouponRow;
  eligibleProductIds: string[];
  eligibleStoreIds: string[];
  eligibleSubtotal: number;
  discountAmount: number;
  scopeType: 'all' | 'products' | 'stores';
}

interface OrderItemPricing {
  discountedUnitPrice: number;
  discountedSubtotal: number;
  discountShare: number;
}

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const getAffiliateLocalData = (): AffiliateLocalData | null => {
  try {
    const raw = localStorage.getItem('affiliate_data');
    if (!raw) return null;
    return JSON.parse(raw);
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

const productMatchesScope = (
  product: ProductWithMeta | null | undefined,
  scope: ScopeInfo | null
) => {
  if (!scope) return true;
  if (!product) return false;

  if (scope.source === 'stores') {
    return product.store_id === scope.storeId;
  }

  const productOwnerId = product.user_id || product.merchant_id || null;
  return productOwnerId === scope.merchantUserId;
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ريال`;

const normalizeDateOnly = (value?: string | null) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

const getProductTitle = (product: ProductWithMeta | null | undefined) => {
  return product?.title || product?.name || 'منتج';
};

const getProductSellerId = (product: ProductWithMeta | null | undefined) => {
  return product?.user_id || product?.merchant_id || null;
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

const isCartItemQuantityInvalid = (item: CartItem) => {
  if (!item.product) return true;

  const remaining = getRemainingQuantity(item.product);

  if (remaining === null) return false;

  return remaining <= 0 || item.quantity > remaining;
};

const getCartItemQuantityIssueMessage = (item: CartItem) => {
  if (!item.product) {
    return 'يوجد منتج غير متاح في السلة. احذفه ثم حاول إتمام الطلب مرة أخرى.';
  }

  const productTitle = getProductTitle(item.product);
  const remaining = getRemainingQuantity(item.product);

  if (remaining === null) return '';

  if (remaining <= 0) {
    return `المنتج "${productTitle}" نفدت كميته ولا يمكن شراؤه حالياً.`;
  }

  if (item.quantity > remaining) {
    return `الكمية المطلوبة من المنتج "${productTitle}" أكبر من المتبقي. المتبقي حالياً ${remaining} فقط.`;
  }

  return '';
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
  const [paymentMethod] = useState<'card' | 'paypal'>('card');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState | null>(null);

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

  useEffect(() => {
    if (!appliedCoupon) return;

    const stillValid =
      couponCode.trim().toUpperCase() === appliedCoupon.coupon.code.trim().toUpperCase();

    if (!stillValid) {
      setAppliedCoupon(null);
      setCouponSuccess('');
    }
  }, [couponCode, appliedCoupon]);

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
        .eq('user_id', profile.id);

      if (cartError) throw cartError;

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map((item) => item.product_id).filter(Boolean);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) throw productsError;

        const allProducts = (productsData || []) as ProductWithMeta[];

        const storeIds = Array.from(new Set(allProducts.map((p) => p.store_id).filter(Boolean))) as string[];

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

        const storesMap = new Map<string, any>(((storesRes.data || []) as any[]).map((store) => [store.id, store]));

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
      setError('حدث خطأ أثناء تحميل السلة');
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCartProductsBeforePayment = async () => {
    if (cartItems.length === 0) return cartItems;

    const productIds = cartItems.map((item) => item.product_id).filter(Boolean);

    const { data: latestProducts, error: latestProductsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (latestProductsError) {
      console.error('latest products fetch before payment error:', latestProductsError);
      throw latestProductsError;
    }

    const latestProductsMap = new Map<string, ProductWithMeta>(
      ((latestProducts || []) as ProductWithMeta[]).map((product) => [product.id, product])
    );

    const refreshedItems = cartItems.map((item) => ({
      ...item,
      product: latestProductsMap.get(item.product_id) || null,
    }));

    setCartItems(refreshedItems);

    return refreshedItems;
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + Number(item.product?.price || 0) * item.quantity;
    }, 0);
  };

  const totalAmount = useMemo(() => calculateTotal(), [cartItems]);
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const finalAmount = Math.max(0, Number((totalAmount - discountAmount).toFixed(2)));

  const quantityInvalidItems = useMemo(() => {
    return cartItems.filter(isCartItemQuantityInvalid);
  }, [cartItems]);

  const quantityIssueMessage = useMemo(() => {
    if (quantityInvalidItems.length === 0) return '';

    const firstIssue = quantityInvalidItems[0];
    return getCartItemQuantityIssueMessage(firstIssue) || 'يوجد منتج غير متاح أو كمية غير صالحة داخل الطلب.';
  }, [quantityInvalidItems]);

  const canSubmitCheckout = cartItems.length > 0 && quantityInvalidItems.length === 0 && !processing;

  const uniqueSellerIds = useMemo(() => {
    return Array.from(
      new Set(
        cartItems
          .map((item) => getProductSellerId(item.product))
          .filter((id): id is string => !!id)
      )
    );
  }, [cartItems]);

  const singleSellerId = uniqueSellerIds.length === 1 ? uniqueSellerIds[0] : null;

  const getCouponEligibleItems = (
    items: CartItem[],
    productIds: string[],
    storeIds: string[]
  ): CartItem[] => {
    if (productIds.length > 0) {
      return items.filter((item) => productIds.includes(item.product_id));
    }

    if (storeIds.length > 0) {
      return items.filter((item) => !!item.product?.store_id && storeIds.includes(item.product.store_id));
    }

    return items;
  };

  const calculateCouponDiscount = (
    coupon: DiscountCouponRow,
    eligibleSubtotal: number
  ) => {
    if (eligibleSubtotal <= 0) return 0;

    let calculatedDiscount = 0;

    if (coupon.discount_type === 'percentage') {
      calculatedDiscount = eligibleSubtotal * (Number(coupon.discount_value || 0) / 100);
    } else if (coupon.discount_type === 'fixed') {
      calculatedDiscount = Number(coupon.discount_value || 0);
    } else {
      return 0;
    }

    if (coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined) {
      calculatedDiscount = Math.min(calculatedDiscount, Number(coupon.max_discount_amount));
    }

    calculatedDiscount = Math.min(calculatedDiscount, eligibleSubtotal);

    return Number(calculatedDiscount.toFixed(2));
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');

    const normalizedCode = couponCode.trim().toUpperCase();

    if (!normalizedCode) {
      setCouponError('أدخل كود الخصم أولًا');
      return;
    }

    if (cartItems.length === 0) {
      setCouponError('لا يمكن تطبيق الكوبون لأن السلة فارغة');
      return;
    }

    if (quantityInvalidItems.length > 0) {
      setCouponError('لا يمكن تطبيق الكوبون قبل تعديل الكميات غير المتاحة في الطلب');
      return;
    }

    setIsApplyingCoupon(true);

    try {
      const { data: couponData, error: couponFetchError } = await supabase
        .from('discount_coupons')
        .select(
          'id, user_id, code, discount_type, discount_value, is_active, created_at, affiliate_marketer_id, affiliate_link_id, min_purchase_amount, max_discount_amount, usage_limit, used_count, start_date, end_date'
        )
        .eq('code', normalizedCode)
        .maybeSingle();

      if (couponFetchError) {
        throw couponFetchError;
      }

      if (!couponData) {
        setAppliedCoupon(null);
        setCouponError('كود الخصم غير موجود');
        return;
      }

      const coupon = couponData as DiscountCouponRow;

      if (!coupon.is_active) {
        setAppliedCoupon(null);
        setCouponError('كود الخصم غير نشط');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = normalizeDateOnly(coupon.start_date);
      const endDate = normalizeDateOnly(coupon.end_date);

      if (startDate && today < startDate) {
        setAppliedCoupon(null);
        setCouponError('كود الخصم غير متاح بعد');
        return;
      }

      if (endDate && today > endDate) {
        setAppliedCoupon(null);
        setCouponError('انتهت صلاحية كود الخصم');
        return;
      }

      if (
        coupon.usage_limit !== null &&
        coupon.usage_limit !== undefined &&
        Number(coupon.used_count || 0) >= Number(coupon.usage_limit)
      ) {
        setAppliedCoupon(null);
        setCouponError('تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون');
        return;
      }

      const [{ data: couponProductsData, error: couponProductsError }, { data: couponStoresData, error: couponStoresError }] =
        await Promise.all([
          supabase.from('coupon_products').select('product_id').eq('coupon_id', coupon.id),
          supabase.from('coupon_stores').select('store_id').eq('coupon_id', coupon.id),
        ]);

      if (couponProductsError) throw couponProductsError;
      if (couponStoresError) throw couponStoresError;

      const eligibleProductIds = (couponProductsData || [])
        .map((item: any) => item.product_id)
        .filter(Boolean) as string[];

      const eligibleStoreIds = (couponStoresData || [])
        .map((item: any) => item.store_id)
        .filter(Boolean) as string[];

      const eligibleItems = getCouponEligibleItems(cartItems, eligibleProductIds, eligibleStoreIds);

      if (eligibleItems.length === 0) {
        setAppliedCoupon(null);
        setCouponError('هذا الكوبون لا ينطبق على المنتجات الموجودة في السلة');
        return;
      }

      const eligibleSubtotal = Number(
        eligibleItems
          .reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0)
          .toFixed(2)
      );

      if (
        coupon.min_purchase_amount !== null &&
        coupon.min_purchase_amount !== undefined &&
        eligibleSubtotal < Number(coupon.min_purchase_amount)
      ) {
        setAppliedCoupon(null);
        setCouponError(
          `الحد الأدنى لاستخدام هذا الكوبون هو ${formatMoney(Number(coupon.min_purchase_amount))}`
        );
        return;
      }

      const calculatedDiscount = calculateCouponDiscount(coupon, eligibleSubtotal);

      if (calculatedDiscount <= 0) {
        setAppliedCoupon(null);
        setCouponError('تعذر احتساب الخصم لهذا الكوبون');
        return;
      }

      const scopeType: 'all' | 'products' | 'stores' =
        eligibleProductIds.length > 0 ? 'products' : eligibleStoreIds.length > 0 ? 'stores' : 'all';

      setAppliedCoupon({
        coupon,
        eligibleProductIds,
        eligibleStoreIds,
        eligibleSubtotal,
        discountAmount: calculatedDiscount,
        scopeType,
      });

      setCouponSuccess(`تم تطبيق الكوبون بنجاح وخصم ${formatMoney(calculatedDiscount)}`);
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      setAppliedCoupon(null);
      setCouponError(error?.message || 'حدث خطأ أثناء تطبيق الكوبون');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
    setCouponCode('');
  };

  const getOrderItemPricings = (items: CartItem[], applied: AppliedCouponState | null): OrderItemPricing[] => {
    const originalSubtotals = items.map((item) =>
      Number((Number(item.product?.price || 0) * item.quantity).toFixed(2))
    );

    if (!applied || applied.discountAmount <= 0) {
      return items.map((_, index) => {
        const subtotal = originalSubtotals[index];
        const quantity = Math.max(1, items[index].quantity);
        return {
          discountedSubtotal: subtotal,
          discountedUnitPrice: Number((subtotal / quantity).toFixed(2)),
          discountShare: 0,
        };
      });
    }

    const eligibleItems = getCouponEligibleItems(items, applied.eligibleProductIds, applied.eligibleStoreIds);
    const eligibleIds = new Set(eligibleItems.map((item) => item.id));
    const eligibleSubtotal = applied.eligibleSubtotal;

    if (eligibleSubtotal <= 0) {
      return items.map((_, index) => {
        const subtotal = originalSubtotals[index];
        const quantity = Math.max(1, items[index].quantity);
        return {
          discountedSubtotal: subtotal,
          discountedUnitPrice: Number((subtotal / quantity).toFixed(2)),
          discountShare: 0,
        };
      });
    }

    let remainingDiscount = Number(applied.discountAmount.toFixed(2));

    return items.map((item, index) => {
      const subtotal = originalSubtotals[index];
      const quantity = Math.max(1, item.quantity);

      if (!eligibleIds.has(item.id)) {
        return {
          discountedSubtotal: subtotal,
          discountedUnitPrice: Number((subtotal / quantity).toFixed(2)),
          discountShare: 0,
        };
      }

      const isLastEligible =
        eligibleItems.findIndex((eligibleItem) => eligibleItem.id === item.id) === eligibleItems.length - 1;

      let discountShare = 0;

      if (isLastEligible) {
        discountShare = remainingDiscount;
      } else {
        discountShare = Number(((subtotal / eligibleSubtotal) * applied.discountAmount).toFixed(2));
        discountShare = Math.min(discountShare, remainingDiscount);
        remainingDiscount = Number((remainingDiscount - discountShare).toFixed(2));
      }

      const discountedSubtotal = Number(Math.max(0, subtotal - discountShare).toFixed(2));
      const discountedUnitPrice = Number((discountedSubtotal / quantity).toFixed(2));

      return {
        discountedSubtotal,
        discountedUnitPrice,
        discountShare,
      };
    });
  };

  const validateQuantityBeforePayment = async () => {
    const refreshedItems = await refreshCartProductsBeforePayment();

    const invalidItem = refreshedItems.find(isCartItemQuantityInvalid);

    if (invalidItem) {
      const message = getCartItemQuantityIssueMessage(invalidItem);
      throw new Error(message || 'يوجد منتج غير متاح أو كمية غير صالحة داخل الطلب.');
    }

    return refreshedItems;
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

    if (quantityInvalidItems.length > 0) {
      setError(quantityIssueMessage || 'يوجد منتج غير متاح أو كمية غير صالحة داخل الطلب.');
      return;
    }

    if (finalAmount <= 0) {
      setError('المبلغ النهائي غير صالح');
      return;
    }

    setProcessing(true);

    try {
      const validatedCartItems = await validateQuantityBeforePayment();

      const missingProduct = validatedCartItems.find((i) => !i.product);
      if (missingProduct) {
        setError('حدث خطأ: بعض المنتجات غير موجودة. رجاءً حدّث الصفحة وحاول مرة أخرى.');
        return;
      }

      const missingPrice = validatedCartItems.find((i) => (i.product?.price ?? null) === null);
      if (missingPrice) {
        setError('حدث خطأ: سعر أحد المنتجات غير موجود. رجاءً راجع بيانات المنتج.');
        return;
      }

      const missingSeller = validatedCartItems.find((i) => !getProductSellerId(i.product));
      if (missingSeller) {
        setError('حدث خطأ: تعذر تحديد التاجر لأحد المنتجات.');
        return;
      }

      const affiliateLocalData = getAffiliateLocalData();
      const visitorToken =
        affiliateLocalData?.visitor_token ||
        (() => {
          try {
            return localStorage.getItem('visitor_token');
          } catch {
            return null;
          }
        })();

      const resolvedAttributionsByItem = await Promise.all(
        validatedCartItems.map(async (item) => {
          const sellerId = getProductSellerId(item.product);
          const productId = item.product?.id || item.product_id || null;
          const storeId = item.product?.store_id || null;

          if (!sellerId || (!visitorToken && !profile.id)) {
            return null;
          }

          const { data, error } = await supabase.rpc(
            'resolve_affiliate_attribution_for_checkout',
            {
              p_customer_user_id: profile.id,
              p_visitor_token: visitorToken,
              p_seller_id: sellerId,
              p_product_id: productId,
              p_store_id: storeId,
            }
          );

          if (error) {
            console.error('Affiliate resolve error for checkout item:', error);
            return null;
          }

          if (!data || !Array.isArray(data) || data.length === 0) {
            return null;
          }

          return data[0] as ResolvedAffiliateAttribution;
        })
      );

      const itemPricings = getOrderItemPricings(validatedCartItems, appliedCoupon);

      const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
        'generate_order_number'
      );

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

      const couponEligibleItemIds = new Set(
        getCouponEligibleItems(
          validatedCartItems,
          appliedCoupon?.eligibleProductIds || [],
          appliedCoupon?.eligibleStoreIds || []
        ).map((item) => item.id)
      );

      const itemAffiliateFallbacks = validatedCartItems.map((item) => {
        const eligibleForCouponAffiliate =
          !!appliedCoupon &&
          couponEligibleItemIds.has(item.id) &&
          (!!appliedCoupon.coupon.affiliate_link_id || !!appliedCoupon.coupon.affiliate_marketer_id);

        if (!eligibleForCouponAffiliate) {
          return null;
        }

        return {
          attribution_id: null,
          affiliate_link_id: appliedCoupon?.coupon.affiliate_link_id || null,
          affiliate_marketer_id: appliedCoupon?.coupon.affiliate_marketer_id || null,
          affiliate_rule_id: null,
          affiliate_ref_code: appliedCoupon?.coupon.code || null,
        } as ResolvedAffiliateAttribution;
      });

      const mergedItemAffiliations = resolvedAttributionsByItem.map((resolved, index) => {
        return resolved || itemAffiliateFallbacks[index] || null;
      });

      const validItemAttributions = mergedItemAffiliations.filter(
        (item): item is ResolvedAffiliateAttribution =>
          !!item && (!!item.affiliate_link_id || !!item.affiliate_marketer_id)
      );

      const currentUniqueSellerIds = Array.from(
        new Set(
          validatedCartItems
            .map((item) => getProductSellerId(item.product))
            .filter((id): id is string => !!id)
        )
      );

      const currentSingleSellerId = currentUniqueSellerIds.length === 1 ? currentUniqueSellerIds[0] : null;

      const canUseOrderLevelAffiliate =
        currentUniqueSellerIds.length === 1 &&
        validItemAttributions.length > 0 &&
        validItemAttributions.length === validatedCartItems.length &&
        validItemAttributions.every(
          (item) =>
            item.attribution_id === validItemAttributions[0].attribution_id &&
            item.affiliate_link_id === validItemAttributions[0].affiliate_link_id &&
            item.affiliate_marketer_id === validItemAttributions[0].affiliate_marketer_id &&
            item.affiliate_rule_id === validItemAttributions[0].affiliate_rule_id &&
            item.affiliate_ref_code === validItemAttributions[0].affiliate_ref_code
        );

      const orderAffiliate = canUseOrderLevelAffiliate ? validItemAttributions[0] : null;

      const couponNote = appliedCoupon
        ? [
            `Coupon Code: ${appliedCoupon.coupon.code}`,
            `Coupon Discount Type: ${appliedCoupon.coupon.discount_type}`,
            `Coupon Discount Value: ${appliedCoupon.coupon.discount_value}`,
            `Coupon Applied Discount: ${discountAmount.toFixed(2)}`,
            `Order Original Total: ${totalAmount.toFixed(2)}`,
            `Order Final Total: ${finalAmount.toFixed(2)}`,
          ].join(' | ')
        : '';

      const quantityNote = validatedCartItems
        .map((item) => {
          const limit = getQuantityLimit(item.product);
          const sold = getQuantitySold(item.product);
          if (limit === null) return null;
          return `Product ${item.product_id}: ordered ${item.quantity}, quantity_limit ${limit}, quantity_sold_before_order ${sold}`;
        })
        .filter(Boolean)
        .join(' | ');

      const finalNotes = [couponNote, quantityNote].filter(Boolean).join('\n');

      const orderPayload = {
        order_number: orderNumber,
        user_id: profile.id,
        seller_id: currentSingleSellerId,
        merchant_id: currentSingleSellerId,
        total_amount: finalAmount,
        status: 'pending_payment',
        currency: 'SAR',
        payment_method: paymentMethod,
        payment_provider: paymentMethod === 'card' ? 'paymob' : 'paypal',
        customer_name: profile?.name || '',
        customer_email: profile?.email || '',
        customer_phone: profile?.phone || '',
        shipping_address: '',
        notes: finalNotes || '',
        sale_source: scopeInfo ? 'direct' : 'marketplace',
        affiliate_link_id: orderAffiliate?.affiliate_link_id || null,
        affiliate_marketer_id: orderAffiliate?.affiliate_marketer_id || null,
        affiliate_rule_id: orderAffiliate?.affiliate_rule_id || null,
        affiliate_attribution_id: orderAffiliate?.attribution_id || null,
        affiliate_ref_code:
          orderAffiliate?.affiliate_ref_code || affiliateLocalData?.ref_code || appliedCoupon?.coupon.code || null,
        affiliate_commission_amount: 0,
        affiliate_commission_status:
          orderAffiliate?.affiliate_link_id || orderAffiliate?.affiliate_marketer_id ? 'pending' : 'none',
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

      const orderItems = validatedCartItems.map((item, index) => {
        const originalPrice = Number(item.product!.price);
        const sellerId = getProductSellerId(item.product)!;
        const itemAffiliate = mergedItemAffiliations[index];
        const pricing = itemPricings[index];

        return {
          order_id: order.id,
          product_id: item.product_id,
          seller_id: sellerId,
          quantity: item.quantity,
          price: pricing.discountedUnitPrice,
          product_price: originalPrice,
          subtotal: pricing.discountedSubtotal,
          product_name: getProductTitle(item.product),
          affiliate_link_id: itemAffiliate?.affiliate_link_id || null,
          affiliate_marketer_id: itemAffiliate?.affiliate_marketer_id || null,
          affiliate_rule_id: itemAffiliate?.affiliate_rule_id || null,
          affiliate_attribution_id: itemAffiliate?.attribution_id || null,
          affiliate_ref_code:
            itemAffiliate?.affiliate_ref_code || affiliateLocalData?.ref_code || appliedCoupon?.coupon.code || null,
          affiliate_commission_amount: 0,
          affiliate_commission_status:
            itemAffiliate?.affiliate_link_id || itemAffiliate?.affiliate_marketer_id ? 'pending' : 'none',
        };
      });

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);

      if (orderItemsError) {
        console.error('Order items insert error:', orderItemsError);
        throw orderItemsError;
      }

      if (scopeInfo) {
        const scopedProductIds = validatedCartItems.map((item) => item.product_id);

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

  const renderQuantityStatus = (item: CartItem) => {
    const remaining = getRemainingQuantity(item.product);
    const isInvalid = isCartItemQuantityInvalid(item);

    if (!item.product) {
      return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>غير متاح</span>
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

    if (remaining <= 0) {
      return (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>نفدت الكمية</span>
        </div>
      );
    }

    return (
      <div
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isInvalid ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}
      >
        {isInvalid ? <AlertTriangle className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
        <span>{isInvalid ? `المتبقي ${remaining} فقط` : `المتبقي ${remaining}`}</span>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="mb-8 text-right">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إتمام الطلب</h1>
          <p className="text-gray-600">
            {scopeInfo
              ? `أكمل الدفع لإتمام الشراء من متجر ${scopeInfo.name}`
              : 'راجع طلبك ثم أكمل الدفع'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">ملخص الطلب</h3>

            {quantityIssueMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{quantityIssueMessage}</span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {cartItems.map((item) => {
                const productTitle = getProductTitle(item.product);
                const isInvalid = isCartItemQuantityInvalid(item);

                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 p-4 border rounded-xl ${
                      isInvalid ? 'border-red-200 bg-red-50/40' : 'border-gray-100'
                    }`}
                  >
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

                    <div className="flex-1 min-w-0">
                      {!scopeInfo && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <StoreIcon className="w-3 h-3" />
                          <span>{item.store_name || 'متجر'}</span>
                        </div>
                      )}

                      <h4 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-1">
                        {productTitle}
                      </h4>

                      <p className="text-sm text-gray-600 mt-1">
                        {item.quantity} × {item.product?.price} {item.product?.currency || 'SAR'}
                      </p>

                      <p className="text-sm font-bold text-blue-600 mt-1">
                        {(Number(item.product?.price || 0) * item.quantity).toFixed(2)}{' '}
                        {item.product?.currency || 'SAR'}
                      </p>

                      {renderQuantityStatus(item)}

                      {isInvalid && (
                        <p className="mt-2 text-xs text-red-700">
                          {getCartItemQuantityIssueMessage(item)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-gray-900">كود الخصم</h4>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                    if (couponSuccess && appliedCoupon) {
                      const sameCode =
                        e.target.value.trim().toUpperCase() ===
                        appliedCoupon.coupon.code.trim().toUpperCase();

                      if (!sameCode) {
                        setCouponSuccess('');
                        setAppliedCoupon(null);
                      }
                    }
                  }}
                  placeholder="أدخل كود الخصم"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-3 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors"
                  >
                    إزالة
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || quantityInvalidItems.length > 0}
                    className="px-4 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplyingCoupon ? 'جاري...' : 'تطبيق'}
                  </button>
                )}
              </div>

              {quantityInvalidItems.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm mb-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>عدّل الكميات غير المتاحة قبل تطبيق كود الخصم أو إتمام الدفع.</span>
                </div>
              )}

              {couponError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-3">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccess && appliedCoupon && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p>{couponSuccess}</p>
                    <p className="text-xs text-green-600">
                      الكود: <span className="font-bold">{appliedCoupon.coupon.code}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">المجموع الفرعي</span>
                <span className="font-semibold">{formatMoney(totalAmount)}</span>
              </div>

              {appliedCoupon && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">المبلغ المؤهل للخصم</span>
                    <span className="font-semibold">{formatMoney(appliedCoupon.eligibleSubtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">الخصم</span>
                    <span className="font-bold text-green-700">- {formatMoney(discountAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-gray-900">المجموع الكلي</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatMoney(finalAmount)}
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
              disabled={!canSubmitCheckout}
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
        </form>
      </div>
    </div>
  );
};
