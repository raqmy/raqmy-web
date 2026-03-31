import React, { useEffect, useMemo, useState } from 'react';
import {
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Eye,
  ShoppingBag,
  Copy,
  Check,
  BarChart3,
  Package,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AffiliateDashboardProps {
  onNavigate: (page: string) => void;
}

type AffiliateMarketerRow = {
  id: string;
  seller_id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  total_clicks?: number | null;
  total_sales?: number | null;
  total_earnings?: number | null;
};

type AffiliateLinkRow = {
  id: string;
  code: string;
  marketer_id?: string | null;
  seller_id?: string | null;
  apply_to?: string | null;
  product_id?: string | null;
  store_id?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  clicks?: number | null;
  sales?: number | null;
  earnings?: number | null;
  created_at?: string | null;
  marketer?: { id: string; name?: string | null } | null;
  product?: { id: string; name?: string | null; title?: string | null; slug?: string | null; price?: number | null; currency?: string | null } | null;
  store?: { id: string; name?: string | null; title?: string | null; slug?: string | null } | null;
};

type AffiliateCommissionRow = {
  id: string;
  marketer_id?: string | null;
  commission_amount?: number | null;
  status?: string | null;
};

interface AffiliateStats {
  totalClicks: number;
  totalSales: number;
  totalCommission: number;
  conversionRate: number;
}

const getDisplayName = (item?: { name?: string | null; title?: string | null } | null) =>
  item?.title || item?.name || 'بدون اسم';

const getAffiliateUrl = (link: AffiliateLinkRow) => {
  const origin = window.location.origin;

  if (link.apply_to === 'product' && link.product?.slug) {
    return `${origin}/p/${link.product.slug}?ref=${link.code}`;
  }

  if (link.apply_to === 'product' && link.product_id) {
    return `${origin}/p/${link.product_id}?ref=${link.code}`;
  }

  if (link.apply_to === 'store' && link.store?.slug) {
    return `${origin}/s/${link.store.slug}?ref=${link.code}`;
  }

  if (link.apply_to === 'store' && link.store_id) {
    return `${origin}/s/${link.store_id}?ref=${link.code}`;
  }

  return `${origin}?ref=${link.code}`;
};

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ onNavigate }) => {
  const { profile, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'marketers'>('overview');
  const [myMarketerProfiles, setMyMarketerProfiles] = useState<AffiliateMarketerRow[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkRow[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommissionRow[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalClicks: 0,
    totalSales: 0,
    totalCommission: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (profile || user) {
      fetchAffiliateData();
    }
  }, [profile?.id, profile?.email, user?.id, user?.email]);

  const fetchAffiliateData = async () => {
    setLoading(true);

    try {
      const authUserId = user?.id || profile?.id || null;
      const authEmail = user?.email || (profile as any)?.email || null;

      if (!authUserId && !authEmail) {
        setMyMarketerProfiles([]);
        setAffiliateLinks([]);
        setCommissions([]);
        setStats({
          totalClicks: 0,
          totalSales: 0,
          totalCommission: 0,
          conversionRate: 0,
        });
        return;
      }

      let marketerQuery = supabase.from('affiliate_marketers').select('*');

      if (authUserId && authEmail) {
        marketerQuery = marketerQuery.or(`user_id.eq.${authUserId},email.eq.${authEmail}`);
      } else if (authUserId) {
        marketerQuery = marketerQuery.eq('user_id', authUserId);
      } else if (authEmail) {
        marketerQuery = marketerQuery.eq('email', authEmail);
      }

      const { data: marketerRows, error: marketerError } = await marketerQuery;

      if (marketerError) {
        console.error('Error fetching marketer profiles:', marketerError);
        setMyMarketerProfiles([]);
        setAffiliateLinks([]);
        setCommissions([]);
        setStats({
          totalClicks: 0,
          totalSales: 0,
          totalCommission: 0,
          conversionRate: 0,
        });
        return;
      }

      const marketerProfiles = (marketerRows || []) as AffiliateMarketerRow[];
      setMyMarketerProfiles(marketerProfiles);

      const marketerIds = marketerProfiles.map((m) => m.id);

      if (marketerIds.length === 0) {
        setAffiliateLinks([]);
        setCommissions([]);
        setStats({
          totalClicks: 0,
          totalSales: 0,
          totalCommission: 0,
          conversionRate: 0,
        });
        return;
      }

      const [{ data: linksData, error: linksError }, { data: commissionsData, error: commissionsError }] =
        await Promise.all([
          supabase
            .from('affiliate_links')
            .select(`
              *,
              marketer:affiliate_marketers(id, name),
              product:products(id, name, title, slug, price, currency),
              store:stores(id, name, title, slug)
            `)
            .in('marketer_id', marketerIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('affiliate_commissions')
            .select('*')
            .in('marketer_id', marketerIds),
        ]);

      if (linksError) {
        console.error('Error fetching affiliate links:', linksError);
      }

      if (commissionsError) {
        console.error('Error fetching affiliate commissions:', commissionsError);
      }

      const formattedLinks = (linksData || []) as AffiliateLinkRow[];
      const commissionRows = (commissionsData || []) as AffiliateCommissionRow[];

      setAffiliateLinks(formattedLinks);
      setCommissions(commissionRows);

      const totalClicks = formattedLinks.reduce((sum, link) => sum + Number(link.clicks || 0), 0);
      const totalSales = formattedLinks.reduce((sum, link) => sum + Number(link.sales || 0), 0);
      const totalCommission = commissionRows.reduce(
        (sum, row) => sum + Number(row.commission_amount || 0),
        0
      );
      const conversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

      setStats({
        totalClicks,
        totalSales,
        totalCommission,
        conversionRate,
      });
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const uniqueCoveredProducts = useMemo(() => {
    const map = new Map<string, AffiliateLinkRow>();
    affiliateLinks.forEach((link) => {
      const key = `${link.apply_to}-${link.product_id || link.store_id || link.id}`;
      if (!map.has(key)) {
        map.set(key, link);
      }
    });
    return Array.from(map.values());
  }, [affiliateLinks]);

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة التسويق بالعمولة</h1>
          <p className="text-gray-600">
            {myMarketerProfiles.length > 0
              ? `مرحباً ${myMarketerProfiles[0].name}، هذه نظرة على روابطك وعمولاتك`
              : 'هذه الصفحة تعرض بياناتك إذا كنت مسوقًا مضافًا من قبل أحد التجار'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'links' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LinkIcon className="w-5 h-5" />
              <span>روابطي</span>
            </button>

            <button
              onClick={() => setActiveTab('marketers')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'marketers' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>حساباتي كمسوق</span>
            </button>
          </div>
        </div>

        {myMarketerProfiles.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا يوجد حساب تسويق مرتبط بك</h3>
            <p className="text-gray-600">
              لم يتم ربط حسابك بعد كمسوق داخل أي متجر. اطلب من التاجر إضافتك بالبريد أو ربط حسابك.
            </p>
          </div>
        ) : (
          <>
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
                      {stats.totalCommission.toFixed(2)} ريال
                    </div>
                    <p className="text-sm text-gray-600">إجمالي العمولات</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Eye className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalClicks}</div>
                    <p className="text-sm text-gray-600">إجمالي النقرات</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSales}</div>
                    <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {stats.conversionRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">معدل التحويل</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">روابطك جاهزة للمشاركة</h2>
                  <p className="text-blue-100 mb-6">
                    لديك {affiliateLinks.length} رابط/روابط تسويق. انسخ أي رابط وابدأ الترويج الآن.
                  </p>
                  <button
                    onClick={() => setActiveTab('links')}
                    className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    عرض الروابط
                  </button>
                </div>

                {uniqueCoveredProducts.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">العناصر المشمولة في روابطك</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uniqueCoveredProducts.map((link) => (
                        <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="font-bold text-gray-900 mb-2">
                            {link.apply_to === 'product'
                              ? getDisplayName(link.product)
                              : link.apply_to === 'store'
                              ? getDisplayName(link.store)
                              : 'جميع المنتجات'}
                          </div>
                          <div className="text-sm text-gray-500 mb-3">
                            {link.apply_to === 'product'
                              ? 'رابط لمنتج محدد'
                              : link.apply_to === 'store'
                              ? 'رابط لمتجر محدد'
                              : 'رابط عام'}
                          </div>
                          <button
                            onClick={() => copyToClipboard(getAffiliateUrl(link), link.code)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {copiedCode === link.code ? 'تم النسخ' : 'نسخ الرابط'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'links' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">روابط التسويق</h2>
                  <p className="text-gray-600">هذه الروابط المرتبطة بحسابك كمسوق</p>
                </div>

                {affiliateLinks.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد روابط</h3>
                    <p className="text-gray-600">لم يضف لك أي تاجر روابط تسويق بعد</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {affiliateLinks.map((link) => {
                      const finalUrl = getAffiliateUrl(link);

                      return (
                        <div key={link.id} className="bg-white rounded-xl p-6 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {link.apply_to === 'product'
                                  ? getDisplayName(link.product)
                                  : link.apply_to === 'store'
                                  ? getDisplayName(link.store)
                                  : 'رابط عام'}
                              </h3>

                              <p className="text-sm text-gray-600 mb-2">
                                كود التتبع: {link.code}
                              </p>

                              {link.marketer?.name && (
                                <p className="text-sm text-gray-600 mb-2">
                                  المسوق: {link.marketer.name}
                                </p>
                              )}

                              <p className="text-xs text-gray-500">
                                تم الإنشاء: {link.created_at ? new Date(link.created_at).toLocaleDateString('ar-SA') : '--'}
                              </p>
                            </div>

                            {link.product?.price ? (
                              <div className="text-left">
                                <div className="text-lg font-bold text-blue-600 mb-1">
                                  {link.product.price} {link.product.currency || 'ر.س'}
                                </div>
                                <p className="text-xs text-gray-500">سعر المنتج</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-600 break-all" dir="ltr">
                              {finalUrl}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="rounded-lg bg-gray-50 p-3">
                              <div className="text-xs text-gray-500 mb-1">النقرات</div>
                              <div className="text-lg font-bold text-gray-900">{link.clicks || 0}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <div className="text-xs text-gray-500 mb-1">المبيعات</div>
                              <div className="text-lg font-bold text-gray-900">{link.sales || 0}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <div className="text-xs text-gray-500 mb-1">الأرباح</div>
                              <div className="text-lg font-bold text-gray-900">
                                {Number(link.earnings || 0).toFixed(2)} ر.س
                              </div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <div className="text-xs text-gray-500 mb-1">الحالة</div>
                              <div className="text-lg font-bold text-gray-900">
                                {link.is_active ? 'نشط' : 'متوقف'}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => copyToClipboard(finalUrl, link.code)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {copiedCode === link.code ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>نسخ الرابط</span>
                                </>
                              )}
                            </button>

                            {link.apply_to === 'product' && link.product_id && (
                              <button
                                onClick={() => onNavigate(`product-${link.product_id}`)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                عرض المنتج
                              </button>
                            )}

                            {link.apply_to === 'store' && link.store_id && (
                              <button
                                onClick={() => onNavigate(`store-detail-${link.store_id}`)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                عرض المتجر
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'marketers' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">حساباتي كمسوق</h2>
                  <p className="text-gray-600">قد يكون لديك أكثر من حساب مسوق عند أكثر من تاجر</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myMarketerProfiles.map((marketer) => (
                    <div key={marketer.id} className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{marketer.name}</h3>
                          <div className="text-sm text-gray-600">
                            {marketer.is_active ? 'نشط' : 'غير نشط'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {marketer.email && <div>📧 {marketer.email}</div>}
                        {marketer.phone && <div>📱 {marketer.phone}</div>}
                        {marketer.notes && <div>📝 {marketer.notes}</div>}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">النقرات</div>
                          <div className="font-bold text-gray-900">{marketer.total_clicks || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">المبيعات</div>
                          <div className="font-bold text-gray-900">{marketer.total_sales || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">الأرباح</div>
                          <div className="font-bold text-gray-900">
                            {Number(marketer.total_earnings || 0).toFixed(2)} ر.س
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
