import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Store as StoreIcon,
  Package,
  TrendingUp,
  AlertCircle,
  Trash2,
  Search,
  Settings,
  DollarSign,
  Receipt,
  Shield,
  Save,
  CheckCircle,
  Megaphone,
  ShieldCheck,
  Eye,
  XCircle,
  Landmark,
  RefreshCw,
  Building2,
  Wallet,
} from 'lucide-react';
import { supabase, Product, Store, UserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalUsers: number;
  totalSellers: number;
  totalStores: number;
  totalProducts: number;
  totalRevenue: number;
}

interface AdminProductUI extends Product {
  thumbnail_url?: string | null;
  display_name?: string;
}

interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  source: 'users_profile' | 'profiles' | 'merchant' | 'store' | 'activity';
  source_label?: string;
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

interface IdentityVerificationUI extends IdentityVerificationRow {
  user_name?: string;
  user_email?: string;
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

interface BankAccountUI extends BankAccountRow {
  merchant_user_id?: string;
  merchant_name?: string;
  merchant_email?: string;
  store_name?: string;
  store_slug?: string;
}

type AdminFinancialFilter = 'all' | 'today' | 'week' | 'month';
type AdminFinancialRecordTab = 'all' | 'sales' | 'subscriptions' | 'withdrawals';

interface AdminSaleRow {
  id: string;
  order_number: string;
  total_amount: number;
  seller_amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
  currency: string;
  payment_transaction_id?: string | null;
  payment_provider_order_id?: string | null;
  seller_id?: string | null;
  merchant_id?: string | null;
  customer_id?: string | null;
  customer_name: string;
  merchant_name: string;
  store_name: string;
  product_summary: string;
  quantity_total: number;
}

interface AdminWithdrawalRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  merchant_id?: string | null;
  merchant_user_id?: string | null;
  merchant_name: string;
  store_name: string;
  source_table: 'withdrawal_requests' | 'withdrawals';
}

interface AdminSubscriptionRow {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_email: string;
  plan_id?: string | null;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  interval?: string | null;
  created_at: string;
  paid_at?: string | null;
  paymob_order_id?: string | null;
  paymob_transaction_id?: string | null;
}

