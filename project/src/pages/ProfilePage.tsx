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
  ShieldCheck,
  Mail,
  KeyRound,
  LogOut,
  Landmark,
  CreditCard,
  BadgeCheck,
  Upload,
  RefreshCw,
  FileText,
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
  id: string;
  status: string;
  full_name?: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  date_of_birth?: string | null;
  document_front_url?: string | null;
  document_back_url?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

type SellerPlanRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  price?: number | null;
};

const AVATAR_BUCKET = 'avatars';
const IDENTITY_BUCKET = 'identity-documents';
const MAX_AVATAR_SIZE_MB = 5;
const MAX_IDENTITY_FILE_SIZE_MB = 10;

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

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const identityFrontInputRef = useRef<HTMLInputElement | null>(null);
  const identityBackInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'favorites' | 'viewed' | 'settings'
  >('overview');

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [pendingEmail, setPendingEmail] = useState<string | null>(
    ((user as any)?.new_email as string) || ((user as any)?.email_change as string) || null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    ((profile as any)?.avatar_url as string) || null
  );
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

  const [identityVerification, setIdentityVerification] =
    useState<IdentityVerificationRecord | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [identityMessage, setIdentityMessage] = useState('');
  const [identityFullName, setIdentityFullName] = useState('');
  const [identityType, setIdentityType] = useState('national_id');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityDateOfBirth, setIdentityDateOfBirth] = useState('');
  const [identityFrontFile, setIdentityFrontFile] = useState<File | null>(null);
  const [identityBackFile, setIdentityBackFile] = useState<File | null>(null);
  const [identityFrontFileName, setIdentityFrontFileName] = useState('');
  const [identityBackFileName, setIdentityBackFileName] = useState('');

  const [sellerPlan, setSellerPlan] = useState<SellerPlanRecord | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [favorites, setFavorites] = useState<ProfileListedProduct[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');

  const [viewedProducts, setViewedProducts] = useState<ProfileListedProduct[]>([]);
  const [viewedProductsLoading, setViewedProductsLoading] = useState(false);
  const [viewedProductsError, setViewedProductsError] = useState('');

  useEffect(() => {
    setName(profile?.name || '');
    setEmail(user?.email || '');
    setPendingEmail(
      ((user as any)?.new_email as string) || ((user as any)?.email_change as string) || null
    );
    setAvatarUrl(((profile as any)?.avatar_url as string) || null);
  }, [
    profile?.name,
    (profile as any)?.avatar_url,
    user?.email,
    (user as any)?.new_email,
    (user as any)?.email_change,
  ]);

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

  const fillIdentityFormFromRecord = (record: IdentityVerificationRecord | null) => {
    if (record) {
      setIdentityFullName(record.full_name || profile?.name || '');
      setIdentityType(record.identity_type || 'national_id');
      setIdentityNumber(record.identity_number || '');
      setIdentityDateOfBirth(record.date_of_birth ? String(record.date_of_birth).slice(0, 10) : '');
      setIdentityFrontFile(null);
      setIdentityBackFile(null);
      setIdentityFrontFileName(record.document_front_url ? 'مرفق موجود حالياً' : '');
      setIdentityBackFileName(record.document_back_url ? 'مرفق موجود حالياً' : '');
    } else {
      setIdentityFullName(profile?.name || '');
      setIdentityType('national_id');
      setIdentityNumber('');
      setIdentityDateOfBirth('');
      setIdentityFrontFile(null);
      setIdentityBackFile(null);
      setIdentityFrontFileName('');
      setIdentityBackFileName('');
    }
  };

  const fetchProfileStats = async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const [favoritesRes, viewedRes, ordersRes] = await Promise.all([
        supabase.from('favorites').select('id, product_id').eq('user_id', user.id),
        supabase.from('viewed_products').select('id, product_id').eq('user_id', user.id),
        supabase.from('orders').select('id').or(`user_id.eq.${user.id},customer_id.eq.${user.id}`),
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
        const orderItemProductIds = [
          ...new Set(items.map((i: any) => i.product_id).filter(Boolean)),
        ];
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

  const resolveCurrentMerchantId = async () => {
    if (!user) return null;

    try {
      const { data: merchantByUser, error: merchantByUserError } = await supabase
        .from('merchants')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!merchantByUserError && merchantByUser?.id) {
        return merchantByUser.id as string;
      }

      const fallbackId = profile?.id || user.id;

      const { data: merchantById, error: merchantByIdError } = await supabase
        .from('merchants')
        .select('id')
        .eq('id', fallbackId)
        .maybeSingle();

      if (!merchantByIdError && merchantById?.id) {
        return merchantById.id as string;
      }
    } catch (error) {
      console.error('Error resolving current merchant id:', error);
    }

    return null;
  };

  const fetchBankDetails = async () => {
    if (!user || profile?.role !== 'seller') return;

    try {
      const merchantId = await resolveCurrentMerchantId();

      if (!merchantId) {
        setBankDetails(null);
        setBankAccountHolderName(profile?.name || '');
        setBankIban('');
        setBankName('');
        return;
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching bank details:', error);
        return;
      }

      if (data) {
        setBankDetails(data);
        setBankAccountHolderName(data.account_holder_name || profile?.name || '');
        setBankIban(data.iban || '');
        setBankName(data.bank_name || '');
      } else {
        setBankDetails(null);
        setBankAccountHolderName(profile?.name || '');
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
        .select(
          'id, status, full_name, identity_type, identity_number, date_of_birth, document_front_url, document_back_url, submitted_at, reviewed_at, rejection_reason'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching identity verification:', error);
        return;
      }

      const record = (data as IdentityVerificationRecord) || null;
      setIdentityVerification(record);
      fillIdentityFormFromRecord(record);
    } catch (error) {
      console.error('Error fetching identity verification:', error);
    } finally {
      setIdentityLoading(false);
    }
  };

  const fetchSellerPlan = async () => {
    if (!user || profile?.role !== 'seller') return;

    setSubscriptionLoading(true);
    try {
      const sellerProfile = profile as any;
      const nowIso = new Date().toISOString();

      const { data: latestSuccessfulPayment, error: paymentError } = await supabase
        .from('subscription_payments')
        .select('plan_id, status, created_at, paid_at, payment_expires_at')
        .eq('user_id', user.id)
        .in('status', ['paid', 'success', 'completed', 'active'])
        .order('paid_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        console.error('Error fetching latest successful subscription payment:', paymentError);
      }

      const hasValidPaidSubscription = !!(
        latestSuccessfulPayment?.plan_id &&
        (!latestSuccessfulPayment?.payment_expires_at || latestSuccessfulPayment.payment_expires_at >= nowIso)
      );

      const resolvedPlanId: string | null = hasValidPaidSubscription
        ? latestSuccessfulPayment?.plan_id || null
        : sellerProfile?.plan_id || latestSuccessfulPayment?.plan_id || null;

      if (!resolvedPlanId) {
        setSellerPlan(null);
        return;
      }

      const { data, error } = await supabase
        .from('plans')
        .select('id, name, title, slug, price')
        .eq('id', resolvedPlanId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching seller plan:', error);
        return;
      }

      setSellerPlan((data as SellerPlanRecord) || null);
    } catch (error) {
      console.error('Error fetching seller plan:', error);
    } finally {
      setSubscriptionLoading(false);
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
      fetchIdentityVerification();
      fetchSellerPlan();
      fetchOrders();
      fetchFavorites();
      fetchViewedProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    profile?.role,
    (profile as any)?.plan_id,
    (profile as any)?.subscription_status,
    (profile as any)?.subscription_expires_at,
    scopeLoading,
    scopeInfo?.slug,
  ]);

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
      setMessage('تم تحديث الملف الشخصي بنجاح');
    } catch {
      setMessage('فشل تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const normalizeEmailInput = (value: string) => value.trim().toLowerCase();

  const isValidEmail = (value: string) => {
    const normalizedValue = normalizeEmailInput(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
  };

  const handleChangeEmail = async () => {
    if (!user) return;

    const normalizedEmail = normalizeEmailInput(email);
    const currentEmail = normalizeEmailInput(user.email || '');

    setEmailChangeLoading(true);
    setMessage('');

    try {
      if (!normalizedEmail) {
        throw new Error('البريد الإلكتروني مطلوب');
      }

      if (!isValidEmail(normalizedEmail)) {
        throw new Error('صيغة البريد الإلكتروني غير صحيحة');
      }

      if (normalizedEmail === currentEmail) {
        throw new Error('هذا هو نفس البريد الإلكتروني الحالي');
      }

      const { error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        {
          emailRedirectTo: `${window.location.origin}/profile`,
        }
      );

      if (error) throw error;

      setPendingEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setMessage(
        'تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. افتح الرسالة وأكّد البريد لإكمال التغيير.'
      );
    } catch (error: any) {
      console.error('Error changing email:', error);
      setMessage(error?.message || 'فشل طلب تغيير البريد الإلكتروني.');
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleResendEmailConfirmation = async () => {
    if (!user?.email) return;

    setEmailActionLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signup`,
        },
      });

      if (error) throw error;

      setMessage('تم إرسال رابط جديد لتأكيد البريد الإلكتروني.');
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      setMessage(error?.message || 'فشل إعادة إرسال رابط تأكيد البريد.');
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!user?.email) return;

    setPasswordResetLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setMessage('تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      setMessage(error?.message || 'فشل إرسال رابط تغيير كلمة المرور.');
    } finally {
      setPasswordResetLoading(false);
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
      window.dispatchEvent(
        new CustomEvent('profile-updated', { detail: { avatar_url: nextAvatarUrl } })
      );
      window.dispatchEvent(
        new CustomEvent('profile-avatar-updated', { detail: { avatar_url: nextAvatarUrl } })
      );
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

      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
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
        setMessage(
          'مجلد صور الملفات الشخصية غير موجود في التخزين. أنشئ bucket باسم avatars أولاً'
        );
      } else {
        setMessage(error?.message || 'حدث خطأ أثناء رفع صورة الملف الشخصي');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateIdentityFile = (file: File) => {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

    if (!validMimeTypes.includes(file.type) && !validExtensions.includes(extension)) {
      throw new Error('يجب أن يكون الملف صورة أو PDF فقط');
    }

    if (file.size > MAX_IDENTITY_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`حجم الملف يجب أن يكون أقل من ${MAX_IDENTITY_FILE_SIZE_MB}MB`);
    }
  };

  const uploadIdentityDocument = async (file: File, side: 'front' | 'back'): Promise<string> => {
    if (!user) throw new Error('لا يوجد مستخدم');

    validateIdentityFile(file);

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const timestamp = Date.now();
    const path = `${user.id}/${side}-${timestamp}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(IDENTITY_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return path;
  };

  const handleIdentityFrontChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) return;

    try {
      validateIdentityFile(file);
      setIdentityFrontFile(file);
      setIdentityFrontFileName(file.name);
      setIdentityMessage('');
    } catch (error: any) {
      setIdentityMessage(error?.message || 'ملف الواجهة الأمامية غير صالح');
    }
  };

  const handleIdentityBackChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) return;

    try {
      validateIdentityFile(file);
      setIdentityBackFile(file);
      setIdentityBackFileName(file.name);
      setIdentityMessage('');
    } catch (error: any) {
      setIdentityMessage(error?.message || 'ملف الواجهة الخلفية غير صالح');
    }
  };

  const handleStartIdentityEdit = () => {
    fillIdentityFormFromRecord(identityVerification);
    setIdentityMessage('');
    setEditingIdentity(true);
  };

  const handleCancelIdentityEdit = () => {
    fillIdentityFormFromRecord(identityVerification);
    setIdentityMessage('');
    setEditingIdentity(false);
  };

  const handleSubmitIdentityVerification = async () => {
    if (!user) return;

    setIdentitySubmitting(true);
    setIdentityMessage('');

    try {
      const normalizedFullName = identityFullName.trim();
      const normalizedIdentityNumber = identityNumber.trim();

      if (!normalizedFullName) {
        throw new Error('أدخل الاسم الكامل');
      }

      if (!identityType) {
        throw new Error('اختر نوع الهوية');
      }

      if (!identityDateOfBirth) {
        throw new Error('أدخل تاريخ الميلاد');
      }

      if (!normalizedIdentityNumber) {
        throw new Error('أدخل رقم الهوية');
      }

      const currentFrontUrl = identityVerification?.document_front_url || null;
      const currentBackUrl = identityVerification?.document_back_url || null;

      let nextFrontUrl = currentFrontUrl;
      let nextBackUrl = currentBackUrl;

      if (identityFrontFile) {
        nextFrontUrl = await uploadIdentityDocument(identityFrontFile, 'front');
      }

      if (identityBackFile) {
        nextBackUrl = await uploadIdentityDocument(identityBackFile, 'back');
      }

      if (!nextFrontUrl) {
        throw new Error('يجب رفع صورة الهوية الأمامية');
      }

      if (!nextBackUrl) {
        throw new Error('يجب رفع صورة الهوية الخلفية');
      }

      const payload: any = {
        user_id: user.id,
        full_name: normalizedFullName,
        identity_type: identityType,
        identity_number: normalizedIdentityNumber,
        date_of_birth: identityDateOfBirth,
        document_front_url: nextFrontUrl,
        document_back_url: nextBackUrl,
        status: 'pending',
        rejection_reason: null,
        reviewed_at: null,
        submitted_at: new Date().toISOString(),
      };

      if (identityVerification?.id) {
        payload.id = identityVerification.id;
      }

      const { error } = await supabase
        .from('identity_verifications')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      setIdentityFrontFile(null);
      setIdentityBackFile(null);
      setIdentityFrontFileName('');
      setIdentityBackFileName('');
      setEditingIdentity(false);
      setIdentityMessage('تم إرسال طلب توثيق الهوية بنجاح');
      await fetchIdentityVerification();
    } catch (error: any) {
      console.error('Error submitting identity verification:', error);
      const rawMessage = error?.message || '';
      if (rawMessage.includes('Bucket not found')) {
        setIdentityMessage(
          'أنشئ bucket باسم identity-documents أولاً'
        );
      } else {
        setIdentityMessage(rawMessage || 'حدث خطأ أثناء إرسال طلب التوثيق');
      }
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    if (!user) return;

    setBankLoading(true);
    setBankMessage('');

    try {
      const merchantId = await resolveCurrentMerchantId();

      if (!merchantId) {
        setBankMessage('تعذر العثور على سجل التاجر المرتبط بهذا الحساب');
        setBankLoading(false);
        return;
      }

      const normalizedIBAN = bankIban.replace(/\s+/g, '').toUpperCase();
      const normalizedHolderName = bankAccountHolderName.trim();
      const normalizedBankName = bankName.trim();

      if (!normalizedHolderName) {
        setBankMessage('أدخل اسم صاحب الحساب');
        setBankLoading(false);
        return;
      }

      if (!normalizedIBAN.startsWith('SA') || normalizedIBAN.length !== 24) {
        setBankMessage('رقم الآيبان غير صحيح. يجب أن يبدأ بـ SA ويتكون من 24 حرفاً');
        setBankLoading(false);
        return;
      }

      if (!normalizedBankName) {
        setBankMessage('أدخل اسم البنك');
        setBankLoading(false);
        return;
      }

      const payload: any = {
        merchant_id: merchantId,
        account_holder_name: normalizedHolderName,
        iban: normalizedIBAN,
        bank_name: normalizedBankName,
        status: 'pending',
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
      };

      if (bankDetails?.id) {
        payload.id = bankDetails.id;
      }

      const { error } = await supabase
        .from('bank_accounts')
        .upsert(payload, { onConflict: 'merchant_id' });

      if (error) {
        console.error('Error updating bank details:', error);
        setBankMessage(error.message || 'فشل تحديث بيانات الحساب البنكي');
        setBankLoading(false);
        return;
      }

      setBankMessage(
        bankDetails?.id
          ? 'تم تحديث بيانات الحساب البنكي وإعادة إرسالها للمراجعة'
          : 'تم حفظ بيانات الحساب البنكي وإرسالها للمراجعة'
      );
      setEditingBank(false);
      await fetchBankDetails();
    } catch (err: any) {
      console.error('Error updating bank details:', err);
      setBankMessage(err?.message || 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setBankLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (profile?.role === 'seller') return;

    const confirm = window.confirm(
      'هل تريد ترقية حسابك إلى حساب تاجر؟ ستتمكن من إنشاء متاجر وبيع المنتجات.'
    );
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

  const handleLogout = async () => {
    setLogoutLoading(true);
    setMessage('');

    try {
      await signOut();
      onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'home');
    } catch (error: any) {
      console.error('Error signing out:', error);
      setMessage(error?.message || 'حدث خطأ أثناء تسجيل الخروج.');
    } finally {
      setLogoutLoading(false);
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

  const getIdentityStatusColor = (status?: string | null) => {
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

  const getIdentityTypeText = (type?: string | null) => {
    switch (type) {
      case 'national_id':
      case 'هوية وطنية':
        return 'هوية وطنية';
      case 'iqama':
      case 'إقامة':
        return 'إقامة';
      case 'passport':
      case 'جواز سفر':
        return 'جواز سفر';
      default:
        return type || 'غير متوفر';
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
                      <div className="text-3xl font-bold text-blue-600 mb-2">{item.price} ريال</div>
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
  const emailConfirmed = !!(user as any)?.email_confirmed_at;
  const sellerProfile = profile as any;
  const bankStatus = bankDetails?.status || (bankDetails ? 'added' : 'not_added');

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
                        {stats.favorites_count}
                      </div>
                      <p className="text-sm text-gray-600">المنتجات المفضلة</p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats.viewed_products_count}
                      </div>
                      <p className="text-sm text-gray-600">المنتجات المشاهدة</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">مشترياتي</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">
                          عرض مشترياتك من متجر {scopeInfo.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={fetchOrders}
                      disabled={ordersLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {ordersLoading ? 'جاري التحديث...' : 'تحديث المشتريات'}
                    </button>
                  </div>

                  {ordersLoading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">جاري تحميل المشتريات...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {ordersError}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد مشتريات</h3>
                      <p className="text-gray-600 mb-6">
                        {scopeInfo
                          ? `ابدأ بالشراء من متجر ${scopeInfo.name}`
                          : 'ابدأ بتصفح المنتجات وشراء ما يعجبك'}
                      </p>
                      <button
                        onClick={() =>
                          onNavigate(scopeInfo ? `storefront-${scopeInfo.slug}` : 'marketplace')
                        }
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      >
                        {scopeInfo ? 'العودة إلى المتجر' : 'تصفح المنتجات'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-gray-200 rounded-2xl p-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                الطلب #{order.order_number}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleString('ar-SA')}
                              </p>
                            </div>

                            <div className="text-left md:text-right">
                              <div className="text-3xl font-bold text-blue-600 mb-2">
                                {order.total_amount.toFixed(2)} ريال
                              </div>
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {getStatusIcon(order.status)}
                                <span>{getStatusText(order.status)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-bold text-gray-900">عناصر الطلب</h4>

                            {order.items.length > 0 ? (
                              <div className="space-y-3">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        {item.thumbnail_url ? (
                                          <img
                                            src={item.thumbnail_url}
                                            alt={item.product_name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <Package className="w-8 h-8 text-blue-600" />
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">
                                          {item.product_name}
                                        </p>
                                        <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 justify-end">
                                      <div className="text-lg font-bold text-blue-600">
                                        {item.subtotal.toFixed(2)} ريال
                                      </div>

                                      <button
                                        onClick={() => openScopedProduct(item)}
                                        className="px-4 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                                      >
                                        عرض المنتج
                                      </button>

                                      {canAccessFiles(order.status) && (
                                        <button
                                          onClick={() => openScopedProduct(item)}
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>الوصول للملفات</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">لا توجد عناصر لهذا الطلب</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'favorites' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">المنتجات المفضلة</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">
                          عرض المفضلة داخل متجر {scopeInfo.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={fetchFavorites}
                      disabled={favoritesLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {favoritesLoading ? 'جاري التحديث...' : 'تحديث المفضلة'}
                    </button>
                  </div>

                  {renderProductCardList(favorites, {
                    emptyTitle: 'لا توجد منتجات في المفضلة',
                    emptyDescription: scopeInfo
                      ? `ابدأ بإضافة منتجات من متجر ${scopeInfo.name} إلى المفضلة`
                      : 'ابدأ بإضافة المنتجات التي تعجبك إلى المفضلة',
                    refreshLabel: 'تحديث المفضلة',
                    loading: favoritesLoading,
                    error: favoritesError,
                    onRefresh: fetchFavorites,
                    primaryButtonText: 'أضف إلى السلة',
                    secondaryButtonText: 'إزالة من المفضلة',
                    onPrimaryAction: (item) => handleAddProductToCart(item.product_id),
                    onSecondaryAction: (item) => handleRemoveFavorite(item.product_id),
                    secondaryButtonClassName:
                      'px-5 py-3 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50',
                  })}
                </div>
              )}

              {activeTab === 'viewed' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">المنتجات التي شاهدتها</h2>
                      {scopeInfo && (
                        <p className="text-sm text-gray-500 mt-1">
                          عرض المشاهدات داخل متجر {scopeInfo.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={fetchViewedProducts}
                      disabled={viewedProductsLoading}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {viewedProductsLoading ? 'جاري التحديث...' : 'تحديث المشاهدات'}
                    </button>
                  </div>

                  {renderProductCardList(viewedProducts, {
                    emptyTitle: 'لا توجد منتجات تمت مشاهدتها',
                    emptyDescription: scopeInfo
                      ? `ابدأ بتصفح منتجات متجر ${scopeInfo.name}`
                      : 'ابدأ بتصفح المنتجات لتظهر هنا',
                    refreshLabel: 'تحديث المشاهدات',
                    loading: viewedProductsLoading,
                    error: viewedProductsError,
                    onRefresh: fetchViewedProducts,
                    primaryButtonText: 'أضف إلى السلة',
                    secondaryButtonText: 'إزالة من السجل',
                    onPrimaryAction: (item) => handleAddProductToCart(item.product_id),
                    onSecondaryAction: (item) => handleRemoveViewedProduct(item.product_id),
                    secondaryButtonClassName:
                      'px-5 py-3 border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50',
                    metaLabel: (item) =>
                      item.viewed_at
                        ? `آخر مشاهدة: ${new Date(item.viewed_at).toLocaleString('ar-SA')}`
                        : null,
                  })}
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">الإعدادات</h2>

                  <div className="space-y-8">
                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">المعلومات الشخصية</h3>
                          <p className="text-sm text-gray-500">عدّل بياناتك الأساسية من هنا</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الاسم الكامل
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="اسمك الكامل"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              البريد الإلكتروني
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              dir="ltr"
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="example@email.com"
                            />
                            <p className="text-xs text-gray-500 mt-2 leading-6">
                              عند تغيير البريد سيتم إرسال رابط تأكيد إلى البريد الجديد، ولن يكتمل
                              التغيير إلا بعد التأكيد.
                            </p>
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4 self-start">
                            <div className="text-sm text-gray-500 mb-1">نوع الحساب</div>
                            <div className="font-semibold text-gray-900">
                              {profile.role === 'admin'
                                ? 'مدير'
                                : isMerchant
                                ? 'تاجر'
                                : 'عميل'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-sm text-gray-500">
                            يمكنك تعديل الاسم والصورة الشخصية والبريد الإلكتروني من هذه الصفحة
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleUpdateProfile}
                              disabled={loading}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              <span>{loading ? 'جاري الحفظ...' : 'حفظ الاسم'}</span>
                            </button>

                            <button
                              onClick={handleChangeEmail}
                              disabled={emailChangeLoading}
                              className="px-6 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-2"
                            >
                              <Mail className="w-4 h-4" />
                              <span>
                                {emailChangeLoading ? 'جاري الإرسال...' : 'تحديث البريد الإلكتروني'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">الأمان</h3>
                          <p className="text-sm text-gray-500">البريد الإلكتروني وكلمة المرور</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-500">حالة البريد الإلكتروني</div>
                              <div className="font-semibold text-gray-900">
                                {emailConfirmed ? 'تم تأكيد البريد الإلكتروني' : 'البريد غير مؤكد'}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              emailConfirmed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {emailConfirmed ? 'مؤكد' : 'غير مؤكد'}
                          </div>
                        </div>

                        {pendingEmail &&
                          normalizeEmailInput(pendingEmail) !==
                            normalizeEmailInput(user.email || '') && (
                            <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <div>
                                  <div className="text-sm text-yellow-700">
                                    بريد جديد بانتظار التأكيد
                                  </div>
                                  <div className="font-semibold text-gray-900 break-all">
                                    {pendingEmail}
                                  </div>
                                </div>
                              </div>

                              <div className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700">
                                بانتظار التأكيد
                              </div>
                            </div>
                          )}

                        <div className="flex flex-wrap gap-3">
                          {!emailConfirmed && (
                            <button
                              onClick={handleResendEmailConfirmation}
                              disabled={emailActionLoading}
                              className="px-5 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                            >
                              {emailActionLoading ? 'جاري الإرسال...' : 'إعادة إرسال تأكيد البريد'}
                            </button>
                          )}

                          <button
                            onClick={handleSendPasswordResetEmail}
                            disabled={passwordResetLoading}
                            className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>
                              {passwordResetLoading
                                ? 'جاري الإرسال...'
                                : 'إرسال رابط تغيير كلمة المرور'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
                          <SettingsIcon className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">الحساب</h3>
                          <p className="text-sm text-gray-500">معلومات الحساب والإجراءات العامة</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="border border-gray-200 rounded-xl p-4">
                          <div className="text-sm text-gray-500 mb-1">تاريخ إنشاء الحساب</div>
                          <div className="font-semibold text-gray-900">
                            {(user as any)?.created_at
                              ? new Date((user as any).created_at).toLocaleDateString('ar-SA')
                              : 'غير متوفر'}
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-4">
                          <div className="text-sm text-gray-500 mb-1">حالة الحساب</div>
                          <div className="font-semibold text-gray-900">
                            {sellerProfile?.signup_completed ? 'نشط ومكتمل' : 'غير مكتمل'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleLogout}
                          disabled={logoutLoading}
                          className="px-5 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{logoutLoading ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
                        </button>

                        <button
                          onClick={handleDeleteAccount}
                          disabled={loading}
                          className="px-5 py-3 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف الحساب</span>
                        </button>
                      </div>
                    </div>

                    {isMerchant && (
                      <>
                        <div className="border border-gray-200 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                              <BadgeCheck className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">التحقق من الهوية</h3>
                              <p className="text-sm text-gray-500">هذا القسم يظهر للتاجر فقط</p>
                            </div>
                          </div>

                          {identityMessage && (
                            <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm">
                              {identityMessage}
                            </div>
                          )}

                          {identityLoading ? (
                            <div className="text-center py-8">
                              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                              <p className="text-gray-600">جاري تحميل بيانات التوثيق...</p>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              <div className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 rounded-xl p-4">
                                <div>
                                  <div className="text-sm text-gray-500 mb-1">حالة التوثيق</div>
                                  <div className="font-bold text-gray-900">
                                    {getIdentityStatusText(identityVerification?.status)}
                                  </div>
                                </div>

                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getIdentityStatusColor(
                                    identityVerification?.status
                                  )}`}
                                >
                                  {getIdentityStatusText(identityVerification?.status)}
                                </div>
                              </div>

                              {!editingIdentity ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-gray-200 rounded-xl p-4">
                                      <div className="text-sm text-gray-500 mb-1">الاسم في التحقق</div>
                                      <div className="font-semibold text-gray-900">
                                        {identityVerification?.full_name || 'غير متوفر'}
                                      </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-4">
                                      <div className="text-sm text-gray-500 mb-1">نوع الهوية</div>
                                      <div className="font-semibold text-gray-900">
                                        {getIdentityTypeText(identityVerification?.identity_type)}
                                      </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-4">
                                      <div className="text-sm text-gray-500 mb-1">تاريخ التقديم</div>
                                      <div className="font-semibold text-gray-900">
                                        {identityVerification?.submitted_at
                                          ? new Date(
                                              identityVerification.submitted_at
                                            ).toLocaleDateString('ar-SA')
                                          : 'لم يتم التقديم'}
                                      </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-4">
                                      <div className="text-sm text-gray-500 mb-1">تاريخ المراجعة</div>
                                      <div className="font-semibold text-gray-900">
                                        {identityVerification?.reviewed_at
                                          ? new Date(
                                              identityVerification.reviewed_at
                                            ).toLocaleDateString('ar-SA')
                                          : 'لم تتم المراجعة'}
                                      </div>
                                    </div>
                                  </div>

                                  {identityVerification?.rejection_reason && (
                                    <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                                      سبب الرفض: {identityVerification.rejection_reason}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      onClick={handleStartIdentityEdit}
                                      className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                    >
                                      {identityVerification ? 'تعديل / إعادة إرسال الطلب' : 'تقديم طلب التوثيق'}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        الاسم الكامل
                                      </label>
                                      <input
                                        type="text"
                                        value={identityFullName}
                                        onChange={(e) => setIdentityFullName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="الاسم كما يظهر في الهوية"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        نوع الهوية
                                      </label>
                                      <select
                                        value={identityType}
                                        onChange={(e) => setIdentityType(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                      >
                                        <option value="national_id">هوية وطنية</option>
                                        <option value="iqama">إقامة</option>
                                        <option value="passport">جواز سفر</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        رقم الهوية
                                      </label>
                                      <input
                                        type="text"
                                        value={identityNumber}
                                        onChange={(e) => setIdentityNumber(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="رقم الهوية"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        تاريخ الميلاد
                                      </label>
                                      <input
                                        type="date"
                                        value={identityDateOfBirth}
                                        onChange={(e) => setIdentityDateOfBirth(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-white">
                                      <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                          <div className="font-semibold text-gray-900">
                                            صورة الهوية الأمامية
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            JPG / PNG / WEBP / PDF
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => identityFrontInputRef.current?.click()}
                                          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                                        >
                                          <Upload className="w-4 h-4" />
                                          <span>اختيار ملف</span>
                                        </button>
                                      </div>

                                      <input
                                        ref={identityFrontInputRef}
                                        type="file"
                                        accept=".jpg,jpeg,png,webp,pdf,image/*,application/pdf"
                                        onChange={handleIdentityFrontChange}
                                        className="hidden"
                                      />

                                      <div className="text-sm text-gray-600">
                                        {identityFrontFileName || 'لم يتم اختيار ملف'}
                                      </div>
                                    </div>

                                    <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-white">
                                      <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                          <div className="font-semibold text-gray-900">
                                            صورة الهوية الخلفية
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            JPG / PNG / WEBP / PDF
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => identityBackInputRef.current?.click()}
                                          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
                                        >
                                          <Upload className="w-4 h-4" />
                                          <span>اختيار ملف</span>
                                        </button>
                                      </div>

                                      <input
                                        ref={identityBackInputRef}
                                        type="file"
                                        accept=".jpg,jpeg,png,webp,pdf,image/*,application/pdf"
                                        onChange={handleIdentityBackChange}
                                        className="hidden"
                                      />

                                      <div className="text-sm text-gray-600">
                                        {identityBackFileName || 'لم يتم اختيار ملف'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm leading-7">
                                    بعد الإرسال سيتم تحويل الطلب إلى حالة{' '}
                                    <span className="font-bold">قيد المراجعة</span>.
                                    ويمكنك تعديل الطلب وإعادة إرساله إذا تم رفضه لاحقاً.
                                  </div>

                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      onClick={handleSubmitIdentityVerification}
                                      disabled={identitySubmitting}
                                      className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {identitySubmitting ? 'جاري الإرسال...' : 'إرسال طلب التوثيق'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCancelIdentityEdit}
                                      disabled={identitySubmitting}
                                      className="px-5 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border border-gray-200 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                              <Landmark className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">الحساب البنكي</h3>
                              <p className="text-sm text-gray-500">هذا القسم يظهر للتاجر فقط</p>
                            </div>
                          </div>

                          {bankMessage && (
                            <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm">
                              {bankMessage}
                            </div>
                          )}

                          <div className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 rounded-xl p-4">
                              <div>
                                <div className="text-sm text-gray-500 mb-1">حالة الحساب البنكي</div>
                                <div className="font-bold text-gray-900">
                                  {bankStatus === 'approved'
                                    ? 'معتمد'
                                    : bankStatus === 'pending'
                                    ? 'قيد المراجعة'
                                    : bankStatus === 'rejected'
                                    ? 'مرفوض'
                                    : bankDetails
                                    ? 'مضاف'
                                    : 'غير مضاف'}
                                </div>
                              </div>

                              <div
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  bankStatus === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : bankStatus === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : bankStatus === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : bankDetails
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {bankStatus === 'approved'
                                  ? 'معتمد'
                                  : bankStatus === 'pending'
                                  ? 'قيد المراجعة'
                                  : bankStatus === 'rejected'
                                  ? 'مرفوض'
                                  : bankDetails
                                  ? 'مضاف'
                                  : 'غير مضاف'}
                              </div>
                            </div>

                            {!editingBank ? (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="border border-gray-200 rounded-xl p-4">
                                    <div className="text-sm text-gray-500 mb-1">اسم صاحب الحساب</div>
                                    <div className="font-semibold text-gray-900">
                                      {bankDetails?.account_holder_name || 'غير متوفر'}
                                    </div>
                                  </div>

                                  <div className="border border-gray-200 rounded-xl p-4">
                                    <div className="text-sm text-gray-500 mb-1">اسم البنك</div>
                                    <div className="font-semibold text-gray-900">
                                      {bankDetails?.bank_name || 'غير متوفر'}
                                    </div>
                                  </div>

                                  <div className="border border-gray-200 rounded-xl p-4 md:col-span-2">
                                    <div className="text-sm text-gray-500 mb-1">الآيبان</div>
                                    <div className="font-semibold text-gray-900 break-all">
                                      {bankDetails?.iban || 'غير متوفر'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBank(true)}
                                    className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                  >
                                    {bankDetails ? 'تعديل بيانات الحساب البنكي' : 'إضافة حساب بنكي'}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      اسم صاحب الحساب
                                    </label>
                                    <input
                                      type="text"
                                      value={bankAccountHolderName}
                                      onChange={(e) => setBankAccountHolderName(e.target.value)}
                                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="اسم صاحب الحساب"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      اسم البنك
                                    </label>
                                    <input
                                      type="text"
                                      value={bankName}
                                      onChange={(e) => setBankName(e.target.value)}
                                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="اسم البنك"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      الآيبان
                                    </label>
                                    <input
                                      type="text"
                                      value={bankIban}
                                      onChange={(e) => setBankIban(e.target.value)}
                                      dir="ltr"
                                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="SAxxxxxxxxxxxxxxxxxxxxxx"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                      يجب أن يبدأ الآيبان بـ SA ويتكون من 24 حرفاً
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm leading-7">
                                  بعد الحفظ سيتم إرسال بيانات الحساب البنكي للمراجعة من الإدارة إذا
                                  كان ذلك مطلوباً في نظامك.
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={handleUpdateBankDetails}
                                    disabled={bankLoading}
                                    className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {bankLoading ? 'جاري الحفظ...' : 'حفظ بيانات الحساب البنكي'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBank(false);
                                      if (bankDetails) {
                                        setBankAccountHolderName(bankDetails.account_holder_name || '');
                                        setBankIban(bankDetails.iban || '');
                                        setBankName(bankDetails.bank_name || '');
                                      } else {
                                        setBankAccountHolderName('');
                                        setBankIban('');
                                        setBankName('');
                                      }
                                      setBankMessage('');
                                    }}
                                    disabled={bankLoading}
                                    className="px-5 py-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">الاشتراك والخطة</h3>
                              <p className="text-sm text-gray-500">هذا القسم يظهر للتاجر فقط</p>
                            </div>
                          </div>

                          {subscriptionLoading ? (
                            <div className="text-center py-8">
                              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                              <p className="text-gray-600">جاري تحميل الخطة الحالية...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="border border-gray-200 rounded-xl p-4">
                                <div className="text-sm text-gray-500 mb-1">الخطة الحالية</div>
                                <div className="font-semibold text-gray-900">
                                  {sellerPlan?.title || sellerPlan?.name || sellerPlan?.slug || 'غير محددة'}
                                </div>
                              </div>

                              <div className="border border-gray-200 rounded-xl p-4">
                                <div className="text-sm text-gray-500 mb-1">السعر</div>
                                <div className="font-semibold text-gray-900">
                                  {sellerPlan?.price != null ? `${sellerPlan.price} ريال` : 'مجاناً'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
