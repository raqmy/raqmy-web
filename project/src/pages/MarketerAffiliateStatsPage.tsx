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
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type PublicTier = {
  id: string;
  day_from?: number | null;
  day_to?: number | null;
  start_date?: string | null;
  end_date?: string | null;
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
  seller_id?: string | null;
  marketer_id?: string | null;
  product_id?: string | null;
  store_id?: string | null;
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
    seller_id?: string | null;
    marketer_id?: string | null;
    apply_to?: 'product' | 'store' | 'all' | string | null;
    product_id?: string | null;
    store_id?: string | null;
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

type AffiliateLinkRow = {
  id: string;
  code?: string | null;
  report_token?: string | null;
  seller_id?: string | null;
  marketer_id?: string | null;
  apply_to?: 'product' | 'store' | 'all' | string | null;
  product_id?: string | null;
  store_id?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  clicks?: number | null;
  sales?: number | null;
  earnings?: number | null;
};

type AffiliateRuleRow = {
  id: string;
  seller_id?: string | null;
  marketer_id?: string | null;
  scope_type?: 'product' | 'store' | 'all' | string | null;
  product_id?: string | null;
  store_id?: string | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  priority?: number | null;
  is_active?: boolean | null;
  expires_at?: string | null;
};

type AffiliateTierRow = {
  id: string;
  rule_id: string;
  day_from?: number | null;
  day_to?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  is_active?: boolean | null;
};

type OrderRowForStats = {
  id: string;
  status?: string | null;
};

type AffiliateCommissionRowForStats = {
  id: string;
  commission_amount?: number | string | null;
  status?: string | null;
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

const normalizeRule = (rule: any): PublicRule => {
  if (!rule) return null;

  return {
    id: String(rule.id),
    scope_type: rule.scope_type ?? null,
    commission_type: rule.commission_type ?? null,
    commission_value:
      rule.commission_value !== null && rule.commission_value !== undefined
        ? Number(rule.commission_value)
        : null,
    priority: rule.priority !== null && rule.priority !== undefined ? Number(rule.priority) : null,
    is_active: rule.is_active ?? null,
    expires_at: rule.expires_at ?? null,
    seller_id: rule.seller_id ?? null,
    marketer_id: rule.marketer_id ?? null,
    product_id: rule.product_id ?? null,
    store_id: rule.store_id ?? null,
  };
};

const normalizeTier = (tier: any): PublicTier => ({
  id: String(tier.id),
  day_from: tier.day_from !== null && tier.day_from !== undefined ? Number(tier.day_from) : null,
  day_to: tier.day_to !== null && tier.day_to !== undefined ? Number(tier.day_to) : null,
  start_date: tier.start_date ?? null,
  end_date: tier.end_date ?? null,
  commission_type: tier.commission_type ?? null,
  commission_value:
    tier.commission_value !== null && tier.commission_value !== undefined
      ? Number(tier.commission_value)
      : null,
  is_active: tier.is_active ?? null,
});

const sortTiers = (tiers: PublicTier[]) =>
  [...tiers].sort((a, b) => {
    const aStart = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bStart = b.start_date ? new Date(b.start_date).getTime() : 0;
    if (aStart !== bStart) return aStart - bStart;

    const aFrom = Number(a.day_from ?? 0);
    const bFrom = Number(b.day_from ?? 0);
    if (aFrom !== bFrom) return aFrom - bFrom;

    const aTo = a.day_to === null || a.day_to === undefined ? 999999 : Number(a.day_to);
    const bTo = b.day_to === null || b.day_to === undefined ? 999999 : Number(b.day_to);
    return aTo - bTo;
  });

const formatDateForDisplay = (value?: string | null) => {
  if (!value) return 'مفتوح';
  try {
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('ar-SA');
  } catch {
    return value;
  }
};

const getTierStartLabel = (tier: PublicTier) =>
  tier.start_date ? formatDateForDisplay(tier.start_date) : String(tier.day_from ?? 0);

const getTierEndLabel = (tier: PublicTier) =>
  tier.end_date
    ? formatDateForDisplay(tier.end_date)
    : tier.day_to !== null && tier.day_to !== undefined
    ? String(tier.day_to)
    : 'مفتوح';

const selectBestRuleForLink = (
  link: Pick<AffiliateLinkRow, 'apply_to' | 'product_id' | 'store_id'>,
  rules: AffiliateRuleRow[]
): AffiliateRuleRow | null => {
  if (!rules.length) return null;

  const activeRules = rules.filter((rule) => rule.is_active !== false);
  const candidates = activeRules.length > 0 ? activeRules : rules;

  const normalizePriority = (value?: number | null) =>
    value !== null && value !== undefined ? Number(value) : 999999;

  const sorted = [...candidates].sort((a, b) => {
    const pa = normalizePriority(a.priority);
    const pb = normalizePriority(b.priority);
    if (pa !== pb) return pa - pb;
    return String(a.id).localeCompare(String(b.id));
  });

  if (link.apply_to === 'product') {
    const exactProduct = sorted.find(
      (rule) =>
        String(rule.scope_type ?? '').toLowerCase() === 'product' &&
        String(rule.product_id ?? '') === String(link.product_id ?? '')
    );
    if (exactProduct) return exactProduct;
  }

  if (link.apply_to === 'store') {
    const exactStore = sorted.find(
      (rule) =>
        String(rule.scope_type ?? '').toLowerCase() === 'store' &&
        String(rule.store_id ?? '') === String(link.store_id ?? '')
    );
    if (exactStore) return exactStore;
  }

  const allRule =
    sorted.find((rule) => String(rule.scope_type ?? '').toLowerCase() === 'all') ||
    sorted.find((rule) => !rule.scope_type);

  if (allRule) return allRule;

  return sorted[0] ?? null;
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

  const hydrateRuleAndTiersFallback = async (baseData: PublicStatsData): Promise<PublicStatsData> => {
    const existingRule = normalizeRule(baseData.rule);
    const existingTiers = sortTiers((baseData.tiers || []).map(normalizeTier));

    if (existingRule && existingTiers.length > 0) {
      return {
        ...baseData,
        rule: existingRule,
        tiers: existingTiers,
      };
    }

    const linkId = baseData.link?.id ? String(baseData.link.id) : '';
    if (!linkId) {
      return {
        ...baseData,
        rule: existingRule,
        tiers: existingTiers,
      };
    }

    const { data: linkRow, error: linkError } = await supabase
      .from('affiliate_links')
      .select(
        'id, code, report_token, seller_id, marketer_id, apply_to, product_id, store_id, description, is_active, clicks, sales, earnings'
      )
      .eq('id', linkId)
      .maybeSingle();

    if (linkError || !linkRow) {
      console.error('Fallback link fetch error:', linkError);
      return {
        ...baseData,
        rule: existingRule,
        tiers: existingTiers,
      };
    }

    const fullLink = linkRow as AffiliateLinkRow;

    const mergedLink = {
      ...baseData.link,
      id: fullLink.id ?? baseData.link.id ?? null,
      code: fullLink.code ?? baseData.link.code ?? null,
      report_token: fullLink.report_token ?? baseData.link.report_token ?? null,
      seller_id: fullLink.seller_id ?? baseData.link.seller_id ?? null,
      marketer_id: fullLink.marketer_id ?? baseData.link.marketer_id ?? null,
      apply_to: fullLink.apply_to ?? baseData.link.apply_to ?? null,
      product_id: fullLink.product_id ?? baseData.link.product_id ?? null,
      store_id: fullLink.store_id ?? baseData.link.store_id ?? null,
      description: fullLink.description ?? baseData.link.description ?? null,
      is_active: fullLink.is_active ?? baseData.link.is_active ?? null,
      clicks:
        fullLink.clicks !== null && fullLink.clicks !== undefined
          ? Number(fullLink.clicks)
          : baseData.link.clicks ?? 0,
      sales:
        fullLink.sales !== null && fullLink.sales !== undefined
          ? Number(fullLink.sales)
          : baseData.link.sales ?? 0,
      earnings:
        fullLink.earnings !== null && fullLink.earnings !== undefined
          ? Number(fullLink.earnings)
          : baseData.link.earnings ?? 0,
    };

    if (!mergedLink.seller_id || !mergedLink.marketer_id) {
      return {
        ...baseData,
        link: mergedLink,
        rule: existingRule,
        tiers: existingTiers,
      };
    }

    const { data: rulesData, error: rulesError } = await supabase
      .from('affiliate_rules')
      .select(
        'id, seller_id, marketer_id, scope_type, product_id, store_id, commission_type, commission_value, priority, is_active, expires_at'
      )
      .eq('seller_id', mergedLink.seller_id)
      .eq('marketer_id', mergedLink.marketer_id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (rulesError) {
      console.error('Fallback rules fetch error:', rulesError);
      return {
        ...baseData,
        link: mergedLink,
        rule: existingRule,
        tiers: existingTiers,
      };
    }

    const rules = (rulesData || []) as AffiliateRuleRow[];
    const selectedRule = existingRule || normalizeRule(selectBestRuleForLink(mergedLink, rules));

    if (!selectedRule?.id) {
      return {
        ...baseData,
        link: mergedLink,
        rule: selectedRule,
        tiers: existingTiers,
      };
    }

    const { data: tiersData, error: tiersError } = await supabase
      .from('affiliate_rule_tiers')
      .select('id, rule_id, day_from, day_to, start_date, end_date, commission_type, commission_value, is_active')
      .eq('rule_id', selectedRule.id)
      .order('day_from', { ascending: true })
      .order('day_to', { ascending: true });

    if (tiersError) {
      console.error('Fallback tiers fetch error:', tiersError);
      return {
        ...baseData,
        link: mergedLink,
        rule: selectedRule,
        tiers: existingTiers,
      };
    }

    const normalizedTiers = sortTiers((tiersData || []).map(normalizeTier));

    return {
      ...baseData,
      link: mergedLink,
      rule: selectedRule,
      tiers: normalizedTiers,
    };
  };

  const hydratePerformanceFromDatabase = async (
    baseData: PublicStatsData
  ): Promise<PublicStatsData> => {
    const linkId = baseData.link?.id ? String(baseData.link.id) : '';
    const marketerId = baseData.link?.marketer_id
      ? String(baseData.link.marketer_id)
      : baseData.marketer?.id
      ? String(baseData.marketer.id)
      : '';

    if (!linkId || !marketerId) {
      return baseData;
    }

    const currentClicks = Number(baseData.link?.clicks || 0);
    const currentSales = Number(baseData.link?.sales || 0);
    const currentEarnings = Number(baseData.link?.earnings || 0);

    try {
      const [{ data: paidOrders, error: ordersError }, { data: commissionRows, error: commissionsError }] =
        await Promise.all([
          supabase
            .from('orders')
            .select('id, status')
            .eq('status', 'paid')
            .eq('affiliate_link_id', linkId)
            .eq('affiliate_marketer_id', marketerId),
          supabase
            .from('affiliate_commissions')
            .select('id, commission_amount, status')
            .eq('link_id', linkId)
            .eq('marketer_id', marketerId),
        ]);

      if (ordersError) {
        console.error('Error fetching paid affiliate orders for public stats:', ordersError);
      }

      if (commissionsError) {
        console.error('Error fetching affiliate commissions for public stats:', commissionsError);
      }

      const paidSalesCount = ordersError
        ? currentSales
        : new Set(
            ((paidOrders || []) as OrderRowForStats[])
              .map((row) => row.id)
              .filter(Boolean)
          ).size;

      const ignoredCommissionStatuses = new Set([
        'rejected',
        'cancelled',
        'canceled',
        'failed',
        'void',
      ]);

      const totalCommissionEarnings = commissionsError
        ? currentEarnings
        : ((commissionRows || []) as AffiliateCommissionRowForStats[])
            .filter((row) => !ignoredCommissionStatuses.has(String(row.status || '').toLowerCase()))
            .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

      return {
        ...baseData,
        link: {
          ...baseData.link,
          clicks: currentClicks,
          sales: Math.max(currentSales, paidSalesCount),
          earnings: Math.max(currentEarnings, totalCommissionEarnings),
        },
      };
    } catch (error) {
      console.error('hydratePerformanceFromDatabase error:', error);
      return baseData;
    }
  };

  const hydrateMarketerDisplayName = async (
    baseData: PublicStatsData
  ): Promise<PublicStatsData> => {
    const marketerId = baseData.link?.marketer_id
      ? String(baseData.link.marketer_id)
      : baseData.marketer?.id
      ? String(baseData.marketer.id)
      : '';

    if (!marketerId) {
      return baseData;
    }

    try {
      const { data: marketerRow, error: marketerError } = await supabase
        .from('affiliate_marketers')
        .select('id, user_id, name')
        .eq('id', marketerId)
        .maybeSingle();

      if (marketerError || !marketerRow) {
        if (marketerError) console.error('Error fetching marketer display name:', marketerError);
        return baseData;
      }

      let marketerName = String((marketerRow as any).name || '').trim();
      const marketerUserId = (marketerRow as any).user_id ? String((marketerRow as any).user_id) : '';

      if (marketerUserId) {
        const { data: userRow, error: userError } = await supabase
          .from('users_profile')
          .select('id, name')
          .eq('id', marketerUserId)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching marketer user profile:', userError);
        }

        const userName = String((userRow as any)?.name || '').trim();
        if (userName) marketerName = userName;
      }

      return {
        ...baseData,
        marketer: {
          ...baseData.marketer,
          id: marketerId,
          name: marketerName || baseData.marketer?.name || 'مسوق',
        },
      };
    } catch (error) {
      console.error('hydrateMarketerDisplayName error:', error);
      return baseData;
    }
  };

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

      const rawData = (rpcData.data || {}) as PublicStatsData;

      const normalizedData: PublicStatsData = {
        marketer: {
          id: rawData.marketer?.id ?? null,
          name: rawData.marketer?.name ?? null,
        },
        link: {
          id: rawData.link?.id ?? null,
          code: rawData.link?.code ?? null,
          report_token: rawData.link?.report_token ?? null,
          seller_id: rawData.link?.seller_id ?? null,
          marketer_id: rawData.link?.marketer_id ?? null,
          apply_to: rawData.link?.apply_to ?? null,
          product_id: rawData.link?.product_id ?? null,
          store_id: rawData.link?.store_id ?? null,
          description: rawData.link?.description ?? null,
          is_active: rawData.link?.is_active ?? null,
          clicks:
            rawData.link?.clicks !== null && rawData.link?.clicks !== undefined
              ? Number(rawData.link.clicks)
              : 0,
          sales:
            rawData.link?.sales !== null && rawData.link?.sales !== undefined
              ? Number(rawData.link.sales)
              : 0,
          earnings:
            rawData.link?.earnings !== null && rawData.link?.earnings !== undefined
              ? Number(rawData.link.earnings)
              : 0,
        },
        target: {
          product_title: rawData.target?.product_title ?? null,
          store_title: rawData.target?.store_title ?? null,
        },
        rule: normalizeRule(rawData.rule),
        tiers: sortTiers((rawData.tiers || []).map(normalizeTier)),
      };

      const hydratedRuleData = await hydrateRuleAndTiersFallback(normalizedData);
      const hydratedPerformanceData = await hydratePerformanceFromDatabase(hydratedRuleData);
      setData(hydratedPerformanceData);
      const hydratedMarketerData = await hydrateMarketerDisplayName(hydratedPerformanceData);
      setData(hydratedMarketerData);
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
                    نوع العرض:{' '}
                    <span className="font-semibold">{getApplyToLabel(data.link?.apply_to)}</span>
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
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="الحالة"
                  value={isRuleActive ? 'القاعدة نشطة' : 'القاعدة غير نشطة'}
                />
                <InfoRow
                  icon={<CalendarRange className="w-4 h-4" />}
                  label="الصلاحية"
                  value={data.rule.expires_at ? formatDateForDisplay(data.rule.expires_at) : 'بدون انتهاء'}
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
                    <MiniInfo label={tier.start_date ? 'من تاريخ' : 'من اليوم'} value={getTierStartLabel(tier)} />
                    <MiniInfo
                      label={tier.end_date ? 'إلى تاريخ' : 'إلى اليوم'}
                      value={getTierEndLabel(tier)}
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
