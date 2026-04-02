import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  Copy,
  DollarSign,
  Link as LinkIcon,
  MousePointerClick,
  Package,
  Store as StoreIcon,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type PublicTier = {
  id: string;
  day_from?: number | null;
  day_to?: number | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  is_active?: boolean | null;
};

type PublicRule = {
  id: string;
  scope_type?: 'product' | 'store' | 'all' | string | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  priority?: number | null;
  is_active?: boolean | null;
  expires_at?: string | null;
} | null;

type PublicStatsData = {
  marketer: {
    id?: string | null;
    name?: string | null;
  };
  link: {
    id?: string | null;
    code?: string | null;
    report_token?: string | null;
    apply_to?: 'product' | 'store' | 'all' | string | null;
    description?: string | null;
    is_active?: boolean | null;
    clicks?: number | null;
    sales?: number | null;
    earnings?: number | null;
  };
  target: {
    product_title?: string | null;
    store_title?: string | null;
  };
  rule: PublicRule;
  tiers: PublicTier[];
};

const getApplyToLabel = (value?: string | null) => {
  switch (value) {
    case 'product':
      return 'منتج محدد';
    case 'store':
      return 'متجر محدد';
    case 'all':
      return 'عام على جميع منتجات التاجر';
    default:
      return value || 'غير محدد';
  }
};

const getScopeTypeLabel = (value?: string | null) => {
  switch (value) {
    case 'product':
      return 'منتج';
    case 'store':
      return 'متجر';
    case 'all':
      return 'عام';
    default:
      return value || 'عام';
  }
};

const formatMoney = (value?: number | null) => `${Number(value || 0).toFixed(2)} ر.س`;

const formatCommission = (type?: string | null, value?: number | null) => {
  if (!value && value !== 0) return 'غير محدد';
  return type === 'fixed'
    ? `${Number(value).toFixed(2)} ر.س`
    : `${Number(value).toFixed(0)}%`;
};

const conversionRate = (clicks?: number | null, sales?: number | null) => {
  const c = Number(clicks || 0);
  const s = Number(sales || 0);
  if (c <= 0) return '0.0%';
  return `${((s / c) * 100).toFixed(1)}%`;
};

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getReportTokenFromPath = () => {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  return parts.length >= 2 && parts[0] === 'affiliate-report' ? parts[1] : '';
};

