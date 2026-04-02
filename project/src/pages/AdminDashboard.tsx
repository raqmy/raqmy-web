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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'stores'
    | 'products'
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

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      const [usersRes, storesRes, productsRes, verificationsRes, bankAccountsRes] = await Promise.all([
        supabase.from('users_profile').select('*'),
        supabase.from('stores').select('*'),
        supabase.from('products').select('*'),
        supabase.from('identity_verifications').select('id, status'),
        supabase.from('bank_accounts').select('id, status'),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (storesRes.data) setStores(storesRes.data);
      if (productsRes.data) setProducts(productsRes.data);

      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalSellers: usersRes.data?.filter((u) => u.role === 'seller').length || 0,
        totalStores: storesRes.data?.length || 0,
        totalProducts: productsRes.data?.length || 0,
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
    return name.includes(q) || email.includes(q);
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
                onClick={() => onNavigate('transactions')}
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
                        {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : user.role === 'seller'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'مدير' : user.role === 'seller' ? 'تاجر' : 'عميل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={user.role === 'admin'}
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
                const displayName = ((product as any).name ?? (product as any).title ?? '—') as string;
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Package className="w-12 h-12 text-blue-600" />
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
