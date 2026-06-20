import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Store as StoreIcon,
  DollarSign,
  Plus,
  TrendingUp,
  ShoppingBag,
  Eye,
  Share2,
  Users,
  Link as LinkIcon,
  Check,
  Wallet,
  ArrowUpLeft,
  ArrowDownLeft,
  Clock3,
  Landmark,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  Paperclip,
  X,
  Search,
  ImagePlus,
  Trash2,
  Briefcase,
  ChevronDown,
  CheckCircle2,
  Circle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Store, Product } from '../lib/supabase';
import { CreateStoreModal } from '../components/store/CreateStoreModal';
import { CreateProductModal } from '../components/product/CreateProductModal';
import { EditStoreModal } from '../components/store/EditStoreModal';
import { EditProductModal } from '../components/product/EditProductModal';
import { PRODUCT_KIND_LABELS, normalizeProductKind } from '../lib/productSchema';

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

interface MerchantOnboardingRow {
  id: string;
  user_id: string;
  selling_type: 'digital_products' | 'digital_services' | 'both' | 'not_sure' | string;
  readiness_status: 'ready' | 'idea_only' | 'needs_ideas' | 'many_products' | string;
  preferred_sales_channel: 'store' | 'marketplace' | 'direct_link' | 'all' | string;
  audience_source: 'social_accounts' | 'groups' | 'previous_customers' | 'none' | string;
  first_goal: 'first_sale' | 'professional_store' | 'try_platform' | 'multiple_products' | string;
  completed_at: string | null;
  skipped_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface MerchantTaskOverrideRow {
  id: string;
  user_id: string;
  task_key: SellerTaskKey;
  status: 'skipped' | 'user_completed';
  note: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type SellerTaskKey =
  | 'onboarding_profile'
  | 'create_store'
  | 'create_first_offer'
  | 'share_and_market'
  | 'first_sale'
  | 'verification_and_bank';

type SellerTaskStatus = 'completed' | 'warning' | 'pending' | 'locked' | 'skipped';

interface SellerTaskItem {
  key: SellerTaskKey;
  order: number;
  title: string;
  description: string;
  status: SellerTaskStatus;
  details: string[];
  missing: string[];
  actionLabel?: string;
  onAction?: () => void;
  canSkip?: boolean;
}

interface SellerGrowthInsight {
  key: string;
  priority: 1 | 2 | 3 | 4 | 5;
  level: 'critical' | 'high' | 'medium' | 'low' | 'success';
  category: 'setup' | 'trust' | 'reach' | 'conversion' | 'operations' | 'growth';
  title: string;
  cause: string;
  recommendation: string;
  solutions: string[];
  metricLabel?: string;
  metricValue?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

interface EarningsOrderMeta {
  affiliateLabel?: string | null;
  affiliateAmount?: number;
  couponLabel?: string | null;
  couponAmount?: number;
}

interface ServiceOrderAttachmentRow {
  id: string;
  service_order_detail_id: string;
  order_id?: string | null;
  order_item_id?: string | null;
  product_id?: string | null;
  uploader_id?: string | null;
  uploader_role?: 'buyer' | 'seller' | string | null;
  attachment_context?: 'requirements' | 'seller_delivery' | 'buyer_revision' | 'seller_note' | string | null;
  file_name: string;
  file_path: string;
  file_url?: string | null;
  signed_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  note?: string | null;
  created_at?: string | null;
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
    product_kind?: string | null;
    delivery_mode?: string | null;
    service_delivery_days?: number | null;
    service_revisions_count?: number | null;
    service_detail?: ServiceOrderDetailRow | null;
  }>;
}

interface ServiceOrderDetailRow {
  id: string;
  order_id: string;
  order_item_id: string | null;
  product_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  buyer_requirements: string | null;
  seller_notes?: string | null;
  service_status?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  seller_delivery_note?: string | null;
  seller_delivery_file_url?: string | null;
  accepted_at?: string | null;
  revision_requested_at?: string | null;
  buyer_revision_note?: string | null;
  delivery_message?: string | null;
  delivery_url?: string | null;
  revision_request?: string | null;
  revisions_used?: number | null;
  service_attachments?: ServiceOrderAttachmentRow[];
}

type NormalizedProduct = Product & {
  name: string;
  user_id?: string | null;
  views_count: number;
  sales_count: number;
  currency: string;
  thumbnail_url?: string | null;
  product_kind?: string | null;
  delivery_mode?: string | null;
  service_delivery_days?: number | null;
  service_revisions_count?: number | null;
  product_attachment_count?: number;
  has_product_attachments?: boolean;
};

type StoreImageRecord = Store & Record<string, any>;
type SellerDashboardTab =
  | 'overview'
  | 'products'
  | 'stores'
  | 'marketing'
  | 'orders'
  | 'earnings';

const FALLBACK_MIN_WITHDRAWAL_AMOUNT = 10;
const WITHDRAWAL_PROOFS_BUCKET = 'withdrawal-proofs';
const STORE_IMAGES_BUCKET = 'store-images';
const SERVICE_ATTACHMENTS_BUCKET = 'service-order-attachments';
const MAX_SERVICE_ATTACHMENT_SIZE_MB = 50;
const MAX_SERVICE_ATTACHMENT_COUNT_PER_ACTION = 5;
const FINANCIAL_CURRENCY_NOTE = 'يتم احتساب الأرباح والسحب بالريال السعودي.';
const FINANCIAL_GATEWAY_NOTE = 'الأرباح المعروضة هي صافي مبالغ التاجر بعد خصم عمولة رقمي ورسوم بوابة الدفع.';
const SELLER_DASHBOARD_BASE_PATH = '/seller-dashboard';
const SELLER_DASHBOARD_TAB_PATHS: Record<SellerDashboardTab, string> = {
  overview: SELLER_DASHBOARD_BASE_PATH,
  products: `${SELLER_DASHBOARD_BASE_PATH}/products`,
  stores: `${SELLER_DASHBOARD_BASE_PATH}/stores`,
  marketing: `${SELLER_DASHBOARD_BASE_PATH}/marketing`,
  orders: `${SELLER_DASHBOARD_BASE_PATH}/orders`,
  earnings: `${SELLER_DASHBOARD_BASE_PATH}/earnings`,
};

const isSellerDashboardTab = (value: unknown): value is SellerDashboardTab => {
  return ['overview', 'products', 'stores', 'marketing', 'orders', 'earnings'].includes(String(value));
};

const SELLER_DASHBOARD_CACHE_PREFIX = 'seller_dashboard_cache';
const SELLER_DASHBOARD_CACHE_VERSION = 11;
const SELLER_DASHBOARD_CACHE_TTL_MS = 1000 * 60 * 15;

const getSellerDashboardCacheKey = (profileId: string) => {
  return `${SELLER_DASHBOARD_CACHE_PREFIX}:${profileId}`;
};

const normalizeBrowserPath = (path: string) => {
  const normalized = path.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
};

const getSellerDashboardTabFromPath = (pathname: string): SellerDashboardTab | null => {
  const normalizedPath = normalizeBrowserPath(pathname);
  const matchedEntry = Object.entries(SELLER_DASHBOARD_TAB_PATHS).find(([, path]) => {
    return normalizeBrowserPath(path) === normalizedPath;
  });

  return (matchedEntry?.[0] as SellerDashboardTab | undefined) || null;
};

const getSellerDashboardPath = (tab: SellerDashboardTab) => {
  return SELLER_DASHBOARD_TAB_PATHS[tab] || SELLER_DASHBOARD_BASE_PATH;
};

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const profileName = profile?.name ?? '';
  const accountStatus = ((profile as any)?.account_status || 'active').toString();
  const isAccountSuspended = accountStatus === 'suspended';

  const [activeTab, setActiveTab] = useState<SellerDashboardTab>('overview');
  const [hasRestoredDashboardCache, setHasRestoredDashboardCache] = useState(false);
  const [hasCachedDashboardData, setHasCachedDashboardData] = useState(false);

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
  const [serviceActionLoadingId, setServiceActionLoadingId] = useState<string | null>(null);
  const [serviceActionError, setServiceActionError] = useState('');
  const [serviceActionSuccess, setServiceActionSuccess] = useState('');
  const [serviceDeliveryForms, setServiceDeliveryForms] = useState<Record<string, { note: string; fileUrl: string }>>({});
  const [serviceDeliveryFiles, setServiceDeliveryFiles] = useState<Record<string, File[]>>({});

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestRow | null>(null);
  const [showWithdrawalDetails, setShowWithdrawalDetails] = useState(false);
  const [withdrawalProofUrl, setWithdrawalProofUrl] = useState<string | null>(null);
  const [withdrawalProofLoading, setWithdrawalProofLoading] = useState(false);
  const [withdrawalProofError, setWithdrawalProofError] = useState('');
  const [sellerRestrictionMessage, setSellerRestrictionMessage] = useState('');
  const [merchantOnboarding, setMerchantOnboarding] = useState<MerchantOnboardingRow | null>(null);
  const [taskOverrides, setTaskOverrides] = useState<MerchantTaskOverrideRow[]>([]);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [growthInsightsExpanded, setGrowthInsightsExpanded] = useState(false);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);



  const showSuspendedAccountWarning = () => {
    const message = 'لا يمكن تنفيذ هذا الإجراء حالياً لأن حسابك معلق مؤقتاً. يرجى التواصل مع الدعم إذا كنت تعتقد أن هناك خطأ.';
    setSellerRestrictionMessage(message);
    window.setTimeout(() => {
      setSellerRestrictionMessage('');
    }, 5000);
    return false;
  };

