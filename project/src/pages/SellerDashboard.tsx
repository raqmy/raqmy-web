import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Store as StoreIcon,
  DollarSign,
  BarChart3,
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

type NormalizedProduct = Product & {
  name: string;
  user_id?: string | null;
  views_count: number;
  sales_count: number;
  currency: string;
  thumbnail_url?: string | null;
};

const MIN_WITHDRAWAL_AMOUNT = 10;
const WITHDRAWAL_PROOFS_BUCKET = 'withdrawal-proofs';

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'products'
    | 'stores'
    | 'marketing'
    | 'analytics'
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

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestRow | null>(null);
  const [showWithdrawalDetails, setShowWithdrawalDetails] = useState(false);
  const [withdrawalProofUrl, setWithdrawalProofUrl] = useState<string | null>(null);
  const [withdrawalProofLoading, setWithdrawalProofLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      fetchIdentityVerification();
      fetchBankAccountData();
      fetchEarningsData();
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

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('seller_amount, status')
        .eq('seller_id', profile.id)
        .eq('status', 'completed');

      if (ordersErr) console.error('orders fetch error:', ordersErr);

      const productIds = normalizedProducts.map((p) => p.id).filter(Boolean);
      const thumbMap: Record<string, string> = {};

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
      }

      const productsWithThumbs = normalizedProducts.map((p) => ({
        ...p,
        thumbnail_url: p.thumbnail_url || thumbMap[p.id] || null,
      }));

      let affiliateRows: AffiliateLinkRow[] = [];
      if (productIds.length > 0) {
        const { data: links, error: linksErr } = await supabase
          .from('affiliate_links')
          .select('id, user_id, product_id, code, created_at')
          .in('product_id', productIds);

        if (linksErr) {
          console.error('affiliate_links fetch error:', linksErr);
          affiliateRows = [];
        } else {
          affiliateRows = safeArray(links) as any[];
        }
      }

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

      const revenue =
        safeArray(ordersData)?.reduce((sum: number, order: any) => sum + Number(order.seller_amount || 0), 0) || 0;

      const sales = safeArray(ordersData)?.length || 0;
      const views = productsWithThumbs.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const active = productsWithThumbs.filter((p) => p.is_active).length || 0;

      setStats({
        totalRevenue: revenue,
        totalSales: sales,
        totalViews: views,
        activeProducts: active,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
          .limit(10),
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

      setWalletData((walletRes.data as WalletRow | null) ?? null);
      setWalletLedger((safeArray(ledgerRes.data) as any[]) ?? []);
      setWithdrawalRequests((safeArray(requestsRes.data) as any[]) ?? []);
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

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      setWithdrawalError(`الحد الأدنى لطلب السحب حالياً هو ${MIN_WITHDRAWAL_AMOUNT} ريال`);
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
      });

      if (error) {
        console.error('create_withdrawal_request rpc error:', error);
        throw error;
      }

      setWithdrawalAmount('');
      setWithdrawalNotes('');
      setWithdrawalSuccess('تم إرسال طلب السحب بنجاح، وسيظهر في سجل الطلبات خلال لحظات');
      await fetchEarningsData();
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

    if (!request.transfer_proof_path) return;

    try {
      setWithdrawalProofLoading(true);

      const { data, error } = await supabase.storage
        .from(WITHDRAWAL_PROOFS_BUCKET)
        .createSignedUrl(request.transfer_proof_path, 60 * 60);

      if (error) {
        console.error('createSignedUrl withdrawal proof error:', error);
        setWithdrawalProofUrl(null);
        return;
      }

      setWithdrawalProofUrl(data?.signedUrl || null);
    } catch (error) {
      console.error('openWithdrawalDetails error:', error);
      setWithdrawalProofUrl(null);
    } finally {
      setWithdrawalProofLoading(false);
    }
  };

  const closeWithdrawalDetails = () => {
    setSelectedWithdrawal(null);
    setShowWithdrawalDetails(false);
    setWithdrawalProofUrl(null);
    setWithdrawalProofLoading(false);
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

  const canRequestWithdrawal =
    isVerificationApproved &&
    isBankAccountApproved &&
    !!walletData &&
    availableBalance >= MIN_WITHDRAWAL_AMOUNT &&
    !withdrawalSubmitting;

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
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>التحليلات</span>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">ابدأ البيع الآن!</h2>
                <p className="text-blue-100 mb-6">
                  {stores.length === 0 ? 'أنشئ متجرك الأول وابدأ بإضافة المنتجات' : 'أضف منتجات جديدة لزيادة مبيعاتك'}
                </p>

                <div className="flex flex-wrap gap-4">
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
                      className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>إضافة منتج</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">الحساب البنكي</h2>
                    <p className="text-gray-600">اربط حسابك البنكي واعرف حالة مراجعته قبل طلب السحب.</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Landmark className="w-7 h-7 text-purple-600" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bankAccountStatusMeta.className}`}>
                    {bankAccountStatusMeta.label}
                  </span>
                  <span className="text-sm text-gray-500">{bankAccountStatusMeta.description}</span>
                </div>

                {bankAccountData?.rejection_reason && bankAccountData.status === 'rejected' && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    سبب الرفض: {bankAccountData.rejection_reason}
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('bankAccount')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إدارة الحساب البنكي
                </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div
                      className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center cursor-pointer"
                      onClick={() => openProduct(product.id)}
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
                        onClick={() => openProduct(product.id)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stores.map((store) => (
                  <div key={store.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <StoreIcon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{store.name}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">
                          /{store.slug}
                        </p>
                      </div>
                    </div>

                    {store.description && <p className="text-gray-600 mb-4 line-clamp-2">{store.description}</p>}

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {store.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onNavigate(`store-detail-${store.id}`)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        عرض التفاصيل
                      </button>

                      <button
                        onClick={() => setEditingStoreId(store.id)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        تعديل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="bg-white rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة الطلبات</h2>
              <button
                onClick={() => onNavigate('orders-management')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                عرض جميع الطلبات
              </button>
            </div>
            <p className="text-gray-600">تتبع وإدارة طلبات عملائك، تحديث حالة الطلبات، والتواصل مع المشترين</p>
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
                    await Promise.all([fetchEarningsData(), fetchBankAccountData(), fetchIdentityVerification()]);
                  }}
                  disabled={walletLoading || bankAccountLoading || verificationLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${
                      walletLoading || bankAccountLoading || verificationLoading ? 'animate-spin' : ''
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
                <p className="text-sm text-gray-500">أرباح لم تصبح متاحة بعد</p>
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

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                    الحساب البنكي
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-900 mb-1">{bankAccountStatusMeta.label}</div>
                <p className="text-sm text-gray-500">حالة الحساب البنكي المرتبط بالسحب</p>
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
                      min={MIN_WITHDRAWAL_AMOUNT}
                      step="0.01"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      disabled={!canRequestWithdrawal}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder={`الحد الأدنى ${MIN_WITHDRAWAL_AMOUNT} ريال`}
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
                    <p>الحد الأدنى الحالي للسحب: <span className="font-bold">{MIN_WITHDRAWAL_AMOUNT} ريال</span></p>
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
                      const hasProof = !!request.transfer_proof_path;
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
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-200 rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bgClass}`}>
                            <EntryIcon className={`w-6 h-6 ${meta.iconClass}`} />
                          </div>

                          <div>
                            <div className="font-bold text-gray-900">{meta.label}</div>
                            <div className="text-sm text-gray-500">{formatDate(entry.created_at)}</div>
                            {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(entry.amount)}</div>
                          <div className="text-sm text-gray-500">{entry.status || '—'}</div>
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

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">التحليلات قريباً</h3>
            <p className="text-gray-600">سيتم إضافة لوحة التحليلات قريباً</p>
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
                        {selectedWithdrawal.transfer_proof_path ? 'مرفقة' : 'غير مرفقة'}
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
                ) : selectedWithdrawal.transfer_proof_path && withdrawalProofUrl ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      اسم الملف: <span className="font-semibold text-gray-900">{getFileNameFromPath(selectedWithdrawal.transfer_proof_path)}</span>
                    </div>

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
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    لا توجد وثيقة حوالة مرفقة لهذا الطلب حالياً.
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

      <CreateStoreModal
        isOpen={showCreateStoreModal}
        onClose={() => setShowCreateStoreModal(false)}
        onSuccess={fetchDashboardData}
      />

      <CreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSuccess={fetchDashboardData}
      />

      {editingStoreId && (
        <EditStoreModal
          isOpen={true}
          storeId={editingStoreId}
          onClose={() => setEditingStoreId(null)}
          onSuccess={fetchDashboardData}
          onDelete={fetchDashboardData}
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
