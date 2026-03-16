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

// ✅ نطبع المنتج عشان لو الجدول عندك يستخدم title/merchant_id بدل name/user_id
type NormalizedProduct = Product & {
  name: string;
  user_id?: string | null;
  views_count: number;
  sales_count: number;
  currency: string;
  thumbnail_url?: string | null;
};

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'stores' | 'marketing' | 'analytics' | 'settings' | 'orders' | 'verification'
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

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      fetchIdentityVerification();
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

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // 1) Stores
      const { data: storesData, error: storesErr } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', profile.id);

      if (storesErr) console.error('stores fetch error:', storesErr);

      // 2) Products (user_id OR merchant_id)
      const { data: rawProductsData, error: productsErr } = await supabase
        .from('products')
        .select('*')
        .or(`user_id.eq.${profile.id},merchant_id.eq.${profile.id}`);

      if (productsErr) console.error('products fetch error:', productsErr);

      const normalizedProducts = safeArray(rawProductsData).map(normalizeProduct);

      // 3) Orders stats
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('seller_amount, status')
        .eq('seller_id', profile.id)
        .eq('status', 'completed');

      if (ordersErr) console.error('orders fetch error:', ordersErr);

      // 4) Fetch product images to show thumbnails in dashboard
      const productIds = normalizedProducts.map((p) => p.id).filter(Boolean);
      let thumbMap: Record<string, string> = {};

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

      // 5) Affiliate links (بدون JOIN حساس باسم FK)
      let affiliateRows: AffiliateLinkRow[] = [];
      if (productIds.length > 0) {
        const { data: links, error: linksErr } = await supabase
          .from('affiliate_links')
          .select('id, user_id, product_id, code, created_at')
          .in('product_id', productIds);

        if (linksErr) {
          // ✅ أهم شيء: لا نخلي الخطأ يطيح الصفحة
          console.error('affiliate_links fetch error:', linksErr);
          affiliateRows = [];
        } else {
          affiliateRows = safeArray(links) as any[];
        }
      }

      // 6) Get affiliate user names safely
      const affiliateUserIds = Array.from(new Set(affiliateRows.map((l) => l.user_id).filter(Boolean)));
      let userMap: Record<string, { id: string; name: string }> = {};

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

      // 7) Add clicks/sales counts per link (safe)
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

      // Set states
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

    setVerificationError('');
    setVerificationSuccess('');

    if (!verificationForm.full_name.trim()) {
      setVerificationError('يرجى إدخال الاسم الكامل');
      return;
    }

    if (!verificationForm.identity_number.trim()) {
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
        full_name: verificationForm.full_name.trim(),
        identity_type: verificationForm.identity_type,
        identity_number: verificationForm.identity_number.trim(),
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

  const openProduct = (id: string) => {
    // نفس طريقة السوق العام
    onNavigate(`product-${id}`);
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
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </button>

            <button
              onClick={() => setActiveTab('stores')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stores'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span>المتاجر</span>
            </button>

            <button
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'marketing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>التسويق</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>الطلبات</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>التحليلات</span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'verification'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>توثيق الهوية</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
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

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">ابدأ البيع الآن!</h2>
              <p className="text-blue-100 mb-6">
                {stores.length === 0
                  ? 'أنشئ متجرك الأول وابدأ بإضافة المنتجات'
                  : 'أضف منتجات جديدة لزيادة مبيعاتك'}
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
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* ✅ مثل السوق العام: الضغط على الصورة يفتح المنتج */}
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
                      {/* ✅ الضغط على الاسم يفتح المنتج */}
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
                            product.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>

                      {/* ✅ حذفنا زر "عرض المنتج" بالكامل */}
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

                    {store.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{store.description}</p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          store.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
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
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <LinkIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {link.affiliate?.name || 'مسوق'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product?.name || 'منتج'} - {link.code}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {link.clicks_count || 0} نقرة
                          </p>
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
            <p className="text-gray-600">
              تتبع وإدارة طلبات عملائك، تحديث حالة الطلبات، والتواصل مع المشترين
            </p>
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
                        onChange={(e) =>
                          setVerificationForm((prev) => ({ ...prev, full_name: e.target.value }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="اكتب الاسم الكامل كما هو في الهوية"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">نوع الهوية</label>
                      <select
                        value={verificationForm.identity_type}
                        onChange={(e) =>
                          setVerificationForm((prev) => ({ ...prev, identity_type: e.target.value }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        onChange={(e) =>
                          setVerificationForm((prev) => ({ ...prev, identity_number: e.target.value }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="أدخل رقم الهوية"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={verificationForm.date_of_birth}
                        onChange={(e) =>
                          setVerificationForm((prev) => ({ ...prev, date_of_birth: e.target.value }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الهوية الأمامية</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {identityVerification?.document_front_url && !frontFile
                          ? 'يوجد ملف مرفوع حالياً. يمكنك اختيار ملف جديد لاستبداله.'
                          : 'ارفع صورة أو ملف PDF للواجهة الأمامية.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الهوية الخلفية</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {identityVerification?.document_back_url && !backFile
                          ? 'يوجد ملف مرفوع حالياً. يمكنك اختيار ملف جديد لاستبداله.'
                          : 'ارفع صورة أو ملف PDF للواجهة الخلفية.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    بعد الإرسال سيتم تحويل الحالة إلى "قيد المراجعة"، ويمكن للإدارة لاحقاً الموافقة أو الرفض مع سبب الرفض.
                  </div>

                  <button
                    type="submit"
                    disabled={verificationSubmitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verificationSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب التوثيق'}
                  </button>
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
                  <p className="text-sm text-gray-500">
                    تاريخ التقديم: {new Date(identityVerification.submitted_at).toLocaleString('ar-SA')}
                  </p>
                )}

                {identityVerification?.reviewed_at && (
                  <p className="text-sm text-gray-500">
                    تاريخ المراجعة: {new Date(identityVerification.reviewed_at).toLocaleString('ar-SA')}
                  </p>
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