interface AdminFinancialStats {
  paidSalesTotal: number;
  platformFeesTotal: number;
  merchantRevenueTotal: number;
  subscriptionRevenueTotal: number;
  platformTotalRevenue: number;
  paidSalesCount: number;
  pendingSalesCount: number;
  failedSalesCount: number;
  subscriptionPaidCount: number;
  subscriptionPendingCount: number;
  withdrawalsPaidTotal: number;
  withdrawalsPendingTotal: number;
  withdrawalsCount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'stores'
    | 'products'
    | 'financial-transactions'
    | 'payment-settings'
    | 'merchant-verifications'
    | 'bank-account-verifications'
  >('overview');

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    totalStores: 0,
    totalProducts: 0,
    totalRevenue: 0,
  });

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<AdminProductUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paymentKeys, setPaymentKeys] = useState({
    api_key: '',
    integration_id: '',
    hmac_secret: '',
  });

  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [verifications, setVerifications] = useState<IdentityVerificationUI[]>([]);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [verificationActionLoading, setVerificationActionLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentLoading, setDocumentLoading] = useState<'front' | 'back' | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [frontSignedUrl, setFrontSignedUrl] = useState<string | null>(null);
  const [backSignedUrl, setBackSignedUrl] = useState<string | null>(null);

  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);

  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountUI[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [bankAccountFilter, setBankAccountFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [bankAccountActionLoading, setBankAccountActionLoading] = useState(false);
  const [bankAccountMessage, setBankAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bankAccountRejectionReason, setBankAccountRejectionReason] = useState('');
  const [pendingBankAccountsCount, setPendingBankAccountsCount] = useState(0);

  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialRefreshing, setFinancialRefreshing] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [financialFilter, setFinancialFilter] = useState<AdminFinancialFilter>('all');
  const [financialRecordTab, setFinancialRecordTab] = useState<AdminFinancialRecordTab>('all');
  const [financialSearchQuery, setFinancialSearchQuery] = useState('');
  const [salesRecords, setSalesRecords] = useState<AdminSaleRow[]>([]);
  const [subscriptionRecords, setSubscriptionRecords] = useState<AdminSubscriptionRow[]>([]);
  const [withdrawalRecords, setWithdrawalRecords] = useState<AdminWithdrawalRow[]>([]);
  const [financialStats, setFinancialStats] = useState<AdminFinancialStats>({
    paidSalesTotal: 0,
    platformFeesTotal: 0,
    merchantRevenueTotal: 0,
    subscriptionRevenueTotal: 0,
    platformTotalRevenue: 0,
    paidSalesCount: 0,
    pendingSalesCount: 0,
    failedSalesCount: 0,
    subscriptionPaidCount: 0,
    subscriptionPendingCount: 0,
    withdrawalsPaidTotal: 0,
    withdrawalsPendingTotal: 0,
    withdrawalsCount: 0,
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      fetchDashboardData();

      if (activeTab === 'payment-settings') {
        loadPaymentKeys();
      }

      if (activeTab === 'merchant-verifications') {
        fetchMerchantVerifications();
      }

      if (activeTab === 'bank-account-verifications') {
        fetchBankAccountVerifications();
      }

      if (activeTab === 'financial-transactions') {
        fetchFinancialTransactions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeTab]);

  useEffect(() => {
    if (activeTab === 'merchant-verifications' && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
      fetchMerchantVerifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationFilter]);

  useEffect(() => {
    if (activeTab === 'bank-account-verifications' && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
      fetchBankAccountVerifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountFilter]);

  useEffect(() => {
    if (activeTab === 'financial-transactions' && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
      fetchFinancialTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialFilter]);

  const selectedVerification = useMemo(
    () => verifications.find((v) => v.id === selectedVerificationId) || null,
    [verifications, selectedVerificationId]
  );

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((v) => v.id === selectedBankAccountId) || null,
    [bankAccounts, selectedBankAccountId]
  );

  useEffect(() => {
    setFrontSignedUrl(null);
    setBackSignedUrl(null);
    setDocumentError('');
    setRejectionReason(selectedVerification?.rejection_reason || '');
  }, [selectedVerificationId, selectedVerification?.rejection_reason]);

  useEffect(() => {
    setBankAccountRejectionReason(selectedBankAccount?.rejection_reason || '');
  }, [selectedBankAccountId, selectedBankAccount?.rejection_reason]);

  const fetchDashboardData = async () => {
    try {
      const [
        usersRes,
        profilesRes,
        merchantsRes,
        storesRes,
        productsRes,
        verificationsRes,
        bankAccountsRes,
        ordersRes,
        favoritesRes,
        viewedProductsRes,
      ] = await Promise.all([
        supabase.from('users_profile').select('id, name, email, role, created_at'),
        supabase.from('profiles').select('*'),
        supabase.from('merchants').select('id, user_id, store_name, store_slug, created_at'),
        supabase.from('stores').select('*'),
        supabase.from('products').select('*'),
        supabase.from('identity_verifications').select('id, status'),
        supabase.from('bank_accounts').select('id, status'),
        supabase.from('orders').select('user_id, customer_id, created_at'),
        supabase.from('favorites').select('user_id, created_at'),
        supabase.from('viewed_products').select('user_id, created_at, viewed_at'),
      ]);

      if (usersRes.error) console.error('users_profile fetch error:', usersRes.error);
      if (profilesRes.error) console.error('profiles fetch error:', profilesRes.error);
      if (merchantsRes.error) console.error('merchants fetch error:', merchantsRes.error);
      if (storesRes.error) console.error('stores fetch error:', storesRes.error);
      if (productsRes.error) console.error('products fetch error:', productsRes.error);
      if (verificationsRes.error) console.error('identity_verifications fetch error:', verificationsRes.error);
      if (bankAccountsRes.error) console.error('bank_accounts fetch error:', bankAccountsRes.error);
      if (ordersRes.error) console.error('orders fetch error:', ordersRes.error);
      if (favoritesRes.error) console.error('favorites fetch error:', favoritesRes.error);
      if (viewedProductsRes.error) console.error('viewed_products fetch error:', viewedProductsRes.error);

      const usersData = (usersRes.data || []) as any[];
      const profilesData = (profilesRes.data || []) as any[];
      const merchantsData = (merchantsRes.data || []) as Array<{
        id: string;
        user_id?: string | null;
        store_name?: string | null;
        store_slug?: string | null;
        created_at?: string | null;
      }>;
      const storesData = (storesRes.data || []) as any[];
      const productsData = (productsRes.data || []) as any[];
      const ordersData = (ordersRes.data || []) as Array<{
        user_id?: string | null;
        customer_id?: string | null;
        created_at?: string | null;
      }>;
      const favoritesData = (favoritesRes.data || []) as Array<{
        user_id?: string | null;
        created_at?: string | null;
      }>;
      const viewedProductsData = (viewedProductsRes.data || []) as Array<{
        user_id?: string | null;
        created_at?: string | null;
        viewed_at?: string | null;
      }>;

      const productIds = productsData.map((product) => product?.id).filter(Boolean);
      const thumbnailMap: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: productImagesData, error: productImagesError } = await supabase
          .from('product_images')
          .select('product_id, image_url, is_primary, display_order, created_at')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (productImagesError) {
          console.error('product_images fetch error:', productImagesError);
        } else {
          for (const row of (productImagesData || []) as any[]) {
            if (row?.product_id && row?.image_url && !thumbnailMap[row.product_id]) {
              thumbnailMap[row.product_id] = row.image_url;
            }
          }
        }
      }

      const productsWithThumbnails: AdminProductUI[] = productsData.map((product) => ({
        ...(product as Product),
        thumbnail_url:
          product?.thumbnail_url ||
          product?.image_url ||
          product?.cover_image_url ||
          thumbnailMap[product.id] ||
          null,
        display_name: product?.title || product?.name || '—',
      }));

      setStores(storesData || []);
      setProducts(productsWithThumbnails);

      const mergedUsersMap = new Map<string, AdminUserListItem>();

      const normalizeRole = (value: string | null | undefined) => {
        const role = (value || '').toString().toLowerCase();
        if (role === 'admin' || role === 'superadmin') return role;
        if (role === 'seller' || role === 'merchant') return 'seller';
        return 'customer';
      };

      const upsertUser = (item: AdminUserListItem) => {
        if (!item?.id) return;

        const existing = mergedUsersMap.get(item.id);

        if (!existing) {
          mergedUsersMap.set(item.id, item);
          return;
        }

        const existingRole = normalizeRole(existing.role);
        const incomingRole = normalizeRole(item.role);

        const nextRole =
          existingRole === 'admin' || existingRole === 'superadmin'
            ? existingRole
            : incomingRole === 'admin' || incomingRole === 'superadmin'
            ? incomingRole
            : existingRole === 'seller' || incomingRole === 'seller'
            ? 'seller'
            : 'customer';

        mergedUsersMap.set(item.id, {
          ...existing,
          ...item,
          name: existing.name || item.name,
          email: existing.email || item.email,
          role: nextRole,
          created_at: existing.created_at || item.created_at || new Date().toISOString(),
          source:
            existing.source === 'users_profile'
              ? 'users_profile'
              : item.source === 'users_profile'
              ? 'users_profile'
              : existing.source === 'profiles'
              ? 'profiles'
              : item.source === 'profiles'
              ? 'profiles'
              : existing.source,
          source_label: existing.source_label || item.source_label,
        });
      };

      for (const user of usersData) {
        if (!user?.id) continue;

        upsertUser({
          id: user.id,
          name: user.name || null,
          email: user.email || null,
          role: normalizeRole(user.role),
          created_at: user.created_at || new Date().toISOString(),
          source: 'users_profile',
          source_label: 'users_profile',
        });
      }

      for (const profileRow of profilesData) {
        if (!profileRow?.id) continue;

        upsertUser({
          id: profileRow.id,
          name: profileRow.name || profileRow.full_name || profileRow.username || null,
          email: profileRow.email || null,
          role: normalizeRole(profileRow.role),
          created_at: profileRow.created_at || new Date().toISOString(),
          source: 'profiles',
          source_label: 'profiles',
        });
      }

      const sellerIds = new Set<string>();

      for (const merchant of merchantsData) {
        const merchantUserId = merchant?.user_id;
        if (!merchantUserId) continue;

        sellerIds.add(merchantUserId);

        upsertUser({
          id: merchantUserId,
          name: null,
          email: null,
          role: 'seller',
          created_at: merchant.created_at || new Date().toISOString(),
          source: 'merchant',
          source_label: merchant.store_slug || merchant.store_name || 'merchant',
        });
      }

      for (const store of storesData) {
        const storeUserId = store?.user_id;
        if (!storeUserId) continue;

        sellerIds.add(storeUserId);

        upsertUser({
          id: storeUserId,
          name: null,
          email: null,
          role: 'seller',
          created_at: store?.created_at || new Date().toISOString(),
          source: 'store',
          source_label: store?.slug || store?.name || 'store',
        });
      }

      const customerCreatedAtMap = new Map<string, string>();

      for (const order of ordersData) {
        const possibleIds = [order?.user_id, order?.customer_id].filter(Boolean) as string[];
        for (const id of possibleIds) {
          if (!customerCreatedAtMap.has(id) && order?.created_at) {
            customerCreatedAtMap.set(id, order.created_at);
          }
        }
      }

      for (const row of favoritesData) {
        const id = row?.user_id;
        if (id && !customerCreatedAtMap.has(id) && row?.created_at) {
          customerCreatedAtMap.set(id, row.created_at);
        }
      }

      for (const row of viewedProductsData) {
        const id = row?.user_id;
        const createdAt = row?.created_at || row?.viewed_at || null;
        if (id && !customerCreatedAtMap.has(id) && createdAt) {
          customerCreatedAtMap.set(id, createdAt);
        }
      }

      for (const [userId, createdAt] of customerCreatedAtMap.entries()) {
        if (sellerIds.has(userId)) continue;

        upsertUser({
          id: userId,
          name: null,
          email: null,
          role: 'customer',
          created_at: createdAt || new Date().toISOString(),
          source: 'activity',
          source_label: 'activity',
        });
      }

      const mergedUsers = Array.from(mergedUsersMap.values())
        .map((user) => ({
          ...user,
          name:
            user.name ||
            (user.role === 'seller'
              ? `تاجر ${user.id.slice(0, 8)}`
              : user.role === 'admin' || user.role === 'superadmin'
              ? `مدير ${user.id.slice(0, 8)}`
              : `مستخدم ${user.id.slice(0, 8)}`),
        }))
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        });

      setUsers(mergedUsers);

      const totalSellerIds = new Set<string>(
        mergedUsers
          .filter((user) => user.role === 'seller')
          .map((user) => user.id)
          .filter(Boolean)
      );

      setStats({
        totalUsers: mergedUsers.length,
        totalSellers: totalSellerIds.size,
        totalStores: storesData.length || 0,
        totalProducts: productsData.length || 0,
        totalRevenue: 0,
      });

      const pendingCount = (verificationsRes.data || []).filter((v: any) => v.status === 'pending').length;
      setPendingVerificationsCount(pendingCount);

      const pendingBankCount = (bankAccountsRes.data || []).filter((v: any) => v.status === 'pending').length;
      setPendingBankAccountsCount(pendingBankCount);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantVerifications = async () => {
    try {
      setVerificationsLoading(true);
      setVerificationMessage(null);

      let query = supabase
        .from('identity_verifications')
        .select('*')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (verificationFilter !== 'all') {
        query = query.eq('status', verificationFilter);
      }

      const { data: verificationRows, error: verificationError } = await query;

      if (verificationError) throw verificationError;

      const rows = (verificationRows || []) as IdentityVerificationRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

      const userMap: Record<string, { name?: string; email?: string }> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users_profile')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          console.error('users_profile fetch for verifications error:', usersError);
        } else {
          for (const user of usersData || []) {
            userMap[(user as any).id] = {
              name: (user as any).name,
              email: (user as any).email,
            };
          }
        }
      }

      const uiRows: IdentityVerificationUI[] = rows.map((row) => ({
        ...row,
        user_name: userMap[row.user_id]?.name || row.full_name || '—',
        user_email: userMap[row.user_id]?.email || '—',
      }));

      setVerifications(uiRows);

      if (uiRows.length > 0) {
        const currentExists = uiRows.some((row) => row.id === selectedVerificationId);
        if (!currentExists) {
          setSelectedVerificationId(uiRows[0].id);
        }
      } else {
        setSelectedVerificationId(null);
      }

      const { data: countRows } = await supabase.from('identity_verifications').select('id, status');
      const pendingCount = (countRows || []).filter((v: any) => v.status === 'pending').length;
      setPendingVerificationsCount(pendingCount);
    } catch (error: any) {
      console.error('fetchMerchantVerifications error:', error);
      setVerificationMessage({
        type: 'error',
        text: error?.message || 'تعذر تحميل طلبات توثيق الهوية',
      });
    } finally {
      setVerificationsLoading(false);
    }
  };

  const fetchBankAccountVerifications = async () => {
    try {
      setBankAccountsLoading(true);
      setBankAccountMessage(null);

      let query = supabase
        .from('bank_accounts')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (bankAccountFilter !== 'all') {
        query = query.eq('status', bankAccountFilter);
      }

      const { data: bankAccountRows, error: bankAccountsError } = await query;

      if (bankAccountsError) throw bankAccountsError;

      const rows = (bankAccountRows || []) as BankAccountRow[];
      const merchantIds = Array.from(new Set(rows.map((r) => r.merchant_id).filter(Boolean)));

      const merchantMap: Record<
        string,
        {
          user_id?: string;
          store_name?: string;
          store_slug?: string;
        }
      > = {};

      if (merchantIds.length > 0) {
        const { data: merchantsData, error: merchantsError } = await supabase
          .from('merchants')
          .select('id, user_id, store_name, store_slug')
          .in('id', merchantIds);

        if (merchantsError) {
          console.error('merchants fetch for bank accounts error:', merchantsError);
        } else {
          for (const merchant of merchantsData || []) {
            merchantMap[(merchant as any).id] = {
              user_id: (merchant as any).user_id,
              store_name: (merchant as any).store_name,
              store_slug: (merchant as any).store_slug,
            };
          }
        }
      }

      const userIds = Array.from(
        new Set(
          rows
            .map((row) => merchantMap[row.merchant_id]?.user_id)
            .filter(Boolean)
        )
      ) as string[];

      const userMap: Record<string, { name?: string; email?: string }> = {};

      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users_profile')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          console.error('users_profile fetch for bank accounts error:', usersError);
        } else {
          for (const user of usersData || []) {
            userMap[(user as any).id] = {
              name: (user as any).name,
              email: (user as any).email,
            };
          }
        }
      }

      const uiRows: BankAccountUI[] = rows.map((row) => {
        const merchant = merchantMap[row.merchant_id];
        const merchantUserId = merchant?.user_id;
        return {
          ...row,
          merchant_user_id: merchantUserId,
          merchant_name: merchantUserId ? userMap[merchantUserId]?.name || '—' : '—',
          merchant_email: merchantUserId ? userMap[merchantUserId]?.email || '—' : '—',
          store_name: merchant?.store_name || '—',
          store_slug: merchant?.store_slug || '',
        };
      });

      setBankAccounts(uiRows);

      if (uiRows.length > 0) {
        const currentExists = uiRows.some((row) => row.id === selectedBankAccountId);
        if (!currentExists) {
          setSelectedBankAccountId(uiRows[0].id);
        }
      } else {
        setSelectedBankAccountId(null);
      }

      const { data: countRows } = await supabase.from('bank_accounts').select('id, status');
      const pendingCount = (countRows || []).filter((v: any) => v.status === 'pending').length;
      setPendingBankAccountsCount(pendingCount);
    } catch (error: any) {
      console.error('fetchBankAccountVerifications error:', error);
      setBankAccountMessage({
        type: 'error',
        text: error?.message || 'تعذر تحميل طلبات الحسابات البنكية',
      });
    } finally {
      setBankAccountsLoading(false);
    }
  };



  const getFinancialPeriodStart = (value: AdminFinancialFilter) => {
    const now = new Date();

    if (value === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }

    if (value === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }

    if (value === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }

    return null;
  };

  const getFinancialStatusMeta = (status?: string | null) => {
    const normalized = (status || '').toLowerCase();

    if (['paid', 'completed', 'approved'].includes(normalized)) {
      return { label: 'ناجح', className: 'bg-green-100 text-green-700' };
    }

    if (['pending', 'pending_payment', 'on_hold'].includes(normalized)) {
      return { label: 'قيد المراجعة', className: 'bg-yellow-100 text-yellow-700' };
    }

    if (['failed', 'canceled', 'cancelled', 'rejected'].includes(normalized)) {
      return { label: 'فاشل', className: 'bg-red-100 text-red-700' };
    }

    return { label: status || 'غير معروف', className: 'bg-gray-100 text-gray-700' };
  };

  const formatMoney = (value: number, currency: string = 'SAR') => {
    return `${Number(value || 0).toFixed(2)} ${currency === 'SAR' ? 'ريال' : currency}`;
  };

  const fetchFinancialTransactions = async () => {
    const PAID_ORDER_STATUSES = new Set(['paid', 'completed']);
    const PENDING_ORDER_STATUSES = new Set(['pending', 'pending_payment', 'on_hold', 'processing']);
    const FAILED_ORDER_STATUSES = new Set(['failed', 'canceled', 'cancelled', 'rejected']);

    const PAID_SUBSCRIPTION_STATUSES = new Set(['paid', 'completed', 'success', 'succeeded', 'active', 'approved']);
    const PENDING_SUBSCRIPTION_STATUSES = new Set(['pending', 'processing', 'pending_payment', 'created']);

    const PAID_WITHDRAWAL_STATUSES = new Set(['paid', 'approved', 'completed', 'success', 'succeeded']);
    const PENDING_WITHDRAWAL_STATUSES = new Set(['pending', 'on_hold', 'processing', 'review']);

    const isAccessError = (error: any) => {
      const message = (error?.message || '').toLowerCase();
      const code = (error?.code || '').toString().toLowerCase();
      return (
        code === '42501' ||
        message.includes('permission denied') ||
        message.includes('row-level security') ||
        message.includes('not allowed')
      );
    };

    try {
      setFinancialError(null);
      setFinancialLoading(true);

      const startDate = getFinancialPeriodStart(financialFilter);

      const fetchOrdersWithFallback = async () => {
        const attempts = [
          'id, order_number, total_amount, seller_amount, status, created_at, paid_at, currency, payment_transaction_id, payment_provider_order_id, seller_id, merchant_id, user_id, customer_id, customer_name, customer_email, customer_phone',
          'id, order_number, total_amount, seller_amount, status, created_at, paid_at, currency, payment_transaction_id, seller_id, merchant_id, user_id, customer_id, customer_name, customer_email, customer_phone',
          'id, order_number, total_amount, seller_amount, status, created_at, paid_at, currency, user_id, customer_id, customer_name, customer_email, customer_phone',
          'id, order_number, total_amount, seller_amount, status, created_at, currency, user_id, customer_id'
        ];

        let lastError: any = null;

        for (const selectClause of attempts) {
          let query = supabase
            .from('orders')
            .select(selectClause)
            .order('paid_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

          if (startDate) {
            query = query.gte('created_at', startDate);
          }

          const result = await query;
          if (!result.error) {
            return result.data || [];
          }

          lastError = result.error;
          console.error('orders query attempt failed:', selectClause, result.error);
        }

        if (isAccessError(lastError)) {
          throw new Error('لا توجد صلاحية للأدمن لقراءة جدول orders من الواجهة. أضف سياسة SELECT للأدمن على جدول orders ثم أعد المحاولة.');
        }

        throw lastError;
      };

      const fetchOrderItemsWithFallback = async (orderIds: string[]) => {
        if (orderIds.length === 0) return [] as any[];

        const attempts = [
          'order_id, product_id, product_name, quantity, subtotal, seller_id, merchant_id',
          'order_id, product_id, quantity, subtotal, seller_id, merchant_id',
          'order_id, product_id, quantity, seller_id, merchant_id',
          'order_id, product_id, quantity'
        ];

        let lastError: any = null;

        for (const selectClause of attempts) {
          const result = await supabase.from('order_items').select(selectClause).in('order_id', orderIds);
          if (!result.error) {
            return result.data || [];
          }

          lastError = result.error;
          console.error('order_items query attempt failed:', selectClause, result.error);
        }

        if (isAccessError(lastError)) {
          throw new Error('لا توجد صلاحية للأدمن لقراءة جدول order_items من الواجهة. أضف سياسة SELECT للأدمن على جدول order_items ثم أعد المحاولة.');
        }

        return [] as any[];
      };

      const fetchSubscriptionPaymentsWithFallback = async () => {
        const attempts = [
          'id, user_id, plan_id, amount, currency, interval, status, created_at, paid_at, paymob_order_id, paymob_transaction_id',
          'id, user_id, plan_id, amount, currency, interval, status, created_at, paid_at, paymob_order_id',
          'id, user_id, plan_id, amount, currency, interval, status, created_at, paid_at',
          'id, user_id, plan_id, amount, currency, status, created_at'
        ];

        let lastError: any = null;

        for (const selectClause of attempts) {
          let query = supabase
            .from('subscription_payments')
            .select(selectClause)
            .order('paid_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

          if (startDate) {
            query = query.gte('created_at', startDate);
          }

          const result = await query;
          if (!result.error) {
            return result.data || [];
          }

          lastError = result.error;
          console.error('subscription_payments query attempt failed:', selectClause, result.error);
        }

        if (isAccessError(lastError)) {
          throw new Error('لا توجد صلاحية للأدمن لقراءة جدول subscription_payments من الواجهة. أضف سياسة SELECT للأدمن على جدول subscription_payments ثم أعد المحاولة.');
        }

        throw lastError;
      };

      const fetchWithdrawalTable = async (tableName: 'withdrawal_requests' | 'withdrawals') => {
        const attempts = [
          'id, amount, status, created_at, approved_at, processed_at, merchant_id',
          'id, amount, status, created_at, approved_at, merchant_id',
          'id, amount, status, created_at, merchant_id'
        ];

        let lastError: any = null;

        for (const selectClause of attempts) {
          let query = supabase
            .from(tableName)
            .select(selectClause)
            .order('processed_at', { ascending: false, nullsFirst: false })
            .order('approved_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

          if (startDate) {
            query = query.gte('created_at', startDate);
          }

          const result = await query;
          if (!result.error) {
            return result.data || [];
          }

          lastError = result.error;
          console.error(`${tableName} query attempt failed:`, selectClause, result.error);
        }

        if (isAccessError(lastError)) {
          throw new Error(`لا توجد صلاحية للأدمن لقراءة جدول ${tableName} من الواجهة. أضف سياسة SELECT للأدمن على هذا الجدول ثم أعد المحاولة.`);
        }

        return [] as any[];
      };

      const ordersData = await fetchOrdersWithFallback();
      const orderIds = ordersData.map((order: any) => order.id).filter(Boolean);
      const orderItemsData = await fetchOrderItemsWithFallback(orderIds);
      const subscriptionPaymentsData = await fetchSubscriptionPaymentsWithFallback();

      let withdrawalsSourceTable: 'withdrawal_requests' | 'withdrawals' = 'withdrawal_requests';
      let withdrawalsSourceRows = await fetchWithdrawalTable('withdrawal_requests');
      if (!withdrawalsSourceRows.length) {
        const fallbackRows = await fetchWithdrawalTable('withdrawals');
        if (fallbackRows.length) {
          withdrawalsSourceRows = fallbackRows;
          withdrawalsSourceTable = 'withdrawals';
        }
      }

      const orderMerchantIds = new Set<string>();
      const orderSellerUserIds = new Set<string>();
      const orderCustomerUserIds = new Set<string>();
      const planIds = new Set<string>();
      const withdrawalMerchantIds = new Set<string>();

      for (const order of ordersData) {
        if (order?.merchant_id) orderMerchantIds.add(order.merchant_id);
        if (order?.seller_id) orderSellerUserIds.add(order.seller_id);
        if (order?.customer_id) orderCustomerUserIds.add(order.customer_id);
        if (order?.user_id) orderCustomerUserIds.add(order.user_id);
      }

      for (const item of orderItemsData) {
        if (item?.merchant_id) orderMerchantIds.add(item.merchant_id);
        if (item?.seller_id) orderSellerUserIds.add(item.seller_id);
      }

      for (const payment of subscriptionPaymentsData) {
        if (payment?.user_id) orderCustomerUserIds.add(payment.user_id);
        if (payment?.plan_id) planIds.add(payment.plan_id);
      }

      for (const withdrawal of withdrawalsSourceRows) {
        if (withdrawal?.merchant_id) withdrawalMerchantIds.add(withdrawal.merchant_id);
      }

      const merchantIds = Array.from(new Set([...orderMerchantIds, ...withdrawalMerchantIds]));
      const sellerUserIds = Array.from(orderSellerUserIds);
      const customerUserIds = Array.from(orderCustomerUserIds);
      const allUserIds = Array.from(new Set([...sellerUserIds, ...customerUserIds]));

      const usersMap = new Map<string, { name: string; email: string | null }>();
      const merchantsMap = new Map<string, { user_id: string | null; store_name: string | null }>();
      const storesByUserMap = new Map<string, { name: string | null; slug: string | null }>();
      const plansMap = new Map<string, { name: string | null; interval: string | null }>();

      if (allUserIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users_profile')
          .select('id, name, email')
          .in('id', allUserIds);

        if (usersError) {
          console.error('users_profile fetch error:', usersError);
        } else {
          for (const user of usersData || []) {
            usersMap.set((user as any).id, {
              name: (user as any).name || '—',
              email: (user as any).email || null,
            });
          }
        }
      }

      if (merchantIds.length > 0) {
        const { data: merchantsData, error: merchantsError } = await supabase
          .from('merchants')
          .select('id, user_id, store_name')
          .in('id', merchantIds);

        if (merchantsError) {
          console.error('merchants fetch error:', merchantsError);
        } else {
          for (const merchant of merchantsData || []) {
            merchantsMap.set((merchant as any).id, {
              user_id: (merchant as any).user_id || null,
              store_name: (merchant as any).store_name || null,
            });
          }
        }
      }

      if (sellerUserIds.length > 0) {
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id, user_id, name, slug')
          .in('user_id', sellerUserIds);

        if (storesError) {
          console.error('stores fetch error:', storesError);
        } else {
          for (const store of storesData || []) {
            storesByUserMap.set((store as any).user_id, {
              name: (store as any).name || null,
              slug: (store as any).slug || null,
            });
          }
        }
      }

      if (planIds.size > 0) {
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('id, name, interval')
          .in('id', Array.from(planIds));

        if (plansError) {
          console.error('plans fetch error:', plansError);
        } else {
          for (const plan of plansData || []) {
            plansMap.set((plan as any).id, {
              name: (plan as any).name || null,
              interval: (plan as any).interval || null,
            });
          }
        }
      }

      const itemsByOrder = new Map<string, any[]>();
      for (const item of orderItemsData) {
        const orderId = item.order_id;
        if (!orderId) continue;
        if (!itemsByOrder.has(orderId)) {
          itemsByOrder.set(orderId, []);
        }
        itemsByOrder.get(orderId)!.push(item);
      }

      const salesRows: AdminSaleRow[] = (ordersData || []).map((order: any) => {
        const items = itemsByOrder.get(order.id) || [];
        const quantityTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const productSummary =
          items.length === 0
            ? '—'
            : items
                .slice(0, 3)
                .map((item) => item.product_name || `منتج ${String(item.product_id || '').slice(0, 8)}`)
                .join('، ') + (items.length > 3 ? ` +${items.length - 3}` : '');

        const itemSellerId = items.find((item) => item?.seller_id)?.seller_id || null;
        const itemMerchantId = items.find((item) => item?.merchant_id)?.merchant_id || null;
        const merchantId = order.merchant_id || itemMerchantId || null;
        const sellerId = order.seller_id || itemSellerId || merchantsMap.get(merchantId || '')?.user_id || null;
        const customerId = order.customer_id || order.user_id || null;
        const merchantName = usersMap.get(sellerId || '')?.name || 'غير معروف';
        const customerName = order.customer_name || usersMap.get(customerId || '')?.name || 'غير معروف';
        const storeName = storesByUserMap.get(sellerId || '')?.name || merchantsMap.get(merchantId || '')?.store_name || '—';

        const totalAmount = Number(order.total_amount || 0);
        const finalSellerAmount = Number(order.seller_amount || 0);
        const platformFee = Math.max(totalAmount - finalSellerAmount, 0);

        return {
          id: order.id,
          order_number: order.order_number || `ORD-${String(order.id).slice(0, 8)}`,
          total_amount: totalAmount,
          seller_amount: finalSellerAmount,
          platform_fee: platformFee,
          status: order.status || 'unknown',
          created_at: order.paid_at || order.created_at,
          currency: order.currency || 'SAR',
          payment_transaction_id: order.payment_transaction_id || null,
          payment_provider_order_id: order.payment_provider_order_id || null,
          seller_id: sellerId,
          merchant_id: merchantId,
          customer_id: customerId,
          customer_name: customerName,
          merchant_name: merchantName,
          store_name: storeName,
          product_summary: productSummary,
          quantity_total: quantityTotal,
        };
      });

      const subscriptionRows: AdminSubscriptionRow[] = (subscriptionPaymentsData || []).map((payment: any) => {
        const userId = payment.user_id || null;
        const planId = payment.plan_id || null;
        const plan = plansMap.get(planId || '');
        const user = usersMap.get(userId || '');
        return {
          id: payment.id,
          user_id: userId,
          user_name: user?.name || 'غير معروف',
          user_email: user?.email || '—',
          plan_id: planId,
          plan_name: plan?.name || (planId ? `باقة ${String(planId).slice(0, 8)}` : '—'),
          amount: Number(payment.amount || 0),
          currency: payment.currency || 'SAR',
          status: payment.status || 'unknown',
          interval: payment.interval || plan?.interval || null,
          created_at: payment.paid_at || payment.created_at || new Date().toISOString(),
          paid_at: payment.paid_at || null,
          paymob_order_id: payment.paymob_order_id || null,
          paymob_transaction_id: payment.paymob_transaction_id || null,
        };
      });

      const withdrawalsRows: AdminWithdrawalRow[] = (withdrawalsSourceRows || []).map((row: any) => {
        const merchant = merchantsMap.get(row.merchant_id || '');
        const merchantUserId = merchant?.user_id || null;
        return {
          id: row.id,
          amount: Number(row.amount || 0),
          status: row.status || 'unknown',
          created_at: row.processed_at || row.approved_at || row.created_at,
          merchant_id: row.merchant_id || null,
          merchant_user_id: merchantUserId,
          merchant_name: merchantUserId ? usersMap.get(merchantUserId)?.name || 'غير معروف' : 'غير معروف',
          store_name: merchant?.store_name || storesByUserMap.get(merchantUserId || '')?.name || '—',
          source_table: withdrawalsSourceTable,
        };
      });

      const paidSales = salesRows.filter((row) => PAID_ORDER_STATUSES.has((row.status || '').toLowerCase()));
      const pendingSales = salesRows.filter((row) => PENDING_ORDER_STATUSES.has((row.status || '').toLowerCase()));
      const failedSales = salesRows.filter((row) => FAILED_ORDER_STATUSES.has((row.status || '').toLowerCase()));
      const paidSubscriptions = subscriptionRows.filter((row) => PAID_SUBSCRIPTION_STATUSES.has((row.status || '').toLowerCase()));
      const pendingSubscriptions = subscriptionRows.filter((row) => PENDING_SUBSCRIPTION_STATUSES.has((row.status || '').toLowerCase()));
      const paidWithdrawals = withdrawalsRows.filter((row) => PAID_WITHDRAWAL_STATUSES.has((row.status || '').toLowerCase()));
      const pendingWithdrawals = withdrawalsRows.filter((row) => PENDING_WITHDRAWAL_STATUSES.has((row.status || '').toLowerCase()));

      const paidSalesTotal = paidSales.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
      const merchantRevenueTotal = paidSales.reduce((sum, row) => sum + Number(row.seller_amount || 0), 0);
      const platformFeesTotal = paidSales.reduce((sum, row) => sum + Number(row.platform_fee || 0), 0);
      const subscriptionRevenueTotal = paidSubscriptions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const platformTotalRevenue = platformFeesTotal + subscriptionRevenueTotal;
      const withdrawalsPaidTotal = paidWithdrawals.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const withdrawalsPendingTotal = pendingWithdrawals.reduce((sum, row) => sum + Number(row.amount || 0), 0);

      setSalesRecords(salesRows);
      setSubscriptionRecords(subscriptionRows);
      setWithdrawalRecords(withdrawalsRows);
      setFinancialStats({
        paidSalesTotal,
        platformFeesTotal,
        merchantRevenueTotal,
        subscriptionRevenueTotal,
        platformTotalRevenue,
        paidSalesCount: paidSales.length,
        pendingSalesCount: pendingSales.length,
        failedSalesCount: failedSales.length,
        subscriptionPaidCount: paidSubscriptions.length,
        subscriptionPendingCount: pendingSubscriptions.length,
        withdrawalsPaidTotal,
        withdrawalsPendingTotal,
        withdrawalsCount: withdrawalsRows.length,
      });

      setStats((prev) => ({
        ...prev,
        totalRevenue: platformTotalRevenue,
      }));
    } catch (error: any) {
      console.error('fetchFinancialTransactions error:', error);
      setFinancialError(error?.message || 'تعذر تحميل المعاملات المالية');
      setSalesRecords([]);
      setSubscriptionRecords([]);
      setWithdrawalRecords([]);
      setFinancialStats({
        paidSalesTotal: 0,
        platformFeesTotal: 0,
        merchantRevenueTotal: 0,
        subscriptionRevenueTotal: 0,
        platformTotalRevenue: 0,
        paidSalesCount: 0,
        pendingSalesCount: 0,
        failedSalesCount: 0,
        subscriptionPaidCount: 0,
        subscriptionPendingCount: 0,
        withdrawalsPaidTotal: 0,
        withdrawalsPendingTotal: 0,
        withdrawalsCount: 0,
      });
    } finally {
      setFinancialLoading(false);
      setFinancialRefreshing(false);
    }
  };

  const handleRefreshFinancialTransactions = async () => {
    try {
      setFinancialRefreshing(true);
      await fetchFinancialTransactions();
    } finally {
      setFinancialRefreshing(false);
    }
  };

  const loadPaymentKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_provider_keys')
        .select('*')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPaymentKeys({
          api_key: data.api_key || '',
          integration_id: data.integration_id || '',
          hmac_secret: data.hmac_secret || '',
        });
      }
    } catch (err: any) {
      console.error('Load keys error:', err);
    }
  };

  const handleSavePaymentKeys = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!paymentKeys.api_key || !paymentKeys.integration_id || !paymentKeys.hmac_secret) {
        throw new Error('جميع الحقول مطلوبة');
      }

      const { data: existing } = await supabase
        .from('payment_provider_keys')
        .select('id')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('payment_provider_keys')
          .update({
            api_key: paymentKeys.api_key,
            integration_id: paymentKeys.integration_id,
            hmac_secret: paymentKeys.hmac_secret,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_provider_keys').insert({
          provider: 'paymob',
          api_key: paymentKeys.api_key,
          integration_id: paymentKeys.integration_id,
          hmac_secret: paymentKeys.hmac_secret,
          is_active: true,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'تم حفظ إعدادات الدفع بنجاح' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      if (!paymentKeys.api_key || !paymentKeys.integration_id || !paymentKeys.hmac_secret) {
        throw new Error('جميع الحقول مطلوبة للاختبار');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('غير مصرح');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-paymob-connection`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentKeys),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: '✔ تم الاتصال بنجاح! المفاتيح صحيحة.',
        });
      } else {
        setMessage({
          type: 'error',
          text: `✘ ${result.error || 'خطأ في المفاتيح أو الاتصال'}`,
        });
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setMessage({
        type: 'error',
        text: `✘ ${err.message || 'خطأ في الاتصال'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته.')) {
      return;
    }

    try {
      const { error } = await supabase.from('users_profile').delete().eq('id', userId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المستخدم بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف جميع منتجاته.')) {
      return;
    }

    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المتجر بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      await fetchDashboardData();
      alert('تم حذف المنتج بنجاح');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleToggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      await fetchDashboardData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleOpenStorefront = (store: Store) => {
    if (store.slug) {
      onNavigate(`storefront-${store.slug}`);
      return;
    }

    alert('لا يمكن فتح المتجر لأن رابط المتجر غير موجود');
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', productId);
      if (error) throw error;
      await fetchDashboardData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const openSignedDocument = async (path: string | null, side: 'front' | 'back') => {
    if (!path) return;

    try {
      setDocumentError('');
      setDocumentLoading(side);

      const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 60 * 10);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error('تعذر إنشاء رابط الملف');
      }

      if (side === 'front') {
        setFrontSignedUrl(data.signedUrl);
      } else {
        setBackSignedUrl(data.signedUrl);
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('openSignedDocument error:', error);
      setDocumentError(error?.message || 'تعذر فتح الملف. تأكد من صلاحيات التخزين الخاصة بالأدمن.');
    } finally {
      setDocumentLoading(null);
    }
  };

  const handleApproveVerification = async () => {
    if (!selectedVerification || !profile) return;

    if (!window.confirm('هل أنت متأكد من الموافقة على طلب التوثيق هذا؟')) {
      return;
    }

    try {
      setVerificationActionLoading(true);
      setVerificationMessage(null);

      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'approved',
          rejection_reason: null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      setVerificationMessage({
        type: 'success',
        text: 'تمت الموافقة على طلب التوثيق بنجاح',
      });

      await fetchMerchantVerifications();
      await fetchDashboardData();
    } catch (error: any) {
      console.error('handleApproveVerification error:', error);
      setVerificationMessage({
        type: 'error',
        text: error?.message || 'حدث خطأ أثناء الموافقة على الطلب',
      });
    } finally {
      setVerificationActionLoading(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!selectedVerification || !profile) return;

    if (!rejectionReason.trim()) {
      setVerificationMessage({
        type: 'error',
        text: 'يجب كتابة سبب الرفض قبل رفض الطلب',
      });
      return;
    }

    if (!window.confirm('هل أنت متأكد من رفض طلب التوثيق هذا؟')) {
      return;
    }

    try {
      setVerificationActionLoading(true);
      setVerificationMessage(null);

      const { error } = await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        })
        .eq('id', selectedVerification.id);

      if (error) throw error;

      setVerificationMessage({
        type: 'success',
        text: 'تم رفض طلب التوثيق وتسجيل سبب الرفض',
      });

      await fetchMerchantVerifications();
      await fetchDashboardData();
    } catch (error: any) {
      console.error('handleRejectVerification error:', error);
      setVerificationMessage({
        type: 'error',
        text: error?.message || 'حدث خطأ أثناء رفض الطلب',
      });
    } finally {
      setVerificationActionLoading(false);
    }
  };

  const handleApproveBankAccount = async () => {
    if (!selectedBankAccount) return;

    if (!window.confirm('هل أنت متأكد من الموافقة على هذا الحساب البنكي؟')) {
      return;
    }

    try {
      setBankAccountActionLoading(true);
      setBankAccountMessage(null);

      const { error } = await supabase.rpc('approve_bank_account', {
        p_bank_account_id: selectedBankAccount.id,
      });

      if (error) throw error;

      setBankAccountMessage({
        type: 'success',
        text: 'تمت الموافقة على الحساب البنكي بنجاح',
      });

      await fetchBankAccountVerifications();
      await fetchDashboardData();
    } catch (error: any) {
      console.error('handleApproveBankAccount error:', error);
      setBankAccountMessage({
        type: 'error',
        text: error?.message || 'حدث خطأ أثناء الموافقة على الحساب البنكي',
      });
    } finally {
      setBankAccountActionLoading(false);
    }
  };

  const handleRejectBankAccount = async () => {
    if (!selectedBankAccount) return;

    if (!bankAccountRejectionReason.trim()) {
      setBankAccountMessage({
        type: 'error',
        text: 'يجب كتابة سبب الرفض قبل رفض الحساب البنكي',
      });
      return;
    }

    if (!window.confirm('هل أنت متأكد من رفض هذا الحساب البنكي؟')) {
      return;
    }

    try {
      setBankAccountActionLoading(true);
      setBankAccountMessage(null);

      const { error } = await supabase.rpc('reject_bank_account', {
        p_bank_account_id: selectedBankAccount.id,
        p_rejection_reason: bankAccountRejectionReason.trim(),
      });

      if (error) throw error;

      setBankAccountMessage({
        type: 'success',
        text: 'تم رفض الحساب البنكي وتسجيل سبب الرفض',
      });

      await fetchBankAccountVerifications();
      await fetchDashboardData();
    } catch (error: any) {
      console.error('handleRejectBankAccount error:', error);
      setBankAccountMessage({
        type: 'error',
        text: error?.message || 'حدث خطأ أثناء رفض الحساب البنكي',
      });
    } finally {
      setBankAccountActionLoading(false);
    }
  };

  const getIdentityTypeLabel = (value?: string | null) => {
    if (value === 'national_id') return 'هوية وطنية';
    if (value === 'iqama') return 'إقامة';
    if (value === 'passport') return 'جواز سفر';
    return value || '—';
  };

  const getVerificationStatusMeta = (status?: string | null) => {
    if (status === 'approved') {
      return {
        label: 'مقبول',
        className: 'bg-green-100 text-green-700',
      };
    }

    if (status === 'pending') {
      return {
        label: 'قيد المراجعة',
        className: 'bg-yellow-100 text-yellow-700',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
      };
    }

    return {
      label: 'غير مكتمل',
      className: 'bg-gray-100 text-gray-700',
    };
  };

  const getBankAccountStatusMeta = (status?: string | null) => {
    if (status === 'approved') {
      return {
        label: 'معتمد',
        className: 'bg-green-100 text-green-700',
      };
    }

    if (status === 'pending') {
      return {
        label: 'قيد المراجعة',
        className: 'bg-yellow-100 text-yellow-700',
      };
    }

    if (status === 'rejected') {
      return {
        label: 'مرفوض',
        className: 'bg-red-100 text-red-700',
      };
    }

    return {
      label: 'غير مكتمل',
      className: 'bg-gray-100 text-gray-700',
    };
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('ar-SA');
    } catch {
      return value;
    }
  };

  const formatIban = (value: string | null | undefined) => {
    if (!value) return '—';
    const clean = value.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const filteredFinancialSales = useMemo(() => {
    const q = financialSearchQuery.trim().toLowerCase();
    if (!q) return salesRecords;

    return salesRecords.filter((row) =>
      [
        row.order_number,
        row.product_summary,
        row.customer_name,
        row.merchant_name,
        row.store_name,
        row.payment_transaction_id || '',
        row.payment_provider_order_id || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [salesRecords, financialSearchQuery]);

  const filteredFinancialWithdrawals = useMemo(() => {
    const q = financialSearchQuery.trim().toLowerCase();
    if (!q) return withdrawalRecords;

    return withdrawalRecords.filter((row) =>
      [row.merchant_name, row.store_name, row.id, row.status, row.source_table]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [withdrawalRecords, financialSearchQuery]);

  const filteredFinancialSubscriptions = useMemo(() => {
    const q = financialSearchQuery.trim().toLowerCase();
    if (!q) return subscriptionRecords;

    return subscriptionRecords.filter((row) =>
      [
        row.user_name,
        row.user_email,
        row.plan_name,
        row.status,
        row.id,
        row.paymob_order_id || '',
        row.paymob_transaction_id || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [subscriptionRecords, financialSearchQuery]);

  const showFinancialSales = financialRecordTab === 'sales' || financialRecordTab === 'all';
  const showFinancialSubscriptions = financialRecordTab === 'subscriptions' || financialRecordTab === 'all';
  const showFinancialWithdrawals = financialRecordTab === 'withdrawals' || financialRecordTab === 'all';

  const displayedFinancialSales = financialRecordTab === 'all'
    ? filteredFinancialSales.slice(0, 2)
    : filteredFinancialSales;

  const displayedFinancialSubscriptions = financialRecordTab === 'all'
    ? filteredFinancialSubscriptions.slice(0, 2)
    : filteredFinancialSubscriptions;

  const displayedFinancialWithdrawals = financialRecordTab === 'all'
    ? filteredFinancialWithdrawals.slice(0, 2)
    : filteredFinancialWithdrawals;

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
          <p className="text-gray-600 mb-4">ليس لديك صلاحية الوصول إلى هذه الصفحة</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة للرئيسية
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

  const q = (searchQuery || '').toLowerCase().trim();

  const filteredUsers = users.filter((user) => {
    const name = (user.name ?? '').toString().toLowerCase();
    const email = (user.email ?? '').toString().toLowerCase();
    const sourceLabel = (user.source_label ?? '').toString().toLowerCase();
    return name.includes(q) || email.includes(q) || sourceLabel.includes(q);
  });

  const filteredStores = stores.filter((store) => {
    const name = (store.name ?? '').toString().toLowerCase();
    const slug = (store.slug ?? '').toString().toLowerCase();
    return name.includes(q) || slug.includes(q);
  });

  const filteredProducts = products.filter((product) => {
    const name = ((product as any).name ?? (product as any).title ?? '').toString().toLowerCase();
    return name.includes(q);
  });

  const filteredVerifications = verifications.filter((item) => {
    const fullName = (item.full_name ?? item.user_name ?? '').toLowerCase();
    const email = (item.user_email ?? '').toLowerCase();
    const identityNumber = (item.identity_number ?? '').toLowerCase();
    return fullName.includes(q) || email.includes(q) || identityNumber.includes(q);
  });

  const filteredBankAccounts = bankAccounts.filter((item) => {
    const merchantName = (item.merchant_name ?? '').toLowerCase();
    const merchantEmail = (item.merchant_email ?? '').toLowerCase();
    const storeName = (item.store_name ?? '').toLowerCase();
    const iban = (item.iban ?? '').toLowerCase();
    const bankName = (item.bank_name ?? '').toLowerCase();
    const holderName = (item.account_holder_name ?? '').toLowerCase();

    return (
      merchantName.includes(q) ||
      merchantEmail.includes(q) ||
      storeName.includes(q) ||
      iban.includes(q) ||
      bankName.includes(q) ||
      holderName.includes(q)
    );
  });



  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم الإدارة</h1>
          <p className="text-gray-600">إدارة كاملة للمنصة والمستخدمين</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>المستخدمين</span>
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
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>

            <button
              onClick={() => setActiveTab('financial-transactions')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'financial-transactions' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>المعاملات المالية</span>
            </button>

            <button
              onClick={() => setActiveTab('merchant-verifications')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'merchant-verifications' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>توثيق التجار</span>
              {pendingVerificationsCount > 0 && (
                <span
                  className={`min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    activeTab === 'merchant-verifications'
                      ? 'bg-white text-blue-600'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {pendingVerificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('bank-account-verifications')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'bank-account-verifications' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span>الحسابات البنكية</span>
              {pendingBankAccountsCount > 0 && (
                <span
                  className={`min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    activeTab === 'bank-account-verifications'
                      ? 'bg-white text-blue-600'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {pendingBankAccountsCount}
                </span>
              )}
            </button>

            <button
  onClick={() => onNavigate('admin-affiliate-management')}
  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100"
>
  <Megaphone className="w-5 h-5" />
  <span>التسويق بالعمولة</span>
</button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalUsers}</div>
                <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSellers}</div>
                <p className="text-sm text-gray-600">التجار</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <StoreIcon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalStores}</div>
                <p className="text-sm text-gray-600">المتاجر</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalProducts}</div>
                <p className="text-sm text-gray-600">المنتجات</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-2">مرحباً بك في لوحة الإدارة</h2>
              <p className="text-blue-100">من هنا يمكنك إدارة جميع المستخدمين والمتاجر والمنتجات في المنصة</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
  onClick={() => onNavigate('admin-affiliate-management')}
  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
>
  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
    <Megaphone className="w-6 h-6 text-purple-600" />
  </div>
  <h3 className="text-lg font-bold text-gray-900 mb-2">التسويق بالعمولة</h3>
  <p className="text-sm text-gray-600">إدارة روابط وعمولات تسويق المنصة من لوحة الأدمن</p>
</button>

              <button
                onClick={() => onNavigate('admin-withdrawals')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">طلبات السحب</h3>
                <p className="text-sm text-gray-600">إدارة ومراجعة طلبات سحب التجار</p>
              </button>

              <button
                onClick={() => setActiveTab('financial-transactions')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">المعاملات المالية</h3>
                <p className="text-sm text-gray-600">عرض جميع المعاملات والإحصائيات</p>
              </button>

              <button
                onClick={() => setActiveTab('merchant-verifications')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">توثيق هويات التجار</h3>
                  {pendingVerificationsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      {pendingVerificationsCount} معلّق
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">مراجعة والموافقة أو الرفض لطلبات توثيق الهوية</p>
              </button>

              <button
                onClick={() => setActiveTab('bank-account-verifications')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Landmark className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">توثيق الحسابات البنكية</h3>
                  {pendingBankAccountsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      {pendingBankAccountsCount} معلّق
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">مراجعة الحسابات البنكية والموافقة أو الرفض</p>
              </button>

              <button
                onClick={() => onNavigate('admin-announcements')}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Megaphone className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">الرسائل العامة</h3>
                <p className="text-sm text-gray-600">إدارة الإعلانات للمستخدمين</p>
              </button>

              {profile?.role === 'superadmin' && (
                <button
                  onClick={() => onNavigate('admin-management')}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-right"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">إدارة المسؤولين</h3>
                  <p className="text-sm text-gray-600">إضافة وتعديل حسابات المسؤولين</p>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مستخدم..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ التسجيل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                        {user.email ? (
                          <div className="text-xs text-gray-500">{user.email}</div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {user.source === 'merchant'
                              ? 'حساب مرتبط بجدول التجار'
                              : user.source === 'store'
                              ? 'حساب مرتبط بجدول المتاجر'
                              : user.source === 'profiles'
                              ? 'حساب مرتبط بجدول profiles'
                              : user.source === 'activity' || user.source_label === 'activity'
                              ? 'حساب تم اكتشافه من نشاط الموقع'
                              : '—'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin' || user.role === 'superadmin'
                              ? 'bg-red-100 text-red-700'
                              : user.role === 'seller'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {user.role === 'admin' || user.role === 'superadmin'
                            ? 'مدير'
                            : user.role === 'seller'
                            ? 'تاجر'
                            : 'عميل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className={`${
                            user.role === 'admin' || user.role === 'superadmin' || (user.source !== 'users_profile' && user.source !== 'profiles')
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                          }`}
                          disabled={user.role === 'admin' || user.role === 'superadmin' || (user.source !== 'users_profile' && user.source !== 'profiles')}
                          title={
                            user.source !== 'users_profile' && user.source !== 'profiles'
                              ? 'لا يمكن حذف هذا السجل لأنه غير موجود مباشرة في users_profile أو profiles'
                              : user.role === 'admin' || user.role === 'superadmin'
                              ? 'لا يمكن حذف حساب المدير'
                              : 'حذف المستخدم'
                          }
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن متجر..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <div key={store.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <StoreIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{store.name || '—'}</h3>
                      <p className="text-sm text-gray-500">{store.slug || ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                          store.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {store.is_active ? 'نشط' : 'معطل'}
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenStorefront(store)}
                      disabled={!store.slug}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4" />
                      <span>دخول متجر التاجر</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const displayName = ((product as any).display_name ?? (product as any).name ?? (product as any).title ?? '—') as string;
                const thumbnailUrl = ((product as any).thumbnail_url ?? (product as any).image_url ?? null) as string | null;
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-blue-600" />
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{displayName}</h3>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-blue-600">
                          {product.price} {product.currency}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          {product.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {activeTab === 'financial-transactions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Receipt className="w-7 h-7 text-orange-500" />
                    المعاملات المالية
                  </h2>
                  <p className="text-gray-600">عرض شامل لعمولات الطلبات، أرباح الاشتراكات، أرباح التجار، وطلبات السحب.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleRefreshFinancialTransactions}
                    disabled={financialRefreshing || financialLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${financialRefreshing ? 'animate-spin' : ''}`} />
                    <span>تحديث البيانات</span>
                  </button>

                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    {([
                      ['all', 'الكل'],
                      ['today', 'اليوم'],
                      ['week', 'الأسبوع'],
                      ['month', 'الشهر'],
                    ] as Array<[AdminFinancialFilter, string]>).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setFinancialFilter(value)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          financialFilter === value ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {financialError && (
                <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <span>{financialError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{financialStats.paidSalesCount}</div>
                  <p className="text-sm text-gray-600 mt-1">المبيعات المدفوعة</p>
                  <p className="text-xs text-gray-500 mt-2">{formatMoney(financialStats.paidSalesTotal)}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatMoney(financialStats.merchantRevenueTotal)}</div>
                  <p className="text-sm text-gray-600 mt-1">نصيب التجار</p>
                  <p className="text-xs text-gray-500 mt-2">من الطلبات المدفوعة فقط</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-orange-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatMoney(financialStats.platformFeesTotal)}</div>
                  <p className="text-sm text-gray-600 mt-1">عمولات المنصة</p>
                  <p className="text-xs text-gray-500 mt-2">من مبيعات الطلبات المدفوعة</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatMoney(financialStats.subscriptionRevenueTotal)}</div>
                  <p className="text-sm text-gray-600 mt-1">إيرادات الباقات</p>
                  <p className="text-xs text-gray-500 mt-2">مدفوع: {financialStats.subscriptionPaidCount} • معلق: {financialStats.subscriptionPendingCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-5">
                  <div className="text-lg font-bold text-blue-700">{formatMoney(financialStats.paidSalesTotal)}</div>
                  <p className="text-sm text-blue-900 mt-1">إجمالي المبيعات المحصلة</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-5">
                  <div className="text-lg font-bold text-orange-700">{formatMoney(financialStats.platformTotalRevenue)}</div>
                  <p className="text-sm text-orange-900 mt-1">إجمالي أرباح المنصة</p>
                  <p className="text-xs text-orange-700 mt-2">العمولات + اشتراكات الباقات</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-5">
                  <div className="text-lg font-bold text-yellow-700">{formatMoney(financialStats.withdrawalsPendingTotal)}</div>
                  <p className="text-sm text-yellow-900 mt-1">طلبات سحب قيد المراجعة</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5">
                  <div className="text-lg font-bold text-green-700">{formatMoney(financialStats.withdrawalsPaidTotal)}</div>
                  <p className="text-sm text-green-900 mt-1">سحوبات مدفوعة أو معتمدة</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={financialSearchQuery}
                    onChange={(e) => setFinancialSearchQuery(e.target.value)}
                    placeholder="ابحث في المبيعات أو الاشتراكات أو السحوبات..."
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                  {([
                    ['all', 'الكل'],
                    ['sales', 'المبيعات'],
                    ['subscriptions', 'الاشتراكات'],
                    ['withdrawals', 'السحوبات'],
                  ] as Array<[AdminFinancialRecordTab, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setFinancialRecordTab(value)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                        financialRecordTab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {financialLoading ? (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل المعاملات المالية...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {showFinancialSales && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">سجل المبيعات والطلبات</h3>
                          <span className="text-sm text-gray-500">{filteredFinancialSales.length} سجل</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {financialRecordTab === 'sales' && (
                            <button
                              onClick={() => setFinancialRecordTab('all')}
                              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              العودة للكل
                            </button>
                          )}

                          {financialRecordTab === 'all' && filteredFinancialSales.length > 2 && (
                            <button
                              onClick={() => setFinancialRecordTab('sales')}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                              إظهار الكل
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredFinancialSales.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-500">لا توجد مبيعات ضمن الفلاتر الحالية</div>
                      ) : (
                        <div className="space-y-4">
                          {displayedFinancialSales.map((sale) => {
                            const statusMeta = getFinancialStatusMeta(sale.status);
                            return (
                              <div key={sale.id} className="border border-gray-200 rounded-xl p-5">
                                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <h4 className="text-lg font-bold text-gray-900">{sale.order_number}</h4>
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{sale.product_summary}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                      <div>المتجر: <span className="font-semibold text-gray-900">{sale.store_name}</span></div>
                                      <div>التاجر: <span className="font-semibold text-gray-900">{sale.merchant_name}</span></div>
                                      <div>العميل: <span className="font-semibold text-gray-900">{sale.customer_name}</span></div>
                                      <div>التاريخ: <span className="font-semibold text-gray-900">{formatDate(sale.created_at)}</span></div>
                                      <div>عدد المنتجات: <span className="font-semibold text-gray-900">{sale.quantity_total}</span></div>
                                      <div>رقم المعاملة: <span className="font-semibold text-gray-900">{sale.payment_transaction_id || '—'}</span></div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full xl:min-w-[420px]">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                      <div className="text-xs text-gray-600 mb-1">إجمالي الطلب</div>
                                      <div className="text-lg font-bold text-blue-700">{formatMoney(sale.total_amount, sale.currency)}</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                      <div className="text-xs text-gray-600 mb-1">نصيب التاجر</div>
                                      <div className="text-lg font-bold text-green-700">{formatMoney(sale.seller_amount, sale.currency)}</div>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4">
                                      <div className="text-xs text-gray-600 mb-1">نصيب المنصة</div>
                                      <div className="text-lg font-bold text-orange-700">{formatMoney(sale.platform_fee, sale.currency)}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {showFinancialSubscriptions && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">سجل اشتراكات الباقات</h3>
                          <span className="text-sm text-gray-500">{filteredFinancialSubscriptions.length} سجل</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {financialRecordTab === 'subscriptions' && (
                            <button
                              onClick={() => setFinancialRecordTab('all')}
                              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              العودة للكل
                            </button>
                          )}

                          {financialRecordTab === 'all' && filteredFinancialSubscriptions.length > 2 && (
                            <button
                              onClick={() => setFinancialRecordTab('subscriptions')}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                              إظهار الكل
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredFinancialSubscriptions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-500">لا توجد اشتراكات ضمن الفلاتر الحالية</div>
                      ) : (
                        <div className="space-y-4">
                          {displayedFinancialSubscriptions.map((item) => {
                            const statusMeta = getFinancialStatusMeta(item.status);
                            return (
                              <div key={item.id} className="border border-gray-200 rounded-xl p-5">
                                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <h4 className="text-lg font-bold text-gray-900">{item.plan_name}</h4>
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                      <div>المستخدم: <span className="font-semibold text-gray-900">{item.user_name}</span></div>
                                      <div>البريد: <span className="font-semibold text-gray-900">{item.user_email}</span></div>
                                      <div>الفترة: <span className="font-semibold text-gray-900">{item.interval || '—'}</span></div>
                                      <div>تاريخ الدفع: <span className="font-semibold text-gray-900">{formatDate(item.paid_at || item.created_at)}</span></div>
                                      <div>رقم طلب بايموب: <span className="font-semibold text-gray-900">{item.paymob_order_id || '—'}</span></div>
                                      <div>رقم المعاملة: <span className="font-semibold text-gray-900">{item.paymob_transaction_id || '—'}</span></div>
                                    </div>
                                  </div>

                                  <div className="bg-purple-50 rounded-lg p-4 min-w-full xl:min-w-[220px]">
                                    <div className="text-xs text-gray-600 mb-1">مبلغ الاشتراك</div>
                                    <div className="text-lg font-bold text-purple-700">{formatMoney(item.amount, item.currency)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {showFinancialWithdrawals && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">سجل السحوبات</h3>
                          <span className="text-sm text-gray-500">{filteredFinancialWithdrawals.length} سجل</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {financialRecordTab === 'withdrawals' && (
                            <button
                              onClick={() => setFinancialRecordTab('all')}
                              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              العودة للكل
                            </button>
                          )}

                          {financialRecordTab === 'all' && filteredFinancialWithdrawals.length > 2 && (
                            <button
                              onClick={() => setFinancialRecordTab('withdrawals')}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                              إظهار الكل
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredFinancialWithdrawals.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-500">لا توجد طلبات سحب ضمن الفلاتر الحالية</div>
                      ) : (
                        <div className="space-y-4">
                          {displayedFinancialWithdrawals.map((item) => {
                            const statusMeta = getFinancialStatusMeta(item.status);
                            return (
                              <div key={`${item.source_table}-${item.id}`} className="border border-gray-200 rounded-xl p-5">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <h4 className="text-lg font-bold text-gray-900">طلب سحب #{item.id.slice(0, 8)}</h4>
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{item.source_table}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                      <div>التاجر: <span className="font-semibold text-gray-900">{item.merchant_name}</span></div>
                                      <div>المتجر: <span className="font-semibold text-gray-900">{item.store_name}</span></div>
                                      <div>التاريخ: <span className="font-semibold text-gray-900">{formatDate(item.created_at)}</span></div>
                                    </div>
                                  </div>
                                  <div className="bg-purple-50 rounded-lg p-4 min-w-[180px]">
                                    <div className="text-xs text-gray-600 mb-1">المبلغ</div>
                                    <div className="text-lg font-bold text-purple-700">{formatMoney(item.amount)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'merchant-verifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">توثيق هويات التجار</h2>
                  <p className="text-gray-600">راجع الطلبات المرسلة من التجار ثم وافق أو ارفض مع توضيح السبب عند الحاجة.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setVerificationFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      verificationFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    الكل
                  </button>

                  <button
                    onClick={() => setVerificationFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      verificationFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    قيد المراجعة
                  </button>

                  <button
                    onClick={() => setVerificationFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      verificationFilter === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    المقبولة
                  </button>

                  <button
                    onClick={() => setVerificationFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      verificationFilter === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    المرفوضة
                  </button>
                </div>
              </div>
            </div>

            {verificationMessage && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  verificationMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {verificationMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p className={verificationMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {verificationMessage.text}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد أو رقم الهوية..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {verificationsLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل طلبات التوثيق...</p>
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <ShieldCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات مطابقة</h3>
                <p className="text-gray-600">جرّب تغيير الفلتر أو عبارة البحث.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">الطلبات</h3>
                    <span className="text-sm text-gray-500">{filteredVerifications.length} طلب</span>
                  </div>

                  <div className="max-h-[700px] overflow-y-auto divide-y divide-gray-100">
                    {filteredVerifications.map((item) => {
                      const statusMeta = getVerificationStatusMeta(item.status);
                      const isSelected = selectedVerificationId === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedVerificationId(item.id)}
                          className={`w-full text-right p-5 transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{item.full_name || item.user_name || '—'}</p>
                              <p className="text-sm text-gray-500">{item.user_email || '—'}</p>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>نوع الهوية: {getIdentityTypeLabel(item.identity_type)}</p>
                            <p>رقم الهوية: {item.identity_number || '—'}</p>
                            <p>
                              تاريخ التقديم:{' '}
                              {item.submitted_at
                                ? new Date(item.submitted_at).toLocaleString('ar-SA')
                                : '—'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="xl:col-span-3 bg-white rounded-xl shadow-sm p-6">
                  {!selectedVerification ? (
                    <div className="h-full min-h-[400px] flex items-center justify-center text-center">
                      <div>
                        <ShieldCheck className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">اختر طلبًا لعرض التفاصيل</h3>
                        <p className="text-gray-600">من القائمة اليمنى اختر طلب التوثيق الذي تريد مراجعته.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {selectedVerification.full_name || selectedVerification.user_name || '—'}
                          </h3>
                          <p className="text-gray-500 mb-3">{selectedVerification.user_email || '—'}</p>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              getVerificationStatusMeta(selectedVerification.status).className
                            }`}
                          >
                            {getVerificationStatusMeta(selectedVerification.status).label}
                          </span>
                        </div>

                        <div className="text-sm text-gray-500 space-y-1">
                          <p>تاريخ الإنشاء: {new Date(selectedVerification.created_at).toLocaleString('ar-SA')}</p>
                          <p>
                            تاريخ التقديم:{' '}
                            {selectedVerification.submitted_at
                              ? new Date(selectedVerification.submitted_at).toLocaleString('ar-SA')
                              : '—'}
                          </p>
                          <p>
                            آخر تحديث:{' '}
                            {selectedVerification.updated_at
                              ? new Date(selectedVerification.updated_at).toLocaleString('ar-SA')
                              : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">الاسم الكامل</p>
                          <p className="font-semibold text-gray-900">{selectedVerification.full_name || '—'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">نوع الهوية</p>
                          <p className="font-semibold text-gray-900">
                            {getIdentityTypeLabel(selectedVerification.identity_type)}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">رقم الهوية</p>
                          <p className="font-semibold text-gray-900" dir="ltr">
                            {selectedVerification.identity_number || '—'}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">تاريخ الميلاد</p>
                          <p className="font-semibold text-gray-900">
                            {selectedVerification.date_of_birth || '—'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4">المستندات المرفوعة</h4>

                        {documentError && (
                          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            {documentError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h5 className="font-semibold text-gray-900">الواجهة الأمامية</h5>
                              <button
                                onClick={() =>
                                  openSignedDocument(selectedVerification.document_front_url, 'front')
                                }
                                disabled={!selectedVerification.document_front_url || documentLoading === 'front'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Eye className="w-4 h-4" />
                                {documentLoading === 'front' ? 'جاري الفتح...' : 'عرض الملف'}
                              </button>
                            </div>

                            <p className="text-xs text-gray-500 break-all">
                              {selectedVerification.document_front_url || 'لا يوجد ملف'}
                            </p>

                            {frontSignedUrl && (
                              <a
                                href={frontSignedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700"
                              >
                                فتح الرابط مرة أخرى
                              </a>
                            )}
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h5 className="font-semibold text-gray-900">الواجهة الخلفية</h5>
                              <button
                                onClick={() =>
                                  openSignedDocument(selectedVerification.document_back_url, 'back')
                                }
                                disabled={!selectedVerification.document_back_url || documentLoading === 'back'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Eye className="w-4 h-4" />
                                {documentLoading === 'back' ? 'جاري الفتح...' : 'عرض الملف'}
                              </button>
                            </div>

                            <p className="text-xs text-gray-500 break-all">
                              {selectedVerification.document_back_url || 'لا يوجد ملف'}
                            </p>

                            {backSignedUrl && (
                              <a
                                href={backSignedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700"
                              >
                                فتح الرابط مرة أخرى
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">قرار الإدارة</h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              سبب الرفض
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={4}
                              placeholder="اكتب سبب الرفض هنا عند الحاجة..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              اتركه فارغًا عند الموافقة. مطلوب فقط إذا أردت رفض الطلب.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleApproveVerification}
                              disabled={verificationActionLoading || selectedVerification.status === 'approved'}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="w-5 h-5" />
                              {verificationActionLoading ? 'جاري التنفيذ...' : 'الموافقة على الطلب'}
                            </button>

                            <button
                              onClick={handleRejectVerification}
                              disabled={verificationActionLoading}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle className="w-5 h-5" />
                              {verificationActionLoading ? 'جاري التنفيذ...' : 'رفض الطلب'}
                            </button>
                          </div>

                          {selectedVerification.reviewed_at && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                              تمت آخر مراجعة بتاريخ:{' '}
                              {new Date(selectedVerification.reviewed_at).toLocaleString('ar-SA')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bank-account-verifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">توثيق الحسابات البنكية</h2>
                  <p className="text-gray-600">
                    راجع الحسابات البنكية المضافة من التجار ثم وافق أو ارفض مع توضيح السبب عند الحاجة.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setBankAccountFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      bankAccountFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    الكل
                  </button>

                  <button
                    onClick={() => setBankAccountFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      bankAccountFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    قيد المراجعة
                  </button>

                  <button
                    onClick={() => setBankAccountFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      bankAccountFilter === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    المعتمدة
                  </button>

                  <button
                    onClick={() => setBankAccountFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      bankAccountFilter === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    المرفوضة
                  </button>

                  <button
                    onClick={fetchBankAccountVerifications}
                    disabled={bankAccountsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${bankAccountsLoading ? 'animate-spin' : ''}`} />
                    تحديث
                  </button>
                </div>
              </div>
            </div>

            {bankAccountMessage && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  bankAccountMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {bankAccountMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p className={bankAccountMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {bankAccountMessage.text}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم التاجر أو البريد أو المتجر أو الآيبان أو البنك..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {bankAccountsLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل الحسابات البنكية...</p>
              </div>
            ) : filteredBankAccounts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Landmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد حسابات مطابقة</h3>
                <p className="text-gray-600">جرّب تغيير الفلتر أو عبارة البحث.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">الحسابات</h3>
                    <span className="text-sm text-gray-500">{filteredBankAccounts.length} حساب</span>
                  </div>

                  <div className="max-h-[700px] overflow-y-auto divide-y divide-gray-100">
                    {filteredBankAccounts.map((item) => {
                      const statusMeta = getBankAccountStatusMeta(item.status);
                      const isSelected = selectedBankAccountId === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedBankAccountId(item.id)}
                          className={`w-full text-right p-5 transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{item.merchant_name || '—'}</p>
                              <p className="text-sm text-gray-500">{item.merchant_email || '—'}</p>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>المتجر: {item.store_name || '—'}</p>
                            <p>البنك: {item.bank_name || '—'}</p>
                            <p dir="ltr">الآيبان: {formatIban(item.iban)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="xl:col-span-3 bg-white rounded-xl shadow-sm p-6">
                  {!selectedBankAccount ? (
                    <div className="h-full min-h-[400px] flex items-center justify-center text-center">
                      <div>
                        <Landmark className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">اختر حسابًا لعرض التفاصيل</h3>
                        <p className="text-gray-600">من القائمة اليمنى اختر الحساب البنكي الذي تريد مراجعته.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {selectedBankAccount.merchant_name || '—'}
                          </h3>
                          <p className="text-gray-500 mb-2">{selectedBankAccount.merchant_email || '—'}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                getBankAccountStatusMeta(selectedBankAccount.status).className
                              }`}
                            >
                              {getBankAccountStatusMeta(selectedBankAccount.status).label}
                            </span>

                            {selectedBankAccount.store_name && selectedBankAccount.store_name !== '—' && (
                              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                                <StoreIcon className="w-4 h-4" />
                                {selectedBankAccount.store_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-500 space-y-1">
                          <p>تاريخ الإضافة: {formatDate(selectedBankAccount.created_at)}</p>
                          <p>آخر تحديث: {formatDate(selectedBankAccount.updated_at)}</p>
                          <p>آخر مراجعة: {formatDate(selectedBankAccount.reviewed_at)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">اسم التاجر</p>
                          <p className="font-semibold text-gray-900">{selectedBankAccount.merchant_name || '—'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">البريد الإلكتروني</p>
                          <p className="font-semibold text-gray-900">{selectedBankAccount.merchant_email || '—'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">المتجر</p>
                          <p className="font-semibold text-gray-900">{selectedBankAccount.store_name || '—'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">اسم البنك</p>
                          <p className="font-semibold text-gray-900">{selectedBankAccount.bank_name || '—'}</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">اسم صاحب الحساب</p>
                          <p className="font-semibold text-gray-900">
                            {selectedBankAccount.account_holder_name || '—'}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-500 mb-1">الحالة الحالية</p>
                          <p className="font-semibold text-gray-900">
                            {getBankAccountStatusMeta(selectedBankAccount.status).label}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                          <p className="text-sm text-gray-500 mb-1">الآيبان</p>
                          <p className="font-semibold text-gray-900" dir="ltr">
                            {formatIban(selectedBankAccount.iban)}
                          </p>
                        </div>
                      </div>

                      {selectedBankAccount.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-sm text-red-600 mb-1">سبب الرفض الحالي</p>
                          <p className="font-medium text-red-700">{selectedBankAccount.rejection_reason}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                        لا يستطيع التاجر إرسال طلب سحب إلا إذا كانت حالة الحساب البنكي "معتمد".
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">قرار الإدارة</h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">سبب الرفض</label>
                            <textarea
                              value={bankAccountRejectionReason}
                              onChange={(e) => setBankAccountRejectionReason(e.target.value)}
                              rows={4}
                              placeholder="اكتب سبب رفض الحساب البنكي عند الحاجة..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              اتركه فارغًا عند الموافقة. مطلوب فقط إذا أردت رفض الحساب البنكي.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleApproveBankAccount}
                              disabled={bankAccountActionLoading || selectedBankAccount.status === 'approved'}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="w-5 h-5" />
                              {bankAccountActionLoading ? 'جاري التنفيذ...' : 'الموافقة على الحساب'}
                            </button>

                            <button
                              onClick={handleRejectBankAccount}
                              disabled={bankAccountActionLoading}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle className="w-5 h-5" />
                              {bankAccountActionLoading ? 'جاري التنفيذ...' : 'رفض الحساب'}
                            </button>
                          </div>

                          {selectedBankAccount.reviewed_at && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                              تمت آخر مراجعة بتاريخ: {formatDate(selectedBankAccount.reviewed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payment-settings' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">إعدادات بوابة الدفع Paymob</h2>
              <p className="text-gray-600">قم بإدخال مفاتيح Paymob API الخاصة بك</p>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_API_KEY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.api_key}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, api_key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل API Key من Paymob"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_INTEGRATION_ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.integration_id}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, integration_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل Integration ID"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAYMOB_HMAC_SECRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentKeys.hmac_secret}
                    onChange={(e) => setPaymentKeys({ ...paymentKeys, hmac_secret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="أدخل HMAC Secret"
                    dir="ltr"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    💡 يمكنك الحصول على هذه المفاتيح من لوحة تحكم Paymob → Settings → API Keys
                  </p>
                </div>

                <button
                  onClick={handleSavePaymentKeys}
                  disabled={saving}
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">اختبار الاتصال</h3>
              <p className="text-sm text-gray-600 mb-4">اختبر الاتصال ببوابة Paymob للتأكد من صحة المفاتيح</p>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'جاري الاختبار...' : 'اختبار الاتصال ببوابة Paymob'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
