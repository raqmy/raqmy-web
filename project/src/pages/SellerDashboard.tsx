import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Store as StoreIcon,
  DollarSign,
  Settings,
  Plus,
  TrendingUp,
  ShoppingBag,
  Eye,
  Share2,
  Users,
  Link as LinkIcon,
  Check,
  ShieldCheck,
  Wallet,
  ArrowUpLeft,
  ArrowDownLeft,
  Clock3,
  Landmark,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  Paperclip,
  X,
  Search,
  ImagePlus,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Store, Product } from '../lib/supabase';
import { CreateStoreModal } from '../components/store/CreateStoreModal';
import { CreateProductModal } from '../components/product/CreateProductModal';
import { EditStoreModal } from '../components/store/EditStoreModal';
import { EditProductModal } from '../components/product/EditProductModal';

interface SellerDashboardProps {
  onNavigate: (page: string) => void;
}

interface AffiliateLinkRow {
  id: string;
  user_id: string;
  product_id: string;
  code: string;
  created_at: string;
}

interface AffiliateLinkUI extends AffiliateLinkRow {
  affiliate?: { id: string; name: string };
  clicks_count?: number;
  sales_count?: number;
}

interface IdentityVerificationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  identity_type: string | null;
  identity_number: string | null;
  date_of_birth: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BankAccountRow {
  id: string;
  merchant_id: string;
  bank_name: string | null;
  account_holder_name: string | null;
  iban: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface WalletRow {
  id: string;
  merchant_id: string;
  balance_available: number | null;
  balance_pending: number | null;
  updated_at: string | null;
  created_at?: string | null;
}

interface WalletLedgerRow {
  id: string;
  wallet_id: string | null;
  merchant_id: string;
  order_id: string | null;
  entry_type: string | null;
  amount: number | null;
  status: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
  available_at: string | null;
}

interface WithdrawalRequestRow {
  id: string;
  merchant_id: string;
  amount: number | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  wallet_id?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  processed_at?: string | null;
  transfer_proof_url?: string | null;
  transfer_proof_path?: string | null;
  bank_transfer_reference?: string | null;
  bank_transfer_at?: string | null;
  transferred_by?: string | null;
  transfer_notes?: string | null;
}

interface WithdrawalLimitSettingsRow {
  is_enabled: boolean;
  max_requests: number;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | string;
  min_withdrawal_amount: number;
  period_start?: string | null;
  period_end?: string | null;
}

interface WithdrawalLimitStatusRow extends WithdrawalLimitSettingsRow {
  used_requests: number;
  remaining_requests: number;
}

interface EarningsOrderMeta {
  affiliateLabel?: string | null;
  affiliateAmount?: number;
  couponLabel?: string | null;
  couponAmount?: number;
}

interface SellerOrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number | null;
  price_at_time: number | null;
  product_name?: string | null;
  product_title?: string | null;
  subtotal?: number | null;
  seller_amount?: number | null;
  seller_id?: string | null;
}

interface SellerOrderRow {
  id: string;
  order_number?: string | null;
  customer_id?: string | null;
  user_id?: string | null;
  seller_id?: string | null;
  merchant_id?: string | null;
  status: string | null;
  total_amount: number | null;
  seller_amount?: number | null;
  phone?: string | null;
  created_at: string | null;
  paid_at?: string | null;
  currency?: string | null;
}

interface SellerOrderUI extends SellerOrderRow {
  customer_name: string;
  customer_phone: string;
  items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    amount: number;
  }>;
}

type NormalizedProduct = Product & {
  name: string;
  user_id?: string | null;
  views_count: number;
  sales_count: number;
  currency: string;
  thumbnail_url?: string | null;
};

type StoreImageRecord = Store & Record<string, any>;

