import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Camera,
  Save,
  ShoppingBag,
  Heart,
  Eye,
  Package,
  Store as StoreIcon,
  Settings as SettingsIcon,
  Trash2,
  AlertCircle,
  CheckCircle,
  Download,
  XCircle,
  Clock,
  ArrowLeft,
  Lock,
  Mail,
  CreditCard,
  ShieldCheck,
  Crown,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

type ScopeInfo = {
  slug: string;
  name: string;
  source: 'stores' | 'merchants';
  storeId: string | null;
  merchantUserId: string | null;
};

type ProfileStats = {
  favorites_count: number;
  viewed_products_count: number;
};

type ProfileOrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_price: number;
  subtotal: number;
  product_slug?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
};

type ProfileOrder = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  currency?: string | null;
  items: ProfileOrderItem[];
};

type ProfileListedProduct = {
  id: string;
  product_id: string;
  title: string;
  description: string;
  price: number;
  slug?: string | null;
  thumbnail_url?: string | null;
  store_id?: string | null;
  user_id?: string | null;
  viewed_at?: string | null;
  created_at?: string | null;
};

type IdentityVerificationRecord = {
  id?: string;
  status?: string | null;
  full_name?: string | null;
  identity_type?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

type SellerPlanInfo = {
  plan_name: string;
  subscription_status: string | null;
  subscription_expires_at: string | null;
};

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE_MB = 5;

const getActiveStoreScopeSlug = () => {
  try {
    return sessionStorage.getItem('active_store_slug');
  } catch {
    return null;
  }
};

const normalizeProductName = (product: any) => product?.title || product?.name || 'منتج';

const productMatchesScope = (product: any, scope: ScopeInfo | null) => {
  if (!scope) return true;

  if (scope.source === 'stores') {
    return product?.store_id === scope.storeId;
  }

  return (product?.merchant_id || product?.user_id) === scope.merchantUserId;
};

const normalizeBrowserPath = (path: string) => {
  const normalized = path.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
};

const buildProfilePath = (scopeInfo: ScopeInfo | null) => {
  if (scopeInfo?.slug) {
    return `/s/${scopeInfo.slug}/profile`;
  }

  return '/profile';
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

const getIdentityStatusText = (status?: string | null) => {
  switch (status) {
    case 'approved':
      return 'موثق';
    case 'pending':
      return 'قيد المراجعة';
    case 'rejected':
      return 'مرفوض';
    case 'not_submitted':
      return 'غير مرفوع';
    default:
      return 'غير مرفوع';
  }
};

const getIdentityStatusClass = (status?: string | null) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getSubscriptionStatusText = (status?: string | null) => {
  switch (status) {
    case 'active':
      return 'نشط';
    case 'expired':
      return 'منتهي';
    case 'cancelled':
      return 'ملغي';
    case 'trialing':
      return 'تجريبي';
    case 'past_due':
      return 'متأخر';
    default:
      return 'غير محدد';
  }
};

const getSubscriptionStatusClass = (status?: string | null) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'trialing':
      return 'bg-blue-100 text-blue-700';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-700';
    case 'expired':
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, updateProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'favorites' | 'viewed' | 'settings'
  >('overview');

  const [name, setName] = useState(profile?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(((profile as any)?.avatar_url as string) || null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [scopeLoading, setScopeLoading] = useState(true);

  const [stats, setStats] = useState<ProfileStats>({
    favorites_count: 0,
    viewed_products_count: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const [bankDetails, setBankDetails] = useState<any>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState('');

  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [favorites, setFavorites] = useState<ProfileListedProduct[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');

  const [viewedProducts, setViewedProducts] = useState<ProfileListedProduct[]>([]);
  const [viewedProductsLoading, setViewedProductsLoading] = useState(false);
  const [viewedProductsError, setViewedProductsError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [emailResendLoading, setEmailResendLoading] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');

  const [identityVerification, setIdentityVerification] = useState<IdentityVerificationRecord | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);

  const [sellerPlanInfo, setSellerPlanInfo] = useState<SellerPlanInfo>({
    plan_name: 'غير محددة',
    subscription_status: null,
    subscription_expires_at: null,
  });
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
    setAvatarUrl(((profile as any)?.avatar_url as string) || null);
  }, [profile?.name, (profile as any)?.avatar_url]);

  useEffect(() => {
    const loadScope = async () => {
      setScopeLoading(true);
      try {
        const resolved = await resolveStoreScope();
        setScopeInfo(resolved);
      } catch (error) {
        console.error('Error resolving store scope:', error);
        setScopeInfo(null);
      } finally {
        setScopeLoading(false);
      }
    };

    loadScope();
  }, []);

  useEffect(() => {
    if (scopeLoading || typeof window === 'undefined') return;

    const targetPath = normalizeBrowserPath(buildProfilePath(scopeInfo));
    const currentPath = normalizeBrowserPath(window.location.pathname);

    if (currentPath !== targetPath) {
      window.history.replaceState(window.history.state, '', targetPath);
    }
  }, [scopeLoading, scopeInfo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setShowAvatarMenu(false);
      }
    };

    if (showAvatarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvatarMenu]);

  const fetchProductImageMapByIds = async (productIds: string[]) => {
    const cleanIds = [...new Set(productIds.filter(Boolean))];
    if (cleanIds.length === 0) return new Map<string, string | null>();

    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url, is_primary, display_order')
      .in('product_id', cleanIds)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching product images:', error);
      return new Map<string, string | null>();
    }

    const imageMap = new Map<string, string | null>();

    for (const row of data || []) {
      if (!imageMap.has(row.product_id)) {
        imageMap.set(row.product_id, row.image_url || null);
      }
    }

    return imageMap;
  };

  const mapProductCard = (
    product: any,
    extra?: Partial<ProfileListedProduct>,
    thumbnailUrl?: string | null
  ): ProfileListedProduct => ({
    id: extra?.id || product?.id,
    product_id: product?.id,
    title: normalizeProductName(product),
    description: product?.description || '',
    price: Number(product?.price || 0),
    slug: product?.slug || null,
    thumbnail_url: thumbnailUrl || null,
    store_id: product?.store_id || null,
    user_id: product?.merchant_id || product?.user_id || null,
    viewed_at: extra?.viewed_at || null,
    created_at: extra?.created_at || null,
  });

  const fetchProductsMapByIds = async (productIds: string[]) => {
    const cleanIds = [...new Set(productIds.filter(Boolean))];
    if (cleanIds.length === 0) {
      return {
        productsMap: new Map<string, any>(),
        imageMap: new Map<string, string | null>(),
      };
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, title, description, price, slug, store_id, merchant_id')
      .in('id', cleanIds);

    if (error) throw error;

    const productsMap = new Map((data || []).map((product: any) => [product.id, product]));
    const imageMap = await fetchProductImageMapByIds(cleanIds);

    return { productsMap, imageMap };
  };

  const fetchProfileStats = async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const [favoritesRes, viewedRes, ordersRes] = await Promise.all([
        supabase.from('favorites').select('id, product_id').eq('user_id', user.id),
        supabase.from('viewed_products').select('id, product_id').eq('user_id', user.id),
        supabase
          .from('orders')
          .select('id')
          .or(`user_id.eq.${user.id},customer_id.eq.${user.id}`),
      ]);

      const favoriteRows = favoritesRes.data || [];
      const viewedRows = viewedRes.data || [];
      const orderRows = ordersRes.data || [];

      const productIds = [
        ...new Set([
          ...favoriteRows.map((row: any) => row.product_id),
          ...viewedRows.map((row: any) => row.product_id),
        ]),
      ];

      const { productsMap } = await fetchProductsMapByIds(productIds);

      const favoritesCount = favoriteRows.filter((row: any) => {
        const product = productsMap.get(row.product_id);
        return product ? productMatchesScope(product, scopeInfo) : false;
      }).length;

      const viewedCount = viewedRows.filter((row: any) => {
        const product = productsMap.get(row.product_id);
        return product ? productMatchesScope(product, scopeInfo) : false;
      }).length;

      let ordersCount = orderRows.length;

      if (scopeInfo && orderRows.length > 0) {
        const orderIds = orderRows.map((o: any) => o.id);
        const { data: rawItems } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        const items = rawItems || [];
        const orderItemProductIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))];
        const { productsMap: orderProductsMap } = await fetchProductsMapByIds(orderItemProductIds);

        const validOrderIds = new Set<string>();
        for (const item of items) {
          const product = orderProductsMap.get(item.product_id);
          if (product && productMatchesScope(product, scopeInfo)) {
            validOrderIds.add(item.order_id);
          }
        }

        ordersCount = validOrderIds.size;
      }

      setStats({
        favorites_count: favoritesCount,
        viewed_products_count: viewedCount,
      });

      if (activeTab === 'overview') {
        setOrders((prev) => {
          if (prev.length === ordersCount) return prev;
          return prev;
        });
      }
    } catch (e) {
      console.error('Error fetching profile stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    if (!user || profile?.role !== 'seller') return;

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bank details:', error);
        return;
      }

      if (data) {
        setBankDetails(data);
        setBankAccountHolderName(data.account_holder_name || '');
        setBankIban(data.iban || '');
        setBankName(data.bank_name || '');
      } else {
        setBankDetails(null);
        setBankAccountHolderName('');
        setBankIban('');
        setBankName('');
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const fetchIdentityVerification = async () => {
    if (!user || profile?.role !== 'seller') return;

    setIdentityLoading(true);
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching identity verification:', error);
        setIdentityVerification(null);
        return;
      }

      setIdentityVerification(data || null);
    } catch (error) {
      console.error('Error fetching identity verification:', error);
      setIdentityVerification(null);
    } finally {
      setIdentityLoading(false);
    }
  };

  const fetchSellerPlanInfo = async () => {
    if (!user || profile?.role !== 'seller') return;

    setPlanLoading(true);
    try {
      let resolvedPlanName = 'الخطة الأساسية';
      const subscriptionStatus =
        ((profile as any)?.subscription_status as string | null) || null;
      const subscriptionExpiresAt =
        ((profile as any)?.subscription_expires_at as string | null) || null;

      const profilePlanId = (profile as any)?.plan_id;

      if (profilePlanId) {
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('name, title, slug')
          .eq('id', profilePlanId)
          .maybeSingle();

        if (!planError && planData) {
          resolvedPlanName =
            (planData as any).name ||
            (planData as any).title ||
            (planData as any).slug ||
            resolvedPlanName;
        }
      }

      setSellerPlanInfo({
        plan_name: resolvedPlanName,
        subscription_status: subscriptionStatus,
        subscription_expires_at: subscriptionExpiresAt,
      });
    } catch (error) {
      console.error('Error fetching seller plan info:', error);
      setSellerPlanInfo({
        plan_name: 'الخطة الأساسية',
        subscription_status: null,
        subscription_expires_at: null,
      });
    } finally {
      setPlanLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    setOrdersLoading(true);
    setOrdersError('');

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, user_id, customer_id')
        .or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map((order: any) => order.id);

      const { data: rawItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const safeItems = rawItems || [];
      const productIds = [...new Set(safeItems.map((item: any) => item.product_id).filter(Boolean))];
      const { productsMap, imageMap } = await fetchProductsMapByIds(productIds);

      const itemsByOrderId = new Map<string, ProfileOrderItem[]>();

      for (const item of safeItems as any[]) {
        const product = productsMap.get(item.product_id);
        if (!product) continue;
        if (!productMatchesScope(product, scopeInfo)) continue;

        const resolvedPrice = Number(
          item.price ?? item.product_price ?? item.unit_price ?? product?.price ?? 0
        );
        const resolvedQuantity = Number(item.quantity ?? 1);

        const normalizedItem: ProfileOrderItem = {
          id: item.id,
          product_id: item.product_id,
          quantity: resolvedQuantity,
          product_name: normalizeProductName(product),
          product_price: resolvedPrice,
          subtotal: Number(item.subtotal ?? resolvedPrice * resolvedQuantity),
          product_slug: product?.slug || null,
          thumbnail_url: imageMap.get(item.product_id) || null,
          store_id: product?.store_id || null,
          user_id: product?.merchant_id || null,
        };

        if (!itemsByOrderId.has(item.order_id)) {
          itemsByOrderId.set(item.order_id, []);
        }

        itemsByOrderId.get(item.order_id)!.push(normalizedItem);
      }

      const normalizedOrders: ProfileOrder[] = ordersData
        .map((order: any) => {
          const scopedItems = itemsByOrderId.get(order.id) || [];
          if (scopedItems.length === 0) return null;

          return {
            id: order.id,
            order_number: order.order_number || order.id,
            total_amount: scopedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
            status: order.status || 'pending',
            created_at: order.created_at,
            currency: 'SAR',
            items: scopedItems,
          } as ProfileOrder;
        })
        .filter(Boolean) as ProfileOrder[];

      setOrders(normalizedOrders);
    } catch (error) {
      console.error('Error fetching profile orders:', error);
      setOrders([]);
      setOrdersError('حدث خطأ أثناء تحميل المشتريات');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    setFavoritesLoading(true);
    setFavoritesError('');

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id, created_at, product_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const productIds = rows.map((row: any) => row.product_id).filter(Boolean);
      const { productsMap, imageMap } = await fetchProductsMapByIds(productIds);

      const normalized = rows
        .map((row: any) => {
          const product = productsMap.get(row.product_id);
          if (!product || !productMatchesScope(product, scopeInfo)) return null;

          return mapProductCard(
            product,
            {
              id: row.id,
              created_at: row.created_at,
            },
            imageMap.get(row.product_id) || null
          );
        })
        .filter(Boolean) as ProfileListedProduct[];

      setFavorites(normalized);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
      setFavoritesError('حدث خطأ أثناء تحميل المفضلة');
    } finally {
      setFavoritesLoading(false);
    }
  };

  const fetchViewedProducts = async () => {
    if (!user) return;

    setViewedProductsLoading(true);
    setViewedProductsError('');

    try {
      const { data, error } = await supabase
        .from('viewed_products')
        .select('id, created_at, viewed_at, product_id')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const productIds = rows.map((row: any) => row.product_id).filter(Boolean);
      const { productsMap, imageMap } = await fetchProductsMapByIds(productIds);

      const normalized = rows
        .map((row: any) => {
          const product = productsMap.get(row.product_id);
          if (!product || !productMatchesScope(product, scopeInfo)) return null;

          return mapProductCard(
            product,
            {
              id: row.id,
              created_at: row.created_at,
              viewed_at: row.viewed_at,
            },
            imageMap.get(row.product_id) || null
          );
        })
        .filter(Boolean) as ProfileListedProduct[];

      setViewedProducts(normalized);
    } catch (error) {
      console.error('Error fetching viewed products:', error);
      setViewedProducts([]);
      setViewedProductsError('حدث خطأ أثناء تحميل المنتجات التي شاهدتها');
    } finally {
      setViewedProductsLoading(false);
    }
  };

  useEffect(() => {
    if (!scopeLoading && user?.id) {
      fetchProfileStats();
      fetchBankDetails();
      fetchOrders();
      fetchFavorites();
      fetchViewedProducts();
      if (profile?.role === 'seller') {
        fetchIdentityVerification();
        fetchSellerPlanInfo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.role, scopeLoading, scopeInfo?.slug]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'favorites') fetchFavorites();
    if (activeTab === 'viewed') fetchViewedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setMessage('');
    try {
      await updateProfile({ name });
      setMessage('تم تحديث المعلومات الشخصية بنجاح');
    } catch {
      setMessage('فشل تحديث المعلومات الشخصية');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage('');

    if (!password.trim()) {
      setPasswordMessage('كلمة المرور الجديدة مطلوبة');
      return;
    }

    if (password.length < 6) {
      setPasswordMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMessage('كلمتا المرور غير متطابقتين');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword('');
      setConfirmPassword('');
      setPasswordMessage('تم تغيير كلمة المرور بنجاح');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordMessage(error?.message || 'فشل تغيير كلمة المرور');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendEmailVerification = async () => {
    if (!user?.email) {
      setEmailStatusMessage('تعذر العثور على البريد الإلكتروني الحالي');
      return;
    }

    setEmailResendLoading(true);
    setEmailStatusMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signup`,
        },
      });

      if (error) throw error;

      setEmailStatusMessage('تم إرسال رابط تأكيد البريد الإلكتروني مرة أخرى');
    } catch (error: any) {
      console.error('Error resending email verification:', error);
      setEmailStatusMessage(error?.message || 'فشل إعادة إرسال رابط التأكيد');
    } finally {
      setEmailResendLoading(false);
    }
  };

  const syncAvatarEverywhere = async (nextAvatarUrl: string | null) => {
    const updatePromises = [
      supabase.from('users_profile').update({ avatar_url: nextAvatarUrl }).eq('id', user!.id),
      supabase.from('profiles').update({ avatar_url: nextAvatarUrl }).eq('id', user!.id),
      supabase.auth.updateUser({ data: { avatar_url: nextAvatarUrl } }),
    ];

    const results = await Promise.allSettled(updatePromises);
    const profileTableResults = results.slice(0, 2);

    const hardFailure = profileTableResults.every(
      (result) => result.status === 'fulfilled' && result.value.error
    );

    if (hardFailure) {
      const firstError = profileTableResults.find(
        (result) => result.status === 'fulfilled' && result.value.error
      ) as PromiseFulfilledResult<any> | undefined;

      throw firstError?.value.error || new Error('تعذر حفظ صورة الملف الشخصي');
    }

    try {
      await updateProfile({ avatar_url: nextAvatarUrl } as any);
    } catch (contextError) {
      console.error('updateProfile avatar sync error:', contextError);
    }

    try {
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar_url: nextAvatarUrl } }));
      window.dispatchEvent(new CustomEvent('profile-avatar-updated', { detail: { avatar_url: nextAvatarUrl } }));
    } catch (eventError) {
      console.error('Avatar sync event error:', eventError);
    }
  };

  const handleAvatarButtonClick = () => {
    setShowAvatarMenu((prev) => !prev);
  };

  const handleChooseAvatarFile = () => {
    setShowAvatarMenu(false);
    avatarInputRef.current?.click();
  };

  const handleDeleteAvatar = async () => {
    if (!user) return;

    const confirmed = window.confirm('هل تريد حذف الصورة الشخصية؟');
    if (!confirmed) return;

    setUploadingAvatar(true);
    setMessage('');
    setShowAvatarMenu(false);

    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .list(user.id, { limit: 100 });

      if (listError) {
        console.error('Error listing avatar files:', listError);
      }

      const filesToRemove = (existingFiles || [])
        .filter((file: any) => !!file?.name)
        .map((file: any) => `${user.id}/${file.name}`);

      if (filesToRemove.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove(filesToRemove);

        if (removeError) throw removeError;
      }

      await syncAvatarEverywhere(null);
      setAvatarUrl(null);
      setMessage('تم حذف صورة الملف الشخصي بنجاح');

      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      setMessage(error?.message || 'حدث خطأ أثناء حذف صورة الملف الشخصي');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setMessage('اختر صورة صحيحة فقط');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setMessage(`حجم الصورة يجب أن يكون أقل من ${MAX_AVATAR_SIZE_MB}MB`);
      return;
    }

    setUploadingAvatar(true);
    setMessage('');

    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExtension = extension === 'jpeg' ? 'jpg' : extension;
      const filePath = `${user.id}/avatar.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      const uploadedAvatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      await syncAvatarEverywhere(uploadedAvatarUrl);
      setAvatarUrl(uploadedAvatarUrl);
      setShowAvatarMenu(false);
      setMessage('تم تحديث صورة الملف الشخصي بنجاح');

      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      if ((error?.message || '').includes('Bucket not found')) {
        setMessage('مجلد صور الملفات الشخصية غير موجود في التخزين. أنشئ bucket باسم avatars أولاً');
      } else {
        setMessage(error?.message || 'حدث خطأ أثناء رفع صورة الملف الشخصي');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    if (!user) return;

    setBankLoading(true);
    setBankMessage('');

    try {
      const normalizedIBAN = bankIban.replace(/\s+/g, '').toUpperCase();

      if (!bankAccountHolderName.trim()) {
        setBankMessage('اسم صاحب الحساب مطلوب');
        setBankLoading(false);
        return;
      }

      if (!normalizedIBAN.startsWith('SA') || normalizedIBAN.length !== 24) {
        setBankMessage('رقم الآيبان غير صحيح. يجب أن يبدأ بـ SA ويتكون من 24 حرفاً');
        setBankLoading(false);
        return;
      }

      const { error } = await supabase.from('bank_accounts').upsert({
        user_id: user.id,
        account_holder_name: bankAccountHolderName.trim(),
        iban: normalizedIBAN,
        bank_name: bankName || null,
      });

      if (error) {
        console.error('Error updating bank details:', error);
        setBankMessage('فشل تحديث بيانات الحساب البنكي');
        setBankLoading(false);
        return;
      }

      setBankMessage('تم تحديث بيانات الحساب البنكي بنجاح');
      setEditingBank(false);
      await fetchBankDetails();
    } catch (err) {
      console.error('Error updating bank details:', err);
      setBankMessage('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setBankLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (profile?.role === 'seller') return;

    const confirm = window.confirm('هل تريد ترقية حسابك إلى حساب تاجر؟ ستتمكن من إنشاء متاجر وبيع المنتجات.');
    if (!confirm) return;

    setLoading(true);
    try {
      await updateProfile({ role: 'seller' } as any);
      setMessage('تم ترقية حسابك إلى تاجر بنجاح! يمكنك الآن إنشاء متجرك الأول.');
      setTimeout(() => {
        onNavigate('seller-dashboard');
      }, 1200);
    } catch {
      setMessage('فشل ترقية الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = 'DELETE';
    const userInput = window.prompt(
      `تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\n` +
        `سيتم حذف:\n` +
        `- حسابك وجميع بياناتك الشخصية\n` +
        (profile?.role === 'seller' ? `- جميع متاجرك ومنتجاتك\n- جميع مبيعاتك وعمولاتك\n` : '') +
        `\nاكتب "${confirmText}" للتأكيد:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        setMessage('لم يتم حذف الحساب');
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(user!.id);
      if (error) throw error;

      await supabase.auth.signOut();
      onNavigate('home');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setMessage('حدث خطأ أثناء حذف الحساب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProductToCart = async (productId: string) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    try {
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: Number(existingItem.quantity || 0) + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });

        if (error) throw error;
      }

      setMessage('تمت إضافة المنتج إلى السلة');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      console.error('Error adding product to cart:', error);
      setMessage('حدث خطأ أثناء إضافة المنتج إلى السلة');
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      await Promise.all([fetchFavorites(), fetchProfileStats()]);
    } catch (error) {
      console.error('Error removing favorite:', error);
      setMessage('حدث خطأ أثناء حذف المنتج من المفضلة');
    }
  };

  const handleRemoveViewedProduct = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('viewed_products')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      await Promise.all([fetchViewedProducts(), fetchProfileStats()]);
    } catch (error) {
      console.error('Error removing viewed product:', error);
      setMessage('حدث خطأ أثناء حذف المنتج من المشاهدات');
    }
  };

  const canAccessFiles = (status: string) => ['paid', 'completed', 'delivered'].includes(status);

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

  const openScopedProduct = (item: { product_id: string; product_slug?: string | null }) => {
    if (item.product_slug) {
      onNavigate(`product-slug-${item.product_slug}`);
      return;
    }
    onNavigate(`product-${item.product_id}`);
  };

  const scopeBadgeText = useMemo(() => {
    if (!scopeInfo) return 'عرض عام من كل المتاجر';
    return `عرض داخل متجر: ${scopeInfo.name}`;
  }, [scopeInfo]);

  const renderProductCardList = (
    items: ProfileListedProduct[],
    options: {
      emptyTitle: string;
      emptyDescription: string;
      refreshLabel: string;
      loading: boolean;
      error: string;
      onRefresh: () => void;
      primaryButtonText?: string;
      secondaryButtonText?: string;
      onPrimaryAction?: (item: ProfileListedProduct) => void;
      onSecondaryAction?: (item: ProfileListedProduct) => void;
      primaryButtonClassName?: string;
      secondaryButtonClassName?: string;
      metaLabel?: (item: ProfileListedProduct) => string | null;
    }
  ) => {
    if (options.loading) {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      );
    }

    if (options.error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {options.error}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{options.emptyTitle}</h3>
          <p className="text-gray-600 mb-6">{options.emptyDescription}</p>
          <button
            onClick={() => onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => {
          const metaText = options.metaLabel?.(item);

          return (
            <div key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-56 h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-5xl font-bold text-blue-600">
                      {(item.title || '?').charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 line-clamp-2 mb-4">
                        {item.description || 'لا يوجد وصف لهذا المنتج حالياً'}
                      </p>
                      {metaText && <div className="text-sm text-gray-500 mb-3">{metaText}</div>}
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {item.price} ريال
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={() =>
                        openScopedProduct({ product_id: item.product_id, product_slug: item.slug })
                      }
                      className="px-5 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                    >
                      عرض المنتج
                    </button>

                    {options.onPrimaryAction && (
                      <button
                        onClick={() => options.onPrimaryAction?.(item)}
                        className={
                          options.primaryButtonClassName ||
                          'px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700'
                        }
                      >
                        {options.primaryButtonText || 'إجراء'}
                      </button>
                    )}

                    {options.onSecondaryAction && (
                      <button
                        onClick={() => options.onSecondaryAction?.(item)}
                        className={
                          options.secondaryButtonClassName ||
                          'px-5 py-3 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50'
                        }
                      >
                        {options.secondaryButtonText || 'حذف'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول أولاً</p>
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

  const isMerchant = profile.role === 'seller';
  const isEmailConfirmed = !!user.email_confirmed_at;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {scopeInfo && <StoreScopedBanner scopeInfo={scopeInfo} onNavigate={onNavigate} />}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute -bottom-16 right-8">
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white flex items-center justify-center overflow-hidden text-4xl font-bold text-blue-600">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.name || 'الصورة الشخصية'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(profile.name?.charAt(0) || '?').toUpperCase()}</span>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                <div ref={avatarMenuRef} className="absolute bottom-0 left-0">
                  <button
                    type="button"
                    onClick={handleAvatarButtonClick}
                    disabled={uploadingAvatar}
                    className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg disabled:opacity-50"
                    title="خيارات الصورة الشخصية"
                  >
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>

                  {showAvatarMenu && !uploadingAvatar && (
                    <div className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20">
                      <button
                        type="button"
                        onClick={handleChooseAvatarFile}
                        className="w-full px-4 py-3 text-right text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>تعديل الصورة</span>
                        <Camera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={!avatarUrl}
                        className="w-full px-4 py-3 text-right text-sm text-red-600 hover:bg-red-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>حذف الصورة</span>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-20 pb-6 px-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                <p className="text-gray-600">
                  {user.email}
                  {' • '}
                  <span
                    className={`font-semibold ${
                      profile.role === 'admin'
                        ? 'text-red-600'
                        : isMerchant
                        ? 'text-blue-600'
                        : 'text-green-600'
                    }`}
                  >
                    {profile.role === 'admin' ? 'مدير' : isMerchant ? 'تاجر' : 'عميل'}
                  </span>
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                  <StoreIcon className="w-4 h-4" />
                  <span>{scopeBadgeText}</span>
                </div>
              </div>

              {profile.role === 'customer' && (
                <button
                  onClick={handleUpgradeToSeller}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  ترقية إلى حساب تاجر
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-5 h-5" />
                <span>نظرة عامة</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>مشترياتي</span>
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Heart className="w-5 h-5" />
                <span>المفضلة</span>
              </button>

              <button
                onClick={() => setActiveTab('viewed')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'viewed'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>تمت مشاهدتها</span>
              </button>

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span>الإعدادات</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {activeTab === 'overview' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">نظرة عامة</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">
                          هذه الأرقام تخص متجر {scopeInfo.name} فقط
                        </p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await Promise.all([
                          fetchProfileStats(),
                          fetchOrders(),
                          fetchFavorites(),
                          fetchViewedProducts(),
                        ]);
                      }}
                      disabled={statsLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {statsLoading ? 'جاري التحديث...' : 'تحديث الأرقام'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{orders.length}</div>
                      <p className="text-sm text-gray-600">إجمالي المشتريات</p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Heart className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats
