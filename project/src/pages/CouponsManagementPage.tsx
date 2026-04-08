import React, { useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Percent,
  DollarSign,
  Package,
  Store as StoreIcon,
  Users,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CouponsManagementPageProps {
  onNavigate: (page: string) => void;
}

type CouponRow = {
  id: string;
  user_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  used_count?: number | null;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean | null;
  apply_to: 'all' | 'specific_products' | 'specific_stores' | string;
  affiliate_marketer_id?: string | null;
  affiliate_link_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  productCount?: number;
  storeCount?: number;
  affiliate_marketer?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  affiliate_link?: {
    id: string;
    code: string;
    marketer_id?: string | null;
    report_token?: string | null;
  } | null;
};

type ProductOption = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
};

type StoreOption = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
};

type AffiliateMarketerOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
};

type AffiliateLinkOption = {
  id: string;
  code: string;
  marketer_id?: string | null;
  is_active?: boolean | null;
  apply_to?: string | null;
  report_token?: string | null;
};

const getDisplayName = (item?: { name?: string | null; title?: string | null } | null) =>
  item?.title || item?.name || 'بدون اسم';

const getApplyToLabel = (value?: string | null) => {
  switch (value) {
    case 'all':
      return 'جميع منتجاتي';
    case 'specific_products':
      return 'منتجات محددة';
    case 'specific_stores':
      return 'متاجر محددة';
    default:
      return value || 'غير محدد';
  }
};

const formatMoney = (value?: number | null) => `${Number(value || 0).toFixed(2)} ريال`;