const FALLBACK_MIN_WITHDRAWAL_AMOUNT = 10;
const WITHDRAWAL_PROOFS_BUCKET = 'withdrawal-proofs';
const STORE_IMAGES_BUCKET = 'store-images';

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'products'
    | 'stores'
    | 'marketing'
    | 'settings'
    | 'orders'
    | 'earnings'
    | 'verification'
    | 'bankAccount'
  >('overview');

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalViews: 0,
    activeProducts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkUI[]>([]);

  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [identityVerification, setIdentityVerification] = useState<IdentityVerificationRow | null>(null);

  const [verificationForm, setVerificationForm] = useState({
    full_name: '',
    identity_type: 'national_id',
    identity_number: '',
    date_of_birth: '',
  });

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [bankAccountLoading, setBankAccountLoading] = useState(false);
  const [bankAccountSubmitting, setBankAccountSubmitting] = useState(false);
  const [bankAccountError, setBankAccountError] = useState('');
  const [bankAccountSuccess, setBankAccountSuccess] = useState('');
  const [bankAccountData, setBankAccountData] = useState<BankAccountRow | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bank_name: '',
    account_holder_name: '',
    iban: '',
  });

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletRow | null>(null);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerRow[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRow[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
  const [withdrawalLimitLoading, setWithdrawalLimitLoading] = useState(false);
  const [withdrawalLimitStatus, setWithdrawalLimitStatus] = useState<WithdrawalLimitStatusRow | null>(null);
  const [withdrawalLimitSettings, setWithdrawalLimitSettings] = useState<WithdrawalLimitSettingsRow | null>(null);

  const [earningsOrderMeta, setEarningsOrderMeta] = useState<Record<string, EarningsOrderMeta>>({});

  const [sellerOrders, setSellerOrders] = useState<SellerOrderUI[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'paid' | 'pending_payment'>('all');
  const [productsSearchQuery, setProductsSearchQuery] = useState('');
  const [productsStatusFilter, setProductsStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [productsSortBy, setProductsSortBy] = useState<'newest' | 'name' | 'price_high' | 'price_low' | 'views' | 'sales'>('newest');
  const [storesSearchQuery, setStoresSearchQuery] = useState('');
  const [storesStatusFilter, setStoresStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [storesSortBy, setStoresSortBy] = useState<'newest' | 'name'>('newest');
  const [storeImageUploadingId, setStoreImageUploadingId] = useState<string | null>(null);
  const [storeImageError, setStoreImageError] = useState('');
  const [storeImageSuccess, setStoreImageSuccess] = useState('');
  const [storeImageMenuOpenId, setStoreImageMenuOpenId] = useState<string | null>(null);
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [ordersSortBy, setOrdersSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [selectedOrder, setSelectedOrder] = useState<SellerOrderUI | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestRow | null>(null);
  const [showWithdrawalDetails, setShowWithdrawalDetails] = useState(false);
  const [withdrawalProofUrl, setWithdrawalProofUrl] = useState<string | null>(null);
  const [withdrawalProofLoading, setWithdrawalProofLoading] = useState(false);
  const [withdrawalProofError, setWithdrawalProofError] = useState('');

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      fetchIdentityVerification();
      fetchBankAccountData();
      fetchEarningsData();
      fetchWithdrawalLimitData();
      fetchOrdersData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);


  const normalizeProduct = (row: any): NormalizedProduct => {
    const name = row?.name ?? row?.title ?? '';
    const user_id = row?.user_id ?? row?.merchant_id ?? null;

    const views_count = Number(row?.views_count ?? row?.views ?? 0) || 0;
    const sales_count = Number(row?.sales_count ?? 0) || 0;
    const currency = row?.currency ?? 'SAR';

    return {
      ...(row as Product),
      name,
      user_id,
      views_count,
      sales_count,
      currency,
      thumbnail_url: row?.thumbnail_url ?? null,
    } as NormalizedProduct;
  };

  const safeArray = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);

  const getFileNameFromPath = (path: string | null | undefined) => {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  const STORE_IMAGE_URL_FIELDS = ['store_image_url', 'logo_url', 'image_url', 'cover_image', 'cover_url'] as const;
  const STORE_IMAGE_PATH_FIELDS = ['store_image_path', 'logo_path', 'image_path', 'cover_image_path', 'cover_path'] as const;

  const extractSupabaseStoragePath = (value: string | null | undefined, bucketName: string) => {
    if (!value) return '';

    let pathValue = String(value).trim();
    if (!pathValue) return '';

    const signMarker = `/object/sign/${bucketName}/`;
    const publicMarker = `/object/public/${bucketName}/`;

    if (pathValue.includes(signMarker)) {
      pathValue = pathValue.split(signMarker)[1] || '';
    } else if (pathValue.includes(publicMarker)) {
      pathValue = pathValue.split(publicMarker)[1] || '';
    }

    if (pathValue.startsWith(`${bucketName}/`)) {
      pathValue = pathValue.slice(bucketName.length + 1);
    }

    if (pathValue.startsWith('/')) {
      pathValue = pathValue.slice(1);
    }

    const queryIndex = pathValue.indexOf('?');
    if (queryIndex !== -1) {
      pathValue = pathValue.slice(0, queryIndex);
    }

    return decodeURIComponent(pathValue);
  };

  const getStoreImageUrl = (store: StoreImageRecord) => {
    for (const field of STORE_IMAGE_URL_FIELDS) {
      const value = store?.[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return '';
  };

  const getStoreImagePath = (store: StoreImageRecord) => {
    for (const field of STORE_IMAGE_PATH_FIELDS) {
      const value = store?.[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return extractSupabaseStoragePath(getStoreImageUrl(store), STORE_IMAGES_BUCKET);
  };

  const resolveStoreImageFields = (store: StoreImageRecord) => {
    const existingUrlField = STORE_IMAGE_URL_FIELDS.find((field) => field in store);
    const existingPathField = STORE_IMAGE_PATH_FIELDS.find((field) => field in store);

    return {
      urlField: existingUrlField || 'logo_url',
      pathField: existingPathField || null,
    };
  };

  const updateStoreImageReference = async (
    store: StoreImageRecord,
    nextUrl: string | null,
    nextPath: string | null
  ) => {
    const { urlField, pathField } = resolveStoreImageFields(store);
    const updatePayload: Record<string, any> = {
      [urlField]: nextUrl,
    };

    if (pathField) {
      updatePayload[pathField] = nextPath;
    }

    let { error } = await supabase.from('stores').update(updatePayload).eq('id', store.id);

    if (!error) return;

    const fallbackFields = STORE_IMAGE_URL_FIELDS.filter((field) => field !== urlField);
    for (const field of fallbackFields) {
      const fallbackPayload: Record<string, any> = { [field]: nextUrl };
      if (pathField) fallbackPayload[pathField] = nextPath;

      const response = await supabase.from('stores').update(fallbackPayload).eq('id', store.id);
      if (!response.error) return;
      error = response.error;
    }

    throw error;
  };

  const uploadStoreImage = async (store: StoreImageRecord, file: File) => {
    if (!profile?.id) throw new Error('يجب تسجيل الدخول أولاً');

    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExt = (fileExt || 'jpg').toLowerCase();
    const filePath = `${profile.id}/${store.id}-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(STORE_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(STORE_IMAGES_BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || '';

    await updateStoreImageReference(store, publicUrl, filePath);
    return filePath;
  };

  const handleStoreImageSelected = async (store: StoreImageRecord, file: File | null) => {
    if (!file) return;

    setStoreImageError('');
    setStoreImageSuccess('');

    if (!file.type.startsWith('image/')) {
      setStoreImageError('يرجى اختيار ملف صورة صحيح للمتجر');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStoreImageError('حجم صورة المتجر يجب ألا يتجاوز 5MB');
      return;
    }

    try {
      setStoreImageUploadingId(store.id);

      const previousPath = getStoreImagePath(store);
      const uploadedPath = await uploadStoreImage(store, file);

      if (previousPath && previousPath !== uploadedPath) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([previousPath]);
      }

      setStoreImageSuccess('تم تحديث صورة المتجر بنجاح');
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Store image upload error:', error);
      const message = String(error?.message || '');
      if (message.includes('Bucket not found')) {
        setStoreImageError('مجلد صور المتاجر غير موجود في التخزين. أنشئ bucket باسم store-images ثم أعد المحاولة.');
      } else {
        setStoreImageError(error?.message || 'حدث خطأ أثناء رفع صورة المتجر');
      }
    } finally {
      setStoreImageUploadingId(null);
    }
  };

  const handleStoreImageDelete = async (store: StoreImageRecord) => {
    setStoreImageError('');
    setStoreImageSuccess('');

    const existingImageUrl = getStoreImageUrl(store);
    if (!existingImageUrl) {
      setStoreImageError('لا توجد صورة محفوظة لهذا المتجر');
      return;
    }

    try {
      setStoreImageUploadingId(store.id);

      const existingPath = getStoreImagePath(store);
      if (existingPath) {
        await supabase.storage.from(STORE_IMAGES_BUCKET).remove([existingPath]);
      }

      await updateStoreImageReference(store, null, null);
      setStoreImageSuccess('تم حذف صورة المتجر بنجاح');
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Store image delete error:', error);
      setStoreImageError(error?.message || 'حدث خطأ أثناء حذف صورة المتجر');
    } finally {
      setStoreImageUploadingId(null);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    const amount = Number(value || 0);
    return `${amount.toFixed(2)} ريال`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('ar-SA');
    } catch {
      return value;
    }
  };

  const formatIbanForInput = (value: string | null | undefined) => {
    if (!value) return '';
    const clean = value.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const isImageFile = (pathOrUrl: string | null | undefined) => {
    if (!pathOrUrl) return false;
    const lower = pathOrUrl.toLowerCase();
    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif')
    );
  };

  const normalizeStoragePath = (value: string | null | undefined) => {
    if (!value) return '';

    let path = value.trim();
    if (!path) return '';

    if (path.includes('/object/sign/')) {
      const marker = `/object/sign/${WITHDRAWAL_PROOFS_BUCKET}/`;
      const idx = path.indexOf(marker);
      if (idx !== -1) {
        path = path.slice(idx + marker.length);
        const qIndex = path.indexOf('?');
        if (qIndex !== -1) path = path.slice(0, qIndex);
      }
    }

    if (path.includes('/object/public/')) {
      const marker = `/object/public/${WITHDRAWAL_PROOFS_BUCKET}/`;
      const idx = path.indexOf(marker);
      if (idx !== -1) {
        path = path.slice(idx + marker.length);
      }
    }

    if (path.startsWith(`${WITHDRAWAL_PROOFS_BUCKET}/`)) {
      path = path.slice(WITHDRAWAL_PROOFS_BUCKET.length + 1);
    }

    if (path.startsWith('/')) {
      path = path.slice(1);
    }

    return decodeURIComponent(path);
  };

  const buildProofPathCandidates = (request: WithdrawalRequestRow) => {
    const rawValues = [
      request.transfer_proof_path,
      request.transfer_proof_url,
      normalizeStoragePath(request.transfer_proof_path),
      normalizeStoragePath(request.transfer_proof_url),
    ].filter(Boolean) as string[];

    const candidates = new Set<string>();

    for (const raw of rawValues) {
      const normalized = normalizeStoragePath(raw);
      if (!normalized) continue;

      candidates.add(normalized);

      if (request.merchant_id && !normalized.startsWith(`${request.merchant_id}/`)) {
        candidates.add(`${request.merchant_id}/${normalized}`);
      }

      const parts = normalized.split('/').filter(Boolean);

      if (
        request.merchant_id &&
        parts.length >= 2 &&
        parts[0] !== request.merchant_id &&
        parts[1] !== request.merchant_id
      ) {
        candidates.add(`${request.merchant_id}/${normalized}`);
      }

      if (
        request.merchant_id &&
        parts.length >= 2 &&
        parts[0] === request.id &&
        !normalized.startsWith(`${request.merchant_id}/`)
      ) {
        candidates.add(`${request.merchant_id}/${normalized}`);
      }

      if (
        request.merchant_id &&
        parts.length >= 3 &&
        parts[0] === request.merchant_id &&
        parts[1] === request.id
      ) {
        candidates.add(normalized);
      }

      if (
        request.merchant_id &&
        parts.length >= 2 &&
        parts[0] === request.merchant_id &&
        parts[1] !== request.id
      ) {
        candidates.add(normalized);
      }
    }

    return Array.from(candidates);
  };

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data: storesData, error: storesErr } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', profile.id);

      if (storesErr) console.error('stores fetch error:', storesErr);

      const { data: rawProductsData, error: productsErr } = await supabase
        .from('products')
        .select('*')
        .or(`user_id.eq.${profile.id},merchant_id.eq.${profile.id}`);

      if (productsErr) console.error('products fetch error:', productsErr);

      const normalizedProducts = safeArray(rawProductsData).map(normalizeProduct);
      const storeIds = safeArray(storesData).map((store: any) => store?.id).filter(Boolean);

      const { data: sellerStatsData, error: sellerStatsErr } = await supabase.rpc('get_seller_stats', {
        seller_id: profile.id,
      });

      if (sellerStatsErr) console.error('get_seller_stats rpc error:', sellerStatsErr);

      const { data: fallbackOrdersData, error: fallbackOrdersErr } = await supabase
        .from('orders')
        .select('id, seller_amount, status')
        .or(`seller_id.eq.${profile.id},merchant_id.eq.${profile.id}`)
        .in('status', ['paid', 'completed']);

      if (fallbackOrdersErr) console.error('fallback orders fetch error:', fallbackOrdersErr);

      const productIds = normalizedProducts.map((p) => p.id).filter(Boolean);
      const thumbMap: Record<string, string> = {};
      const productSalesMap: Record<string, number> = {};

      if (productIds.length > 0) {
        const { data: imgs, error: imgsErr } = await supabase
          .from('product_images')
          .select('product_id, image_url, is_primary, display_order, created_at')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (imgsErr) {
          console.error('product_images fetch error:', imgsErr);
        } else {
          for (const row of safeArray(imgs) as any[]) {
            if (!thumbMap[row.product_id] && row.image_url) {
              thumbMap[row.product_id] = row.image_url;
            }
          }
        }

        const { data: soldItemsData, error: soldItemsErr } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, seller_id')
          .eq('seller_id', profile.id);

        if (soldItemsErr) {
          console.error('order_items sales fetch error:', soldItemsErr);
        } else {
          const soldItemsRows = safeArray(soldItemsData) as any[];
          const paidOrderIds = new Set(
            safeArray(fallbackOrdersData)
              .filter((order: any) => ['paid', 'completed'].includes(String(order?.status || '').toLowerCase()))
              .map((order: any) => order?.id)
              .filter(Boolean)
          );

          for (const row of soldItemsRows) {
            const productId = row?.product_id;
            const orderId = row?.order_id;

            if (!productId || !orderId || !paidOrderIds.has(orderId)) continue;

            productSalesMap[productId] = (productSalesMap[productId] || 0) + Number(row?.quantity || 1);
          }
        }
      }

      const productsWithThumbs = normalizedProducts.map((p) => ({
        ...p,
        thumbnail_url: p.thumbnail_url || thumbMap[p.id] || null,
        sales_count: productSalesMap[p.id] ?? Number(p.sales_count || 0) ?? 0,
      }));

      let affiliateRows: AffiliateLinkRow[] = [];
      const affiliateRowsMap = new Map<string, AffiliateLinkRow>();

      const affiliateQueries = [
        supabase
          .from('affiliate_links')
          .select('id, user_id, product_id, code, created_at')
          .eq('seller_id', profile.id),
      ];

      if (productIds.length > 0) {
        affiliateQueries.push(
          supabase
            .from('affiliate_links')
            .select('id, user_id, product_id, code, created_at')
            .in('product_id', productIds)
        );
      }

      if (storeIds.length > 0) {
        affiliateQueries.push(
          supabase
            .from('affiliate_links')
            .select('id, user_id, product_id, code, created_at')
            .in('store_id', storeIds)
        );
      }

      const affiliateResponses = await Promise.all(affiliateQueries);

      for (const response of affiliateResponses) {
        if (response.error) {
          console.error('affiliate_links fetch error:', response.error);
          continue;
        }

        for (const row of safeArray(response.data) as any[]) {
          if (row?.id) {
            affiliateRowsMap.set(row.id, row as AffiliateLinkRow);
          }
        }
      }

      affiliateRows = Array.from(affiliateRowsMap.values());

      const affiliateUserIds = Array.from(new Set(affiliateRows.map((l) => l.user_id).filter(Boolean)));
      const userMap: Record<string, { id: string; name: string }> = {};

      if (affiliateUserIds.length > 0) {
        const { data: usersData, error: usersErr } = await supabase
          .from('users_profile')
          .select('id, name')
          .in('id', affiliateUserIds);

        if (usersErr) {
          console.error('users_profile fetch error:', usersErr);
        } else {
          for (const u of safeArray(usersData) as any[]) {
            userMap[u.id] = { id: u.id, name: u.name };
          }
        }
      }

      const linksWithStats: AffiliateLinkUI[] = await Promise.all(
        affiliateRows.map(async (link) => {
          try {
            const { data: clicks } = await supabase
              .from('affiliate_clicks')
              .select('id')
              .eq('affiliate_link_id', link.id);

            const { data: sales } = await supabase
              .from('affiliate_sales')
              .select('id')
              .eq('affiliate_link_id', link.id);

            return {
              ...link,
              affiliate: userMap[link.user_id],
              clicks_count: safeArray(clicks).length,
              sales_count: safeArray(sales).length,
            };
          } catch (e) {
            console.error('affiliate stats error:', e);
            return {
              ...link,
              affiliate: userMap[link.user_id],
              clicks_count: 0,
              sales_count: 0,
            };
          }
        })
      );

      setStores(storesData || []);
      setProducts(productsWithThumbs);
      setAffiliateLinks(linksWithStats);

      const rpcStats =
        sellerStatsData && typeof sellerStatsData === 'object' && !Array.isArray(sellerStatsData)
          ? (sellerStatsData as { total_sales?: number | string })
          : null;

      const fallbackSales = safeArray(fallbackOrdersData)?.length || 0;

      const sales = Number(rpcStats?.total_sales ?? fallbackSales ?? 0) || 0;
      const views = productsWithThumbs.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const active = productsWithThumbs.filter((p) => p.is_active).length || 0;

      setStats((prev) => ({
        ...prev,
        totalSales: sales,
        totalViews: views,
        activeProducts: active,
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  const normalizeOrderStatus = (status: string | null | undefined) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'completed') return 'completed';
    if (normalized === 'paid') return 'paid';
    if (normalized === 'pending_payment' || normalized === 'pending') return 'pending_payment';
    return normalized || 'unknown';
  };

  const getOrderStatusLabel = (status: string | null | undefined) => {
    const normalized = normalizeOrderStatus(status);
    if (normalized === 'completed') return 'مكتمل';
    if (normalized === 'paid') return 'مدفوع';
    if (normalized === 'pending_payment') return 'قيد الانتظار';
    if (normalized === 'failed') return 'فشل الدفع';
    if (normalized === 'canceled') return 'ملغي';
    return status || 'غير معروف';
  };

  const getOrderStatusClass = (status: string | null | undefined) => {
    const normalized = normalizeOrderStatus(status);
    if (normalized === 'completed') return 'bg-blue-100 text-blue-700';
    if (normalized === 'paid') return 'bg-green-100 text-green-700';
    if (normalized === 'pending_payment') return 'bg-yellow-100 text-yellow-700';
    if (normalized === 'failed' || normalized === 'canceled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const fetchOrdersData = async () => {
    if (!profile) return;

    try {
      setOrdersLoading(true);
      setOrdersError('');

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .or(`seller_id.eq.${profile.id},merchant_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      const orderRows = safeArray(ordersData) as any[];
      const orderIds = orderRows.map((row) => row?.id).filter(Boolean);
      const customerIds = Array.from(
        new Set(
          orderRows
            .map((row) => row?.customer_id || row?.user_id)
            .filter(Boolean)
        )
      ) as string[];

      let orderItemsRows: any[] = [];
      if (orderIds.length > 0) {
        const { data: orderItemsData, error: orderItemsErr } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (orderItemsErr) throw orderItemsErr;
        orderItemsRows = safeArray(orderItemsData) as any[];
      }

      const productIds = Array.from(
        new Set(orderItemsRows.map((row) => row?.product_id).filter(Boolean))
      ) as string[];
      const productMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: productRows, error: productsErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsErr) {
          console.error('orders products fetch error:', productsErr);
        } else {
          for (const row of safeArray(productRows) as any[]) {
            if (row?.id) productMap[row.id] = row;
          }
        }
      }

      const customerMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: customerRows, error: customersErr } = await supabase
          .from('users_profile')
          .select('*')
          .in('id', customerIds);

        if (customersErr) {
          console.error('orders customers fetch error:', customersErr);
        } else {
          for (const row of safeArray(customerRows) as any[]) {
            if (row?.id) customerMap[row.id] = row;
          }
        }
      }

      const itemsByOrder: Record<string, SellerOrderUI['items']> = {};
      for (const row of orderItemsRows) {
        const orderId = row?.order_id;
        if (!orderId) continue;

        const product = row?.product_id ? productMap[row.product_id] : null;
        const quantity = Number(row?.quantity || 1) || 1;
        const itemAmount = Number(row?.subtotal ?? row?.seller_amount ?? row?.price_at_time ?? product?.price ?? 0) || 0;
        const productName = row?.product_name || row?.product_title || product?.title || product?.name || 'منتج';

        if (!itemsByOrder[orderId]) itemsByOrder[orderId] = [];
        itemsByOrder[orderId].push({
          id: row?.id || `${orderId}-${row?.product_id || Math.random()}`,
          product_id: row?.product_id || null,
          product_name: productName,
          quantity,
          amount: itemAmount,
        });
      }

      const normalizedOrders: SellerOrderUI[] = orderRows.map((row) => {
        const customerId = row?.customer_id || row?.user_id || null;
        const customer = customerId ? customerMap[customerId] : null;
        return {
          ...(row as SellerOrderRow),
          customer_name: customer?.name || row?.customer_name || 'العميل',
          customer_phone: customer?.phone || row?.phone || '—',
          items: itemsByOrder[row.id] || [],
        };
      });

      setSellerOrders(normalizedOrders);
    } catch (error: any) {
      console.error('Error fetching seller orders:', error);
      setOrdersError(error?.message || 'حدث خطأ أثناء تحميل الطلبات');
    } finally {
      setOrdersLoading(false);
    }
  };

  const openOrderDetails = (order: SellerOrderUI) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
  };



  const fetchIdentityVerification = async () => {
    if (!profile) return;

    try {
      setVerificationLoading(true);
      setVerificationError('');

      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('identity_verifications fetch error:', error);
        setVerificationError('حدث خطأ أثناء تحميل بيانات التوثيق');
        return;
      }

      const row = (data as IdentityVerificationRow | null) ?? null;
      setIdentityVerification(row);

      if (row) {
        setVerificationForm({
          full_name: row.full_name ?? profile.name ?? '',
          identity_type: row.identity_type ?? 'national_id',
          identity_number: row.identity_number ?? '',
          date_of_birth: row.date_of_birth ?? '',
        });
      } else {
        setVerificationForm({
          full_name: profile.name ?? '',
          identity_type: 'national_id',
          identity_number: '',
          date_of_birth: '',
        });
      }
    } catch (error) {
      console.error('Error fetching identity verification:', error);
      setVerificationError('حدث خطأ أثناء تحميل بيانات التوثيق');
    } finally {
      setVerificationLoading(false);
    }
  };

  const fetchBankAccountData = async () => {
    if (!profile) return;

    try {
      setBankAccountLoading(true);
      setBankAccountError('');

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('bank_accounts fetch error:', error);
        setBankAccountError('حدث خطأ أثناء تحميل بيانات الحساب البنكي');
        return;
      }

      const row = (data as BankAccountRow | null) ?? null;
      setBankAccountData(row);

      if (row) {
        setBankAccountForm({
          bank_name: row.bank_name ?? '',
          account_holder_name: row.account_holder_name ?? '',
          iban: formatIbanForInput(row.iban),
        });
      } else {
        setBankAccountForm({
          bank_name: '',
          account_holder_name: profile.name ?? '',
          iban: '',
        });
      }
    } catch (error) {
      console.error('Error fetching bank account:', error);
      setBankAccountError('حدث خطأ أثناء تحميل بيانات الحساب البنكي');
    } finally {
      setBankAccountLoading(false);
    }
  };

  const fetchEarningsData = async () => {
    if (!profile) return;

    try {
      setWalletLoading(true);
      setWithdrawalError('');

      const [walletRes, ledgerRes, requestsRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('merchant_id', profile.id).maybeSingle(),
        supabase
          .from('wallet_ledger')
          .select('*')
          .eq('merchant_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('merchant_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      if (walletRes.error) {
        console.error('wallet fetch error:', walletRes.error);
      }

      if (ledgerRes.error) {
        console.error('wallet_ledger fetch error:', ledgerRes.error);
      }

      if (requestsRes.error) {
        console.error('withdrawal_requests fetch error:', requestsRes.error);
      }

      const ledgerRows = (safeArray(ledgerRes.data) as any[]) ?? [];
      const orderIds = Array.from(
        new Set(
          ledgerRows
            .map((row) => row?.order_id)
            .filter(Boolean)
        )
      ) as string[];

      const nextMeta: Record<string, EarningsOrderMeta> = {};

      if (orderIds.length > 0) {
        const { data: commissionsData, error: commissionsError } = await supabase
          .from('affiliate_commissions')
          .select('order_id, marketer_id, commission_amount')
          .in('order_id', orderIds);

        if (commissionsError) {
          console.error('affiliate_commissions fetch error:', commissionsError);
        } else {
          const commissions = safeArray(commissionsData) as Array<{
            order_id: string;
            marketer_id: string | null;
            commission_amount: number | null;
          }>;

          const marketerIds = Array.from(
            new Set(
              commissions
                .map((row) => row.marketer_id)
                .filter(Boolean)
            )
          ) as string[];

          const marketerUserMap: Record<string, string> = {};
          if (marketerIds.length > 0) {
            const { data: marketersData, error: marketersError } = await supabase
              .from('affiliate_marketers')
              .select('id, user_id')
              .in('id', marketerIds);

            if (marketersError) {
              console.error('affiliate_marketers fetch error:', marketersError);
            } else {
              for (const row of safeArray(marketersData) as any[]) {
                if (row?.id && row?.user_id) {
                  marketerUserMap[row.id] = row.user_id;
                }
              }
            }
          }

          const marketerUserIds = Array.from(new Set(Object.values(marketerUserMap).filter(Boolean)));
          const marketerNameMap: Record<string, string> = {};

          if (marketerUserIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from('users_profile')
              .select('id, name')
              .in('id', marketerUserIds);

            if (usersError) {
              console.error('affiliate marketers users_profile fetch error:', usersError);
            } else {
              for (const row of safeArray(usersData) as any[]) {
                if (row?.id) {
                  marketerNameMap[row.id] = row.name || 'مسوق';
                }
              }
            }
          }

          for (const row of commissions) {
            if (!row?.order_id) continue;

            const marketerUserId = row.marketer_id ? marketerUserMap[row.marketer_id] : undefined;
            const marketerName = marketerUserId ? marketerNameMap[marketerUserId] : undefined;

            nextMeta[row.order_id] = {
              ...nextMeta[row.order_id],
              affiliateLabel: marketerName || 'المسوق',
              affiliateAmount: Number(row.commission_amount || 0),
            };
          }
        }
      }

      const wallet = (walletRes.data as WalletRow | null) ?? null;
      const totalRevenueFromWallet =
        Number(wallet?.balance_available || 0) + Number(wallet?.balance_pending || 0);

      setWalletData(wallet);
      setWalletLedger(ledgerRows);
      setWithdrawalRequests((safeArray(requestsRes.data) as any[]) ?? []);
      setEarningsOrderMeta(nextMeta);
      setStats((prev) => ({
        ...prev,
        totalRevenue: totalRevenueFromWallet,
      }));
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const uploadIdentityFile = async (file: File, side: 'front' | 'back') => {
    if (!profile) throw new Error('المستخدم غير مسجل الدخول');

    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const safeExt = fileExt || 'jpg';
    const filePath = `${profile.id}/${side}-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from('identity-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setVerificationError('يجب تسجيل الدخول أولاً');
      return;
    }

    if (identityVerification?.status === 'pending') {
      setVerificationError('طلب التوثيق الحالي قيد المراجعة بالفعل ولا يمكن تعديله الآن');
      return;
    }

    if (identityVerification?.status === 'approved') {
      setVerificationError('تمت الموافقة على التوثيق مسبقاً ولا يمكن تعديل الطلب حالياً');
      return;
    }

    setVerificationError('');
    setVerificationSuccess('');

    const normalizedFullName = verificationForm.full_name.trim();
    const normalizedIdentityNumber = verificationForm.identity_number.trim();

    if (!normalizedFullName) {
      setVerificationError('يرجى إدخال الاسم الكامل');
      return;
    }

    if (normalizedFullName.length < 3) {
      setVerificationError('الاسم الكامل قصير جداً، يرجى إدخال الاسم بشكل صحيح');
      return;
    }

    if (!normalizedIdentityNumber) {
      setVerificationError('يرجى إدخال رقم الهوية');
      return;
    }

    if (!verificationForm.date_of_birth) {
      setVerificationError('يرجى إدخال تاريخ الميلاد');
      return;
    }

    const existingFront = identityVerification?.document_front_url ?? null;
    const existingBack = identityVerification?.document_back_url ?? null;

    if (!frontFile && !existingFront) {
      setVerificationError('يرجى رفع صورة الواجهة الأمامية للهوية');
      return;
    }

    if (!backFile && !existingBack) {
      setVerificationError('يرجى رفع صورة الواجهة الخلفية للهوية');
      return;
    }

    try {
      setVerificationSubmitting(true);

      let frontUrl = existingFront;
      let backUrl = existingBack;

      if (frontFile) {
        frontUrl = await uploadIdentityFile(frontFile, 'front');
      }

      if (backFile) {
        backUrl = await uploadIdentityFile(backFile, 'back');
      }

      const payload = {
        user_id: profile.id,
        full_name: normalizedFullName,
        identity_type: verificationForm.identity_type,
        identity_number: normalizedIdentityNumber,
        date_of_birth: verificationForm.date_of_birth,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        status: 'pending',
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('identity_verifications')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        console.error('identity_verifications upsert error:', error);
        throw error;
      }

      setFrontFile(null);
      setBackFile(null);
      setVerificationSuccess('تم إرسال طلب التوثيق بنجاح');
      await fetchIdentityVerification();
    } catch (error: any) {
      console.error('Identity verification submit error:', error);
      setVerificationError(error?.message || 'حدث خطأ أثناء إرسال طلب التوثيق');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setBankAccountError('يجب تسجيل الدخول أولاً');
      return;
    }

    setBankAccountError('');
    setBankAccountSuccess('');

    const normalizedBankName = bankAccountForm.bank_name.trim();
    const normalizedHolderName = bankAccountForm.account_holder_name.trim();
    const normalizedIban = bankAccountForm.iban.replace(/\s+/g, '').toUpperCase();

    if (!normalizedBankName) {
      setBankAccountError('يرجى إدخال اسم البنك');
      return;
    }

    if (!normalizedHolderName) {
      setBankAccountError('يرجى إدخال اسم صاحب الحساب');
      return;
    }

    if (!normalizedIban) {
      setBankAccountError('يرجى إدخال الآيبان');
      return;
    }

    if (!normalizedIban.startsWith('SA')) {
      setBankAccountError('الآيبان السعودي يجب أن يبدأ بـ SA');
      return;
    }

    if (normalizedIban.length !== 24) {
      setBankAccountError('الآيبان السعودي يجب أن يتكون من 24 خانة');
      return;
    }

    try {
      setBankAccountSubmitting(true);

      const { error } = await supabase.rpc('upsert_bank_account', {
        p_bank_name: normalizedBankName,
        p_account_holder_name: normalizedHolderName,
        p_iban: normalizedIban,
      });

      if (error) {
        console.error('upsert_bank_account rpc error:', error);
        throw error;
      }

      setBankAccountSuccess(
        bankAccountData
          ? 'تم تحديث الحساب البنكي بنجاح، وتمت إعادته إلى حالة المراجعة.'
          : 'تم حفظ الحساب البنكي بنجاح وإرساله للمراجعة.'
      );

      await fetchBankAccountData();
    } catch (error: any) {
      console.error('Bank account submit error:', error);
      setBankAccountError(error?.message || 'حدث خطأ أثناء حفظ الحساب البنكي');
    } finally {
      setBankAccountSubmitting(false);
    }
  };

  const formatPeriodLabel = (periodType: string | null | undefined) => {
    if (periodType === 'daily') return 'يومي';
    if (periodType === 'weekly') return 'أسبوعي';
    if (periodType === 'monthly') return 'شهري';
    if (periodType === 'yearly') return 'سنوي';
    return 'الدورة الحالية';
  };

  const formatPeriodRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start || !end) return '—';
    try {
      const startText = new Date(start).toLocaleDateString('ar-SA');
      const endText = new Date(end).toLocaleDateString('ar-SA');
      return `${startText} - ${endText}`;
    } catch {
      return '—';
    }
  };

  const fetchWithdrawalLimitData = async () => {
    if (!profile?.id) return;

    try {
      setWithdrawalLimitLoading(true);

      const [
        statusResponse,
        settingsResponse,
        usedRequestsResponse,
      ] = await Promise.all([
        supabase.rpc('get_my_withdrawal_limit_status'),
        supabase.rpc('get_withdrawal_limit_settings'),
        supabase.rpc('get_user_withdrawal_requests_count_current_period', {
          p_user_id: profile.id,
        }),
      ]);

      const { data: statusData, error: statusError } = statusResponse;
      const { data: settingsData, error: settingsError } = settingsResponse;
      const { data: usedRequestsData, error: usedRequestsError } = usedRequestsResponse;

      if (statusError) {
        console.error('get_my_withdrawal_limit_status rpc error:', statusError);
      }

      if (settingsError) {
        console.error('get_withdrawal_limit_settings rpc error:', settingsError);
      }

      if (usedRequestsError) {
        console.error(
          'get_user_withdrawal_requests_count_current_period rpc error:',
          usedRequestsError
        );
      }

      const normalizedSettings = Array.isArray(settingsData)
        ? settingsData[0]
        : settingsData;

      const normalizedStatusRaw = Array.isArray(statusData)
        ? statusData[0]
        : statusData;

      const safeSettings: WithdrawalLimitSettingsRow | null = normalizedSettings
        ? {
            is_enabled: Boolean(normalizedSettings.is_enabled),
            max_requests: Number(normalizedSettings.max_requests || 0),
            period_type: normalizedSettings.period_type || 'monthly',
            min_withdrawal_amount: Number(
              normalizedSettings.min_withdrawal_amount || FALLBACK_MIN_WITHDRAWAL_AMOUNT
            ),
            period_start: normalizedSettings.period_start || null,
            period_end: normalizedSettings.period_end || null,
          }
        : null;

      setWithdrawalLimitSettings(safeSettings);

      const usedRequestsFromCountRpc = Number(usedRequestsData || 0);

      if (normalizedStatusRaw) {
        const safeStatus: WithdrawalLimitStatusRow = {
          is_enabled: Boolean(normalizedStatusRaw.is_enabled),
          max_requests: Number(
            normalizedStatusRaw.max_requests ??
              safeSettings?.max_requests ??
              0
          ),
          used_requests: usedRequestsFromCountRpc,
          remaining_requests: Math.max(
            Number(
              normalizedStatusRaw.max_requests ??
                safeSettings?.max_requests ??
                0
            ) - usedRequestsFromCountRpc,
            0
          ),
          period_type:
            normalizedStatusRaw.period_type ||
            safeSettings?.period_type ||
            'monthly',
          min_withdrawal_amount: Number(
            normalizedStatusRaw.min_withdrawal_amount ??
              safeSettings?.min_withdrawal_amount ??
              FALLBACK_MIN_WITHDRAWAL_AMOUNT
          ),
          period_start: normalizedStatusRaw.period_start || null,
          period_end: normalizedStatusRaw.period_end || null,
        };

        setWithdrawalLimitStatus(safeStatus);
      } else if (safeSettings) {
        setWithdrawalLimitStatus({
          ...safeSettings,
          used_requests: usedRequestsFromCountRpc,
          remaining_requests: Math.max(
            Number(safeSettings.max_requests || 0) - usedRequestsFromCountRpc,
            0
          ),
        });
      } else {
        setWithdrawalLimitStatus(null);
      }
    } catch (error) {
      console.error('Error fetching withdrawal limit data:', error);
      setWithdrawalLimitStatus(null);
      setWithdrawalLimitSettings(null);
    } finally {
      setWithdrawalLimitLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setWithdrawalError('يجب تسجيل الدخول أولاً');
      return;
    }

    setWithdrawalError('');
    setWithdrawalSuccess('');

    if (identityVerification?.status !== 'approved') {
      setWithdrawalError('يجب اعتماد توثيق الهوية قبل إرسال طلب سحب');
      return;
    }

    if (bankAccountData?.status !== 'approved') {
      setWithdrawalError('يجب اعتماد الحساب البنكي قبل إرسال طلب سحب');
      return;
    }

    if (!walletData) {
      setWithdrawalError('لا توجد محفظة مرتبطة بحسابك حالياً');
      return;
    }

    const amount = Number(withdrawalAmount);

    if (!withdrawalAmount.trim() || Number.isNaN(amount)) {
      setWithdrawalError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount <= 0) {
      setWithdrawalError('مبلغ السحب يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount < effectiveMinWithdrawalAmount) {
      setWithdrawalError(`الحد الأدنى لطلب السحب حالياً هو ${effectiveMinWithdrawalAmount} ريال`);
      return;
    }

    if (hasReachedWithdrawalLimit) {
      setWithdrawalError(
        `لقد وصلت إلى الحد الأقصى لطلبات السحب في ${formatPeriodLabel(withdrawalPeriodType)} الحالية`
      );
      return;
    }

    const available = Number(walletData.balance_available || 0);
    if (amount > available) {
      setWithdrawalError('المبلغ المطلوب أكبر من الرصيد المتاح');
      return;
    }

    try {
      setWithdrawalSubmitting(true);

      const { error } = await supabase.rpc('create_withdrawal_request', {
  p_amount: amount,
  p_notes: withdrawalNotes.trim() || null,
});

      if (error) {
        console.error('create_withdrawal_request rpc error:', error);
        throw error;
      }

      setWithdrawalAmount('');
      setWithdrawalNotes('');
      setWithdrawalSuccess('تم إرسال طلب السحب بنجاح، وسيظهر في سجل الطلبات خلال لحظات');
      await Promise.all([fetchEarningsData(), fetchWithdrawalLimitData()]);
    } catch (error: any) {
      console.error('Withdrawal submit error:', error);
      setWithdrawalError(error?.message || 'حدث خطأ أثناء إرسال طلب السحب');
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const openWithdrawalDetails = async (request: WithdrawalRequestRow) => {
    setSelectedWithdrawal(request);
    setShowWithdrawalDetails(true);
    setWithdrawalProofUrl(null);
    setWithdrawalProofError('');

    const candidates = buildProofPathCandidates(request);

    if (candidates.length === 0) {
      return;
    }

    try {
      setWithdrawalProofLoading(true);

      let signedUrl: string | null = null;

      for (const candidate of candidates) {
        const { data, error } = await supabase.storage
          .from(WITHDRAWAL_PROOFS_BUCKET)
          .createSignedUrl(candidate, 60 * 60);

        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl;
          break;
        }

        console.error('createSignedUrl withdrawal proof error for candidate:', candidate, error);
      }

      if (signedUrl) {
        setWithdrawalProofUrl(signedUrl);
        return;
      }

      if (request.transfer_proof_url && /^https?:\/\//i.test(request.transfer_proof_url)) {
        setWithdrawalProofUrl(request.transfer_proof_url);
      } else {
        setWithdrawalProofError('تعذر تحميل وثيقة الحوالة حالياً.');
      }
    } catch (error) {
      console.error('openWithdrawalDetails error:', error);

      if (request.transfer_proof_url && /^https?:\/\//i.test(request.transfer_proof_url)) {
        setWithdrawalProofUrl(request.transfer_proof_url);
      } else {
        setWithdrawalProofError('تعذر تحميل وثيقة الحوالة حالياً.');
      }
    } finally {
      setWithdrawalProofLoading(false);
    }
  };

  const closeWithdrawalDetails = () => {
    setSelectedWithdrawal(null);
    setShowWithdrawalDetails(false);
    setWithdrawalProofUrl(null);
    setWithdrawalProofLoading(false);
    setWithdrawalProofError('');
  };

  const verificationStatusMeta = useMemo(() => {
    const status = identityVerification?.status ?? 'not_submitted';

    if (status === 'approved') {
      return {
        label: 'موثق',
        className: 'bg-green-100 text-green-700',
        description: 'تمت مراجعة الهوية والموافقة عليها.',
      };
    }

    if (status === 'pending') {
      return {
        label: 'قيد المراجعة',
        className: 'bg-yellow-100 text-yellow-700',
        description: 'تم إرسال الطلب وهو الآن بانتظار المراجعة.',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
        description:
          identityVerification?.rejection_reason || 'تم رفض الطلب، يمكنك تعديل البيانات وإعادة الإرسال.',
      };
    }

    return {
      label: 'لم يتم التقديم بعد',
      className: 'bg-gray-100 text-gray-700',
      description: 'قم بإدخال بيانات الهوية ورفع المستندات ثم أرسل الطلب للمراجعة.',
    };
  }, [identityVerification]);

  const bankAccountStatusMeta = useMemo(() => {
    const status = bankAccountData?.status ?? 'not_submitted';

    if (status === 'approved') {
      return {
        label: 'معتمد',
        className: 'bg-green-100 text-green-700',
        description: 'تمت مراجعة الحساب البنكي واعتماده ويمكنك استخدامه في السحب.',
      };
    }

    if (status === 'pending') {
      return {
        label: 'قيد المراجعة',
        className: 'bg-yellow-100 text-yellow-700',
        description: 'تم إرسال الحساب البنكي وهو الآن بانتظار المراجعة من الإدارة.',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
        description:
          bankAccountData?.rejection_reason || 'تم رفض الحساب البنكي، يمكنك تعديل البيانات وإعادة الإرسال.',
      };
    }

    return {
      label: 'غير مضاف',
      className: 'bg-gray-100 text-gray-700',
      description: 'أضف حسابك البنكي الآن حتى تتمكن من طلب سحب الأرباح بعد المراجعة.',
    };
  }, [bankAccountData]);

  const withdrawalStatusMeta = (status: string | null | undefined) => {
    if (status === 'approved') {
      return {
        label: 'مقبول',
        className: 'bg-green-100 text-green-700',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
      };
    }

    return {
      label: 'قيد المراجعة',
      className: 'bg-yellow-100 text-yellow-700',
    };
  };

  const formatLedgerStatus = (status: string | null | undefined) => {
    if (status === 'pending') return 'معلق';
    if (status === 'completed') return 'مكتمل';
    if (status === 'approved') return 'معتمد';
    if (status === 'rejected') return 'مرفوض';
    return status || '—';
  };

  const buildLedgerDescription = (entry: WalletLedgerRow) => {
    const parts: string[] = [];

    if (entry.notes) {
      parts.push(entry.notes);
    }

    const meta = entry.order_id ? earningsOrderMeta[entry.order_id] : null;

    if (meta?.affiliateLabel) {
      const affiliateText = meta.affiliateAmount
        ? `هذه العملية تشمل عمولة تسويق مستحقة ${formatCurrency(meta.affiliateAmount)} لصالح ${meta.affiliateLabel}، لكن كامل مبلغ البيع بعد عمولة الموقع دخل إلى رصيد التاجر.`
        : `هذه العملية مرتبطة بتسويق بالعمولة لصالح ${meta.affiliateLabel}، وعمولة المسوق مسجلة داخل النظام كمستحقة فقط دون تحويل تلقائي.`;
      parts.push(affiliateText);
    }

    if (meta?.couponLabel) {
      const couponText = meta.couponAmount
        ? `تم تطبيق كوبون ${meta.couponLabel} بقيمة ${formatCurrency(meta.couponAmount)} على هذا الطلب.`
        : `تم تطبيق كوبون ${meta.couponLabel} على هذا الطلب.`;
      parts.push(couponText);
    }

    if (entry.entry_type === 'sale_credit' && !meta?.affiliateLabel) {
      parts.push('تم إضافة صافي البيع بعد عمولة الموقع إلى محفظة التاجر، وأي عمولات تسويق أو كوبونات يتم تتبعها بشكل منفصل ولا تُحوّل تلقائيًا من المنصة.');
    }

    return parts.join(' ');
  };

  const ledgerEntryMeta = (entryType: string | null | undefined) => {
    if (entryType === 'sale_credit') {
      return {
        label: 'إيداع مبيعات',
        icon: ArrowDownLeft,
        iconClass: 'text-green-600',
        bgClass: 'bg-green-100',
      };
    }

    if (entryType === 'withdrawal_request') {
      return {
        label: 'طلب سحب',
        icon: ArrowUpLeft,
        iconClass: 'text-yellow-600',
        bgClass: 'bg-yellow-100',
      };
    }

    if (entryType === 'withdrawal_completed') {
      return {
        label: 'سحب مكتمل',
        icon: ArrowUpLeft,
        iconClass: 'text-blue-600',
        bgClass: 'bg-blue-100',
      };
    }

    if (entryType === 'withdrawal_rejected') {
      return {
        label: 'سحب مرفوض',
        icon: RefreshCw,
        iconClass: 'text-red-600',
        bgClass: 'bg-red-100',
      };
    }

    return {
      label: entryType || 'حركة',
      icon: Wallet,
      iconClass: 'text-gray-600',
      bgClass: 'bg-gray-100',
    };
  };

  const isVerificationPending = identityVerification?.status === 'pending';
  const isVerificationApproved = identityVerification?.status === 'approved';
  const isBankAccountApproved = bankAccountData?.status === 'approved';
  const canEditVerification = !isVerificationPending && !isVerificationApproved;

  const availableBalance = Number(walletData?.balance_available || 0);
  const pendingBalance = Number(walletData?.balance_pending || 0);
  const approvedWithdrawalsTotal = withdrawalRequests
    .filter((row) => row.status === 'approved')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingWithdrawalsCount = withdrawalRequests.filter((row) => row.status === 'pending').length;
  const latestWithdrawalRequests = withdrawalRequests.slice(0, 5);
  const latestLedgerEntries = walletLedger.slice(0, 8);

  const effectiveMinWithdrawalAmount = Number(
    withdrawalLimitStatus?.min_withdrawal_amount ??
      withdrawalLimitSettings?.min_withdrawal_amount ??
      FALLBACK_MIN_WITHDRAWAL_AMOUNT
  );

  const withdrawalLimitsEnabled = Boolean(
    withdrawalLimitStatus?.is_enabled ?? withdrawalLimitSettings?.is_enabled ?? false
  );

  const withdrawalRequestsUsed = Number(withdrawalLimitStatus?.used_requests || 0);
  const withdrawalRequestsRemaining = Math.max(Number(withdrawalLimitStatus?.remaining_requests || 0), 0);
  const withdrawalRequestsMax = Number(withdrawalLimitStatus?.max_requests || withdrawalLimitSettings?.max_requests || 0);
  const withdrawalPeriodType = withdrawalLimitStatus?.period_type || withdrawalLimitSettings?.period_type || 'monthly';
  const withdrawalPeriodStart = withdrawalLimitStatus?.period_start || withdrawalLimitSettings?.period_start || null;
  const withdrawalPeriodEnd = withdrawalLimitStatus?.period_end || withdrawalLimitSettings?.period_end || null;

  const hasReachedWithdrawalLimit =
    withdrawalLimitsEnabled &&
    withdrawalRequestsMax > 0 &&
    withdrawalRequestsRemaining <= 0;

  const canRequestWithdrawal =
    isVerificationApproved &&
    isBankAccountApproved &&
    !!walletData &&
    availableBalance >= effectiveMinWithdrawalAmount &&
    !hasReachedWithdrawalLimit &&
    !withdrawalSubmitting;

  const filteredSellerOrders = sellerOrders.filter((order) => {
    if (ordersFilter === 'all') return true;
    return normalizeOrderStatus(order.status) === ordersFilter;
  });

  const ordersStats = {
    total: sellerOrders.length,
    paid: sellerOrders.filter((order) => normalizeOrderStatus(order.status) === 'paid').length,
    pending: sellerOrders.filter((order) => normalizeOrderStatus(order.status) === 'pending_payment').length,
    revenue: sellerOrders
      .filter((order) => ['paid', 'completed'].includes(normalizeOrderStatus(order.status)))
      .reduce((sum, order) => sum + Number(order.total_amount || order.seller_amount || 0), 0),
  };

  const filteredProducts = useMemo(() => {
    const query = productsSearchQuery.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesSearch =
        query === '' ||
        String(product.name || '').toLowerCase().includes(query) ||
        String((product as any).title || '').toLowerCase().includes(query) ||
        String((product as any).description || '').toLowerCase().includes(query) ||
        String((product as any).slug || '').toLowerCase().includes(query);

      const matchesStatus =
        productsStatusFilter === 'all' ||
        (productsStatusFilter === 'active' && Boolean(product.is_active)) ||
        (productsStatusFilter === 'inactive' && !Boolean(product.is_active));

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      switch (productsSortBy) {
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
        case 'price_high':
          return Number(b.price || 0) - Number(a.price || 0);
        case 'price_low':
          return Number(a.price || 0) - Number(b.price || 0);
        case 'views':
          return Number(b.views_count || 0) - Number(a.views_count || 0);
        case 'sales':
          return Number(b.sales_count || 0) - Number(a.sales_count || 0);
        case 'newest':
        default:
          return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
      }
    });
  }, [products, productsSearchQuery, productsStatusFilter, productsSortBy]);

  const filteredStores = useMemo(() => {
    try {
      const query = storesSearchQuery.trim().toLowerCase();
      const storesList = safeArray(stores) as StoreImageRecord[];

      const result = storesList.filter((store) => {
        const storeName = String(store?.name || '').toLowerCase();
        const storeSlug = String((store as any)?.slug || '').toLowerCase();
        const storeDescription = String((store as any)?.description || '').toLowerCase();

        const matchesSearch =
          query === '' ||
          storeName.includes(query) ||
          storeSlug.includes(query) ||
          storeDescription.includes(query);

        const matchesStatus =
          storesStatusFilter === 'all' ||
          (storesStatusFilter === 'active' && Boolean(store?.is_active)) ||
          (storesStatusFilter === 'inactive' && !Boolean(store?.is_active));

        return matchesSearch && matchesStatus;
      });

      return [...result].sort((a, b) => {
        switch (storesSortBy) {
          case 'name':
            return String(a?.name || '').localeCompare(String(b?.name || ''), 'ar');
          case 'newest':
          default:
            return (
              new Date((b as any)?.created_at || 0).getTime() -
              new Date((a as any)?.created_at || 0).getTime()
            );
        }
      });
    } catch (error) {
      console.error('Error while filtering stores:', error);
      return [] as StoreImageRecord[];
    }
  }, [stores, storesSearchQuery, storesStatusFilter, storesSortBy]);

  const editingStore = useMemo(() => {
    if (!editingStoreId) return null;
    return (stores.find((store) => store.id === editingStoreId) as StoreImageRecord | undefined) || null;
  }, [stores, editingStoreId]);

  const editingStoreImageUrl = editingStore ? getStoreImageUrl(editingStore) : '';
  const isEditingStoreImageBusy = editingStore ? storeImageUploadingId === editingStore.id : false;

  useEffect(() => {
    if (!editingStoreId) {
      setStoreImageMenuOpenId(null);
      return;
    }

    setStoreImageMenuOpenId(null);
  }, [editingStoreId]);


  useEffect(() => {
    const isStoreModalOpen = Boolean(editingStoreId) || showCreateStoreModal;
    if (!isStoreModalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [editingStoreId, showCreateStoreModal]);

  useEffect(() => {
    const isStoreModalOpen = Boolean(editingStoreId) || showCreateStoreModal;
    if (!isStoreModalOpen) return;

    const hiddenLabels = [
      'عرض هذا المتجر في السوق العام',
      'المنتجات المرتبطة بالمتجر',
      'اختر المنتجات التي تريد ربطها بهذا المتجر',
      'لا توجد منتجات لديك حالياً',
      'يمكنك تعديل صورة المتجر من داخل نافذة تعديل المتجر',
    ];

    const hideStoreModalExtras = () => {
      const elements = Array.from(document.querySelectorAll('label, p, span, div, h1, h2, h3, h4, h5, h6')) as HTMLElement[];

      elements.forEach((element) => {
        const content = (element.textContent || '').replace(/\s+/g, ' ').trim();
        if (!content) return;
        if (!hiddenLabels.some((label) => content.includes(label))) return;

        let target: HTMLElement | null = element;
        for (let i = 0; i < 5 && target?.parentElement; i += 1) {
          const parent = target.parentElement as HTMLElement;
          const parentText = (parent.textContent || '').replace(/\s+/g, ' ').trim();
          if (parentText.includes(content)) target = parent;
        }

        if (target) target.style.display = 'none';
      });
    };

    const initial = window.setTimeout(hideStoreModalExtras, 50);
    const observer = new MutationObserver(() => hideStoreModalExtras());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(initial);
      observer.disconnect();
    };
  }, [editingStoreId, showCreateStoreModal]);

  useEffect(() => {
    if (!storeImageMenuOpenId) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-store-image-menu]') || target?.closest('[data-store-image-trigger]')) {
        return;
      }
      setStoreImageMenuOpenId(null);
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [storeImageMenuOpenId]);


  const filteredOrdersResults = useMemo(() => {
    const query = ordersSearchQuery.trim().toLowerCase();

    const result = filteredSellerOrders.filter((order) => {
      const itemsText = order.items.map((item) => item.product_name).join(' ').toLowerCase();
      const matchesSearch =
        query === '' ||
        String(order.order_number || order.id || '').toLowerCase().includes(query) ||
        String(order.customer_name || '').toLowerCase().includes(query) ||
        String(order.customer_phone || '').toLowerCase().includes(query) ||
        itemsText.includes(query);

      return matchesSearch;
    });

    return [...result].sort((a, b) => {
      switch (ordersSortBy) {
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'highest':
          return Number(b.total_amount || 0) - Number(a.total_amount || 0);
        case 'lowest':
          return Number(a.total_amount || 0) - Number(b.total_amount || 0);
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });
  }, [filteredSellerOrders, ordersSearchQuery, ordersSortBy]);

  const totalProductsCount = products.length;
  const averageViewsPerProduct = totalProductsCount > 0 ? stats.totalViews / totalProductsCount : 0;
  const averageRevenuePerSale = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
  const totalAffiliateLinks = affiliateLinks.length;
  const soldProductsCount = products.filter((product) => Number(product.sales_count || 0) > 0).length;
  const topProducts = [...products]
    .sort((a, b) => {
      const salesDiff = Number(b.sales_count || 0) - Number(a.sales_count || 0);
      if (salesDiff !== 0) return salesDiff;
      return Number(b.views_count || 0) - Number(a.views_count || 0);
    })
    .slice(0, 5);
  const latestOverviewLedgerEntries = latestLedgerEntries.slice(0, 4);

  const openProduct = (product: NormalizedProduct) => {
    onNavigate(`product-slug-${product.slug || product.id}`);
  };

  const openStorefront = (store: Store) => {
    if (store.slug) {
      try {
        sessionStorage.setItem('active_store_slug', store.slug);
        sessionStorage.setItem('store_mode_source', 'storefront');
      } catch (error) {
        console.error('Error setting store context:', error);
      }

      onNavigate(`storefront-${store.slug}`);
      return;
    }

    onNavigate(`store-detail-${store.id}`);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم التاجر</h1>
          <p className="text-gray-600">مرحباً {profile?.name}، إدارة متاجرك ومنتجاتك</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>

            <button
              onClick={() => setActiveTab('stores')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stores' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span>المتاجر</span>
            </button>

            <button
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'marketing' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>التسويق</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>الطلبات</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'earnings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>الأرباح</span>
            </button>

            <button
              onClick={() => setActiveTab('bankAccount')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'bankAccount' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span>الحساب البنكي</span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'verification' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>توثيق الهوية</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>الإعدادات</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stats.totalRevenue.toFixed(2)} ريال
                </div>
                <p className="text-sm text-gray-600">إجمالي الأرباح</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSales}</div>
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalViews}</div>
                <p className="text-sm text-gray-600">إجمالي المشاهدات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.activeProducts}</div>
                <p className="text-sm text-gray-600">المنتجات النشطة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">ملخص الأداء السريع</h2>
                      <p className="text-sm text-gray-600">نظرة مختصرة على أهم المؤشرات التي تساعدك على متابعة نشاط متجرك بسرعة.</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-700">متوسط الربح لكل عملية</span>
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(averageRevenuePerSale)}</div>
                      <p className="text-xs text-gray-600 mt-2">محسوب من إجمالي الأرباح ÷ عدد المبيعات.</p>
                    </div>

                    <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-purple-700">متوسط المشاهدات</span>
                        <Eye className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{averageViewsPerProduct.toFixed(1)}</div>
                      <p className="text-xs text-gray-600 mt-2">متوسط المشاهدات لكل منتج نشط داخل متجرك.</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-emerald-700">الروابط التسويقية</span>
                        <Share2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{totalAffiliateLinks}</div>
                      <p className="text-xs text-gray-600 mt-2">عدد الروابط التابعة لمنتجاتك والمسوقين لديك.</p>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-orange-700">منتجات حققت مبيعات</span>
                        <Package className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{soldProductsCount}</div>
                      <p className="text-xs text-gray-600 mt-2">عدد المنتجات التي سجلت عملية بيع واحدة على الأقل.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-green-100 p-4 bg-green-50/60">
                      <div className="flex items-center gap-2 mb-2 text-green-700 font-semibold text-sm">
                        <Wallet className="w-4 h-4" />
                        <span>الرصيد المتاح</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(availableBalance)}</div>
                      <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              stats.totalRevenue > 0 ? (availableBalance / stats.totalRevenue) * 100 : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-yellow-100 p-4 bg-yellow-50/60">
                      <div className="flex items-center gap-2 mb-2 text-yellow-700 font-semibold text-sm">
                        <Clock3 className="w-4 h-4" />
                        <span>الرصيد المعلق</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(pendingBalance)}</div>
                      <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              stats.totalRevenue > 0 ? (pendingBalance / stats.totalRevenue) * 100 : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 p-4 bg-blue-50/60">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold text-sm">
                        <ArrowUpLeft className="w-4 h-4" />
                        <span>إجمالي السحوبات المعتمدة</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(approvedWithdrawalsTotal)}</div>
                      <p className="text-xs text-gray-600">طلبات سحب مكتملة الاعتماد من الإدارة حتى الآن.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">أفضل المنتجات أداءً</h2>
                      <p className="text-sm text-gray-600">ترتيب سريع لأكثر المنتجات نشاطاً بحسب المبيعات ثم المشاهدات.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      عرض كل المنتجات
                    </button>
                  </div>

                  {topProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                      لا توجد منتجات كافية لعرض لوحة الأداء بعد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-right text-gray-500 border-b border-gray-100">
                            <th className="pb-3 font-medium">المنتج</th>
                            <th className="pb-3 font-medium">الحالة</th>
                            <th className="pb-3 font-medium">المشاهدات</th>
                            <th className="pb-3 font-medium">المبيعات</th>
                            <th className="pb-3 font-medium">السعر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.map((product) => (
                            <tr key={product.id} className="border-b border-gray-50 last:border-b-0">
                              <td className="py-4">
                                <button
                                  onClick={() => openProduct(product)}
                                  className="text-right hover:text-blue-600 transition-colors"
                                >
                                  <div className="font-semibold text-gray-900">{product.name || 'منتج بدون اسم'}</div>
                                  <div className="text-xs text-gray-500 mt-1">{product.slug || product.id}</div>
                                </button>
                              </td>
                              <td className="py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {product.is_active ? 'نشط' : 'غير نشط'}
                                </span>
                              </td>
                              <td className="py-4 font-medium text-gray-700">{Number(product.views_count || 0)}</td>
                              <td className="py-4 font-medium text-gray-700">{Number(product.sales_count || 0)}</td>
                              <td className="py-4 font-semibold text-gray-900">{formatCurrency(Number(product.price || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">ابدأ البيع الآن!</h2>
                  <p className="text-blue-100 mb-6">
                    {stores.length === 0 ? 'أنشئ متجرك الأول وابدأ بإضافة المنتجات' : 'أضف منتجات جديدة لزيادة مبيعاتك'}
                  </p>

                  <div className="flex flex-wrap gap-4 mb-6">
                    {storeImageError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {storeImageError}
              </div>
            )}

            {storeImageSuccess && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {storeImageSuccess}
              </div>
            )}

            {stores.length === 0 ? (
                      <button
                        onClick={() => setShowCreateStoreModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>إنشاء متجر</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowCreateProductModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>إضافة منتج</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <div className="text-xs text-blue-100 mb-1">عدد المتاجر</div>
                      <div className="text-xl font-bold">{stores.length}</div>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <div className="text-xs text-blue-100 mb-1">طلبات السحب المعلقة</div>
                      <div className="text-xl font-bold">{pendingWithdrawalsCount}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">آخر الحركات المالية</h2>
                      <p className="text-sm text-gray-600">آخر التحديثات القادمة من المحفظة وسجل الأرباح والسحب.</p>
                    </div>
                    <Wallet className="w-6 h-6 text-gray-400" />
                  </div>

                  {latestOverviewLedgerEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                      لا توجد حركات مالية حديثة حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {latestOverviewLedgerEntries.map((entry) => {
                        const meta = ledgerEntryMeta(entry.entry_type);
                        const EntryIcon = meta.icon;
                        return (
                          <div key={entry.id} className="rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.bgClass}`}>
                                  <EntryIcon className={`w-5 h-5 ${meta.iconClass}`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900">{meta.label}</div>
                                  <div className="text-xs text-gray-500 mt-1">{formatDate(entry.created_at)}</div>
                                </div>
                              </div>
                              <div className="text-left shrink-0">
                                <div className="text-lg font-bold text-gray-900">{formatCurrency(entry.amount)}</div>
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-2 ${
                                    entry.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : entry.status === 'completed' || entry.status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : entry.status === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {formatLedgerStatus(entry.status)}
                                </span>
                              </div>
                            </div>

                            {buildLedgerDescription(entry) && (
                              <p className="text-sm text-gray-600 leading-7">{buildLedgerDescription(entry)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">منتجاتي</h2>
              <button
                onClick={() => setShowCreateProductModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة منتج</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
                <p className="text-gray-600 mb-6">ابدأ بإضافة منتجك الأول</p>
                <button
                  onClick={() => setShowCreateProductModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إضافة منتج
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-4" />
                      <input
                        type="text"
                        value={productsSearchQuery}
                        onChange={(e) => setProductsSearchQuery(e.target.value)}
                        placeholder="ابحث عن منتج..."
                        className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <select
                      value={productsStatusFilter}
                      onChange={(e) => setProductsStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="all">كل الحالات</option>
                      <option value="active">النشطة فقط</option>
                      <option value="inactive">غير النشطة فقط</option>
                    </select>

                    <select
                      value={productsSortBy}
                      onChange={(e) => setProductsSortBy(e.target.value as 'newest' | 'name' | 'price_high' | 'price_low' | 'views' | 'sales')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="newest">الأحدث</option>
                      <option value="name">الاسم</option>
                      <option value="price_high">السعر: من الأعلى للأقل</option>
                      <option value="price_low">السعر: من الأقل للأعلى</option>
                      <option value="views">الأكثر مشاهدة</option>
                      <option value="sales">الأكثر مبيعاً</option>
                    </select>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد نتائج</h3>
                    <p className="text-gray-600">جرّب تغيير كلمات البحث أو الفلاتر</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div
                          className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center cursor-pointer"
                          onClick={() => openProduct(product)}
                          role="button"
                          tabIndex={0}
                        >
                          {product.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-12 h-12 text-blue-600" />
                          )}
                        </div>

                        <div className="p-6">
                          <h3
                            className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 cursor-pointer hover:text-blue-600"
                            onClick={() => openProduct(product)}
                          >
                            {product.name || 'بدون اسم'}
                          </h3>

                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>{product.sales_count || 0} مبيعات</span>
                            <span>{product.views_count || 0} مشاهدة</span>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xl font-bold text-blue-600">
                              {product.price} {product.currency}
                            </span>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {product.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>

                          <button
                            onClick={() => setEditingProductId(product.id)}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                          >
                            تعديل المنتج
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'stores' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">متاجري</h2>
              <button
                onClick={() => setShowCreateStoreModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إنشاء متجر</span>
              </button>
            </div>

            {stores.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد متاجر</h3>
                <p className="text-gray-600 mb-6">أنشئ متجرك الأول لبدء البيع</p>
                <button
                  onClick={() => setShowCreateStoreModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إنشاء متجر
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-4" />
                      <input
                        type="text"
                        value={storesSearchQuery}
                        onChange={(e) => setStoresSearchQuery(e.target.value)}
                        placeholder="ابحث عن متجر..."
                        className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <select
                      value={storesStatusFilter}
                      onChange={(e) => setStoresStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="all">كل الحالات</option>
                      <option value="active">النشطة فقط</option>
                      <option value="inactive">غير النشطة فقط</option>
                    </select>

                    <select
                      value={storesSortBy}
                      onChange={(e) => setStoresSortBy(e.target.value as 'newest' | 'name')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="newest">الأحدث</option>
                      <option value="name">الاسم</option>
                    </select>
                  </div>
                </div>

                {filteredStores.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد نتائج</h3>
                    <p className="text-gray-600">جرّب تغيير كلمات البحث أو الفلاتر</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredStores.map((store) => {
                      const normalizedStore = store as StoreImageRecord;
                      const storeImageUrl = getStoreImageUrl(normalizedStore);
                      const storeName = String(normalizedStore?.name || 'متجر');
                      const storeSlug = String((normalizedStore as any)?.slug || '');
                      const storeDescription = String((normalizedStore as any)?.description || '').trim();
                      const isStoreActive = Boolean(normalizedStore?.is_active);

                      return (
                        <div key={normalizedStore.id} className="bg-white rounded-xl shadow-sm p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                              {storeImageUrl ? (
                                <img
                                  src={storeImageUrl}
                                  alt={storeName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                  <StoreIcon className="w-10 h-10 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900">{storeName}</h3>
                                  <p className="text-sm text-gray-500" dir="ltr">
                                    {storeSlug ? `/s/${storeSlug}` : 'بدون رابط بعد'}
                                  </p>
                                </div>

                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    isStoreActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {isStoreActive ? 'نشط' : 'غير نشط'}
                                </span>
                              </div>

                              {storeDescription ? (
                                <p className="text-gray-600 mb-3 line-clamp-2">{storeDescription}</p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openStorefront(normalizedStore)}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                              دخول المتجر
                            </button>

                            <button
                              onClick={() => {
                                setStoreImageError('');
                                setStoreImageSuccess('');
                                setStoreImageMenuOpenId(null);
                                setEditingStoreId(normalizedStore.id);
                              }}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              تعديل
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'marketing' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">التسويق والعمولات</h2>
              <p className="text-gray-600">إدارة المسوقين والكوبونات وتتبع أداء الحملات التسويقية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">التسويق بالعمولة</h3>
                    <p className="text-blue-100">إدارة المسوقين والروابط</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">المسوقين النشطين</span>
                    <span className="text-2xl font-bold">{affiliateLinks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">إجمالي النقرات</span>
                    <span className="text-2xl font-bold">
                      {affiliateLinks.reduce((sum, link) => sum + (link.clicks_count || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">المبيعات من المسوقين</span>
                    <span className="text-2xl font-bold">
                      {affiliateLinks.reduce((sum, link) => sum + (link.sales_count || 0), 0)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('affiliate-management')}
                  className="w-full px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  <span>إدارة المسوقين والروابط</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">الكوبونات</h3>
                    <p className="text-purple-100">إدارة كوبونات الخصم</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-purple-100">قم بإنشاء وإدارة كوبونات الخصم لمنتجاتك ومتاجرك</p>
                  <ul className="space-y-2 text-sm text-purple-100">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>خصم بالنسبة المئوية أو المبلغ الثابت</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>تحديد عدد مرات الاستخدام</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>تفعيل وإيقاف الكوبونات</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onNavigate('coupons-management')}
                  className="w-full px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>إدارة الكوبونات</span>
                </button>
              </div>
            </div>

            {affiliateLinks.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">آخر الروابط التسويقية</h3>
                <div className="space-y-4">
                  {affiliateLinks.slice(0, 5).map((link) => {
                    const product = products.find((p) => p.id === link.product_id);
                    return (
                      <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <LinkIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{link.affiliate?.name || 'مسوق'}</p>
                            <p className="text-sm text-gray-600">
                              {product?.name || 'منتج'} - {link.code}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{link.clicks_count || 0} نقرة</p>
                          <p className="text-sm text-green-600">{link.sales_count || 0} مبيعات</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة الطلبات</h2>
                  <p className="text-gray-600">تتبع وإدارة جميع طلبات عملائك مباشرة من داخل لوحة التحكم.</p>
                </div>

                <button
                  onClick={fetchOrdersData}
                  disabled={ordersLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  <span>تحديث الطلبات</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{ordersStats.total}</div>
                  <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(ordersStats.revenue)}</div>
                  <p className="text-sm text-gray-600">إجمالي الطلبات المدفوعة</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                    <Clock3 className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{ordersStats.pending}</div>
                  <p className="text-sm text-gray-600">طلبات قيد الانتظار</p>
                </div>

              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-6">
                {[
                  { value: 'all', label: `الكل (${ordersStats.total})` },
                  { value: 'paid', label: `مدفوعة (${ordersStats.paid})` },
                  { value: 'pending_payment', label: `قيد الانتظار (${ordersStats.pending})` },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setOrdersFilter(filter.value as typeof ordersFilter)}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${
                      ordersFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-4" />
                  <input
                    type="text"
                    value={ordersSearchQuery}
                    onChange={(e) => setOrdersSearchQuery(e.target.value)}
                    placeholder="ابحث برقم الطلب أو اسم العميل أو رقم الهاتف أو المنتج..."
                    className="w-full pr-12 pl-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <select
                  value={ordersSortBy}
                  onChange={(e) => setOrdersSortBy(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="newest">الأحدث</option>
                  <option value="oldest">الأقدم</option>
                  <option value="highest">الأعلى قيمة</option>
                  <option value="lowest">الأقل قيمة</option>
                </select>
              </div>

              {ordersError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                  {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الطلبات...</p>
                </div>
              ) : filteredOrdersResults.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات حالياً</h3>
                  <p className="text-gray-600">عندما تصلك طلبات جديدة ستظهر هنا مباشرة داخل لوحة التحكم.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrdersResults.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">المبلغ الإجمالي</p>
                            <p className="text-3xl font-bold text-blue-600">{formatCurrency(order.total_amount || 0)}</p>
                            <p className="text-sm text-gray-500 mt-1">{order.items.length} منتج</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">التاريخ</p>
                            <p className="text-base font-medium text-gray-900">{formatDate(order.created_at)}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">الهاتف</p>
                            <p className="text-base font-medium text-gray-900">{order.customer_phone || '—'}</p>
                          </div>

                          <div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-3 ${getOrderStatusClass(order.status)}`}>
                              <span>{getOrderStatusLabel(order.status)}</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">طلب #{order.order_number || order.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-500 mt-1">العميل: {order.customer_name}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                          <button
                            onClick={() => openOrderDetails(order)}
                            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                          >
                            <Eye className="w-5 h-5" />
                            <span>عرض التفاصيل</span>
                          </button>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showOrderDetails && selectedOrder && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">تفاصيل الطلب</h3>
                      <p className="text-gray-500 mt-1">طلب #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}</p>
                    </div>
                    <button
                      onClick={closeOrderDetails}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm text-gray-500 mb-1">اسم العميل</p>
                        <p className="text-lg font-bold text-gray-900">{selectedOrder.customer_name}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm text-gray-500 mb-1">رقم الهاتف</p>
                        <p className="text-lg font-bold text-gray-900">{selectedOrder.customer_phone || '—'}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm text-gray-500 mb-1">الحالة</p>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getOrderStatusClass(selectedOrder.status)}`}>
                          {getOrderStatusLabel(selectedOrder.status)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm text-gray-500 mb-1">إجمالي المبلغ</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedOrder.total_amount || 0)}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-4">المنتجات داخل الطلب</h4>
                      <div className="space-y-3">
                        {selectedOrder.items.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
                            لا توجد عناصر ظاهرة لهذا الطلب.
                          </div>
                        ) : (
                          selectedOrder.items.map((item) => (
                            <div key={item.id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-gray-900">{item.product_name}</p>
                                <p className="text-sm text-gray-500 mt-1">الكمية: {item.quantity}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(item.amount)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">الأرباح والسحب</h2>
                  <p className="text-gray-600">
                    من هنا يمكنك متابعة رصيدك، مراجعة سجل المحفظة، وإرسال طلبات سحب الأرباح.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    await Promise.all([
                      fetchEarningsData(),
                      fetchBankAccountData(),
                      fetchIdentityVerification(),
                      fetchWithdrawalLimitData(),
                    ]);
                  }}
                  disabled={walletLoading || bankAccountLoading || verificationLoading || withdrawalLimitLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${
                      walletLoading || bankAccountLoading || verificationLoading || withdrawalLimitLoading ? 'animate-spin' : ''
                    }`}
                  />
                  <span>تحديث البيانات</span>
                </button>
              </div>

              {!isVerificationApproved && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    لا يمكن إرسال طلب سحب حالياً لأن توثيق الهوية غير معتمد بعد. أكمل التوثيق أولاً ثم انتظر الموافقة.
                  </div>
                </div>
              )}

              {isVerificationApproved && !isBankAccountApproved && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    لا يمكن إرسال طلب سحب حالياً لأن الحساب البنكي غير معتمد بعد. أضف الحساب البنكي أو انتظر مراجعته من الإدارة.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    متاح للسحب
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(availableBalance)}</div>
                <p className="text-sm text-gray-500">الرصيد المتاح حالياً</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock3 className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">
                    قيد التعليق
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(pendingBalance)}</div>
                <p className="text-sm text-gray-500">أرباح دخلت للتاجر وتصبح متاحة بعد انتهاء فترة التعليق</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ArrowUpLeft className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                    مسحوب
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(approvedWithdrawalsTotal)}</div>
                <p className="text-sm text-gray-500">إجمالي السحوبات المعتمدة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">طلب سحب جديد</h3>
                  <p className="text-gray-600 text-sm">
                    أرسل طلب سحب من رصيدك المتاح، وسيتم مراجعته من الإدارة قبل الاعتماد.
                  </p>
                </div>

                <div className="mt-5 mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock3 className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="text-sm font-bold text-gray-900">سياسة طلبات السحب</h4>

                        {withdrawalLimitsEnabled ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            مفعلة
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            غير مفعلة
                          </span>
                        )}

                        {hasReachedWithdrawalLimit && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            تم بلوغ الحد الأقصى
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-500 mb-1">الحد الأدنى</p>
                          <p className="text-base font-bold text-gray-900">{effectiveMinWithdrawalAmount} ريال</p>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-500 mb-1">عدد الطلبات المسموح</p>
                          <p className="text-base font-bold text-gray-900">
                            {withdrawalLimitsEnabled ? `${withdrawalRequestsMax} / ${formatPeriodLabel(withdrawalPeriodType)}` : 'غير محدود'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white border border-gray-100 p-3">
                          <p className="text-xs text-gray-500 mb-1">المتبقي لك الآن</p>
                          <p className={`text-base font-bold ${hasReachedWithdrawalLimit ? 'text-red-600' : 'text-gray-900'}`}>
                            {withdrawalLimitsEnabled ? withdrawalRequestsRemaining : '—'}
                          </p>
                        </div>
                      </div>

                      {withdrawalLimitsEnabled && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                          <span>المستخدم: <strong>{withdrawalRequestsUsed}</strong></span>
                          <span>المتبقي: <strong>{withdrawalRequestsRemaining}</strong></span>
                          <span>الدورة: <strong>{formatPeriodLabel(withdrawalPeriodType)}</strong></span>
                          <span>الفترة: <strong>{formatPeriodRange(withdrawalPeriodStart, withdrawalPeriodEnd)}</strong></span>
                        </div>
                      )}

                      {hasReachedWithdrawalLimit && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          وصلت إلى الحد الأقصى لطلبات السحب في هذه الفترة. يمكنك تقديم طلب جديد عند بداية الفترة التالية.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {withdrawalError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {withdrawalError}
                  </div>
                )}

                {withdrawalSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                    {withdrawalSuccess}
                  </div>
                )}

                <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ السحب</label>
                    <input
                      type="number"
                      min={effectiveMinWithdrawalAmount}
                      step="0.01"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      disabled={!canRequestWithdrawal}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder={`الحد الأدنى ${effectiveMinWithdrawalAmount} ريال`}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={withdrawalNotes}
                      onChange={(e) => setWithdrawalNotes(e.target.value)}
                      disabled={!canRequestWithdrawal}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-none"
                      placeholder="مثلاً: تحويل على الحساب البنكي المسجل"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                    <p>الرصيد المتاح حالياً: <span className="font-bold">{formatCurrency(availableBalance)}</span></p>
                    <p>الحد الأدنى الحالي للسحب: <span className="font-bold">{effectiveMinWithdrawalAmount} ريال</span></p>
                    {withdrawalLimitsEnabled && (
                      <>
                        <p>الحد الأقصى للطلبات: <span className="font-bold">{withdrawalRequestsMax}</span> لكل {formatPeriodLabel(withdrawalPeriodType)}</p>
                        <p>استخدمت: <span className="font-bold">{withdrawalRequestsUsed}</span> / المتبقي: <span className="font-bold">{withdrawalRequestsRemaining}</span></p>
                      </>
                    )}
                    <p>بعد إرسال الطلب سيتم خصمه تنظيمياً كسحب قيد المراجعة حتى تعتمد الإدارة الطلب.</p>
                  </div>

                  {!walletData && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                      لا توجد محفظة مرتبطة بحسابك حالياً. إذا كانت لديك مبيعات ولم تظهر المحفظة، جرّب تحديث البيانات أولاً.
                    </div>
                  )}

                  {!isVerificationApproved && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      السحب متاح فقط للتاجر الذي تم اعتماد توثيق هويته.
                    </div>
                  )}

                  {isVerificationApproved && !isBankAccountApproved && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      يجب اعتماد الحساب البنكي أولاً قبل إرسال طلب السحب. يمكنك إضافته أو تعديله من تبويب "الحساب البنكي".
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canRequestWithdrawal}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawalSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب السحب'}
                  </button>
                </form>
              </div>

              <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">آخر طلبات السحب</h3>
                    <p className="text-sm text-gray-500">متابعة حالة الطلبات الأخيرة الخاصة بك</p>
                  </div>
                </div>

                {walletLoading ? (
                  <div className="text-center py-10">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل بيانات الأرباح...</p>
                  </div>
                ) : latestWithdrawalRequests.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-10 text-center">
                    <Landmark className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات سحب بعد</h4>
                    <p className="text-gray-600">عند إرسال أول طلب سحب سيظهر هنا مباشرة.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {latestWithdrawalRequests.map((request) => {
                      const statusMeta = withdrawalStatusMeta(request.status);
                      const hasProof = buildProofPathCandidates(request).length > 0;

                      return (
                        <div
                          key={request.id}
                          className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            <div>
                              <div className="text-lg font-bold text-gray-900">{formatCurrency(request.amount)}</div>
                              <div className="text-sm text-gray-500">تاريخ الطلب: {formatDate(request.created_at)}</div>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-gray-500 mb-1">الحالة</div>
                              <div className="font-semibold text-gray-900">{statusMeta.label}</div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-gray-500 mb-1">تاريخ الاعتماد</div>
                              <div className="font-semibold text-gray-900">{formatDate(request.approved_at)}</div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-gray-500 mb-1">تاريخ الرفض</div>
                              <div className="font-semibold text-gray-900">{formatDate(request.rejected_at)}</div>
                            </div>
                          </div>

                          {request.notes && (
                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                              ملاحظات الإدارة: {request.notes}
                            </div>
                          )}

                          {request.rejection_reason && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                              سبب الرفض: {request.rejection_reason}
                            </div>
                          )}

                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {request.status === 'approved' && hasProof && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                                  <Paperclip className="w-3.5 h-3.5" />
                                  توجد وثيقة حوالة
                                </span>
                              )}

                              {request.status === 'approved' && !hasProof && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold">
                                  لا توجد وثيقة مرفقة
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => openWithdrawalDetails(request)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              عرض التفاصيل
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">سجل المحفظة</h3>
                <p className="text-sm text-gray-500">آخر الحركات المالية المتعلقة بمحفظتك</p>
              </div>

              {walletLoading ? (
                <div className="text-center py-10">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل سجل المحفظة...</p>
                </div>
              ) : latestLedgerEntries.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-10 text-center">
                  <Wallet className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">لا توجد حركات في المحفظة</h4>
                  <p className="text-gray-600">ستظهر هنا الإيداعات والسحوبات المرتبطة بمحفظتك.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestLedgerEntries.map((entry) => {
                    const meta = ledgerEntryMeta(entry.entry_type);
                    const EntryIcon = meta.icon;
                    const entryDescription = buildLedgerDescription(entry);
                    const hasAffiliateInfo = Boolean(entry.order_id && earningsOrderMeta[entry.order_id]?.affiliateLabel);

                    return (
                      <div
                        key={entry.id}
                        className="border border-gray-200 rounded-2xl p-5"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bgClass}`}>
                              <EntryIcon className={`w-6 h-6 ${meta.iconClass}`} />
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-bold text-gray-900">{meta.label}</div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  entry.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : entry.status === 'completed' || entry.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : entry.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {formatLedgerStatus(entry.status)}
                                </span>
                                {hasAffiliateInfo && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                    عمولة مسوق مسجلة فقط
                                  </span>
                                )}
                              </div>

                              <div className="text-sm text-gray-500">{formatDate(entry.created_at)}</div>

                              {entryDescription && (
                                <div className="text-sm text-gray-600 leading-7 max-w-3xl">{entryDescription}</div>
                              )}

                              {entry.available_at && entry.status === 'pending' && (
                                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                                  <Clock3 className="w-4 h-4" />
                                  <span>يتحول هذا المبلغ إلى الرصيد المتاح في: {formatDate(entry.available_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right lg:min-w-[170px]">
                            <div className="text-lg font-bold text-gray-900">{formatCurrency(entry.amount)}</div>
                            {entry.reference && (
                              <div className="text-xs text-gray-400 mt-1 break-all">{entry.reference}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bankAccount' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-7 h-7 text-purple-600" />
                  </div>

                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">الحساب البنكي</h2>
                    <p className="text-gray-600 mb-4">
                      أضف بيانات حسابك البنكي لربطه بطلبات السحب. أي تعديل على البيانات سيعيد الحالة إلى قيد المراجعة.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bankAccountStatusMeta.className}`}>
                        {bankAccountStatusMeta.label}
                      </span>
                      <span className="text-sm text-gray-500">{bankAccountStatusMeta.description}</span>
                    </div>

                    {bankAccountData?.rejection_reason && bankAccountData.status === 'rejected' && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                        سبب الرفض: {bankAccountData.rejection_reason}
                      </div>
                    )}

                    {bankAccountData?.reviewed_at && (
                      <div className="mt-4 text-sm text-gray-500">
                        تاريخ آخر مراجعة: {formatDate(bankAccountData.reviewed_at)}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={fetchBankAccountData}
                  disabled={bankAccountLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${bankAccountLoading ? 'animate-spin' : ''}`} />
                  <span>تحديث البيانات</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {bankAccountData ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي'}
              </h3>

              {bankAccountLoading ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل بيانات الحساب البنكي...</p>
                </div>
              ) : (
                <form onSubmit={handleBankAccountSubmit} className="space-y-6">
                  {bankAccountError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                      {bankAccountError}
                    </div>
                  )}

                  {bankAccountSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                      {bankAccountSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم البنك</label>
                      <input
                        type="text"
                        value={bankAccountForm.bank_name}
                        onChange={(e) => setBankAccountForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                        disabled={bankAccountSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="مثال: البنك الأهلي السعودي"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">اسم صاحب الحساب</label>
                      <input
                        type="text"
                        value={bankAccountForm.account_holder_name}
                        onChange={(e) =>
                          setBankAccountForm((prev) => ({ ...prev, account_holder_name: e.target.value }))
                        }
                        disabled={bankAccountSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="الاسم كما يظهر في البنك"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">الآيبان</label>
                      <input
                        type="text"
                        value={bankAccountForm.iban}
                        onChange={(e) => setBankAccountForm((prev) => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                        disabled={bankAccountSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="SAxxxxxxxxxxxxxxxxxxxxxx"
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        يجب أن يبدأ الآيبان بـ SA وأن يتكون من 24 خانة بعد إزالة المسافات.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                    <p>بعد الحفظ سيتم إرسال الحساب البنكي للمراجعة من الإدارة.</p>
                    <p>إذا قمت بتعديل البيانات لاحقاً فسيعود الطلب تلقائياً إلى حالة "قيد المراجعة".</p>
                    <p>لن تتمكن من السحب حتى تصبح حالة الحساب البنكي "معتمد".</p>
                  </div>

                  {bankAccountData?.status === 'approved' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                      الحساب البنكي الحالي معتمد. أي تعديل جديد سيعيده إلى حالة المراجعة.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bankAccountSubmitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bankAccountSubmitting
                      ? 'جاري الحفظ...'
                      : bankAccountData
                      ? 'حفظ تحديثات الحساب البنكي'
                      : 'حفظ الحساب البنكي'}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">الحالة الحالية</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bankAccountStatusMeta.className}`}>
                    {bankAccountStatusMeta.label}
                  </span>
                  <span className="text-sm text-gray-500">{bankAccountStatusMeta.description}</span>
                </div>

                {bankAccountData?.bank_name && (
                  <p className="text-sm text-gray-600">
                    اسم البنك: <span className="font-semibold text-gray-900">{bankAccountData.bank_name}</span>
                  </p>
                )}

                {bankAccountData?.account_holder_name && (
                  <p className="text-sm text-gray-600">
                    صاحب الحساب: <span className="font-semibold text-gray-900">{bankAccountData.account_holder_name}</span>
                  </p>
                )}

                {bankAccountData?.iban && (
                  <p className="text-sm text-gray-600">
                    الآيبان:{' '}
                    <span className="font-semibold text-gray-900" dir="ltr">
                      {formatIbanForInput(bankAccountData.iban)}
                    </span>
                  </p>
                )}

                {bankAccountData?.created_at && (
                  <p className="text-sm text-gray-500">تاريخ الإضافة: {formatDate(bankAccountData.created_at)}</p>
                )}

                {bankAccountData?.updated_at && (
                  <p className="text-sm text-gray-500">آخر تحديث: {formatDate(bankAccountData.updated_at)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-7 h-7 text-blue-600" />
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">توثيق الهوية</h2>
                  <p className="text-gray-600 mb-4">
                    ارفع بيانات الهوية والمستندات المطلوبة لإرسال طلب التوثيق ومراجعته من الإدارة.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${verificationStatusMeta.className}`}>
                      {verificationStatusMeta.label}
                    </span>
                    <span className="text-sm text-gray-500">{verificationStatusMeta.description}</span>
                  </div>

                  {identityVerification?.rejection_reason && identityVerification.status === 'rejected' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                      سبب الرفض: {identityVerification.rejection_reason}
                    </div>
                  )}

                  {isVerificationPending && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                      لا يمكنك تعديل الطلب حالياً لأن الطلب قيد المراجعة.
                    </div>
                  )}

                  {isVerificationApproved && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                      تم اعتماد هويتك بنجاح، لذلك تم قفل نموذج التعديل.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">نموذج التوثيق</h3>

              {verificationLoading ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل بيانات التوثيق...</p>
                </div>
              ) : (
                <form onSubmit={handleVerificationSubmit} className="space-y-6">
                  {verificationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                      {verificationError}
                    </div>
                  )}

                  {verificationSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                      {verificationSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                      <input
                        type="text"
                        value={verificationForm.full_name}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="اكتب الاسم الكامل كما هو في الهوية"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">نوع الهوية</label>
                      <select
                        value={verificationForm.identity_type}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, identity_type: e.target.value }))}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option value="national_id">هوية وطنية</option>
                        <option value="iqama">إقامة</option>
                        <option value="passport">جواز سفر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهوية</label>
                      <input
                        type="text"
                        value={verificationForm.identity_number}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, identity_number: e.target.value }))}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="أدخل رقم الهوية"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={verificationForm.date_of_birth}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الهوية الأمامية</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {frontFile
                          ? `الملف الجديد المختار: ${frontFile.name}`
                          : identityVerification?.document_front_url
                          ? `الملف الحالي: ${getFileNameFromPath(identityVerification.document_front_url)}`
                          : 'ارفع صورة أو ملف PDF للواجهة الأمامية.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الهوية الخلفية</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                        disabled={!canEditVerification || verificationSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {backFile
                          ? `الملف الجديد المختار: ${backFile.name}`
                          : identityVerification?.document_back_url
                          ? `الملف الحالي: ${getFileNameFromPath(identityVerification.document_back_url)}`
                          : 'ارفع صورة أو ملف PDF للواجهة الخلفية.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    بعد الإرسال سيتم تحويل الحالة إلى "قيد المراجعة"، ويمكن للإدارة لاحقاً الموافقة أو الرفض مع سبب الرفض.
                  </div>

                  {canEditVerification ? (
                    <button
                      type="submit"
                      disabled={verificationSubmitting}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verificationSubmitting
                        ? 'جاري إرسال الطلب...'
                        : identityVerification?.status === 'rejected'
                        ? 'إعادة إرسال طلب التوثيق'
                        : 'إرسال طلب التوثيق'}
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500">تم إيقاف تعديل النموذج حسب حالة طلب التوثيق الحالية.</div>
                  )}
                </form>
              )}
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">الحالة الحالية</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${verificationStatusMeta.className}`}>
                    {verificationStatusMeta.label}
                  </span>
                  <span className="text-sm text-gray-500">{verificationStatusMeta.description}</span>
                </div>

                {identityVerification?.submitted_at && (
                  <p className="text-sm text-gray-500">تاريخ التقديم: {new Date(identityVerification.submitted_at).toLocaleString('ar-SA')}</p>
                )}

                {identityVerification?.reviewed_at && (
                  <p className="text-sm text-gray-500">تاريخ المراجعة: {new Date(identityVerification.reviewed_at).toLocaleString('ar-SA')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">الإعدادات</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                <input
                  type="text"
                  defaultValue={profile?.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
                <input
                  type="tel"
                  defaultValue={profile?.phone}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>

              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                حفظ التغييرات
              </button>
            </div>
          </div>
        )}
      </div>

      {showWithdrawalDetails && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">تفاصيل طلب السحب</h3>
                <p className="text-sm text-gray-500 mt-1">يمكنك مراجعة حالة الطلب ووثيقة الحوالة إن كانت متاحة</p>
              </div>

              <button
                onClick={closeWithdrawalDetails}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    withdrawalStatusMeta(selectedWithdrawal.status).className
                  }`}
                >
                  {withdrawalStatusMeta(selectedWithdrawal.status).label}
                </span>

                <span className="text-sm text-gray-500">
                  رقم الطلب: <span className="font-semibold text-gray-800">{selectedWithdrawal.id}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-green-600" />
                    <h4 className="font-bold text-gray-900">بيانات السحب</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      المبلغ: <span className="font-bold text-gray-900">{formatCurrency(selectedWithdrawal.amount)}</span>
                    </p>
                    <p className="text-gray-700">
                      تاريخ الطلب: <span className="font-semibold">{formatDate(selectedWithdrawal.created_at)}</span>
                    </p>
                    <p className="text-gray-700">
                      تاريخ المعالجة: <span className="font-semibold">{formatDate(selectedWithdrawal.processed_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900">بيانات التحويل البنكي</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      مرجع التحويل:{' '}
                      <span className="font-semibold text-gray-900">
                        {selectedWithdrawal.bank_transfer_reference || '—'}
                      </span>
                    </p>
                    <p className="text-gray-700">
                      وقت التحويل:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatDate(selectedWithdrawal.bank_transfer_at)}
                      </span>
                    </p>
                    <p className="text-gray-700">
                      حالة وجود وثيقة:{' '}
                      <span className="font-semibold text-gray-900">
                        {buildProofPathCandidates(selectedWithdrawal).length ? 'مرفقة' : 'غير مرفقة'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {selectedWithdrawal.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-900">ملاحظات الإدارة</h4>
                  </div>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedWithdrawal.notes}</p>
                </div>
              )}

              {selectedWithdrawal.transfer_notes && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-indigo-900">ملاحظات التحويل</h4>
                  </div>
                  <p className="text-sm text-indigo-800 whitespace-pre-wrap">{selectedWithdrawal.transfer_notes}</p>
                </div>
              )}

              {selectedWithdrawal.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-bold text-red-900">سبب الرفض</h4>
                  </div>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedWithdrawal.rejection_reason}</p>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="w-5 h-5 text-gray-700" />
                  <h4 className="font-bold text-gray-900">وثيقة الحوالة</h4>
                </div>

                {withdrawalProofLoading ? (
                  <div className="text-sm text-gray-500">جاري تجهيز الوثيقة...</div>
                ) : !buildProofPathCandidates(selectedWithdrawal).length ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    لا توجد وثيقة حوالة مرفقة لهذا الطلب حالياً.
                  </div>
                ) : withdrawalProofUrl ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      اسم الملف:{' '}
                      <span className="font-semibold text-gray-900">
                        {getFileNameFromPath(
                          normalizeStoragePath(selectedWithdrawal.transfer_proof_path || selectedWithdrawal.transfer_proof_url)
                        )}
                      </span>
                    </div>

                    {isImageFile(selectedWithdrawal.transfer_proof_path || selectedWithdrawal.transfer_proof_url) && (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                        <img
                          src={withdrawalProofUrl}
                          alt="وثيقة الحوالة"
                          className="w-full max-h-[420px] object-contain"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={withdrawalProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                        فتح الوثيقة
                      </a>

                      <a
                        href={withdrawalProofUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200"
                      >
                        <Download className="w-4 h-4" />
                        تحميل الوثيقة
                      </a>
                    </div>

                    <div className="text-xs text-gray-500">
                      في حال تأخر وصول الحوالة للبنك، يمكنك الرجوع لهذه الوثيقة للتحقق من أن التحويل تم من الإدارة.
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {withdrawalProofError || 'تعذر تحميل وثيقة الحوالة حالياً.'}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeWithdrawalDetails}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateStoreModal && (
        <CreateStoreModal
          isOpen={true}
          onClose={() => setShowCreateStoreModal(false)}
          onSuccess={async () => {
            setStoreImageMenuOpenId(null);
            await fetchDashboardData();
          }}
        />
      )}

      <CreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSuccess={fetchDashboardData}
      />

      {editingStoreId && (
        <EditStoreModal
            isOpen={true}
            storeId={editingStoreId}
            onClose={() => {
              setEditingStoreId(null);
              setStoreImageMenuOpenId(null);
            }}
            onSuccess={async () => {
              setStoreImageMenuOpenId(null);
              await fetchDashboardData();
            }}
            onDelete={async () => {
              setStoreImageMenuOpenId(null);
              await fetchDashboardData();
            }}
        />
      )}

      {editingProductId && (
        <EditProductModal
          isOpen={true}
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
          onSuccess={fetchDashboardData}
          onDelete={fetchDashboardData}
        />
      )}
    </div>
  );
};