export const MarketerAffiliateStatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [data, setData] = useState<PublicStatsData | null>(null);

  const reportToken = useMemo(() => getReportTokenFromPath(), []);

  useEffect(() => {
    fetchStats();
  }, [reportToken]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    setData(null);

    try {
      if (!reportToken) {
        throw new Error('رابط الإحصائيات غير مكتمل');
      }

      if (!isValidUuid(reportToken)) {
        throw new Error('رابط الإحصائيات غير صالح');
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_affiliate_public_stats',
        {
          p_report_token: reportToken,
        }
      );

      if (rpcError) throw rpcError;

      if (!rpcData?.success) {
        throw new Error('تعذر العثور على صفحة الإحصائيات');
      }

      setData(rpcData.data as PublicStatsData);
    } catch (err: any) {
      console.error('Error fetching marketer affiliate stats:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarketingLink = async () => {
    try {
      if (!data?.link?.code) return;
      const url = `${window.location.origin}?ref=${data.link.code}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1800);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const targetName =
    data?.link?.apply_to === 'product'
      ? data?.target?.product_title || 'منتج غير معروف'
      : data?.link?.apply_to === 'store'
      ? data?.target?.store_title || 'متجر غير معروف'
      : 'جميع منتجات التاجر';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل إحصائيات رابط التسويق...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white border border-red-100 rounded-3xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">تعذر فتح صفحة الإحصائيات</h1>
          <p className="text-gray-600 leading-7">
            {error || 'هذه الصفحة غير متاحة حاليًا'}
          </p>
        </div>
      </div>
    );
  }

  const clicks = Number(data.link?.clicks || 0);
  const sales = Number(data.link?.sales || 0);
  const earnings = Number(data.link?.earnings || 0);
  const isLinkActive = data.link?.is_active === true;
  const isRuleActive = data.rule ? data.rule.is_active === true : true;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-l from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-lg mb-6">
          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm mb-4">
                  <Target className="w-4 h-4" />
                  لوحة إحصائيات المسوق
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                  {data.marketer?.name || 'مسوق'}
                </h1>

                <div className="space-y-2 text-white/90 text-sm lg:text-base">
                  <div>
                    الكود: <span className="font-mono font-bold">{data.link?.code || '—'}</span>
                  </div>
                  <div>
                    نوع العرض: <span className="font-semibold">{getApplyToLabel(data.link?.apply_to)}</span>
                  </div>
                  <div>
                    المستهدف: <span className="font-semibold">{targetName}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-[320px]">
                <SummaryMiniCard
                  label="النقرات"
                  value={clicks}
                  icon={<MousePointerClick className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="المبيعات"
                  value={sales}
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="الأرباح"
                  value={formatMoney(earnings)}
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="التحويل"
                  value={conversionRate(clicks, sales)}
                  icon={<Target className="w-5 h-5" />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <PanelCard
            title="ملخص الرابط"
            subtitle="الرابط الذي تعمل عليه حاليًا"
            icon={<LinkIcon className="w-5 h-5" />}
          >
            <div className="space-y-3">
              <InfoRow
                icon={<LinkIcon className="w-4 h-4" />}
                label="الكود"
                value={data.link?.code || '—'}
              />
              <InfoRow
                icon={<Target className="w-4 h-4" />}
                label="النطاق"
                value={getApplyToLabel(data.link?.apply_to)}
              />
              <InfoRow
                icon={
                  data.link?.apply_to === 'store' ? (
                    <StoreIcon className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )
                }
                label="المستهدف"
                value={targetName}
              />
              <InfoRow
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="الحالة"
                value={isLinkActive ? 'الرابط نشط' : 'الرابط غير نشط'}
              />
            </div>

            <div className="mt-5">
              <button
                onClick={handleCopyMarketingLink}
                className="w-full px-4 py-3 rounded-2xl bg-violet-600 text-white font-semibold hover:bg-violet-700 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copySuccess ? 'تم نسخ الرابط' : 'نسخ رابط التسويق'}
              </button>
            </div>
          </PanelCard>

          <PanelCard
            title="العمولة الأساسية"
            subtitle="القاعدة الحالية المرتبطة بهذا الرابط"
            icon={<DollarSign className="w-5 h-5" />}
          >
            {!data.rule ? (
              <EmptyMiniState text="لا توجد قاعدة عمولة مرتبطة بهذا الرابط حاليًا." />
            ) : (
              <div className="space-y-3">
                <InfoRow
                  icon={<SettingsIconMini />}
                  label="نوع القاعدة"
                  value={getScopeTypeLabel(data.rule.scope_type)}
                />
                <InfoRow
                  icon={<DollarSign className="w-4 h-4" />}
                  label="العمولة"
                  value={formatCommission(data.rule.commission_type, data.rule.commission_value)}
                />
                <InfoRow
                  icon={<Target className="w-4 h-4" />}
                  label="الأولوية"
                  value={String(data.rule.priority || 100)}
                />
                <InfoRow
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="الحالة"
                  value={isRuleActive ? 'القاعدة نشطة' : 'القاعدة غير نشطة'}
                />
                <InfoRow
                  icon={<CalendarRange className="w-4 h-4" />}
                  label="الصلاحية"
                  value={data.rule.expires_at || 'بدون انتهاء'}
                />
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="ملخص الأداء"
            subtitle="نتيجة هذا الرابط فقط"
            icon={<TrendingUp className="w-5 h-5" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<MousePointerClick className="w-4 h-4" />}
                label="النقرات"
                value={clicks}
              />
              <MetricCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="المبيعات"
                value={sales}
              />
              <MetricCard
                icon={<DollarSign className="w-4 h-4" />}
                label="الأرباح"
                value={formatMoney(earnings)}
              />
              <MetricCard
                icon={<Target className="w-4 h-4" />}
                label="التحويل"
                value={conversionRate(clicks, sales)}
              />
            </div>
          </PanelCard>
        </div>

        <div className="mt-6">
          <PanelCard
            title="شرائح العمولة حسب الأيام"
            subtitle="إذا لم توجد شرائح فسيتم الاعتماد على العمولة الأساسية"
            icon={<CalendarRange className="w-5 h-5" />}
          >
            {!data.tiers || data.tiers.length === 0 ? (
              <EmptyMiniState text="لا توجد شرائح عمولة. سيتم استخدام العمولة الأساسية فقط." />
            ) : (
              <div className="space-y-3">
                {data.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4"
                  >
                    <MiniInfo label="من اليوم" value={String(tier.day_from ?? 0)} />
                    <MiniInfo
                      label="إلى اليوم"
                      value={
                        tier.day_to !== null && tier.day_to !== undefined
                          ? String(tier.day_to)
                          : 'مفتوح'
                      }
                    />
                    <MiniInfo
                      label="العمولة"
                      value={formatCommission(tier.commission_type, tier.commission_value)}
                    />
                    <MiniInfo
                      label="الحالة"
                      value={tier.is_active ? 'نشطة' : 'غير نشطة'}
                    />
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  );
};

const SettingsIconMini = () => (
  <div className="w-4 h-4 rounded-full border border-current" />
);

const SummaryMiniCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-white/80 text-xs">{label}</span>
      <div className="text-white/90">{icon}</div>
    </div>
    <div className="font-bold text-lg">{value}</div>
  </div>
);

const PanelCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
}> = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-lg font-bold text-gray-900">{value}</div>
  </div>
);

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
    <div className="flex items-center gap-2 text-gray-500 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <div className="font-medium text-gray-800 break-words">{value}</div>
  </div>
);

const MiniInfo: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="font-semibold text-gray-900">{value}</div>
  </div>
);

const EmptyMiniState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
    {text}
  </div>
);