export const CouponsManagementPage: React.FC<CouponsManagementPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRow | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCoupons();
    }
  }, [user?.id]);

  const fetchCoupons = async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const couponsRows = ((data || []) as CouponRow[]) || [];

      if (couponsRows.length === 0) {
        setCoupons([]);
        return;
      }

      const marketerIds = [
        ...new Set(couponsRows.map((item) => item.affiliate_marketer_id).filter(Boolean)),
      ] as string[];
      const linkIds = [
        ...new Set(couponsRows.map((item) => item.affiliate_link_id).filter(Boolean)),
      ] as string[];

      const marketerMap = new Map<string, AffiliateMarketerOption>();
      const linkMap = new Map<string, AffiliateLinkOption>();

      if (marketerIds.length > 0) {
        const { data: marketersData, error: marketersError } = await supabase
          .from('affiliate_marketers')
          .select('id, name, email, phone, is_active')
          .in('id', marketerIds);

        if (marketersError) {
          console.error('Error fetching coupon marketers:', marketersError);
        } else {
          (marketersData || []).forEach((item: any) => {
            marketerMap.set(item.id, item as AffiliateMarketerOption);
          });
        }
      }

      if (linkIds.length > 0) {
        const { data: linksData, error: linksError } = await supabase
          .from('affiliate_links')
          .select('id, code, marketer_id, is_active, apply_to, report_token')
          .in('id', linkIds);

        if (linksError) {
          console.error('Error fetching coupon affiliate links:', linksError);
        } else {
          (linksData || []).forEach((item: any) => {
            linkMap.set(item.id, item as AffiliateLinkOption);
          });
        }
      }

      const enrichedCoupons = await Promise.all(
        couponsRows.map(async (coupon) => {
          let productCount = 0;
          let storeCount = 0;

          if (coupon.apply_to === 'specific_products') {
            const { count } = await supabase
              .from('coupon_products')
              .select('*', { count: 'exact', head: true })
              .eq('coupon_id', coupon.id);

            productCount = count || 0;
          } else if (coupon.apply_to === 'specific_stores') {
            const { count } = await supabase
              .from('coupon_stores')
              .select('*', { count: 'exact', head: true })
              .eq('coupon_id', coupon.id);

            storeCount = count || 0;
          }

          return {
            ...coupon,
            productCount,
            storeCount,
            affiliate_marketer: coupon.affiliate_marketer_id
              ? marketerMap.get(coupon.affiliate_marketer_id) || null
              : null,
            affiliate_link: coupon.affiliate_link_id
              ? linkMap.get(coupon.affiliate_link_id) || null
              : null,
          } as CouponRow;
        })
      );

      setCoupons(enrichedCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;

    try {
      const { error } = await supabase.from('discount_coupons').delete().eq('id', couponId);

      if (error) throw error;

      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('حدث خطأ أثناء حذف الكوبون');
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const q = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !q ||
        coupon.code.toLowerCase().includes(q) ||
        (coupon.affiliate_marketer?.name || '').toLowerCase().includes(q) ||
        (coupon.affiliate_link?.code || '').toLowerCase().includes(q);

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && coupon.is_active) ||
        (filterStatus === 'inactive' && !coupon.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [coupons, searchQuery, filterStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة أكواد الخصم</h1>
          <p className="text-gray-600">
            أنشئ وأدر أكواد الخصم لمنتجاتك مع إمكانية ربطها بالمسوقين وروابط الأفلييت
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث عن كوبون أو مسوق أو كود أفلييت..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الكوبونات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>كوبون جديد</span>
              </button>
            </div>
          </div>
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد أكواد خصم</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'لم يتم العثور على أكواد خصم مطابقة'
                : 'ابدأ بإنشاء كود خصم جديد'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                إنشاء كوبون
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900 font-mono">{coupon.code}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            coupon.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {coupon.is_active ? 'نشط' : 'غير نشط'}
                        </span>

                        {(coupon.affiliate_marketer || coupon.affiliate_link) && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                            مربوط بالأفلييت
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-4 h-4" />
                              <span>{coupon.discount_value}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" />
                              <span>{coupon.discount_value} ريال</span>
                            </>
                          )}
                        </div>

                        <div className="text-sm text-gray-400">•</div>

                        <div className="text-sm text-gray-600">
                          استخدم {coupon.used_count || 0}
                          {coupon.usage_limit ? ` من ${coupon.usage_limit}` : ''} مرة
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingCoupon(coupon)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="تعديل"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">نطاق التطبيق</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      {coupon.apply_to === 'all' && (
                        <>
                          <Package className="w-4 h-4" />
                          <span>جميع المنتجات</span>
                        </>
                      )}
                      {coupon.apply_to === 'specific_products' && (
                        <>
                          <Package className="w-4 h-4" />
                          <span>{coupon.productCount || 0} منتج</span>
                        </>
                      )}
                      {coupon.apply_to === 'specific_stores' && (
                        <>
                          <StoreIcon className="w-4 h-4" />
                          <span>{coupon.storeCount || 0} متجر</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">تاريخ البداية</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(coupon.start_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</div>
                    <div className="text-sm font-medium text-gray-900">
                      {coupon.end_date
                        ? new Date(coupon.end_date).toLocaleDateString('ar-SA')
                        : 'غير محدد'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">المسوق المرتبط</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Users className="w-4 h-4" />
                      <span>{coupon.affiliate_marketer?.name || 'بدون ربط'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">رابط الأفلييت المرتبط</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <LinkIcon className="w-4 h-4" />
                      <span className="font-mono">{coupon.affiliate_link?.code || 'بدون ربط'}</span>
                    </div>
                  </div>
                </div>

                {(coupon.min_purchase_amount! > 0 || coupon.max_discount_amount) && (
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
                    {coupon.min_purchase_amount! > 0 && (
                      <div className="text-sm text-gray-600">
                        حد أدنى: {coupon.min_purchase_amount} ريال
                      </div>
                    )}
                    {coupon.max_discount_amount && (
                      <div className="text-sm text-gray-600">
                        حد أقصى للخصم: {coupon.max_discount_amount} ريال
                      </div>
                    )}
                  </div>
                )}

                {(coupon.affiliate_marketer || coupon.affiliate_link) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                      هذا الكوبون مربوط بالأفلييت، ويمكن استخدامه داخل حملات المسوق أو الرابط المحدد
                      لقياس الأداء بشكل أوضح.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateModal || editingCoupon) && (
        <CouponFormModal
          coupon={editingCoupon || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
};

interface CouponFormModalProps {
  coupon?: CouponRow;
  onClose: () => void;
  onSuccess: () => void;
}

const CouponFormModal: React.FC<CouponFormModalProps> = ({ coupon, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [marketers, setMarketers] = useState<AffiliateMarketerOption[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkOption[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value:
      coupon?.discount_value !== null && coupon?.discount_value !== undefined
        ? String(coupon.discount_value)
        : '',
    min_purchase_amount:
      coupon?.min_purchase_amount !== null && coupon?.min_purchase_amount !== undefined
        ? String(coupon.min_purchase_amount)
        : '',
    max_discount_amount:
      coupon?.max_discount_amount !== null && coupon?.max_discount_amount !== undefined
        ? String(coupon.max_discount_amount)
        : '',
    usage_limit:
      coupon?.usage_limit !== null && coupon?.usage_limit !== undefined
        ? String(coupon.usage_limit)
        : '',
    start_date: coupon?.start_date
      ? new Date(coupon.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    end_date: coupon?.end_date
      ? new Date(coupon.end_date).toISOString().split('T')[0]
      : '',
    is_active: coupon?.is_active ?? true,
    apply_to: coupon?.apply_to || 'all',
    affiliate_marketer_id: coupon?.affiliate_marketer_id || '',
    affiliate_link_id: coupon?.affiliate_link_id || '',
  });

  useEffect(() => {
    fetchUserData();
    if (coupon) {
      fetchCouponRelations();
    }
  }, [coupon, user?.id]);

  const fetchOwnedRows = async <T extends Record<string, any>>(
    table: 'products' | 'stores',
    selectClause: string,
    ownerColumns: string[]
  ): Promise<T[]> => {
    if (!user?.id) return [];

    const allRows: T[] = [];
    const seenIds = new Set<string>();

    for (const ownerColumn of ownerColumns) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select(selectClause)
          .eq(ownerColumn, user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching ${table} by ${ownerColumn}:`, error);
          continue;
        }

        (data || []).forEach((item: any) => {
          if (item?.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            allRows.push(item as T);
          }
        });
      } catch (err) {
        console.error(`Unexpected error fetching ${table} by ${ownerColumn}:`, err);
      }
    }

    return allRows;
  };

  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      const [productsData, storesData, marketersResponse, linksResponse] = await Promise.all([
        fetchOwnedRows<ProductOption>('products', 'id, title, slug', [
          'user_id',
          'seller_id',
          'merchant_id',
        ]),
        fetchOwnedRows<StoreOption>('stores', 'id, name, slug', ['user_id']),
        supabase
          .from('affiliate_marketers')
          .select('id, name, email, phone, is_active')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('affiliate_links')
          .select('id, code, marketer_id, is_active, apply_to, report_token')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (marketersResponse.error) {
        console.error('Error fetching marketers:', marketersResponse.error);
      }

      if (linksResponse.error) {
        console.error('Error fetching affiliate links:', linksResponse.error);
      }

      setProducts(productsData || []);
      setStores(storesData || []);
      setMarketers((marketersResponse.data || []) as AffiliateMarketerOption[]);
      setAffiliateLinks((linksResponse.data || []) as AffiliateLinkOption[]);

      if ((productsData || []).length === 0) {
        console.warn('No products found for coupon options. Check owner columns / RLS.');
      }

      if ((storesData || []).length === 0) {
        console.warn('No stores found for coupon options. Check owner columns / RLS.');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchCouponRelations = async () => {
    if (!coupon) return;

    try {
      if (coupon.apply_to === 'specific_products') {
        const { data } = await supabase
          .from('coupon_products')
          .select('product_id')
          .eq('coupon_id', coupon.id);

        if (data) setSelectedProducts(data.map((p: any) => p.product_id));
      } else if (coupon.apply_to === 'specific_stores') {
        const { data } = await supabase
          .from('coupon_stores')
          .select('store_id')
          .eq('coupon_id', coupon.id);

        if (data) setSelectedStores(data.map((s: any) => s.store_id));
      }
    } catch (error) {
      console.error('Error fetching coupon relations:', error);
    }
  };

  const filteredAffiliateLinks = useMemo(() => {
    if (!formData.affiliate_marketer_id) return affiliateLinks;

    return affiliateLinks.filter((link) => {
      if (!link.marketer_id) return false;
      return link.marketer_id === formData.affiliate_marketer_id;
    });
  }, [affiliateLinks, formData.affiliate_marketer_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setLoading(true);

    try {
      if (!formData.code.trim()) {
        throw new Error('كود الخصم مطلوب');
      }

      if (formData.discount_value === '') {
        throw new Error('قيمة الخصم مطلوبة');
      }

      if (formData.apply_to === 'specific_products' && selectedProducts.length === 0) {
        throw new Error('اختر منتجًا واحدًا على الأقل');
      }

      if (formData.apply_to === 'specific_stores' && selectedStores.length === 0) {
        throw new Error('اختر متجرًا واحدًا على الأقل');
      }

      const normalizedCode = formData.code.trim().toUpperCase();

      const { data: existingCoupon, error: duplicateCheckError } = await supabase
        .from('discount_coupons')
        .select('id')
        .eq('code', normalizedCode)
        .eq('user_id', user.id)
        .maybeSingle();

      if (duplicateCheckError) throw duplicateCheckError;

      if (existingCoupon && (!coupon || existingCoupon.id !== coupon.id)) {
        throw new Error('كود الخصم مستخدم بالفعل، اختر كودًا مختلفًا');
      }

      const selectedLink = affiliateLinks.find((item) => item.id === formData.affiliate_link_id);

      if (
        formData.affiliate_marketer_id &&
        formData.affiliate_link_id &&
        selectedLink?.marketer_id &&
        selectedLink.marketer_id !== formData.affiliate_marketer_id
      ) {
        throw new Error('الرابط المختار لا يتبع للمسوق المحدد');
      }

      const couponData = {
        user_id: user.id,
        code: normalizedCode,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        apply_to: formData.apply_to,
        affiliate_marketer_id: formData.affiliate_marketer_id || null,
        affiliate_link_id: formData.affiliate_link_id || null,
      };

      let couponId = coupon?.id;

      if (coupon) {
        const { error: updateError } = await supabase
          .from('discount_coupons')
          .update(couponData)
          .eq('id', coupon.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('discount_coupons')
          .insert(couponData)
          .select('id')
          .single();

        if (insertError) throw insertError;
        couponId = data.id;
      }

      if (!couponId) {
        throw new Error('تعذر تحديد الكوبون بعد الحفظ');
      }

      await Promise.all([
        supabase.from('coupon_products').delete().eq('coupon_id', couponId),
        supabase.from('coupon_stores').delete().eq('coupon_id', couponId),
      ]);

      if (formData.apply_to === 'specific_products' && selectedProducts.length > 0) {
        const { error: productsInsertError } = await supabase.from('coupon_products').insert(
          selectedProducts.map((productId) => ({
            coupon_id: couponId,
            product_id: productId,
          }))
        );

        if (productsInsertError) throw productsInsertError;
      }

      if (formData.apply_to === 'specific_stores' && selectedStores.length > 0) {
        const { error: storesInsertError } = await supabase.from('coupon_stores').insert(
          selectedStores.map((storeId) => ({
            coupon_id: couponId,
            store_id: storeId,
          }))
        );

        if (storesInsertError) throw storesInsertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ الكوبون');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {coupon ? 'تعديل كوبون الخصم' : 'إنشاء كوبون جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            تقدر تستخدم الكوبون بشكل مستقل، أو تربطه بمسوق معيّن أو رابط أفلييت معيّن حتى يكون
            النظام أكثر احترافية وترابطًا.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كود الخصم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الخصم <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ريال)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                قيمة الخصم <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد مرات الاستخدام
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="غير محدود"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للشراء (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) =>
                  setFormData({ ...formData, min_purchase_amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى للخصم (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.max_discount_amount}
                onChange={(e) =>
                  setFormData({ ...formData, max_discount_amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="غير محدود"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البداية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الانتهاء
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">ربط اختياري مع التسويق بالعمولة</h3>
                <p className="text-sm text-gray-500 mt-1">
                  هذا الربط اختياري. استخدمه إذا كنت تريد أن يكون الكوبون جزءًا من حملة أفلييت
                  احترافية.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المسوق المرتبط
                </label>
                <select
                  value={formData.affiliate_marketer_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      affiliate_marketer_id: e.target.value,
                      affiliate_link_id:
                        e.target.value &&
                        prev.affiliate_link_id &&
                        affiliateLinks.find((link) => link.id === prev.affiliate_link_id)
                          ?.marketer_id !== e.target.value
                          ? ''
                          : prev.affiliate_link_id,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">بدون ربط بمسوق</option>
                  {marketers.map((marketer) => (
                    <option key={marketer.id} value={marketer.id}>
                      {marketer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رابط الأفلييت المرتبط
                </label>
                <select
                  value={formData.affiliate_link_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedLink = affiliateLinks.find((item) => item.id === selectedId);

                    setFormData((prev) => ({
                      ...prev,
                      affiliate_link_id: selectedId,
                      affiliate_marketer_id:
                        selectedLink?.marketer_id || prev.affiliate_marketer_id,
                    }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">بدون ربط برابط أفلييت</option>
                  {filteredAffiliateLinks.map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 leading-7">
              الأفضل عمليًا:
              <br />
              - إذا كان الكوبون خاصًا بمسوق معيّن فقط، اربطه بالمسوق.
              <br />
              - إذا كان الكوبون جزءًا من حملة دقيقة لها رابط أفلييت محدد، اربطه بالرابط أيضًا.
              <br />
              - إذا كان الكوبون عامًا، اترك الحقول فارغة.
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نطاق التطبيق <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.apply_to}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  apply_to: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="all">جميع منتجاتي</option>
              <option value="specific_products">منتجات محددة</option>
              <option value="specific_stores">متاجر محددة</option>
            </select>
          </div>

          {formData.apply_to === 'specific_products' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اختر المنتجات</label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                {products.length === 0 ? (
                  <div className="text-sm text-gray-500">لا توجد منتجات متاحة</div>
                ) : (
                  products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts((prev) => [...prev, product.id]);
                          } else {
                            setSelectedProducts((prev) =>
                              prev.filter((id) => id !== product.id)
                            );
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>{getDisplayName(product)}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {formData.apply_to === 'specific_stores' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اختر المتاجر</label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                {stores.length === 0 ? (
                  <div className="text-sm text-gray-500">لا توجد متاجر متاحة</div>
                ) : (
                  stores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(store.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStores((prev) => [...prev, store.id]);
                          } else {
                            setSelectedStores((prev) =>
                              prev.filter((id) => id !== store.id)
                            );
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>{getDisplayName(store)}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
              الكوبون نشط
            </label>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : coupon ? 'حفظ التغييرات' : 'إنشاء الكوبون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