  const canPerformSellerAction = () => {
    if (!isAccountSuspended) return true;
    return showSuspendedAccountWarning();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTabFromPath = () => {
      const resolvedTab = getSellerDashboardTabFromPath(window.location.pathname);
      if (resolvedTab && resolvedTab !== activeTab) {
        setActiveTab(resolvedTab);
      }
    };

    syncTabFromPath();
    window.addEventListener('popstate', syncTabFromPath);

    return () => {
      window.removeEventListener('popstate', syncTabFromPath);
    };
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targetPath = normalizeBrowserPath(getSellerDashboardPath(activeTab));
    const currentPath = normalizeBrowserPath(window.location.pathname);

    if (currentPath !== targetPath) {
      window.history.replaceState(window.history.state, '', targetPath);
    }
  }, [activeTab]);

  const handleTabChange = (tab: SellerDashboardTab) => {
    setActiveTab(tab);

    if (typeof window === 'undefined') return;

    const targetPath = normalizeBrowserPath(getSellerDashboardPath(tab));
    const currentPath = normalizeBrowserPath(window.location.pathname);

    if (currentPath !== targetPath) {
      window.history.pushState(window.history.state, '', targetPath);
    }
  };

  useEffect(() => {
    if (!profileId || typeof window === 'undefined') {
      setHasRestoredDashboardCache(false);
      setHasCachedDashboardData(false);
      return;
    }

    try {
      const rawCache = sessionStorage.getItem(getSellerDashboardCacheKey(profileId));
      if (!rawCache) {
        setHasCachedDashboardData(false);
        return;
      }

      const parsedCache = JSON.parse(rawCache);
      const isCacheValid =
        parsedCache?.version === SELLER_DASHBOARD_CACHE_VERSION &&
        typeof parsedCache?.cachedAt === 'number' &&
        Date.now() - parsedCache.cachedAt <= SELLER_DASHBOARD_CACHE_TTL_MS;

      if (!isCacheValid) {
        sessionStorage.removeItem(getSellerDashboardCacheKey(profileId));
        setHasCachedDashboardData(false);
        return;
      }

      if (isSellerDashboardTab(parsedCache.activeTab)) {
        setActiveTab(parsedCache.activeTab);
      } else {
        setActiveTab('overview');
      }

      setStores(Array.isArray(parsedCache.stores) ? parsedCache.stores : []);
      setProducts(
        Array.isArray(parsedCache.products)
          ? parsedCache.products.filter((product: any) => !isProductSoftDeleted(product))
          : []
      );
      setStats(
        parsedCache.stats && typeof parsedCache.stats === 'object'
          ? parsedCache.stats
          : {
              totalRevenue: 0,
              totalSales: 0,
              totalViews: 0,
              activeProducts: 0,
            }
      );
      setAffiliateLinks(Array.isArray(parsedCache.affiliateLinks) ? parsedCache.affiliateLinks : []);
      setIdentityVerification(parsedCache.identityVerification ?? null);
      setVerificationForm(
        parsedCache.verificationForm && typeof parsedCache.verificationForm === 'object'
          ? parsedCache.verificationForm
          : {
              full_name: profileName,
              identity_type: 'national_id',
              identity_number: '',
              date_of_birth: '',
            }
      );
      setBankAccountData(parsedCache.bankAccountData ?? null);
      setBankAccountForm(
        parsedCache.bankAccountForm && typeof parsedCache.bankAccountForm === 'object'
          ? parsedCache.bankAccountForm
          : {
              bank_name: '',
              account_holder_name: profileName,
              iban: '',
            }
      );
      setWalletData(parsedCache.walletData ?? null);
      setWalletLedger(Array.isArray(parsedCache.walletLedger) ? parsedCache.walletLedger : []);
      setWithdrawalRequests(Array.isArray(parsedCache.withdrawalRequests) ? parsedCache.withdrawalRequests : []);
      setWithdrawalLimitStatus(parsedCache.withdrawalLimitStatus ?? null);
      setWithdrawalLimitSettings(parsedCache.withdrawalLimitSettings ?? null);
      setEarningsOrderMeta(
        parsedCache.earningsOrderMeta && typeof parsedCache.earningsOrderMeta === 'object'
          ? parsedCache.earningsOrderMeta
          : {}
      );
      setSellerOrders(Array.isArray(parsedCache.sellerOrders) ? parsedCache.sellerOrders : []);
      setMerchantOnboarding(parsedCache.merchantOnboarding ?? null);
      setTaskOverrides(Array.isArray(parsedCache.taskOverrides) ? parsedCache.taskOverrides : []);
      setHasCachedDashboardData(true);
      setLoading(false);
    } catch (error) {
      console.error('Error restoring seller dashboard cache:', error);
      setHasCachedDashboardData(false);
    } finally {
      setHasRestoredDashboardCache(true);
    }
  }, [profileId, profileName]);

  useEffect(() => {
    if (!profileId || !hasRestoredDashboardCache) return;

    fetchDashboardData({ showLoader: !hasCachedDashboardData });
    fetchIdentityVerification();
    fetchBankAccountData();
    fetchEarningsData();
    fetchWithdrawalLimitData();
    fetchOrdersData();
    fetchMerchantOnboardingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, hasRestoredDashboardCache]);

  useEffect(() => {
    if (!profileId || typeof window === 'undefined' || !hasRestoredDashboardCache) return;

    try {
      const payload = {
        version: SELLER_DASHBOARD_CACHE_VERSION,
        cachedAt: Date.now(),
        activeTab,
        stores,
        products,
        stats,
        affiliateLinks,
        identityVerification,
        verificationForm,
        bankAccountData,
        bankAccountForm,
        walletData,
        walletLedger,
        withdrawalRequests,
        withdrawalLimitStatus,
        withdrawalLimitSettings,
        earningsOrderMeta,
        sellerOrders,
        merchantOnboarding,
        taskOverrides,
      };

      sessionStorage.setItem(getSellerDashboardCacheKey(profileId), JSON.stringify(payload));
    } catch (error) {
      console.error('Error caching seller dashboard state:', error);
    }
  }, [
    profileId,
    hasRestoredDashboardCache,
    activeTab,
    stores,
    products,
    stats,
    affiliateLinks,
    identityVerification,
    verificationForm,
    bankAccountData,
    bankAccountForm,
    walletData,
    walletLedger,
    withdrawalRequests,
    withdrawalLimitStatus,
    withdrawalLimitSettings,
    earningsOrderMeta,
    sellerOrders,
    merchantOnboarding,
    taskOverrides,
  ]);


  const normalizeProduct = (row: any): NormalizedProduct => {
    const name = row?.name ?? row?.title ?? '';
    const user_id = row?.user_id ?? row?.merchant_id ?? null;

    const views_count = Number(row?.views_count ?? row?.views ?? 0) || 0;
    const sales_count = Number(row?.sales_count ?? 0) || 0;
    const currency = row?.currency ?? 'SAR';
    const product_kind = normalizeProductKind(row?.product_kind);

    return {
      ...(row as Product),
      name,
      user_id,
      views_count,
      sales_count,
      currency,
      product_kind,
      delivery_mode: row?.delivery_mode ?? (product_kind === 'digital_service' ? 'manual' : 'instant'),
      service_delivery_days: row?.service_delivery_days ?? null,
      service_revisions_count: row?.service_revisions_count ?? null,
      thumbnail_url: row?.thumbnail_url ?? null,
    } as NormalizedProduct;
  };

  const safeArray = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);

  const sanitizeServiceAttachmentFileName = (fileName: string) => {
    return fileName
      .replace(/[\\/]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g, '')
      .slice(0, 120) || `file-${Date.now()}`;
  };

  const formatServiceAttachmentSize = (bytes?: number | null) => {
    const size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return '';
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAllowedServiceAttachmentFile = (file: File) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    return allowedTypes.includes(file.type) || /\.(jpg|jpeg|png|webp|gif|pdf|zip|txt|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name);
  };

  const getServiceAttachmentsByContext = (
    detail: ServiceOrderDetailRow | null | undefined,
    context: ServiceOrderAttachmentRow['attachment_context']
  ) => {
    return (detail?.service_attachments || []).filter((attachment) => attachment.attachment_context === context);
  };

  const fetchServiceAttachmentsByDetailIds = async (detailIds: string[]) => {
    const cleanIds = Array.from(new Set(detailIds.filter(Boolean)));
    const attachmentsMap = new Map<string, ServiceOrderAttachmentRow[]>();

    if (cleanIds.length === 0) return attachmentsMap;

    const { data, error } = await supabase
      .from('service_order_attachments')
      .select('*')
      .in('service_order_detail_id', cleanIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching service order attachments:', error);
      return attachmentsMap;
    }

    const signedRows = await Promise.all(
      ((data || []) as ServiceOrderAttachmentRow[]).map(async (attachment) => {
        let signedUrl = attachment.file_url || null;

        if (!signedUrl && attachment.file_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(SERVICE_ATTACHMENTS_BUCKET)
            .createSignedUrl(attachment.file_path, 60 * 60);

          if (!signedError) {
            signedUrl = signedData?.signedUrl || null;
          }
        }

        return {
          ...attachment,
          signed_url: signedUrl,
        };
      })
    );

    for (const attachment of signedRows) {
      const key = String(attachment.service_order_detail_id || '');
      if (!key) continue;
      attachmentsMap.set(key, [...(attachmentsMap.get(key) || []), attachment]);
    }

    return attachmentsMap;
  };

  const handleServiceDeliveryFilesSelected = (detailId: string, selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setServiceActionError('');
    setServiceActionSuccess('');

    const files = Array.from(selectedFiles);
    const currentFiles = serviceDeliveryFiles[detailId] || [];
    const nextFiles = [...currentFiles];

    for (const file of files) {
      if (nextFiles.length >= MAX_SERVICE_ATTACHMENT_COUNT_PER_ACTION) {
        setServiceActionError(`يمكن إرفاق ${MAX_SERVICE_ATTACHMENT_COUNT_PER_ACTION} ملفات كحد أقصى عند التسليم.`);
        break;
      }

      if (file.size > MAX_SERVICE_ATTACHMENT_SIZE_MB * 1024 * 1024) {
        setServiceActionError(`حجم الملف "${file.name}" أكبر من ${MAX_SERVICE_ATTACHMENT_SIZE_MB}MB.`);
        continue;
      }

      if (!isAllowedServiceAttachmentFile(file)) {
        setServiceActionError(`نوع الملف "${file.name}" غير مدعوم.`);
        continue;
      }

      nextFiles.push(file);
    }

    setServiceDeliveryFiles((current) => ({
      ...current,
      [detailId]: nextFiles,
    }));
  };

  const removeServiceDeliveryFile = (detailId: string, fileIndex: number) => {
    setServiceDeliveryFiles((current) => ({
      ...current,
      [detailId]: (current[detailId] || []).filter((_, index) => index !== fileIndex),
    }));
  };

  const uploadServiceDeliveryAttachments = async (detail: ServiceOrderDetailRow, files: File[]) => {
    if (!profile?.id || !detail?.id || files.length === 0) return;

    const attachmentRows = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const safeName = sanitizeServiceAttachmentFileName(file.name);
      const filePath = `${profile.id}/${detail.id}/${Date.now()}-${index}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(SERVICE_ATTACHMENTS_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      attachmentRows.push({
        service_order_detail_id: detail.id,
        order_id: detail.order_id || null,
        order_item_id: detail.order_item_id || null,
        product_id: detail.product_id || null,
        uploader_id: profile.id,
        uploader_role: 'seller',
        attachment_context: 'seller_delivery',
        file_name: file.name,
        file_path: filePath,
        file_url: null,
        file_type: file.type || null,
        file_size: file.size || null,
        note: null,
      });
    }

    if (attachmentRows.length > 0) {
      const { error } = await supabase.from('service_order_attachments').insert(attachmentRows);
      if (error) throw error;
    }
  };

  const renderServiceAttachmentList = (
    attachments: ServiceOrderAttachmentRow[],
    emptyText?: string
  ) => {
    if (!attachments || attachments.length === 0) {
      if (!emptyText) return null;
      return <p className="mt-2 text-xs text-gray-500">{emptyText}</p>;
    }

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => {
          const href = attachment.signed_url || attachment.file_url || '';
          return (
            <a
              key={attachment.id}
              href={href || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs ${
                href ? 'hover:border-blue-200 hover:bg-blue-50' : 'cursor-default opacity-70'
              }`}
              onClick={(event) => {
                if (!href) event.preventDefault();
              }}
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-700">
                <Paperclip className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{attachment.file_name || 'مرفق'}</span>
              </span>
              <span className="flex-shrink-0 text-gray-500">
                {formatServiceAttachmentSize(attachment.file_size)}
              </span>
            </a>
          );
        })}
      </div>
    );
  };

  const isProductSoftDeleted = (product: any) => {
    return String(product?.status || '').toLowerCase() === 'deleted';
  };

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
    if (isAccountSuspended) throw new Error('لا يمكن تحديث صورة المتجر لأن حسابك معلق مؤقتاً');
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
    if (!canPerformSellerAction()) return;

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
    if (!canPerformSellerAction()) return;
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

  const fetchDashboardData = async (options?: { showLoader?: boolean }) => {
    if (!profile) return;

    const showLoader = options?.showLoader !== false;

    try {
      if (showLoader) {
        setLoading(true);
      }

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

      const normalizedProducts = safeArray(rawProductsData)
        .filter((product: any) => !isProductSoftDeleted(product))
        .map(normalizeProduct);
      const storeIds = safeArray(storesData).map((store: any) => store?.id).filter(Boolean);

      let sellerStatsData: any = null;

      try {
        const sellerStatsResponse = await supabase.rpc('get_seller_stats', {
          seller_id: profile.id,
        });

        if (sellerStatsResponse.error) {
          console.error('get_seller_stats rpc error:', sellerStatsResponse.error);
        } else {
          sellerStatsData = sellerStatsResponse.data;
        }
      } catch (error) {
        console.error('get_seller_stats unexpected error:', error);
      }

      const { data: fallbackOrdersData, error: fallbackOrdersErr } = await supabase
        .from('orders')
        .select('id, seller_amount, status')
        .or(`seller_id.eq.${profile.id},merchant_id.eq.${profile.id}`)
        .in('status', ['paid', 'completed']);

      if (fallbackOrdersErr) console.error('fallback orders fetch error:', fallbackOrdersErr);

      const productIds = normalizedProducts.map((p) => p.id).filter(Boolean);
      const thumbMap: Record<string, string> = {};
      const productAttachmentCountMap: Record<string, number> = {};
      const productSalesMap: Record<string, number> = {};
      const productViewsMap: Record<string, number> = {};

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

        try {
          const { data: attachmentRows, error: attachmentRowsErr } = await supabase
            .from('product_attachments')
            .select('product_id')
            .in('product_id', productIds);

          if (attachmentRowsErr) {
            console.error('product_attachments fetch error:', attachmentRowsErr);
          } else {
            for (const row of safeArray(attachmentRows) as any[]) {
              const productId = row?.product_id;
              if (!productId) continue;

              productAttachmentCountMap[productId] = (productAttachmentCountMap[productId] || 0) + 1;
            }
          }
        } catch (error) {
          console.error('product_attachments unexpected error:', error);
        }

        const { data: viewedProductsData, error: viewedProductsErr } = await supabase
          .from('viewed_products')
          .select('product_id')
          .in('product_id', productIds);

        if (viewedProductsErr) {
          console.error('viewed_products count fetch error:', viewedProductsErr);
        } else {
          for (const row of safeArray(viewedProductsData) as any[]) {
            const productId = row?.product_id;
            if (!productId) continue;

            productViewsMap[productId] = (productViewsMap[productId] || 0) + 1;
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
        product_attachment_count: productAttachmentCountMap[p.id] || Number((p as any).product_attachment_count || 0) || 0,
        has_product_attachments:
          (productAttachmentCountMap[p.id] || Number((p as any).product_attachment_count || 0) || 0) > 0 ||
          Boolean((p as any).has_product_attachments),
        views_count: Math.max(Number(p.views_count || 0) || 0, productViewsMap[p.id] || 0),
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


  const normalizeServiceStatus = (status: string | null | undefined) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'requirements_submitted' || normalized === 'pending_requirements') return 'requirements_submitted';
    if (normalized === 'in_progress') return 'in_progress';
    if (normalized === 'delivered') return 'delivered';
    if (normalized === 'revision_requested') return 'revision_requested';
    if (normalized === 'completed' || normalized === 'accepted') return 'completed';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    return normalized || 'requirements_submitted';
  };

  const getServiceStatusLabel = (status: string | null | undefined) => {
    const normalized = normalizeServiceStatus(status);
    if (normalized === 'requirements_submitted') return 'تم إرسال المتطلبات';
    if (normalized === 'in_progress') return 'قيد التنفيذ';
    if (normalized === 'delivered') return 'تم التسليم بانتظار العميل';
    if (normalized === 'revision_requested') return 'طلب العميل تعديل';
    if (normalized === 'completed') return 'مكتملة';
    if (normalized === 'cancelled') return 'ملغاة';
    return 'تم إرسال المتطلبات';
  };

  const getServiceStatusClass = (status: string | null | undefined) => {
    const normalized = normalizeServiceStatus(status);
    if (normalized === 'requirements_submitted') return 'bg-purple-100 text-purple-700';
    if (normalized === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (normalized === 'delivered') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'revision_requested') return 'bg-orange-100 text-orange-700';
    if (normalized === 'completed') return 'bg-green-100 text-green-700';
    if (normalized === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getServiceRequirementText = (detail: ServiceOrderDetailRow | null | undefined) => {
    return String(detail?.buyer_requirements || '').trim();
  };

  const getServiceDeliveryNoteText = (detail: ServiceOrderDetailRow | null | undefined) => {
    return String(detail?.seller_delivery_note || detail?.delivery_message || '').trim();
  };

  const getServiceDeliveryUrlText = (detail: ServiceOrderDetailRow | null | undefined) => {
    return String(detail?.seller_delivery_file_url || detail?.delivery_url || '').trim();
  };

  const getServiceRevisionText = (detail: ServiceOrderDetailRow | null | undefined) => {
    return String(detail?.buyer_revision_note || detail?.revision_request || '').trim();
  };

  const getServiceUsedRevisions = (detail: ServiceOrderDetailRow | null | undefined) => {
    const rawValue = Number(detail?.revisions_used ?? 0);
    if (!Number.isFinite(rawValue) || rawValue < 0) return 0;
    return Math.floor(rawValue);
  };

  const getServiceMaxRevisions = (item: { service_revisions_count?: number | null }) => {
    const rawValue = Number(item.service_revisions_count ?? 0);
    if (!Number.isFinite(rawValue) || rawValue < 0) return 0;
    return Math.floor(rawValue);
  };

  const getServiceRemainingRevisions = (
    item: { service_revisions_count?: number | null },
    detail: ServiceOrderDetailRow | null | undefined
  ) => {
    return Math.max(getServiceMaxRevisions(item) - getServiceUsedRevisions(detail), 0);
  };
  const handleStartServiceWork = async (detailId: string) => {
    if (!canPerformSellerAction()) return;

    setServiceActionError('');
    setServiceActionSuccess('');

    try {
      setServiceActionLoadingId(detailId);
      const { error } = await supabase.rpc('seller_start_service_work', {
        p_service_detail_id: detailId,
      });

      if (error) throw error;

      setServiceActionSuccess('تم تحديث حالة الخدمة إلى قيد التنفيذ.');
      await fetchOrdersData();
    } catch (error: any) {
      console.error('seller_start_service_work error:', error);
      setServiceActionError(error?.message || 'تعذر بدء تنفيذ الخدمة حالياً.');
    } finally {
      setServiceActionLoadingId(null);
    }
  };

  const handleDeliverService = async (detailId: string) => {
    if (!canPerformSellerAction()) return;

    const form = serviceDeliveryForms[detailId] || { note: '', fileUrl: '' };
    const deliveryNote = form.note.trim();
    const deliveryUrl = form.fileUrl.trim();
    const detail =
      selectedOrder?.items
        .map((item) => item.service_detail)
        .find((serviceDetail) => serviceDetail?.id === detailId) || null;
    const files = serviceDeliveryFiles[detailId] || [];

    setServiceActionError('');
    setServiceActionSuccess('');

    if (!deliveryNote && !deliveryUrl && files.length === 0) {
      setServiceActionError('اكتب رسالة التسليم أو ضع رابط ملف/نتيجة الخدمة أو أرفق ملف قبل التسليم.');
      return;
    }

    if (!detail) {
      setServiceActionError('تعذر العثور على تفاصيل الخدمة لهذا الطلب.');
      return;
    }

    try {
      setServiceActionLoadingId(detailId);
      const { error } = await supabase.rpc('seller_update_service_delivery', {
        p_service_detail_id: detailId,
        p_delivery_message: deliveryNote || null,
        p_delivery_url: deliveryUrl || null,
        p_seller_notes: null,
      });

      if (error) throw error;

      await uploadServiceDeliveryAttachments(detail, files);

      setServiceActionSuccess('تم تسليم الخدمة للعميل بنجاح.');
      setServiceDeliveryForms((prev) => ({
        ...prev,
        [detailId]: { note: '', fileUrl: '' },
      }));
      setServiceDeliveryFiles((prev) => ({ ...prev, [detailId]: [] }));
      await fetchOrdersData();
    } catch (error: any) {
      console.error('seller_update_service_delivery error:', error);
      setServiceActionError(error?.message || 'تعذر تسليم الخدمة حالياً.');
    } finally {
      setServiceActionLoadingId(null);
    }
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

      let serviceDetailsRows: ServiceOrderDetailRow[] = [];
      if (orderIds.length > 0) {
        try {
          const { data: rpcServiceDetails, error: rpcServiceDetailsError } = await supabase.rpc(
            'get_my_seller_service_order_details'
          );

          if (!rpcServiceDetailsError && Array.isArray(rpcServiceDetails)) {
            const orderIdSet = new Set(orderIds);
            serviceDetailsRows = (rpcServiceDetails as ServiceOrderDetailRow[]).filter((detail) => {
              return detail?.order_id && orderIdSet.has(detail.order_id);
            });
          } else {
            if (rpcServiceDetailsError) {
              console.error('get_my_seller_service_order_details rpc error:', rpcServiceDetailsError);
            }

            const { data: directServiceDetails, error: directServiceDetailsError } = await supabase
              .from('service_order_details')
              .select('*')
              .in('order_id', orderIds)
              .eq('seller_id', profile.id);

            if (directServiceDetailsError) {
              console.error('service_order_details direct fetch error:', directServiceDetailsError);
            } else {
              serviceDetailsRows = safeArray(directServiceDetails) as ServiceOrderDetailRow[];
            }
          }
        } catch (error) {
          console.error('service_order_details fetch unexpected error:', error);
        }
      }

      const serviceAttachmentsByDetailId = await fetchServiceAttachmentsByDetailIds(
        serviceDetailsRows.map((detail) => String(detail?.id || '')).filter(Boolean)
      );

      const serviceDetailByOrderItemId: Record<string, ServiceOrderDetailRow> = {};
      const serviceDetailByOrderAndProductId: Record<string, ServiceOrderDetailRow> = {};

      for (const detail of serviceDetailsRows) {
        if (detail?.id) {
          detail.service_attachments = serviceAttachmentsByDetailId.get(String(detail.id)) || [];
        }

        if (detail?.order_item_id) {
          serviceDetailByOrderItemId[detail.order_item_id] = detail;
        }

        if (detail?.order_id && detail?.product_id) {
          serviceDetailByOrderAndProductId[`${detail.order_id}:${detail.product_id}`] = detail;
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
        const productKind = normalizeProductKind(product?.product_kind || row?.product_kind);
        const serviceDetail =
          (row?.id ? serviceDetailByOrderItemId[row.id] : null) ||
          (row?.product_id ? serviceDetailByOrderAndProductId[`${orderId}:${row.product_id}`] : null) ||
          null;

        if (!itemsByOrder[orderId]) itemsByOrder[orderId] = [];
        itemsByOrder[orderId].push({
          id: row?.id || serviceDetail?.order_item_id || `${orderId}-${row?.product_id || Math.random()}`,
          product_id: row?.product_id || null,
          product_name: productName,
          quantity,
          amount: itemAmount,
          product_kind: productKind,
          delivery_mode: product?.delivery_mode ?? (productKind === 'digital_service' ? 'manual' : 'instant'),
          service_delivery_days:
            product?.service_delivery_days !== undefined && product?.service_delivery_days !== null
              ? Number(product.service_delivery_days)
              : null,
          service_revisions_count:
            product?.service_revisions_count !== undefined && product?.service_revisions_count !== null
              ? Number(product.service_revisions_count)
              : null,
          service_detail: serviceDetail,
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
      setSelectedOrder((current) => {
        if (!current) return current;
        return normalizedOrders.find((order) => order.id === current.id) || current;
      });
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

      const [statusResponse, settingsResponse] = await Promise.all([
        supabase.rpc('get_my_withdrawal_limit_status'),
        supabase.rpc('get_withdrawal_limit_settings'),
      ]);

      const { data: statusData, error: statusError } = statusResponse;
      const { data: settingsData, error: settingsError } = settingsResponse;

      if (statusError) {
        console.error('get_my_withdrawal_limit_status rpc error:', statusError);
      }

      if (settingsError) {
        console.error('get_withdrawal_limit_settings rpc error:', settingsError);
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

      const baseMaxRequests = Number(
        normalizedStatusRaw?.max_requests ??
          safeSettings?.max_requests ??
          0
      );

      const periodType =
        normalizedStatusRaw?.period_type ||
        safeSettings?.period_type ||
        'monthly';

      const periodStart =
        normalizedStatusRaw?.period_start ||
        safeSettings?.period_start ||
        null;

      const periodEnd =
        normalizedStatusRaw?.period_end ||
        safeSettings?.period_end ||
        null;

      let approvedRequestsQuery = supabase
        .from('withdrawal_requests')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', profile.id)
        .eq('status', 'approved');

      if (periodStart) {
        approvedRequestsQuery = approvedRequestsQuery.gte('created_at', periodStart);
      }

      if (periodEnd) {
        approvedRequestsQuery = approvedRequestsQuery.lt('created_at', periodEnd);
      }

      const { count: approvedRequestsCount, error: approvedRequestsError } = await approvedRequestsQuery;

      if (approvedRequestsError) {
        console.error('approved withdrawal requests count error:', approvedRequestsError);
      }

      const usedApprovedRequests = Number(approvedRequestsCount || 0);

      if (normalizedStatusRaw || safeSettings) {
        const safeStatus: WithdrawalLimitStatusRow = {
          is_enabled: Boolean(normalizedStatusRaw?.is_enabled ?? safeSettings?.is_enabled ?? false),
          max_requests: baseMaxRequests,
          used_requests: usedApprovedRequests,
          remaining_requests: Math.max(baseMaxRequests - usedApprovedRequests, 0),
          period_type: periodType,
          min_withdrawal_amount: Number(
            normalizedStatusRaw?.min_withdrawal_amount ??
              safeSettings?.min_withdrawal_amount ??
              FALLBACK_MIN_WITHDRAWAL_AMOUNT
          ),
          period_start: periodStart,
          period_end: periodEnd,
        };

        setWithdrawalLimitStatus(safeStatus);
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

    if (!canPerformSellerAction()) {
      setWithdrawalError('لا يمكن إرسال طلب سحب لأن حسابك معلق مؤقتاً');
      return;
    }

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
    const meta = entry.order_id ? earningsOrderMeta[entry.order_id] : null;

    if (entry.entry_type === 'sale_credit') {
      parts.push('تم إضافة صافي قيمة الطلب إلى محفظتك بعد خصم عمولة رقمي ورسوم الدفع.');

      if (entry.status === 'pending' && entry.available_at) {
        parts.push('المبلغ حالياً في الرصيد المعلق، وسيصبح متاحاً للسحب بعد انتهاء مدة التعليق.');
      } else if (entry.status === 'completed' || entry.status === 'approved') {
        parts.push('المبلغ أصبح ضمن رصيدك المتاح.');
      }

      if (meta?.affiliateLabel) {
        const affiliateText = meta.affiliateAmount
          ? `توجد عمولة تسويق مرتبطة بهذا الطلب للمسوق ${meta.affiliateLabel} بقيمة ${formatCurrency(meta.affiliateAmount)}، وتظهر في تقارير التسويق بالعمولة.`
          : `هذا الطلب مرتبط بالمسوق ${meta.affiliateLabel}، وتظهر تفاصيله في تقارير التسويق بالعمولة.`;
        parts.push(affiliateText);
      }

      if (meta?.couponLabel) {
        const couponText = meta.couponAmount
          ? `تم استخدام كوبون ${meta.couponLabel} بخصم ${formatCurrency(meta.couponAmount)} على هذا الطلب.`
          : `تم استخدام كوبون ${meta.couponLabel} على هذا الطلب.`;
        parts.push(couponText);
      }
    } else if (entry.entry_type === 'withdrawal_request') {
      parts.push('تم إنشاء طلب سحب، والمبلغ الآن قيد المراجعة من الإدارة.');

      if (entry.status === 'pending') {
        parts.push('سيتم تحويل المبلغ إلى حسابك البنكي بعد اعتماد الطلب.');
      }
    } else if (entry.entry_type === 'withdrawal_completed') {
      parts.push('تم اعتماد طلب السحب وتحويل المبلغ إلى حسابك البنكي.');
    } else if (entry.entry_type === 'withdrawal_rejected') {
      parts.push('تم رفض طلب السحب، وتمت إعادة المبلغ إلى رصيدك المتاح.');
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
      if (isProductSoftDeleted(product)) return false;

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


  const getPublicProductUrl = (product: any) => {
    if (typeof window === 'undefined' || !product) return '';
    const productPath = product?.slug ? `/p/${product.slug}` : `/p/${product.id}`;
    return `${window.location.origin}${productPath}`;
  };

  const getPublicStoreUrl = (store: any) => {
    if (typeof window === 'undefined' || !store) return '';
    const storePath = store?.slug ? `/s/${store.slug}` : `/store/${store.id}`;
    return `${window.location.origin}${storePath}`;
  };

  const copyTextToClipboard = async (textToCopy: string, successMessage = 'تم نسخ الرابط بنجاح.') => {
    if (!textToCopy) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setSellerRestrictionMessage(successMessage);
      window.setTimeout(() => setSellerRestrictionMessage(''), 3500);
    } catch (error) {
      console.error('Clipboard copy error:', error);
      setSellerRestrictionMessage('تعذر نسخ الرابط. افتح الصفحة وانسخ الرابط يدويًا.');
      window.setTimeout(() => setSellerRestrictionMessage(''), 4000);
    }
  };


  const fetchMerchantOnboardingData = async () => {
    if (!profileId) return;

    try {
      const [onboardingResponse, overridesResponse] = await Promise.all([
        supabase
          .from('merchant_onboarding')
          .select('*')
          .eq('user_id', profileId)
          .maybeSingle(),
        supabase
          .from('merchant_task_overrides')
          .select('*')
          .eq('user_id', profileId),
      ]);

      if (onboardingResponse.error) {
        console.error('merchant_onboarding fetch error:', onboardingResponse.error);
      } else {
        setMerchantOnboarding((onboardingResponse.data as MerchantOnboardingRow | null) || null);
      }

      if (overridesResponse.error) {
        console.error('merchant_task_overrides fetch error:', overridesResponse.error);
      } else {
        setTaskOverrides((overridesResponse.data || []) as MerchantTaskOverrideRow[]);
      }
    } catch (error) {
      console.error('Error fetching merchant onboarding data:', error);
    }
  };

  const upsertTaskOverride = async (
    taskKey: SellerTaskKey,
    status: 'skipped' | 'user_completed'
  ) => {
    if (!profileId) return;

    const confirmationMessage =
      status === 'skipped'
        ? 'هل تريد تخطي هذه الخطوة مؤقتًا؟ يمكنك الرجوع لها لاحقًا من لوحة التاجر.'
        : 'هل تريد تأكيد إنجاز هذه الخطوة؟ استخدم هذا الخيار فقط إذا أنهيتها بالفعل.';

    if (!window.confirm(confirmationMessage)) return;

    try {
      setTaskActionLoading(`${taskKey}-${status}`);

      const { error } = await supabase
        .from('merchant_task_overrides')
        .upsert(
          {
            user_id: profileId,
            task_key: taskKey,
            status,
            note: status === 'skipped' ? 'تم تخطي المهمة من لوحة التاجر' : 'تم تعليم المهمة كمنجزة يدويًا',
          },
          { onConflict: 'user_id,task_key' }
        );

      if (error) throw error;

      await fetchMerchantOnboardingData();
    } catch (error: any) {
      console.error('Task override error:', error);
      setSellerRestrictionMessage(error?.message || 'تعذر تحديث حالة المهمة. حاول مرة أخرى.');
      window.setTimeout(() => setSellerRestrictionMessage(''), 5000);
    } finally {
      setTaskActionLoading(null);
    }
  };

  const getTaskOverride = (taskKey: SellerTaskKey) => {
    return taskOverrides.find((override) => override.task_key === taskKey) || null;
  };

  const applyTaskOverride = (task: SellerTaskItem): SellerTaskItem => {
    const override = getTaskOverride(task.key);
    if (!override) return task;

    if (override.status === 'user_completed') {
      return {
        ...task,
        status: 'completed',
        details: [...task.details, 'تم تأكيد إنجازها.'],
      };
    }

    if (override.status === 'skipped') {
      return {
        ...task,
        status: 'skipped',
        details: [...task.details, 'تم تخطيها مؤقتًا.'],
      };
    }

    return task;
  };

  const hasUsefulText = (value: unknown) => {
    return typeof value === 'string' && value.trim().length > 0;
  };

  const hasStoreImage = (store: any) => {
    return !!getStoreImageUrl(store);
  };

  const hasProductImage = (product: any) => {
    return !!(
      product?.thumbnail_url ||
      product?.image_url ||
      product?.cover_image ||
      product?.cover_url ||
      product?.main_image_url
    );
  };

  const hasDigitalProductFile = (product: any) => {
    const attachmentCount =
      Number(product?.product_attachment_count || 0) ||
      Number(product?.attachments_count || 0) ||
      Number(product?.attachment_count || 0) ||
      Number(product?.product_attachments_count || 0) ||
      0;

    return !!(
      attachmentCount > 0 ||
      product?.has_product_attachments ||
      product?.file_url ||
      product?.download_url ||
      product?.delivery_url ||
      product?.attachment_url ||
      product?.digital_file_url ||
      product?.file_path ||
      product?.attachment_path ||
      product?.download_path ||
      product?.digital_file_path
    );
  };

  const hasServiceRequirementsNote = (product: any) => {
    return !!(
      hasUsefulText(product?.service_requirements_note) ||
      hasUsefulText(product?.service_requirements) ||
      hasUsefulText(product?.requirements_note)
    );
  };

  const hasProductDelivery = (product: any) => {
    const productKind = normalizeProductKind(product?.product_kind);
    const deliveryMode = String(product?.delivery_mode || '').toLowerCase();

    if (productKind === 'digital_service') {
      return Number(product?.service_delivery_days || 0) > 0 && hasServiceRequirementsNote(product);
    }

    // المنتج الرقمي الجاهز لا يحتاج متطلبات خدمة.
    // المطلوب فقط: ملف المنتج أو اختيار التسليم اليدوي لو كان المنتج يُسلّم يدويًا.
    return deliveryMode === 'manual' || hasDigitalProductFile(product);
  };

  const isPaidSellerOrder = (order: SellerOrderUI | SellerOrderRow) => {
    const status = String(order?.status || '').toLowerCase();
    return status === 'paid' || status === 'completed';
  };

  const hasFirstSale = useMemo(() => {
    const available = Number(walletData?.balance_available || 0);
    const pending = Number(walletData?.balance_pending || 0);

    return (
      Number(stats.totalSales || 0) > 0 ||
      sellerOrders.some(isPaidSellerOrder) ||
      available > 0 ||
      pending > 0
    );
  }, [stats.totalSales, sellerOrders, walletData]);

  const sellerOnboardingTasks = useMemo<SellerTaskItem[]>(() => {
    const tasks: SellerTaskItem[] = [];

    const onboardingMissing: string[] = [];
    if (!merchantOnboarding?.completed_at && !merchantOnboarding?.skipped_at) {
      onboardingMissing.push('إكمال أسئلة البداية حتى تظهر لك خطوات أوضح.');
    }

    tasks.push(
      applyTaskOverride({
        key: 'onboarding_profile',
        order: 1,
        title: 'جهّز مسارك في رقمي',
        description: 'أكمل أسئلة البداية مرة واحدة حتى تظهر لك خطوات أوضح داخل لوحة التاجر.',
        status: merchantOnboarding?.completed_at
          ? 'completed'
          : merchantOnboarding?.skipped_at
          ? 'skipped'
          : 'pending',
        details: [
          merchantOnboarding?.selling_type === 'digital_services'
            ? 'نوع البيع: خدمات رقمية حسب الطلب.'
            : merchantOnboarding?.selling_type === 'both'
            ? 'نوع البيع: منتجات وخدمات معًا.'
            : merchantOnboarding?.selling_type === 'not_sure'
            ? 'نوع البيع: لم يتم تحديده بعد.'
            : 'نوع البيع: منتجات رقمية جاهزة.',
          merchantOnboarding?.preferred_sales_channel === 'store'
            ? 'طريقة البيع المفضلة: متجر خاص.'
            : merchantOnboarding?.preferred_sales_channel === 'marketplace'
            ? 'طريقة البيع المفضلة: السوق العام.'
            : merchantOnboarding?.preferred_sales_channel === 'direct_link'
            ? 'طريقة البيع المفضلة: رابط مباشر.'
            : 'طريقة البيع المفضلة: كل الطرق المتاحة.',
        ],
        missing: onboardingMissing,
        actionLabel: 'فتح أسئلة البداية',
        onAction: () => onNavigate('merchant-onboarding'),
        canSkip: true,
      })
    );

    const firstStore = stores[0] as any;
    const storeMissing: string[] = [];

    if (!firstStore) {
      storeMissing.push('إنشاء متجر واحد على الأقل.');
    } else {
      if (!hasUsefulText(firstStore?.name)) storeMissing.push('اسم المتجر غير واضح.');
      if (!hasStoreImage(firstStore)) storeMissing.push('إضافة صورة للمتجر.');
      if (!hasUsefulText(firstStore?.description)) storeMissing.push('إضافة وصف مختصر للمتجر.');
    }

    tasks.push(
      applyTaskOverride({
        key: 'create_store',
        order: 2,
        title: 'أنشئ متجرك',
        description: 'أنشئ متجرًا واضحًا يساعد الزائر يعرف من يشتري منه ويثق برابطك.',
        status: !firstStore ? 'pending' : storeMissing.length > 0 ? 'warning' : 'completed',
        details: firstStore
          ? [
              `لديك ${stores.length} متجر.`,
              hasStoreImage(firstStore) ? 'صورة المتجر موجودة.' : 'صورة المتجر غير مضافة.',
              hasUsefulText(firstStore?.description) ? 'وصف المتجر موجود.' : 'وصف المتجر غير مضاف.',
            ]
          : ['ابدأ بإنشاء متجر واحد حتى يكون عندك رابط متجر واضح.'],
        missing: storeMissing,
        actionLabel: firstStore ? 'فتح المتاجر' : 'إنشاء متجر',
        onAction: () => {
          handleTabChange('stores');
          if (!firstStore && canPerformSellerAction()) {
            setShowCreateStoreModal(true);
          }
        },
        canSkip: true,
      })
    );

    const getOfferMissing = (product: any) => {
      const missing: string[] = [];

      if (!product) {
        missing.push('إضافة منتج أو خدمة واحدة على الأقل.');
        return missing;
      }

      const productKind = normalizeProductKind(product?.product_kind);

      if (!hasUsefulText(product?.name || product?.title)) {
        missing.push('عنوان المنتج أو الخدمة غير واضح.');
      }

      if (!hasUsefulText(product?.description)) {
        missing.push('إضافة وصف يوضح الفائدة.');
      }

      if (!hasProductImage(product)) {
        missing.push('إضافة صورة للمنتج أو الخدمة.');
      }

      if (Number(product?.price || 0) <= 0) {
        missing.push('تحديد سعر صحيح.');
      }

      if (productKind === 'digital_service') {
        if (Number(product?.service_delivery_days || 0) <= 0) {
          missing.push('تحديد مدة تنفيذ الخدمة.');
        }

        if (!hasServiceRequirementsNote(product)) {
          missing.push('إضافة تعليمات أو أسئلة العميل المطلوبة للخدمة.');
        }
      } else if (!hasProductDelivery(product)) {
        missing.push('إضافة ملف المنتج أو اختيار التسليم اليدوي.');
      }

      return missing;
    };

    const completedOffer = products.find((product: any) => getOfferMissing(product).length === 0) as any;
    const firstProduct = (completedOffer || products[0]) as any;
    const productMissing: string[] = firstProduct ? getOfferMissing(firstProduct) : ['إضافة منتج أو خدمة واحدة على الأقل.'];
    const firstProductKind = normalizeProductKind(firstProduct?.product_kind);
    const isFirstProductService = firstProductKind === 'digital_service';
    const offerTitle =
      merchantOnboarding?.selling_type === 'digital_services' || isFirstProductService
        ? 'أضف أول خدمة رقمية'
        : merchantOnboarding?.selling_type === 'both'
        ? 'أضف أول منتج أو خدمة'
        : 'أضف أول منتج رقمي';

    tasks.push(
      applyTaskOverride({
        key: 'create_first_offer',
        order: 3,
        title: offerTitle,
        description: isFirstProductService
          ? 'جهّز خدمة واضحة بسعر مناسب ومدة تنفيذ محددة حتى يعرف العميل ما الذي سيحصل عليه.'
          : 'جهّز منتجًا واضحًا بصورة وسعر وملف جاهز حتى يستطيع العميل الشراء بثقة.',
        status: !firstProduct ? 'pending' : productMissing.length > 0 ? 'warning' : 'completed',
        details: firstProduct
          ? [
              `لديك ${products.length} منتج/خدمة.`,
              isFirstProductService ? 'أول عرض لديك خدمة رقمية.' : 'أول عرض لديك منتج رقمي.',
              hasProductImage(firstProduct) ? 'الصورة موجودة.' : 'الصورة غير مضافة.',
              hasUsefulText(firstProduct?.description) ? 'الوصف موجود.' : 'الوصف غير مضاف.',
              isFirstProductService
                ? hasServiceRequirementsNote(firstProduct)
                  ? 'متطلبات الخدمة موجودة.'
                  : 'متطلبات الخدمة غير مضافة.'
                : hasDigitalProductFile(firstProduct)
                ? `مرفقات المنتج موجودة${Number(firstProduct?.product_attachment_count || 0) > 0 ? ` (${Number(firstProduct?.product_attachment_count || 0)})` : ''}.`
                : 'مرفق المنتج غير مضاف.',
            ]
          : ['ابدأ بعرض واحد فقط حتى تنتهي بسرعة من أول خطوة بيع.'],
        missing: productMissing,
        actionLabel: firstProduct ? 'فتح المنتجات' : 'إضافة منتج',
        onAction: () => {
          handleTabChange('products');
          if (!firstProduct && canPerformSellerAction()) {
            setShowCreateProductModal(true);
          }
        },
        canSkip: true,
      })
    );


    const shareMissing: string[] = [];
    if (!firstProduct) {
      shareMissing.push('أضف منتجًا أو خدمة قبل مشاركة الرابط.');
    }
    if (!hasFirstSale && !getTaskOverride('share_and_market')) {
      shareMissing.push('شارك رابط المنتج أو المتجر مع جمهورك أو أول 5 أشخاص مهتمين.');
    }

    tasks.push(
      applyTaskOverride({
        key: 'share_and_market',
        order: 4,
        title: 'اضبط الظهور وشارك الرابط',
        description: 'اختر طريقة الظهور المناسبة ثم انسخ رابط المنتج أو المتجر وابدأ النشر.',
        status: hasFirstSale ? 'completed' : firstProduct ? 'pending' : 'locked',
        details: [
          merchantOnboarding?.audience_source === 'groups'
            ? 'أنسب بداية لك: قروب واتساب أو تيليجرام مناسب.'
            : merchantOnboarding?.audience_source === 'previous_customers'
            ? 'أنسب بداية لك: أرسل الرابط لمعارف أو عملاء سابقين.'
            : merchantOnboarding?.audience_source === 'none'
            ? 'ابدأ بمشاركة بسيطة مع أشخاص مهتمين بدل انتظار جمهور كبير.'
            : 'أنسب بداية لك: حسابات التواصل الاجتماعي.',
          'شارك الرابط بعد التأكد من أن صفحة المنتج أو الخدمة واضحة ومناسبة للشراء.',
        ],
        missing: shareMissing,
        actionLabel: 'فتح التسويق',
        onAction: () => handleTabChange('marketing'),
        canSkip: true,
      })
    );

    tasks.push(
      applyTaskOverride({
        key: 'first_sale',
        order: 5,
        title: 'احصل على أول عملية شراء',
        description: 'بعد تجهيز العرض ومشاركة الرابط، الهدف التالي هو أول طلب مدفوع.',
        status: hasFirstSale ? 'completed' : firstProduct ? 'pending' : 'locked',
        details: hasFirstSale
          ? ['تم رصد طلب مدفوع أو رصيد في محفظتك.']
          : ['راقب الطلبات من لوحة التاجر، وحسّن العنوان أو السعر إذا لم تصل زيارات.'],
        missing: hasFirstSale ? [] : ['لم يتم رصد أول عملية شراء حتى الآن.'],
        actionLabel: 'فتح الطلبات',
        onAction: () => handleTabChange('orders'),
        canSkip: true,
      })
    );

    const identityApproved = identityVerification?.status === 'approved';
    const bankApproved = bankAccountData?.status === 'approved';
    const verificationMissing: string[] = [];

    if (hasFirstSale) {
      if (!identityApproved) verificationMissing.push('توثيق الهوية غير مكتمل أو غير معتمد.');
      if (!bankApproved) verificationMissing.push('الحساب البنكي غير مكتمل أو غير معتمد.');
    } else {
      verificationMissing.push('تظهر أهمية هذه الخطوة بعد أول بيع أو وجود أرباح.');
    }

    tasks.push(
      applyTaskOverride({
        key: 'verification_and_bank',
        order: 6,
        title: 'أكمل التوثيق والحساب البنكي',
        description: 'هذه الخطوة تأتي بعد أول بيع حتى تتمكن من سحب أرباحك.',
        status: !hasFirstSale
          ? 'locked'
          : identityApproved && bankApproved
          ? 'completed'
          : identityVerification || bankAccountData
          ? 'warning'
          : 'pending',
        details: [
          identityApproved
            ? 'توثيق الهوية معتمد.'
            : identityVerification?.status === 'pending'
            ? 'توثيق الهوية قيد المراجعة.'
            : 'توثيق الهوية غير مكتمل.',
          bankApproved
            ? 'الحساب البنكي معتمد.'
            : bankAccountData?.status === 'pending'
            ? 'الحساب البنكي قيد المراجعة.'
            : 'الحساب البنكي غير مكتمل.',
        ],
        missing: verificationMissing,
        actionLabel: hasFirstSale ? 'فتح صفحة التوثيق والحساب البنكي' : 'تظهر بعد أول بيع',
        onAction: () => {
          if (!hasFirstSale) return;

          try {
            sessionStorage.setItem('profile_default_tab', 'settings');
          } catch (error) {
            console.error('Error setting profile default tab:', error);
          }

          onNavigate('profile');
        },
        canSkip: false,
      })
    );

    return tasks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    merchantOnboarding,
    stores,
    products,
    hasFirstSale,
    identityVerification,
    bankAccountData,
    taskOverrides,
    onNavigate,
  ]);

  const currentSellerTask = useMemo(() => {
    return (
      sellerOnboardingTasks.find((task) => task.status === 'warning') ||
      sellerOnboardingTasks.find((task) => task.status === 'pending') ||
      sellerOnboardingTasks.find((task) => task.status === 'locked') ||
      sellerOnboardingTasks[0]
    );
  }, [sellerOnboardingTasks]);

  const completedSellerTasksCount = sellerOnboardingTasks.filter(
    (task) => task.status === 'completed' || task.status === 'skipped'
  ).length;

  const areSellerOnboardingTasksDone =
    sellerOnboardingTasks.length > 0 &&
    sellerOnboardingTasks.every((task) => task.status === 'completed' || task.status === 'skipped');

  const sellerGrowthInsights = useMemo<SellerGrowthInsight[]>(() => {
    const insights: SellerGrowthInsight[] = [];

    const activeProducts = products.filter((product) => Boolean(product?.is_active));
    const storesWithMissingBasics = stores.filter((store: any) => {
      return !hasUsefulText(store?.name) || !hasStoreImage(store) || !hasUsefulText(store?.description);
    });

    const paidOrdersCount = sellerOrders.filter(isPaidSellerOrder).length;
    const totalViews = products.reduce((sum, product) => sum + Number(product?.views_count || 0), 0);
    const totalProductSales = products.reduce((sum, product) => sum + Number(product?.sales_count || 0), 0);
    const availableBalance = Number(walletData?.balance_available || 0);
    const pendingBalance = Number(walletData?.balance_pending || 0);
    const hasMoneyMovement = paidOrdersCount > 0 || availableBalance > 0 || pendingBalance > 0 || Number(stats.totalSales || 0) > 0;

    const bestProductByViews = [...products].sort(
      (a, b) => Number(b.views_count || 0) - Number(a.views_count || 0)
    )[0];
    const bestProductBySales = [...products].sort(
      (a, b) => Number(b.sales_count || 0) - Number(a.sales_count || 0)
    )[0];
    const firstStore = stores[0] as any;
    const firstActiveProduct = activeProducts[0] || products[0];

    const productsMissingFiles = activeProducts.filter((product: any) => {
      return normalizeProductKind(product?.product_kind) !== 'digital_service' && !hasProductDelivery(product);
    });

    const servicesMissingExecution = activeProducts.filter((product: any) => {
      return normalizeProductKind(product?.product_kind) === 'digital_service' && !hasProductDelivery(product);
    });

    const productsMissingTrust = activeProducts.filter((product: any) => {
      return !hasProductImage(product) || !hasUsefulText(product?.description) || Number(product?.price || 0) <= 0;
    });

    const lowViewsProducts = activeProducts.filter((product: any) => {
      return Number(product?.views_count || 0) < 10 && Number(product?.sales_count || 0) === 0;
    });

    const highViewsNoSalesProducts = activeProducts.filter((product: any) => {
      return Number(product?.views_count || 0) >= 20 && Number(product?.sales_count || 0) === 0;
    });

    if (activeProducts.length === 0) {
      insights.push({
        key: 'no-active-products',
        priority: 1,
        level: 'critical',
        category: 'setup',
        title: products.length > 0 ? 'فعّل منتجًا جاهزًا للبيع' : 'أضف أول منتج قابل للبيع',
        cause:
          products.length > 0
            ? 'عندك منتجات محفوظة، لكنها غير مفعلة للظهور والبيع حاليًا.'
            : 'المتجر يحتاج منتجًا واضحًا حتى يجد الزائر شيئًا يشتريه.',
        recommendation:
          products.length > 0
            ? 'راجع المنتجات غير النشطة وفعّل المنتج الأفضل بعد التأكد من الصورة والوصف والسعر.'
            : 'ابدأ بمنتج واحد فقط: عنوان واضح، صورة مناسبة، وصف مختصر، وسعر بسيط.',
        solutions: [
          products.length > 0 ? 'فعّل أفضل منتج عندك بدل إنشاء منتجات كثيرة دفعة واحدة.' : 'أضف منتجًا واحدًا مكتملًا قبل التفكير في التسويق.',
          'تأكد أن المنتج يحتوي على صورة ووصف وسعر واضح.',
          'بعد نشر المنتج انسخ رابطه وشاركه مع جمهور مناسب.',
        ],
        metricLabel: 'المنتجات النشطة',
        metricValue: String(activeProducts.length),
        primaryActionLabel: products.length > 0 ? 'فتح المنتجات' : 'إضافة منتج',
        onPrimaryAction: () => {
          handleTabChange('products');
          if (products.length === 0 && canPerformSellerAction()) {
            setShowCreateProductModal(true);
          }
        },
      });
    }

    if (productsMissingFiles.length > 0) {
      const product = productsMissingFiles[0] as any;
      insights.push({
        key: 'product-missing-file',
        priority: 1,
        level: 'critical',
        category: 'setup',
        title: 'أضف ملف المنتج قبل نشر الرابط',
        cause: 'المنتج الرقمي يحتاج ملفًا أو طريقة تسليم واضحة حتى يحصل العميل على ما اشتراه بعد الدفع.',
        recommendation: 'افتح المنتج وأضف الملف النهائي أو اجعل التسليم يدويًا إذا كان المنتج يحتاج متابعة منك.',
        solutions: [
          'أرفق الملف النهائي للمنتج داخل صفحة التعديل.',
          'استخدم التسليم اليدوي فقط إذا كنت فعلًا سترسل الملف بعد الشراء.',
          'بعد حفظ التعديل جرّب فتح المنتج وتأكد أن بياناته واضحة.',
        ],
        metricLabel: 'منتجات ناقصة ملف',
        metricValue: String(productsMissingFiles.length),
        primaryActionLabel: 'تعديل المنتج',
        onPrimaryAction: () => setEditingProductId(product.id),
        secondaryActionLabel: 'فتح المنتجات',
        onSecondaryAction: () => handleTabChange('products'),
      });
    }

    if (servicesMissingExecution.length > 0) {
      const service = servicesMissingExecution[0] as any;
      insights.push({
        key: 'service-missing-execution',
        priority: 1,
        level: 'critical',
        category: 'setup',
        title: 'وضّح طريقة تنفيذ الخدمة',
        cause: 'الخدمة حسب الطلب تحتاج مدة تنفيذ ومتطلبات واضحة حتى يعرف العميل ماذا يرسل ومتى يستلم.',
        recommendation: 'أضف مدة التنفيذ والأسئلة المطلوبة من العميل قبل أن تبدأ تسويق الخدمة.',
        solutions: [
          'حدد مدة تنفيذ واقعية بالأيام.',
          'اكتب متطلبات العميل مثل النصوص أو الملفات أو المقاسات التي تحتاجها.',
          'اجعل الوصف يوضح النتيجة التي سيستلمها العميل.',
        ],
        metricLabel: 'خدمات تحتاج توضيح',
        metricValue: String(servicesMissingExecution.length),
        primaryActionLabel: 'تعديل الخدمة',
        onPrimaryAction: () => setEditingProductId(service.id),
        secondaryActionLabel: 'فتح المنتجات',
        onSecondaryAction: () => handleTabChange('products'),
      });
    }

    if (storesWithMissingBasics.length > 0 && activeProducts.length > 0) {
      const store = storesWithMissingBasics[0] as any;
      insights.push({
        key: 'store-trust-basics',
        priority: 2,
        level: 'high',
        category: 'trust',
        title: 'ارفع ثقة الزائر بواجهة المتجر',
        cause: 'الزائر يشتري أسرع عندما يرى اسم متجر واضح، صورة مناسبة، ووصف قصير يشرح نوع المنتجات.',
        recommendation: 'كمّل واجهة المتجر قبل مشاركة الرابط على نطاق أوسع.',
        solutions: [
          'أضف صورة أو شعار بسيط للمتجر.',
          'اكتب وصفًا من سطرين يوضح ماذا تبيع ولمن.',
          'تأكد أن اسم المتجر مفهوم وليس مختصرًا جدًا.',
        ],
        metricLabel: 'متاجر تحتاج تحسين',
        metricValue: String(storesWithMissingBasics.length),
        primaryActionLabel: 'تعديل المتجر',
        onPrimaryAction: () => {
          handleTabChange('stores');
          if (store?.id) setEditingStoreId(store.id);
        },
        secondaryActionLabel: 'فتح المتجر',
        onSecondaryAction: () => {
          if (store) openStorefront(store as Store);
        },
      });
    }

    if (productsMissingTrust.length > 0 && activeProducts.length > 0) {
      const product = productsMissingTrust[0] as any;
      insights.push({
        key: 'product-trust-basics',
        priority: 2,
        level: 'high',
        category: 'trust',
        title: 'حسّن صفحة المنتج قبل زيادة التسويق',
        cause: 'صفحة المنتج هي مكان قرار الشراء. إذا كانت الصورة أو الوصف أو السعر غير واضح، قد يدخل الزائر ويخرج بدون شراء.',
        recommendation: 'ابدأ بأفضل منتج عندك وحسّن عرضه بدل تعديل كل المنتجات مرة واحدة.',
        solutions: [
          'اكتب الوصف على شكل: المشكلة، ماذا يحصل العميل، ولماذا المنتج مفيد.',
          'استخدم صورة واضحة تعبر عن محتوى المنتج.',
          'راجع السعر واجعله مناسبًا لقيمة المنتج وليس منخفضًا بلا سبب.',
        ],
        metricLabel: 'منتجات تحتاج تحسين',
        metricValue: String(productsMissingTrust.length),
        primaryActionLabel: 'تعديل المنتج',
        onPrimaryAction: () => setEditingProductId(product.id),
        secondaryActionLabel: 'فتح المنتج',
        onSecondaryAction: () => openProduct(product),
      });
    }

    if (activeProducts.length > 0 && paidOrdersCount === 0 && totalViews < 10) {
      const product = bestProductByViews || firstActiveProduct;
      insights.push({
        key: 'low-reach',
        priority: 3,
        level: 'medium',
        category: 'reach',
        title: 'المشكلة الآن في الوصول للمنتج',
        cause: 'المنتج موجود، لكن عدد المشاهدات قليل. قبل تعديل السعر أو العرض، تحتاج أن يرى المنتج عدد أكبر من المهتمين.',
        recommendation: 'شارك رابط المنتج في مكان واحد مناسب اليوم، ثم راقب هل تزيد المشاهدات.',
        solutions: [
          'انسخ رابط أفضل منتج وشاركه مع 5 أشخاص مهتمين.',
          'اكتب جملة قصيرة تشرح الفائدة بدل الاكتفاء بالرابط.',
          'جرّب النشر في حسابك أو قروب مناسب بدون تكرار مزعج.',
        ],
        metricLabel: 'إجمالي المشاهدات',
        metricValue: String(totalViews),
        primaryActionLabel: 'نسخ رابط المنتج',
        onPrimaryAction: () => copyTextToClipboard(getPublicProductUrl(product), 'تم نسخ رابط المنتج. شاركه مع جمهور مناسب.'),
        secondaryActionLabel: 'فتح التسويق',
        onSecondaryAction: () => handleTabChange('marketing'),
      });
    }

    if (highViewsNoSalesProducts.length > 0) {
      const product = highViewsNoSalesProducts[0] as any;
      insights.push({
        key: 'views-without-sales',
        priority: 3,
        level: 'high',
        category: 'conversion',
        title: 'فيه زيارات بدون مبيعات',
        cause: 'وصول الزوار للمنتج يعني أن الرابط أو الظهور بدأ يعمل، لكن صفحة المنتج تحتاج تقوية حتى تقنع بالشراء.',
        recommendation: 'راجع العنوان والوصف والصورة والسعر، ووضح للعميل بالضبط ماذا سيستلم.',
        solutions: [
          'اجعل أول سطر في الوصف يوضح النتيجة أو الفائدة.',
          'أضف تفاصيل التسليم أو محتويات الملف بوضوح.',
          'قارن السعر بقيمة المنتج، ولا تترك الوصف عامًا.',
        ],
        metricLabel: 'مشاهدات المنتج',
        metricValue: String(Number(product?.views_count || 0)),
        primaryActionLabel: 'تعديل المنتج',
        onPrimaryAction: () => setEditingProductId(product.id),
        secondaryActionLabel: 'فتح المنتج',
        onSecondaryAction: () => openProduct(product),
      });
    }

    if (paidOrdersCount > 0 && totalProductSales > 0 && products.length < 2) {
      insights.push({
        key: 'add-second-product',
        priority: 4,
        level: 'medium',
        category: 'growth',
        title: 'استفد من أول مبيعاتك بإضافة عرض قريب',
        cause: 'وجود مبيعات يعني أن السوق فهم عرضك. أفضل خطوة بعدها هي إضافة منتج قريب بدل البدء من الصفر.',
        recommendation: 'أنشئ منتجًا ثانيًا يكمل المنتج الذي باع أو يحل مشكلة قريبة لنفس الجمهور.',
        solutions: [
          'حوّل أكثر سؤال يجيك من العملاء إلى منتج جديد.',
          'قدّم نسخة مختصرة أو متقدمة من المنتج الحالي.',
          'اربط المنتج الجديد بوصف المنتج الأكثر مبيعًا.',
        ],
        metricLabel: 'عدد المنتجات',
        metricValue: String(products.length),
        primaryActionLabel: 'إضافة منتج جديد',
        onPrimaryAction: () => {
          handleTabChange('products');
          if (canPerformSellerAction()) setShowCreateProductModal(true);
        },
      });
    }

    const identityApproved = identityVerification?.status === 'approved';
    const bankApproved = bankAccountData?.status === 'approved';

    if (hasMoneyMovement && (!identityApproved || !bankApproved)) {
      insights.push({
        key: 'payout-readiness',
        priority: 2,
        level: 'high',
        category: 'operations',
        title: 'جهّز السحب قبل احتياجك له',
        cause: 'بعد وجود مبيعات أو رصيد، تحتاج توثيق الهوية والحساب البنكي حتى يكون طلب السحب جاهزًا عند توفر الرصيد.',
        recommendation: 'أكمل التوثيق من صفحة الإعدادات بدل الانتظار إلى وقت السحب.',
        solutions: [
          !identityApproved ? 'أرسل بيانات الهوية وانتظر المراجعة.' : 'توثيق الهوية جاهز.',
          !bankApproved ? 'أضف الحساب البنكي وتأكد أن الاسم مطابق قدر الإمكان.' : 'الحساب البنكي جاهز.',
          'بعد الاعتماد ستتمكن من طلب السحب حسب الشروط داخل صفحة الأرباح.',
        ],
        metricLabel: 'جاهزية السحب',
        metricValue: identityApproved || bankApproved ? 'جزئية' : 'غير مكتملة',
        primaryActionLabel: 'فتح التوثيق والحساب البنكي',
        onPrimaryAction: () => {
          try {
            sessionStorage.setItem('profile_default_tab', 'settings');
          } catch (error) {
            console.error('Error setting profile default tab:', error);
          }
          onNavigate('profile');
        },
        secondaryActionLabel: 'فتح الأرباح',
        onSecondaryAction: () => handleTabChange('earnings'),
      });
    }

    if (affiliateLinks.length === 0 && activeProducts.length > 0 && paidOrdersCount === 0) {
      insights.push({
        key: 'no-marketing-links',
        priority: 4,
        level: 'low',
        category: 'reach',
        title: 'جهّز رابطًا تسويقيًا يساعدك في الانتشار',
        cause: 'وجود رابط تسويقي أو مشاركة منظمة يسهل عليك تتبع الجهود ومعرفة من أين تأتي الزيارات والطلبات.',
        recommendation: 'افتح قسم التسويق وجهّز طريقة مشاركة واضحة قبل التواصل مع المسوقين أو الجمهور.',
        solutions: [
          'ابدأ برابط منتج واحد بدل نشر روابط كثيرة.',
          'اكتب نصًا قصيرًا يشرح الفائدة من المنتج.',
          'تابع النتائج من لوحة التاجر بعد النشر.',
        ],
        metricLabel: 'روابط التسويق',
        metricValue: String(affiliateLinks.length),
        primaryActionLabel: 'فتح التسويق',
        onPrimaryAction: () => handleTabChange('marketing'),
      });
    }

    if (insights.length === 0) {
      const product = bestProductBySales || bestProductByViews || firstActiveProduct;
      insights.push({
        key: 'ready-for-growth',
        priority: 5,
        level: 'success',
        category: 'growth',
        title: 'متجرك جاهز للخطوة التالية',
        cause: 'الأساسيات مكتملة ولا توجد مشكلة واضحة تمنع البيع الآن.',
        recommendation: 'ركز على زيادة الوصول وإضافة عروض قريبة من المنتجات التي يهتم بها الزوار.',
        solutions: [
          'شارك رابط أفضل منتج لديك اليوم مع جمهور مناسب.',
          'أضف منتجًا ثانيًا قريبًا من نفس الفكرة إذا كان عندك منتج واحد فقط.',
          'راجع الأداء بعد يومين: إذا زادت المشاهدات بدون مبيعات، حسّن صفحة المنتج.',
        ],
        metricLabel: 'حالة المتجر',
        metricValue: 'جاهز',
        primaryActionLabel: product ? 'نسخ رابط المنتج' : firstStore ? 'نسخ رابط المتجر' : 'فتح المنتجات',
        onPrimaryAction: () => {
          if (product) {
            copyTextToClipboard(getPublicProductUrl(product), 'تم نسخ رابط المنتج. ابدأ بمشاركته الآن.');
          } else if (firstStore) {
            copyTextToClipboard(getPublicStoreUrl(firstStore), 'تم نسخ رابط المتجر. ابدأ بمشاركته الآن.');
          } else {
            handleTabChange('products');
          }
        },
        secondaryActionLabel: 'إضافة منتج جديد',
        onSecondaryAction: () => {
          handleTabChange('products');
          if (canPerformSellerAction()) setShowCreateProductModal(true);
        },
      });
    }

    return [...insights].sort((a, b) => a.priority - b.priority);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products,
    stores,
    sellerOrders,
    walletData,
    stats.totalSales,
    identityVerification,
    bankAccountData,
    affiliateLinks,
  ]);

  const getSellerTaskStatusMeta = (status: SellerTaskStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'مكتملة',
          className: 'bg-green-50 text-green-700 border-green-200',
          icon: <CheckCircle2 className="w-4 h-4" />,
        };
      case 'warning':
        return {
          label: 'تحتاج تحسين',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      case 'skipped':
        return {
          label: 'تم تخطيها',
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: <XCircle className="w-4 h-4" />,
        };
      case 'locked':
        return {
          label: 'لاحقًا',
          className: 'bg-slate-50 text-slate-500 border-slate-200',
          icon: <Clock3 className="w-4 h-4" />,
        };
      default:
        return {
          label: 'غير مكتملة',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Circle className="w-4 h-4" />,
        };
    }
  };

  const renderSellerTaskCard = (task: SellerTaskItem, compact = false) => {
    const meta = getSellerTaskStatusMeta(task.status);
    const isActionDisabled = task.status === 'locked' || !!taskActionLoading;
    const visibleDetails = task.details.slice(0, compact ? 2 : 3);
    const visibleMissing = task.missing.slice(0, compact ? 2 : 3);

    return (
      <div
        key={task.key}
        className={`rounded-2xl border bg-white ${compact ? 'border-gray-100 p-4' : 'border-blue-100 p-4'}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {task.order}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                {meta.icon}
                {meta.label}
              </span>
            </div>

            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-extrabold text-gray-900`}>
              {task.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{task.description}</p>

            {visibleDetails.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {visibleDetails.map((detail, index) => (
                  <div key={`${task.key}-detail-${index}`} className="flex items-start gap-2 text-xs text-gray-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                    <span className="line-clamp-1">{detail}</span>
                  </div>
                ))}
              </div>
            )}

            {visibleMissing.length > 0 && (
              <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                <p className="mb-1 text-xs font-bold text-orange-800">المطلوب الآن:</p>
                <ul className="space-y-1 text-xs text-orange-700">
                  {visibleMissing.map((missingItem, index) => (
                    <li key={`${task.key}-missing-${index}`} className="line-clamp-1">• {missingItem}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-row flex-wrap gap-2 md:w-40 md:flex-col">
            {task.actionLabel && (
              <button
                type="button"
                onClick={task.onAction}
                disabled={isActionDisabled}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  task.status === 'locked'
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                }`}
              >
                {task.actionLabel}
              </button>
            )}

            {task.canSkip && task.status !== 'completed' && task.status !== 'skipped' && (
              <button
                type="button"
                onClick={() => upsertTaskOverride(task.key, 'skipped')}
                disabled={!!taskActionLoading}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                تخطي
              </button>
            )}

            {task.status !== 'completed' && task.status !== 'skipped' && (
              <button
                type="button"
                onClick={() => upsertTaskOverride(task.key, 'user_completed')}
                disabled={!!taskActionLoading}
                className="rounded-xl border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                تم الإنجاز
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getGrowthInsightMeta = (level: SellerGrowthInsight['level']) => {
    switch (level) {
      case 'critical':
        return {
          label: 'أولوية عالية',
          badgeClassName: 'bg-red-50 text-red-700 border-red-200',
          cardClassName: 'from-red-50 via-orange-50 to-white border-red-100',
          iconClassName: 'bg-red-600 text-white',
          icon: <AlertTriangle className="h-5 w-5" />,
        };
      case 'high':
        return {
          label: 'مهم الآن',
          badgeClassName: 'bg-orange-50 text-orange-700 border-orange-200',
          cardClassName: 'from-orange-50 via-amber-50 to-white border-orange-100',
          iconClassName: 'bg-orange-500 text-white',
          icon: <TrendingUp className="h-5 w-5" />,
        };
      case 'medium':
        return {
          label: 'فرصة تحسين',
          badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
          cardClassName: 'from-blue-50 via-sky-50 to-white border-blue-100',
          iconClassName: 'bg-blue-600 text-white',
          icon: <Eye className="h-5 w-5" />,
        };
      case 'low':
        return {
          label: 'اقتراح مفيد',
          badgeClassName: 'bg-purple-50 text-purple-700 border-purple-200',
          cardClassName: 'from-purple-50 via-indigo-50 to-white border-purple-100',
          iconClassName: 'bg-purple-600 text-white',
          icon: <Share2 className="h-5 w-5" />,
        };
      case 'success':
      default:
        return {
          label: 'جاهز للنمو',
          badgeClassName: 'bg-green-50 text-green-700 border-green-200',
          cardClassName: 'from-green-50 via-emerald-50 to-white border-green-100',
          iconClassName: 'bg-green-600 text-white',
          icon: <CheckCircle2 className="h-5 w-5" />,
        };
    }
  };

  const getGrowthCategoryLabel = (category: SellerGrowthInsight['category']) => {
    switch (category) {
      case 'setup':
        return 'تجهيز';
      case 'trust':
        return 'ثقة العميل';
      case 'reach':
        return 'الوصول';
      case 'conversion':
        return 'تحويل الزوار';
      case 'operations':
        return 'تشغيل وسحب';
      case 'growth':
      default:
        return 'نمو';
    }
  };

  const renderGrowthInsightCard = (insight: SellerGrowthInsight, isMain = false) => {
    const meta = getGrowthInsightMeta(insight.level);

    return (
      <div
        key={insight.key}
        className={`overflow-hidden rounded-3xl border bg-gradient-to-br ${meta.cardClassName} ${
          isMain ? 'p-4 shadow-sm' : 'p-4'
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${meta.badgeClassName}`}>
                {meta.label}
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-600">
                {getGrowthCategoryLabel(insight.category)}
              </span>
              {insight.metricLabel && (
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {insight.metricLabel}: <span className="font-extrabold text-gray-900">{insight.metricValue}</span>
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className={`hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl sm:flex ${meta.iconClassName}`}>
                {meta.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className={`${isMain ? 'text-lg' : 'text-base'} font-extrabold text-gray-900`}>
                  {insight.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {insight.cause}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
                  {insight.recommendation}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {insight.solutions.slice(0, isMain ? 2 : 3).map((solution, index) => (
                    <div key={`${insight.key}-solution-${index}`} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs leading-5 text-gray-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                      <span>{solution}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-2 lg:w-44 lg:flex-col">
            {insight.primaryActionLabel && (
              <button
                type="button"
                onClick={insight.onPrimaryAction}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                {insight.primaryActionLabel}
              </button>
            )}

            {insight.secondaryActionLabel && (
              <button
                type="button"
                onClick={insight.onSecondaryAction}
                className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                {insight.secondaryActionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGrowthAssistantCard = () => {
    const mainInsight = sellerGrowthInsights[0];
    if (!mainInsight) return null;

    const remainingInsights = sellerGrowthInsights.slice(1);
    const totalActionableInsights = sellerGrowthInsights.filter((insight) => insight.level !== 'success').length;

    return (
      <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                مساعد نمو التاجر
              </span>
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                الخطوة الجاية
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {totalActionableInsights > 0
                  ? `${totalActionableInsights} نقطة تستحق انتباهك`
                  : 'لا توجد مشكلة واضحة الآن'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">
              ركّز على أهم خطوة لتحسين نتائجك
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              نراجع منتجاتك ومتجرك ومبيعاتك ونقترح عليك أفضل خطوة عملية للنمو.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setGrowthInsightsExpanded((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
          >
            {growthInsightsExpanded ? 'إخفاء التفاصيل' : remainingInsights.length > 0 ? 'عرض كل الاقتراحات' : 'عرض التفاصيل'}
            <ChevronDown className={`h-4 w-4 transition-transform ${growthInsightsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {renderGrowthInsightCard(mainInsight, true)}

        {growthInsightsExpanded && (
          <div className="mt-4 grid gap-3">
            {remainingInsights.length > 0 ? (
              remainingInsights.map((insight) => renderGrowthInsightCard(insight))
            ) : (
              <div className="rounded-2xl border border-green-100 bg-white p-4 text-sm leading-6 text-gray-700">
                متجرك لا يظهر فيه عائق واضح الآن. استمر في مشاركة أفضل منتج، وراجع الأداء بعد وصول مشاهدات أكثر.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSellerOnboardingTasksCard = () => {
    if (areSellerOnboardingTasksDone) return renderGrowthAssistantCard();

    if (!currentSellerTask) return null;

    const progressPercentage = sellerOnboardingTasks.length > 0
      ? Math.round((completedSellerTasksCount / sellerOnboardingTasks.length) * 100)
      : 0;

    const meta = getSellerTaskStatusMeta(currentSellerTask.status);
    const visibleDetails = currentSellerTask.details.slice(0, 2);
    const visibleMissing = currentSellerTask.missing.slice(0, 2);
    const isActionDisabled = currentSellerTask.status === 'locked' || !!taskActionLoading;

    return (
      <div className="mb-6 rounded-3xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                خطواتك لأول بيع
              </span>
              <span className="text-xs font-medium text-gray-500">
                {completedSellerTasksCount} من {sellerOnboardingTasks.length} مكتملة
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                {meta.icon}
                {meta.label}
              </span>
            </div>

            <div className="mb-3 h-2 w-full max-w-xl overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold text-gray-900">
                  {currentSellerTask.order}. {currentSellerTask.title}
                </h2>
                <p className="mt-1 line-clamp-1 text-sm text-gray-600">
                  {currentSellerTask.description}
                </p>

                {(visibleDetails.length > 0 || visibleMissing.length > 0) && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {visibleDetails.map((detail, index) => (
                      <div key={`current-detail-${index}`} className="flex items-start gap-2 text-xs text-gray-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                        <span className="line-clamp-1">{detail}</span>
                      </div>
                    ))}
                    {visibleMissing.map((missingItem, index) => (
                      <div key={`current-missing-${index}`} className="flex items-start gap-2 text-xs text-orange-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{missingItem}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-row flex-wrap gap-2 md:w-44 md:flex-col">
                {currentSellerTask.actionLabel && (
                  <button
                    type="button"
                    onClick={currentSellerTask.onAction}
                    disabled={isActionDisabled}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      currentSellerTask.status === 'locked'
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                    }`}
                  >
                    {currentSellerTask.actionLabel}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTasksExpanded((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  {tasksExpanded ? 'إخفاء المهام' : 'عرض كل المهام'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${tasksExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {tasksExpanded && (
          <div className="mt-4 grid gap-3">
            {sellerOnboardingTasks.map((task) => renderSellerTaskCard(task, true))}
          </div>
        )}
      </div>
    );
  };


  if (loading && !hasCachedDashboardData) {
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
      {sellerRestrictionMessage && (
        <div className="fixed top-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800 shadow-lg">
          {sellerRestrictionMessage}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم التاجر</h1>
          <p className="text-gray-600">مرحباً {profile?.name}، إدارة متاجرك ومنتجاتك</p>
          {isAccountSuspended && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              حسابك معلق مؤقتاً، لذلك لا يمكن تنفيذ إجراءات البيع أو السحب أو تعديل المنتجات والمتاجر حتى يتم رفع التعليق.
            </div>
          )}

        </div>

        {renderSellerOnboardingTasksCard()}

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => handleTabChange('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>

            <button
              onClick={() => handleTabChange('stores')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stores' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span>المتاجر</span>
            </button>

            <button
              onClick={() => handleTabChange('marketing')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'marketing' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>التسويق</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>الطلبات</span>
            </button>

            <button
              onClick={() => handleTabChange('earnings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'earnings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>الأرباح</span>
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
                <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                      <p className="text-[11px] text-gray-400 mt-1">{FINANCIAL_CURRENCY_NOTE}</p>
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

                  <p className="mt-4 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">أفضل المنتجات أداءً</h2>
                      <p className="text-sm text-gray-600">ترتيب سريع لأكثر المنتجات نشاطاً بحسب المبيعات ثم المشاهدات.</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('products')}
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
                        onClick={() => { if (canPerformSellerAction()) setShowCreateStoreModal(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>إنشاء متجر</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (canPerformSellerAction()) setShowCreateProductModal(true); }}
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
                      <p className="mt-1 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                onClick={() => { if (canPerformSellerAction()) setShowCreateProductModal(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة منتج</span>
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات</h3>
                <p className="text-gray-600 mb-6">ابدأ بإضافة منتجك الأول</p>
                <button
                  onClick={() => { if (canPerformSellerAction()) setShowCreateProductModal(true); }}
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
                          className="h-64 bg-white flex items-center justify-center cursor-pointer overflow-hidden border-b border-gray-100"
                          onClick={() => openProduct(product)}
                          role="button"
                          tabIndex={0}
                        >
                          {product.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.name}
                              className="max-w-full max-h-full object-contain p-3"
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

                          <div className="mb-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                product.product_kind === 'digital_service'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {product.product_kind === 'digital_service' ? (
                                <Briefcase className="w-3.5 h-3.5" />
                              ) : (
                                <Package className="w-3.5 h-3.5" />
                              )}
                              {PRODUCT_KIND_LABELS[normalizeProductKind(product.product_kind)]}
                            </span>
                          </div>

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
                            onClick={() => { if (canPerformSellerAction()) setEditingProductId(product.id); }}
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
                onClick={() => { if (canPerformSellerAction()) setShowCreateStoreModal(true); }}
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
                  onClick={() => { if (canPerformSellerAction()) setShowCreateStoreModal(true); }}
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
                                  className="w-full h-full object-contain"
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
                                if (!canPerformSellerAction()) return;
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
                    {serviceActionError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {serviceActionError}
                      </div>
                    )}
                    {serviceActionSuccess && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        {serviceActionSuccess}
                      </div>
                    )}

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
                          selectedOrder.items.map((item) => {
                            const isServiceItem =
                              normalizeProductKind(item.product_kind) === 'digital_service' || Boolean(item.service_detail);
                            const detail = item.service_detail || null;
                            const detailId = detail?.id || '';
                            const status = normalizeServiceStatus(detail?.service_status);
                            const requirementText = getServiceRequirementText(detail);
                            const deliveryNoteText = getServiceDeliveryNoteText(detail);
                            const deliveryUrlText = getServiceDeliveryUrlText(detail);
                            const revisionText = getServiceRevisionText(detail);
                            const canStartWork =
                              Boolean(detailId) &&
                              (status === 'requirements_submitted' || status === 'revision_requested');
                            const canDeliver =
                              Boolean(detailId) &&
                              (status === 'requirements_submitted' ||
                                status === 'in_progress' ||
                                status === 'revision_requested');
                            const formValue = serviceDeliveryForms[detailId] || { note: '', fileUrl: '' };

                            return (
                              <div key={item.id} className="rounded-xl border border-gray-200 p-4 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-bold text-gray-900">{item.product_name}</p>
                                      {isServiceItem && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                                          <Briefcase className="w-3 h-3" />
                                          خدمة رقمية
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">الكمية: {item.quantity}</p>
                                    {isServiceItem && (
                                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                        {item.service_delivery_days ? (
                                          <span className="rounded-full bg-gray-100 px-2 py-1">
                                            مدة التنفيذ: {item.service_delivery_days} يوم
                                          </span>
                                        ) : null}
                                        {item.service_revisions_count !== null &&
                                        item.service_revisions_count !== undefined ? (
                                          <span className="rounded-full bg-gray-100 px-2 py-1">
                                            التعديلات المستخدمة: {getServiceUsedRevisions(detail)} من{' '}
                                            {getServiceMaxRevisions(item)} — المتبقي:{' '}
                                            {getServiceRemainingRevisions(item, detail)}
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-lg font-bold text-blue-600">{formatCurrency(item.amount)}</p>
                                    {isServiceItem && (
                                      <span
                                        className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getServiceStatusClass(
                                          detail?.service_status
                                        )}`}
                                      >
                                        {getServiceStatusLabel(detail?.service_status)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isServiceItem && (
                                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-4">
                                    {!detail ? (
                                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                        هذه خدمة رقمية، لكن لم تصل تفاصيل تنفيذها لهذا الطلب. غالباً يحتاج تشغيل SQL الخاص
                                        بدالة جلب تفاصيل الخدمات أو تحديث الطلبات.
                                      </div>
                                    ) : (
                                      <>
                                        <div>
                                          <h5 className="text-sm font-bold text-purple-900 mb-2">متطلبات العميل</h5>
                                          <p className="whitespace-pre-line rounded-lg bg-white p-3 text-sm text-gray-700 border border-purple-100">
                                            {requirementText || 'لم يكتب العميل تفاصيل واضحة.'}
                                          </p>
                                          {renderServiceAttachmentList(
                                            getServiceAttachmentsByContext(detail, 'requirements'),
                                            'لا توجد مرفقات من العميل مع المتطلبات.'
                                          )}
                                        </div>

                                        {detail && item.service_revisions_count !== null && item.service_revisions_count !== undefined && (
                                          <div className="rounded-lg bg-white p-3 text-xs font-semibold text-purple-700 border border-purple-100">
                                            التعديلات المستخدمة: {getServiceUsedRevisions(detail)} من{' '}
                                            {getServiceMaxRevisions(item)} — المتبقي:{' '}
                                            {getServiceRemainingRevisions(item, detail)}
                                          </div>
                                        )}

                                        {revisionText && (
                                          <div>
                                            <h5 className="text-sm font-bold text-orange-700 mb-2">طلب التعديل من العميل</h5>
                                            <p className="whitespace-pre-line rounded-lg bg-white p-3 text-sm text-gray-700 border border-orange-100">
                                              {revisionText}
                                            </p>
                                            {renderServiceAttachmentList(
                                              getServiceAttachmentsByContext(detail, 'buyer_revision'),
                                              'لا توجد مرفقات مع طلب التعديل.'
                                            )}
                                          </div>
                                        )}

                                        {deliveryNoteText || deliveryUrlText ? (
                                          <div>
                                            <h5 className="text-sm font-bold text-green-700 mb-2">آخر تسليم مرسل للعميل</h5>
                                            {deliveryNoteText && (
                                              <p className="whitespace-pre-line rounded-lg bg-white p-3 text-sm text-gray-700 border border-green-100">
                                                {deliveryNoteText}
                                              </p>
                                            )}
                                            {deliveryUrlText && (
                                              <a
                                                href={deliveryUrlText}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                                              >
                                                <LinkIcon className="w-4 h-4" />
                                                فتح رابط التسليم
                                              </a>
                                            )}
                                            {renderServiceAttachmentList(
                                              getServiceAttachmentsByContext(detail, 'seller_delivery'),
                                              'لا توجد مرفقات تسليم مرفوعة.'
                                            )}
                                          </div>
                                        ) : null}

                                        {status !== 'completed' && status !== 'cancelled' && (
                                          <div className="rounded-lg bg-white p-3 border border-purple-100 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                              {canStartWork && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartServiceWork(detailId)}
                                                  disabled={serviceActionLoadingId === detailId}
                                                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                                >
                                                  <Clock3 className="w-4 h-4" />
                                                  {serviceActionLoadingId === detailId ? 'جاري التحديث...' : 'بدء تنفيذ الخدمة'}
                                                </button>
                                              )}
                                            </div>

                                            {canDeliver && (
                                              <div className="space-y-3">
                                                <textarea
                                                  rows={3}
                                                  value={formValue.note}
                                                  onChange={(e) =>
                                                    setServiceDeliveryForms((prev) => ({
                                                      ...prev,
                                                      [detailId]: {
                                                        ...(prev[detailId] || { note: '', fileUrl: '' }),
                                                        note: e.target.value,
                                                      },
                                                    }))
                                                  }
                                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                  placeholder="اكتب رسالة التسليم للعميل مثل: تم تنفيذ التصميم، وهذه التفاصيل النهائية..."
                                                />
                                                <input
                                                  type="url"
                                                  value={formValue.fileUrl}
                                                  onChange={(e) =>
                                                    setServiceDeliveryForms((prev) => ({
                                                      ...prev,
                                                      [detailId]: {
                                                        ...(prev[detailId] || { note: '', fileUrl: '' }),
                                                        fileUrl: e.target.value,
                                                      },
                                                    }))
                                                  }
                                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                  placeholder="رابط ملف التسليم إن وجد: Google Drive / Canva / ملف..."
                                                />
                                                <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/60 p-3">
                                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700">
                                                    <Upload className="w-4 h-4" />
                                                    <span>إرفاق ملفات التسليم</span>
                                                    <input
                                                      type="file"
                                                      multiple
                                                      className="hidden"
                                                      accept="image/*,.pdf,.zip,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                      onChange={(event) => {
                                                        handleServiceDeliveryFilesSelected(detailId, event.target.files);
                                                        event.currentTarget.value = '';
                                                      }}
                                                    />
                                                  </label>

                                                  {(serviceDeliveryFiles[detailId] || []).length > 0 && (
                                                    <div className="mt-2 space-y-2">
                                                      {(serviceDeliveryFiles[detailId] || []).map((file, fileIndex) => (
                                                        <div
                                                          key={`${file.name}-${fileIndex}`}
                                                          className="flex items-center justify-between gap-2 rounded-lg border border-purple-100 bg-white px-3 py-2 text-xs"
                                                        >
                                                          <span className="flex min-w-0 items-center gap-2">
                                                            <Paperclip className="w-4 h-4 flex-shrink-0" />
                                                            <span className="truncate">{file.name}</span>
                                                            <span className="flex-shrink-0 text-gray-500">
                                                              {formatServiceAttachmentSize(file.size)}
                                                            </span>
                                                          </span>
                                                          <button
                                                            type="button"
                                                            onClick={() => removeServiceDeliveryFile(detailId, fileIndex)}
                                                            className="text-red-600 hover:text-red-700"
                                                            aria-label="حذف المرفق"
                                                          >
                                                            <X className="w-4 h-4" />
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={() => handleDeliverService(detailId)}
                                                  disabled={serviceActionLoadingId === detailId}
                                                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                                                >
                                                  <Check className="w-4 h-4" />
                                                  {serviceActionLoadingId === detailId ? 'جاري التسليم...' : 'تسليم الخدمة للعميل'}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
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
                  <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
                  <p className="mt-1 text-xs text-gray-400">{FINANCIAL_GATEWAY_NOTE}</p>
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    التوثيق والحساب البنكي لا يمنعانك من البيع أو استقبال الطلبات؛ هما مطلوبان فقط قبل إرسال طلب سحب الأرباح.
                  </div>
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
                <p className="text-sm text-gray-500">الرصيد الصافي المتاح حالياً بعد الخصومات المحتسبة</p>
                <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                <p className="text-sm text-gray-500">صافي أرباح دخلت للتاجر وتصبح متاحة بعد انتهاء فترة التعليق</p>
                <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">طلب سحب جديد</h3>
                  <p className="text-gray-600 text-sm">
                    أرسل طلب سحب من رصيدك المتاح، وسيتم مراجعته من الإدارة قبل الاعتماد.
                  </p>
                  <p className="mt-2 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                    <p>الرصيد الصافي المتاح حالياً: <span className="font-bold">{formatCurrency(availableBalance)}</span></p>
                    <p>الحد الأدنى الحالي للسحب: <span className="font-bold">{effectiveMinWithdrawalAmount} ريال</span></p>
                    {withdrawalLimitsEnabled && (
                      <>
                        <p>الحد الأقصى للطلبات: <span className="font-bold">{withdrawalRequestsMax}</span> لكل {formatPeriodLabel(withdrawalPeriodType)}</p>
                        <p>استخدمت: <span className="font-bold">{withdrawalRequestsUsed}</span> / المتبقي: <span className="font-bold">{withdrawalRequestsRemaining}</span></p>
                      </>
                    )}
                    <p>بعد إرسال الطلب سيتم خصمه تنظيمياً كسحب قيد المراجعة حتى تعتمد الإدارة الطلب.</p>
                    <p className="text-xs text-blue-700/80">المبالغ الظاهرة في المحفظة لا تمثل إجمالي سعر البيع؛ بل صافي ربح التاجر بعد خصم عمولة رقمي ورسوم الدفع.</p>
                    <p className="text-xs text-blue-700/80">{FINANCIAL_CURRENCY_NOTE}</p>
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
                    <p className="mt-1 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
                <p className="text-sm text-gray-500">آخر الحركات المالية المتعلقة بمحفظتك، مع عرض صافي مبالغ البيع بعد خصم عمولة رقمي ورسوم الدفع</p>
                <p className="mt-1 text-xs text-gray-400">{FINANCIAL_CURRENCY_NOTE}</p>
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
          onSuccess={async () => {
            await fetchDashboardData();
          }}
          onDelete={async () => {
            const deletedProductId = editingProductId;
            setEditingProductId(null);
            setProducts((currentProducts) =>
              currentProducts.filter((product) => product.id !== deletedProductId)
            );
            await fetchDashboardData({ showLoader: false });
          }}
        />
      )}
    </div>
  );
};
