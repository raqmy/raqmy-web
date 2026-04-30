import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Link as LinkIcon,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Search,
  Settings2,
  CalendarRange,
  Target,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Megaphone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CopyLinkButton } from '../components/shared/CopyLinkButton';

interface AffiliateManagementPageProps {
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
  created_at?: string | null;
  updated_at?: string | null;
};

type AffiliateLinkRow = {
  id: string;
  user_id?: string | null;
  seller_id?: string | null;
  marketer_id?: string | null;
  code: string;
  report_token?: string | null;
  apply_to?: 'product' | 'store' | 'all' | string | null;
  product_id?: string | null;
  store_id?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  clicks?: number | null;
  sales?: number | null;
  earnings?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  marketer?: { id: string; name?: string | null } | null;
  product?: { id: string; name?: string | null; title?: string | null; slug?: string | null } | null;
  store?: { id: string; name?: string | null; title?: string | null; slug?: string | null } | null;
};

type AffiliateRuleRow = {
  id: string;
  seller_id: string;
  marketer_id: string;
  rule_name?: string | null;
  scope_type?: 'product' | 'store' | 'all' | string | null;
  store_id?: string | null;
  product_id?: string | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  is_active?: boolean | null;
  priority?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  marketer?: { id: string; name?: string | null } | null;
  product?: { id: string; name?: string | null; title?: string | null; slug?: string | null } | null;
  store?: { id: string; name?: string | null; title?: string | null; slug?: string | null } | null;
  tiers?: AffiliateRuleTierRow[];
};

type AffiliateRuleTierRow = {
  id: string;
  rule_id: string;
  day_from?: number | null;
  day_to?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  commission_type?: 'percentage' | 'fixed' | string | null;
  commission_value?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
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

type TierDraft = {
  id?: string;
  localId: string;
  start_date: string;
  end_date: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: string;
  is_active: boolean;
};

type UnifiedCampaignMetrics = {
  clicks: number;
  sales: number;
  earnings: number;
};

type UnifiedCampaignRow = {
  id: string;
  marketer: AffiliateMarketerRow | null;
  link: AffiliateLinkRow | null;
  rule: AffiliateRuleRow | null;
  title: string;
  metrics: UnifiedCampaignMetrics;
};

type UnifiedAffiliateForm = {
  marketer_mode: 'new' | 'existing';
  existing_marketer_id: string;

  marketer_name: string;
  marketer_email: string;
  marketer_phone: string;
  marketer_notes: string;
  marketer_is_active: boolean;

  link_apply_to: 'product' | 'store' | 'all';
  link_product_id: string;
  link_store_id: string;
  link_is_active: boolean;

  rule_commission_type: 'percentage' | 'fixed';
  rule_commission_value: string;
  rule_priority: string;
  rule_is_active: boolean;

  expiry_mode: 'none' | 'date';
  expiry_date: string;
};

type ScopeFilter = 'all' | 'product' | 'store' | 'catalog';

type OrderAffiliateRow = {
  id: string;
  affiliate_link_id?: string | null;
  affiliate_marketer_id?: string | null;
  status?: string | null;
};

type AffiliateCommissionRow = {
  id: string;
  order_id?: string | null;
  order_item_id?: string | null;
  seller_id?: string | null;
  marketer_id?: string | null;
  link_id?: string | null;
  rule_id?: string | null;
  commission_type?: string | null;
  commission_value?: number | string | null;
  commission_amount?: number | string | null;
  status?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

const getDisplayName = (item?: { name?: string | null; title?: string | null } | null) =>
  item?.title || item?.name || 'بدون اسم';

const getApplyToLabel = (value?: string | null) => {
  switch (value) {
    case 'product':
      return 'منتج محدد';
    case 'store':
      return 'متجر محدد';
    case 'all':
      return 'جميع منتجاتي';
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
  return type === 'fixed' ? `${Number(value).toFixed(2)} ر.س` : `${Number(value).toFixed(0)}%`;
};

const conversionRate = (clicks?: number | null, sales?: number | null) => {
  const c = Number(clicks || 0);
  const s = Number(sales || 0);
  if (c <= 0) return '0.0%';
  return `${((s / c) * 100).toFixed(1)}%`;
};

const createLocalTierId = () => Math.random().toString(36).slice(2, 10);

const getTodayDateInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

const formatDateForDisplay = (value?: string | null) => {
  if (!value) return 'مفتوح';
  try {
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('ar-SA');
  } catch {
    return value;
  }
};

const buildLegacyDayRangeFromDateTier = (tier: TierDraft) => ({
  day_from: 0,
  day_to: 999999,
  start_date: tier.start_date || null,
  end_date: tier.end_date || null,
});

const sanitizeAffiliateCodePart = (value?: string | null) =>
  (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);

const getScopeCodePrefix = (scope: 'product' | 'store' | 'all') => {
  if (scope === 'product') return 'PRD';
  if (scope === 'store') return 'STR';
  return 'AFF';
};

const buildGeneratedAffiliateCode = (
  marketerName: string,
  scope: 'product' | 'store' | 'all',
  seed?: string
) => {
  const cleanName = sanitizeAffiliateCodePart(marketerName);
  const namePart = cleanName || 'AFF';
  const suffix = (seed || Math.random().toString(36).slice(2, 6))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || '0001';

  return `${getScopeCodePrefix(scope)}-${namePart}-${suffix}`;
};

const uniqueIds = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

const buildMarketerMap = (items: AffiliateMarketerRow[]) =>
  new Map(items.map((item) => [item.id, item]));

const buildProductMap = (items: ProductOption[]) =>
  new Map(items.map((item) => [item.id, item]));

const buildStoreMap = (items: StoreOption[]) =>
  new Map(items.map((item) => [item.id, item]));

const buildRuleName = (marketerName: string, scopeType: string) => {
  const scopeLabel =
    scopeType === 'product' ? 'منتج' : scopeType === 'store' ? 'متجر' : 'عام';
  return `قاعدة ${marketerName || 'أفلييت'} - ${scopeLabel}`;
};

const buildAffiliateOfferUrl = (campaign: UnifiedCampaignRow) => {
  if (typeof window === 'undefined' || !campaign.link) return '';

  const origin = window.location.origin;
  const refCode = encodeURIComponent(campaign.link.code);

  if (campaign.link.apply_to === 'store') {
    const storeSlug = campaign.link.store?.slug || campaign.rule?.store?.slug;
    if (storeSlug) {
      return `${origin}/s/${encodeURIComponent(storeSlug)}?ref=${refCode}`;
    }

    if (campaign.link.store_id) {
      return `${origin}/marketplace?store_id=${encodeURIComponent(campaign.link.store_id)}&ref=${refCode}`;
    }
  }

  if (campaign.link.apply_to === 'product') {
    const productSlugOrId =
      campaign.link.product?.slug ||
      campaign.rule?.product?.slug ||
      campaign.link.product_id ||
      campaign.rule?.product_id ||
      '';

    const storeSlug = campaign.link.store?.slug || campaign.rule?.store?.slug;

    if (productSlugOrId && storeSlug) {
      return `${origin}/p/${encodeURIComponent(productSlugOrId)}?store=${encodeURIComponent(storeSlug)}&ref=${refCode}`;
    }

    if (productSlugOrId) {
      return `${origin}/p/${encodeURIComponent(productSlugOrId)}?ref=${refCode}`;
    }
  }

  const sellerId = campaign.link.seller_id || campaign.link.user_id || campaign.marketer?.seller_id;
  if (sellerId) {
    const encodedSellerId = encodeURIComponent(sellerId);
    return `${origin}/marketplace?seller=${encodedSellerId}&seller_id=${encodedSellerId}&ref=${refCode}`;
  }

  return `${origin}/marketplace?ref=${refCode}`;
};

const getAffiliateOfferLinkHint = (campaign: UnifiedCampaignRow) => {
  const scope = getCampaignScopeValue(campaign);

  if (scope === 'store') return 'هذا الرابط يفتح المتجر مباشرة مع حفظ كود الأفلييت.';
  if (scope === 'product') return 'هذا الرابط يفتح المنتج مباشرة مع حفظ كود الأفلييت.';
  return 'هذا الرابط يفتح السوق العام مع إظهار منتجات هذا التاجر فقط مع حفظ كود الأفلييت.';
};

const matchRuleForLink = (link: AffiliateLinkRow, rules: AffiliateRuleRow[]) => {
  if (!link.marketer_id) return null;

  const candidates = rules.filter((rule) => {
    if (rule.marketer_id !== link.marketer_id) return false;

    if (rule.scope_type === 'all' && link.apply_to === 'all') return true;
    if (
      rule.scope_type === 'product' &&
      link.apply_to === 'product' &&
      rule.product_id === link.product_id
    ) {
      return true;
    }
    if (
      rule.scope_type === 'store' &&
      link.apply_to === 'store' &&
      rule.store_id === link.store_id
    ) {
      return true;
    }

    return false;
  });

  if (candidates.length === 0) {
    const fallback = rules.filter(
      (rule) => rule.marketer_id === link.marketer_id && rule.scope_type === 'all'
    );

    if (fallback.length === 0) return null;

    return [...fallback].sort(
      (a, b) => Number(a.priority || 100) - Number(b.priority || 100)
    )[0];
  }

  return [...candidates].sort(
    (a, b) => Number(a.priority || 100) - Number(b.priority || 100)
  )[0];
};

const isCampaignActive = (campaign: UnifiedCampaignRow) =>
  (campaign.marketer?.is_active ?? true) === true &&
  (campaign.link?.is_active ?? true) === true &&
  (campaign.rule?.is_active ?? true) === true;

const getCampaignScopeValue = (campaign: UnifiedCampaignRow): ScopeFilter => {
  const source = campaign.link?.apply_to || campaign.rule?.scope_type || 'all';
  if (source === 'product') return 'product';
  if (source === 'store') return 'store';
  return 'catalog';
};

const getCampaignScopeLabel = (campaign: UnifiedCampaignRow) => {
  const scope = getCampaignScopeValue(campaign);
  if (scope === 'product') return 'منتج';
  if (scope === 'store') return 'متجر';
  return 'جميع منتجاتي';
};

const getCampaignObjectName = (campaign: UnifiedCampaignRow) => {
  const scope = getCampaignScopeValue(campaign);

  if (scope === 'product') {
    return getDisplayName(campaign.link?.product || campaign.rule?.product);
  }

  if (scope === 'store') {
    return getDisplayName(campaign.link?.store || campaign.rule?.store);
  }

  return 'جميع منتجاتي';
};

const buildInitialTierDrafts = (campaign?: UnifiedCampaignRow | null): TierDraft[] =>
  campaign?.rule?.tiers?.map((tier) => ({
    id: tier.id,
    localId: tier.id || createLocalTierId(),
    start_date: tier.start_date ? tier.start_date.slice(0, 10) : '',
    end_date: tier.end_date ? tier.end_date.slice(0, 10) : '',
    commission_type: (tier.commission_type as 'percentage' | 'fixed') || 'percentage',
    commission_value: tier.commission_value?.toString() ?? '',
    is_active: tier.is_active ?? true,
  })) || [];

const buildInitialFormData = (campaign?: UnifiedCampaignRow | null): UnifiedAffiliateForm => ({
  marketer_mode: campaign?.marketer ? 'existing' : 'new',
  existing_marketer_id:
    campaign?.marketer?.id || campaign?.rule?.marketer_id || campaign?.link?.marketer_id || '',

  marketer_name: campaign?.marketer?.name || '',
  marketer_email: campaign?.marketer?.email || '',
  marketer_phone: campaign?.marketer?.phone || '',
  marketer_notes: campaign?.marketer?.notes || '',
  marketer_is_active: campaign?.marketer?.is_active ?? true,

  link_apply_to: (campaign?.link?.apply_to as 'product' | 'store' | 'all') || 'all',
  link_product_id: campaign?.link?.product_id || campaign?.rule?.product_id || '',
  link_store_id: campaign?.link?.store_id || campaign?.rule?.store_id || '',
  link_is_active: campaign?.link?.is_active ?? true,

  rule_commission_type:
    (campaign?.rule?.commission_type as 'percentage' | 'fixed') || 'percentage',
  rule_commission_value:
    campaign?.rule?.commission_value !== null && campaign?.rule?.commission_value !== undefined
      ? String(campaign.rule.commission_value)
      : '',
  rule_priority:
    campaign?.rule?.priority !== null && campaign?.rule?.priority !== undefined
      ? String(campaign.rule.priority)
      : '100',
  rule_is_active: campaign?.rule?.is_active ?? true,

  expiry_mode: campaign?.rule?.expires_at ? 'date' : 'none',
  expiry_date: campaign?.rule?.expires_at ? campaign.rule.expires_at.slice(0, 10) : '',
});

export const AffiliateManagementPage: React.FC<AffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [marketers, setMarketers] = useState<AffiliateMarketerRow[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRow[]>([]);
  const [rules, setRules] = useState<AffiliateRuleRow[]>([]);
  const [ordersWithAffiliate, setOrdersWithAffiliate] = useState<OrderAffiliateRow[]>([]);
  const [affiliateCommissions, setAffiliateCommissions] = useState<AffiliateCommissionRow[]>([]);

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<UnifiedCampaignRow | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user?.id]);

  const fetchAllData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      await Promise.all([
        fetchMarketers(),
        fetchLinks(),
        fetchRules(),
        fetchOrdersWithAffiliate(),
        fetchAffiliateCommissions(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketers = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('affiliate_marketers')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketers:', error);
      return;
    }

    setMarketers((data || []) as AffiliateMarketerRow[]);
  };

  const fetchLinks = async () => {
    if (!user?.id) return;

    const { data: rawLinks, error: linksError } = await supabase
      .from('affiliate_links')
      .select('*')
      .or(`seller_id.eq.${user.id},user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return;
    }

    const linksRows = (rawLinks || []) as AffiliateLinkRow[];

    if (linksRows.length === 0) {
      setLinks([]);
      return;
    }

    const marketerIds = uniqueIds(linksRows.map((item) => item.marketer_id));
    const productIds = uniqueIds(linksRows.map((item) => item.product_id));
    const storeIds = uniqueIds(linksRows.map((item) => item.store_id));

    let marketerMap = new Map<string, AffiliateMarketerRow>();
    let productMap = new Map<string, ProductOption>();
    let storeMap = new Map<string, StoreOption>();

    if (marketerIds.length > 0) {
      const { data: marketersData, error: marketersError } = await supabase
        .from('affiliate_marketers')
        .select(
          'id, name, email, phone, status, is_active, seller_id, user_id, notes, total_clicks, total_sales, total_earnings'
        )
        .in('id', marketerIds);

      if (marketersError) {
        console.error('Error fetching link marketers:', marketersError);
      } else {
        marketerMap = buildMarketerMap((marketersData || []) as AffiliateMarketerRow[]);
      }
    }

    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, slug')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching link products:', productsError);
      } else {
        productMap = buildProductMap((productsData || []) as ProductOption[]);
      }
    }

    if (storeIds.length > 0) {
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, slug')
        .in('id', storeIds);

      if (storesError) {
        console.error('Error fetching link stores:', storesError);
      } else {
        storeMap = buildStoreMap((storesData || []) as StoreOption[]);
      }
    }

    const normalizedLinks = linksRows.map((item) => ({
      ...item,
      marketer: item.marketer_id ? marketerMap.get(item.marketer_id) || null : null,
      product: item.product_id ? productMap.get(item.product_id) || null : null,
      store: item.store_id ? storeMap.get(item.store_id) || null : null,
    })) as AffiliateLinkRow[];

    setLinks(normalizedLinks);
  };

  const fetchRules = async () => {
    if (!user?.id) return;

    const { data: rawRules, error: rulesError } = await supabase
      .from('affiliate_rules')
      .select('*')
      .eq('seller_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      return;
    }

    const rulesRows = (rawRules || []) as AffiliateRuleRow[];

    if (rulesRows.length === 0) {
      setRules([]);
      return;
    }

    const ruleIds = uniqueIds(rulesRows.map((item) => item.id));
    const marketerIds = uniqueIds(rulesRows.map((item) => item.marketer_id));
    const productIds = uniqueIds(rulesRows.map((item) => item.product_id));
    const storeIds = uniqueIds(rulesRows.map((item) => item.store_id));

    let tiersMap = new Map<string, AffiliateRuleTierRow[]>();
    let marketerMap = new Map<string, AffiliateMarketerRow>();
    let productMap = new Map<string, ProductOption>();
    let storeMap = new Map<string, StoreOption>();

    if (ruleIds.length > 0) {
      const { data: tiersData, error: tiersError } = await supabase
        .from('affiliate_rule_tiers')
        .select('*')
        .in('rule_id', ruleIds)
        .order('start_date', { ascending: true, nullsFirst: false })
        .order('day_from', { ascending: true });

      if (tiersError) {
        console.error('Error fetching rule tiers:', tiersError);
      } else {
        (tiersData || []).forEach((tier: any) => {
          const current = tiersMap.get(tier.rule_id) || [];
          current.push(tier as AffiliateRuleTierRow);
          tiersMap.set(tier.rule_id, current);
        });
      }
    }

    if (marketerIds.length > 0) {
      const { data: marketersData, error: marketersError } = await supabase
        .from('affiliate_marketers')
        .select(
          'id, name, email, phone, status, is_active, seller_id, user_id, notes, total_clicks, total_sales, total_earnings'
        )
        .in('id', marketerIds);

      if (marketersError) {
        console.error('Error fetching rule marketers:', marketersError);
      } else {
        marketerMap = buildMarketerMap((marketersData || []) as AffiliateMarketerRow[]);
      }
    }

    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, slug')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching rule products:', productsError);
      } else {
        productMap = buildProductMap((productsData || []) as ProductOption[]);
      }
    }

    if (storeIds.length > 0) {
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, slug')
        .in('id', storeIds);

      if (storesError) {
        console.error('Error fetching rule stores:', storesError);
      } else {
        storeMap = buildStoreMap((storesData || []) as StoreOption[]);
      }
    }

    const normalizedRules = rulesRows.map((item) => ({
      ...item,
      marketer: item.marketer_id ? marketerMap.get(item.marketer_id) || null : null,
      product: item.product_id ? productMap.get(item.product_id) || null : null,
      store: item.store_id ? storeMap.get(item.store_id) || null : null,
      tiers: tiersMap.get(item.id) || [],
    })) as AffiliateRuleRow[];

    setRules(normalizedRules);
  };

  const fetchOrdersWithAffiliate = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('orders')
      .select('id, affiliate_link_id, affiliate_marketer_id, status')
      .eq('status', 'paid')
      .eq('merchant_id', user.id)
      .not('affiliate_link_id', 'is', null)
      .not('affiliate_marketer_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliate orders:', error);
      return;
    }

    setOrdersWithAffiliate((data || []) as OrderAffiliateRow[]);
  };

  const fetchAffiliateCommissions = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(
        'id, order_id, order_item_id, seller_id, marketer_id, link_id, rule_id, commission_type, commission_value, commission_amount, status, approved_at, paid_at, created_at'
      )
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliate commissions:', error);
      return;
    }

    setAffiliateCommissions((data || []) as AffiliateCommissionRow[]);
  };

  const handleDeleteCampaign = async (campaign: UnifiedCampaignRow) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العرض؟ سيتم حذف الرابط والقاعدة المرتبطين به.')) {
      return;
    }

    try {
      if (campaign.rule?.id) {
        const { error: deleteTiersError } = await supabase
          .from('affiliate_rule_tiers')
          .delete()
          .eq('rule_id', campaign.rule.id);

        if (deleteTiersError) throw deleteTiersError;

        const { error: deleteRuleError } = await supabase
          .from('affiliate_rules')
          .delete()
          .eq('id', campaign.rule.id)
          .eq('seller_id', user?.id);

        if (deleteRuleError) throw deleteRuleError;
      }

      if (campaign.link?.id) {
        const { error: deleteLinkError } = await supabase
          .from('affiliate_links')
          .delete()
          .eq('id', campaign.link.id)
          .eq('seller_id', user?.id);

        if (deleteLinkError) throw deleteLinkError;
      }

      fetchAllData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('حدث خطأ أثناء حذف العرض');
    }
  };

  const campaignMetricsMap = useMemo(() => {
    const map = new Map<string, UnifiedCampaignMetrics>();

    const commissionApprovedStatuses = new Set(['approved', 'paid']);

    links.forEach((link) => {
      const paidOrdersForLink = ordersWithAffiliate.filter(
        (order) =>
          String(order.affiliate_link_id || '') === String(link.id) &&
          String(order.affiliate_marketer_id || '') === String(link.marketer_id || '')
      );

      const uniquePaidOrderIds = new Set(
        paidOrdersForLink.map((order) => order.id).filter(Boolean)
      );

      const commissionsForLink = affiliateCommissions.filter(
        (commission) =>
          String(commission.link_id || '') === String(link.id) &&
          String(commission.marketer_id || '') === String(link.marketer_id || '') &&
          commissionApprovedStatuses.has(String(commission.status || '').toLowerCase())
      );

      const earnings = commissionsForLink.reduce(
        (sum, row) => sum + Number(row.commission_amount || 0),
        0
      );

      map.set(link.id, {
        clicks: Number(link.clicks || 0),
        sales: uniquePaidOrderIds.size,
        earnings,
      });
    });

    return map;
  }, [links, ordersWithAffiliate, affiliateCommissions]);

  const marketerMetricsMap = useMemo(() => {
    const map = new Map<string, UnifiedCampaignMetrics>();

    const commissionApprovedStatuses = new Set(['approved', 'paid']);

    marketers.forEach((marketer) => {
      const marketerLinks = links.filter((link) => String(link.marketer_id || '') === String(marketer.id));
      const marketerLinkIds = new Set(marketerLinks.map((link) => link.id));

      const clicks = marketerLinks.reduce((sum, link) => sum + Number(link.clicks || 0), 0);

      const paidOrdersForMarketer = ordersWithAffiliate.filter(
        (order) => String(order.affiliate_marketer_id || '') === String(marketer.id)
      );

      const uniquePaidOrderIds = new Set(
        paidOrdersForMarketer
          .filter((order) => {
            if (!order.affiliate_link_id) return false;
            return marketerLinkIds.has(String(order.affiliate_link_id));
          })
          .map((order) => order.id)
          .filter(Boolean)
      );

      const commissionsForMarketer = affiliateCommissions.filter(
        (commission) =>
          String(commission.marketer_id || '') === String(marketer.id) &&
          commissionApprovedStatuses.has(String(commission.status || '').toLowerCase())
      );

      const earnings = commissionsForMarketer.reduce(
        (sum, row) => sum + Number(row.commission_amount || 0),
        0
      );

      map.set(marketer.id, {
        clicks,
        sales: uniquePaidOrderIds.size,
        earnings,
      });
    });

    return map;
  }, [marketers, links, ordersWithAffiliate, affiliateCommissions]);

  const unifiedCampaigns = useMemo(() => {
    const fromLinks: UnifiedCampaignRow[] = links.map((link) => {
      const marketer =
        marketers.find((marketer) => marketer.id === link.marketer_id) || null;
      const rule = matchRuleForLink(link, rules);
      const marketerName = marketer?.name || link.marketer?.name || 'بدون مسوق';
      const scopeLabel = getApplyToLabel(link.apply_to);
      const metrics = campaignMetricsMap.get(link.id) || {
        clicks: Number(link.clicks || 0),
        sales: 0,
        earnings: 0,
      };

      return {
        id: `campaign-link-${link.id}`,
        marketer,
        link,
        rule,
        title: `${marketerName} • ${scopeLabel}`,
        metrics,
      };
    });

    const ruleOnly = rules
      .filter(
        (rule) =>
          !links.some((link) => matchRuleForLink(link, [rule])?.id === rule.id)
      )
      .map((rule) => {
        const marketer =
          marketers.find((marketer) => marketer.id === rule.marketer_id) || null;

        const metrics =
          (marketer?.id && marketerMetricsMap.get(marketer.id)) || {
            clicks: 0,
            sales: 0,
            earnings: 0,
          };

        return {
          id: `campaign-rule-${rule.id}`,
          marketer,
          link: null,
          rule,
          title: `${marketer?.name || rule.marketer?.name || 'مسوق'} • قاعدة فقط`,
          metrics,
        } as UnifiedCampaignRow;
      });

    return [...fromLinks, ...ruleOnly];
  }, [links, rules, marketers, campaignMetricsMap, marketerMetricsMap]);

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return unifiedCampaigns.filter((campaign) => {
      const marketerName = (
        campaign.marketer?.name ||
        campaign.rule?.marketer?.name ||
        ''
      ).toLowerCase();

      const code = (campaign.link?.code || '').toLowerCase();
      const title = (campaign.title || '').toLowerCase();
      const productName = getDisplayName(
        campaign.link?.product || campaign.rule?.product
      ).toLowerCase();
      const storeName = getDisplayName(
        campaign.link?.store || campaign.rule?.store
      ).toLowerCase();
      const objectName = getCampaignObjectName(campaign).toLowerCase();
      const active = isCampaignActive(campaign);
      const scope = getCampaignScopeValue(campaign);

      const matchesQuery =
        !q ||
        marketerName.includes(q) ||
        code.includes(q) ||
        title.includes(q) ||
        productName.includes(q) ||
        storeName.includes(q) ||
        objectName.includes(q);

      const matchesMarketer =
        selectedMarketerId === 'all' ||
        campaign.marketer?.id === selectedMarketerId ||
        campaign.rule?.marketer_id === selectedMarketerId ||
        campaign.link?.marketer_id === selectedMarketerId;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && active) ||
        (statusFilter === 'inactive' && !active);

      const matchesScope =
        scopeFilter === 'all' ||
        (scopeFilter === 'catalog' && scope === 'catalog') ||
        scope === scopeFilter;

      return matchesQuery && matchesMarketer && matchesStatus && matchesScope;
    });
  }, [unifiedCampaigns, searchQuery, selectedMarketerId, statusFilter, scopeFilter]);

  const overviewStats = useMemo(() => {
    const totalClicks = unifiedCampaigns.reduce(
      (sum, item) => sum + Number(item.metrics.clicks || 0),
      0
    );
    const totalSales = unifiedCampaigns.reduce(
      (sum, item) => sum + Number(item.metrics.sales || 0),
      0
    );
    const totalEarnings = unifiedCampaigns.reduce(
      (sum, item) => sum + Number(item.metrics.earnings || 0),
      0
    );
    const activeCampaigns = unifiedCampaigns.filter((item) => isCampaignActive(item)).length;
    const activeMarketers = marketers.filter(
      (item) => (item.is_active ?? item.status === 'active') === true
    ).length;

    return {
      totalClicks,
      totalSales,
      totalEarnings,
      totalCampaigns: unifiedCampaigns.length,
      activeCampaigns,
      activeMarketers,
      conversion:
        totalClicks > 0 ? `${((totalSales / totalClicks) * 100).toFixed(1)}%` : '0.0%',
    };
  }, [unifiedCampaigns, marketers]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMarketerId('all');
    setStatusFilter('all');
    setScopeFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة التسويق بالعمولة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl overflow-hidden bg-gradient-to-l from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-lg">
          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm mb-4">
                  <Sparkles className="w-4 h-4" />
                  مركز إدارة الأفلييت
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-3">إدارة عروض التسويق بالعمولة</h1>
                <p className="text-white/90 max-w-3xl leading-7">
                  صفحة موحدة لإدارة عروض الأفلييت داخل متجرك. كل عرض يجمع المسوق والرابط وقاعدة
                  العمولة والشرائح في مكان واحد واضح وسهل.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCampaign(null);
                  setShowCampaignModal(true);
                }}
                className="px-5 py-3 rounded-2xl bg-white text-violet-700 font-semibold hover:bg-violet-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                إنشاء عرض أفلييت
              </button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
              <SummaryMiniCard
                label="العروض النشطة"
                value={overviewStats.activeCampaigns}
                icon={<Megaphone className="w-5 h-5" />}
              />
              <SummaryMiniCard
                label="المسوقون النشطون"
                value={overviewStats.activeMarketers}
                icon={<Users className="w-5 h-5" />}
              />
              <SummaryMiniCard
                label="إجمالي النقرات"
                value={overviewStats.totalClicks}
                icon={<MousePointerClick className="w-5 h-5" />}
              />
              <SummaryMiniCard
                label="إجمالي الأرباح"
                value={formatMoney(overviewStats.totalEarnings)}
                icon={<DollarSign className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 lg:p-6 border-b border-gray-100">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">العروض الموحدة</div>
                <div className="text-sm text-gray-500 mt-1">
                  قائمة واحدة تعرض كل ما يخص العرض: المسوق، الرابط، العمولة، الأداء، والتفاصيل عند الطلب.
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>الإجمالي:</span>
                <span className="font-bold text-gray-900">{filteredCampaigns.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mt-5">
              <div className="xl:col-span-4 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث بالمسوق أو الكود أو المنتج أو المتجر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="xl:col-span-3">
                <select
                  value={selectedMarketerId}
                  onChange={(e) => setSelectedMarketerId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">كل المسوقين</option>
                  {marketers.map((marketer) => (
                    <option key={marketer.id} value={marketer.id}>
                      {marketer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-2">
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="catalog">جميع منتجاتي</option>
                  <option value="product">منتج</option>
                  <option value="store">متجر</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط فقط</option>
                  <option value="inactive">غير نشط فقط</option>
                </select>
              </div>

              <div className="xl:col-span-1">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium"
                >
                  إعادة
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
              <KpiCard
                title="عدد العروض"
                value={filteredCampaigns.length}
                helper="بعد الفلاتر الحالية"
                icon={<Megaphone className="w-5 h-5" />}
              />
              <KpiCard
                title="إجمالي المبيعات"
                value={overviewStats.totalSales}
                helper={`التحويل ${overviewStats.conversion}`}
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <KpiCard
                title="إجمالي النقرات"
                value={overviewStats.totalClicks}
                helper="لكل العروض"
                icon={<MousePointerClick className="w-5 h-5" />}
              />
              <KpiCard
                title="إجمالي الأرباح"
                value={formatMoney(overviewStats.totalEarnings)}
                helper="نتيجة كل الروابط"
                icon={<DollarSign className="w-5 h-5" />}
              />
              <KpiCard
                title="المسوقون النشطون"
                value={overviewStats.activeMarketers}
                helper="من إجمالي المسوقين"
                icon={<Users className="w-5 h-5" />}
              />
            </div>

            <UnifiedCampaignsList
              campaigns={filteredCampaigns}
              expandedCampaignId={expandedCampaignId}
              onToggleExpand={(campaignId) =>
                setExpandedCampaignId((prev) => (prev === campaignId ? null : campaignId))
              }
              onEdit={(campaign) => {
                setEditingCampaign(campaign);
                setShowCampaignModal(true);
              }}
              onDelete={handleDeleteCampaign}
              onViewAnalytics={(marketerId) => onNavigate(`marketer-analytics-${marketerId}`)}
            />
          </div>
        </div>
      </div>

      {showCampaignModal && (
        <AffiliateCampaignFormModal
          campaign={editingCampaign}
          marketers={marketers}
          onClose={() => {
            setShowCampaignModal(false);
            setEditingCampaign(null);
          }}
          onSuccess={() => {
            setShowCampaignModal(false);
            setEditingCampaign(null);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
};

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

const KpiCard: React.FC<{
  title: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
}> = ({ title, value, helper, icon }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="w-10 h-10 rounded-2xl bg-white text-blue-600 flex items-center justify-center border border-gray-100">
        {icon}
      </div>
    </div>
    <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-xs text-gray-500">{helper}</div>
  </div>
);

const UnifiedCampaignsList: React.FC<{
  campaigns: UnifiedCampaignRow[];
  expandedCampaignId: string | null;
  onToggleExpand: (campaignId: string) => void;
  onEdit: (campaign: UnifiedCampaignRow) => void;
  onDelete: (campaign: UnifiedCampaignRow) => void;
  onViewAnalytics: (marketerId: string) => void;
}> = ({ campaigns, expandedCampaignId, onToggleExpand, onEdit, onDelete, onViewAnalytics }) => {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد عروض أفلييت</h3>
        <p className="text-gray-600">أنشئ أول عرض موحد وسيظهر هنا بكل تفاصيله بشكل منظم وواضح.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {campaigns.map((campaign) => {
        const active = isCampaignActive(campaign);
        const isExpanded = expandedCampaignId === campaign.id;
        const scopeLabel = getCampaignScopeLabel(campaign);
        const objectName = getCampaignObjectName(campaign);
        const marketerName =
          campaign.marketer?.name || campaign.rule?.marketer?.name || 'بدون مسوق';

        return (
          <div
            key={campaign.id}
            className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="p-5 lg:p-6">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0">
                      <Megaphone className="w-7 h-7" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>

                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {active ? 'نشط' : 'غير نشط'}
                        </span>

                        <TagChip text={scopeLabel} />
                        {campaign.rule && (
                          <TagChip
                            text={formatCommission(
                              campaign.rule.commission_type,
                              campaign.rule.commission_value
                            )}
                            success
                          />
                        )}
                      </div>

                      <p className="text-sm text-gray-500 leading-7 mb-4">
                        المسوق: <span className="font-medium text-gray-800">{marketerName}</span>
                        {' • '}
                        النطاق: <span className="font-medium text-gray-800">{objectName}</span>
                        {' • '}
                        الكود:{' '}
                        <span className="font-mono font-medium text-gray-800">
                          {campaign.link?.code || '—'}
                        </span>
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard
                          icon={<MousePointerClick className="w-4 h-4" />}
                          label="النقرات"
                          value={campaign.metrics.clicks}
                        />
                        <MetricCard
                          icon={<TrendingUp className="w-4 h-4" />}
                          label="المبيعات"
                          value={campaign.metrics.sales}
                        />
                        <MetricCard
                          icon={<DollarSign className="w-4 h-4" />}
                          label="الأرباح"
                          value={formatMoney(campaign.metrics.earnings)}
                        />
                        <MetricCard
                          icon={<Target className="w-4 h-4" />}
                          label="التحويل"
                          value={conversionRate(campaign.metrics.clicks, campaign.metrics.sales)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:w-[260px] shrink-0">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="text-sm text-gray-500 mb-3">إجراءات العرض</div>

                    <div className="space-y-2">
                      {campaign.link && (
                        <>
                          <CopyLinkButton
                            url={buildAffiliateOfferUrl(campaign)}
                            label="نسخ رابط العرض"
                            variant="minimal"
                          />

                          <p className="text-[11px] leading-5 text-gray-500 text-center px-2">
                            {getAffiliateOfferLinkHint(campaign)}
                          </p>
                        </>
                      )}

                      {campaign.link?.report_token && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  `${window.location.origin}/affiliate-report/${campaign.link?.report_token}`
                                );
                                alert('تم نسخ رابط إحصائيات المسوق');
                              } catch (error) {
                                console.error('Error copying marketer stats link:', error);
                                alert('حدث خطأ أثناء نسخ رابط إحصائيات المسوق');
                              }
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-violet-200 text-violet-700 font-medium hover:bg-violet-50"
                          >
                            نسخ رابط إحصائيات المسوق
                          </button>

                          <p className="text-[11px] leading-5 text-gray-500 text-center px-2">
                            هذا الرابط تعطيه للمسوق ليشاهد إحصائياته لهذا العرض فقط بدون تسجيل دخول.
                          </p>
                        </>
                      )}

                      {campaign.marketer?.id && (
                        <button
                          onClick={() => onViewAnalytics(campaign.marketer!.id)}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-white"
                        >
                          عرض تحليلات المسوق
                        </button>
                      )}

                      <button
                        onClick={() => onEdit(campaign)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-white flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل العرض
                      </button>

                      <button
                        onClick={() => onToggleExpand(campaign.id)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-white flex items-center justify-center gap-2"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            إخفاء التفاصيل
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            عرض التفاصيل
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDelete(campaign)}
                        className="w-full px-4 py-3 rounded-2xl border border-red-200 text-red-600 font-medium hover:bg-red-50 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف العرض
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/60 px-5 lg:px-6 py-5">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <DetailsCard
                    title="بيانات المسوق"
                    icon={<Users className="w-5 h-5" />}
                  >
                    <InfoRowSimple label="الاسم" value={marketerName} />
                    <InfoRowSimple label="البريد" value={campaign.marketer?.email || '—'} />
                    <InfoRowSimple label="الهاتف" value={campaign.marketer?.phone || '—'} />
                    <InfoRowSimple
                      label="الحالة"
                      value={(campaign.marketer?.is_active ?? true) ? 'نشط' : 'غير نشط'}
                    />
                    {campaign.marketer?.notes && (
                      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600 leading-7">
                        {campaign.marketer.notes}
                      </div>
                    )}
                  </DetailsCard>

                  <DetailsCard
                    title="بيانات الرابط"
                    icon={<LinkIcon className="w-5 h-5" />}
                  >
                    <InfoRowSimple label="الكود" value={campaign.link?.code || '—'} />
                    <InfoRowSimple
                      label="النطاق"
                      value={campaign.link ? getApplyToLabel(campaign.link.apply_to) : '—'}
                    />
                    <InfoRowSimple label="العنصر" value={objectName} />
                    <InfoRowSimple
                      label="الحالة"
                      value={(campaign.link?.is_active ?? true) ? 'نشط' : 'غير نشط'}
                    />
                    <InfoRowSimple
                      label="الوصف"
                      value={campaign.link?.description || 'بدون وصف'}
                    />
                  </DetailsCard>

                  <DetailsCard
                    title="قاعدة العمولة"
                    icon={<Settings2 className="w-5 h-5" />}
                  >
                    <InfoRowSimple
                      label="نوع القاعدة"
                      value={campaign.rule ? getScopeTypeLabel(campaign.rule.scope_type) : '—'}
                    />
                    <InfoRowSimple
                      label="العمولة الأساسية"
                      value={
                        campaign.rule
                          ? formatCommission(
                              campaign.rule.commission_type,
                              campaign.rule.commission_value
                            )
                          : '—'
                      }
                    />
                    <InfoRowSimple
                      label="الأولوية"
                      value={String(campaign.rule?.priority || 100)}
                    />
                    <InfoRowSimple
                      label="الحالة"
                      value={(campaign.rule?.is_active ?? true) ? 'نشطة' : 'غير نشطة'}
                    />
                    <InfoRowSimple
                      label="الصلاحية"
                      value={campaign.rule?.expires_at ? campaign.rule.expires_at : 'بدون انتهاء'}
                    />
                  </DetailsCard>
                </div>

                <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarRange className="w-5 h-5 text-gray-500" />
                    <h4 className="font-bold text-gray-900">شرائح العمولة حسب التاريخ</h4>
                  </div>

                  {!campaign.rule?.tiers || campaign.rule.tiers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                      لا توجد شرائح. سيتم استخدام العمولة الأساسية لهذا العرض.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaign.rule.tiers.map((tier) => (
                        <div
                          key={tier.id}
                          className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4"
                        >
                          <MiniInfo label="من التاريخ" value={formatDateForDisplay(tier.start_date)} />
                          <MiniInfo label="إلى التاريخ" value={formatDateForDisplay(tier.end_date)} />
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
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

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

const TagChip: React.FC<{ text: string; success?: boolean }> = ({ text, success = false }) => (
  <span
    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
      success ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
    }`}
  >
    {text}
  </span>
);

const DetailsCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="rounded-3xl border border-gray-200 bg-white p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center">
        {icon}
      </div>
      <div className="font-bold text-gray-900">{title}</div>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const InfoRowSimple: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
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

interface AffiliateCampaignFormModalProps {
  campaign?: UnifiedCampaignRow | null;
  marketers: AffiliateMarketerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const AffiliateCampaignFormModal: React.FC<AffiliateCampaignFormModalProps> = ({
  campaign,
  marketers,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [tiers, setTiers] = useState<TierDraft[]>(() => buildInitialTierDrafts(campaign));
  const [formData, setFormData] = useState<UnifiedAffiliateForm>(() => buildInitialFormData(campaign));

  const selectedExistingMarketer = useMemo(
    () => marketers.find((item) => item.id === formData.existing_marketer_id) || null,
    [marketers, formData.existing_marketer_id]
  );

  const activeMarketerName =
    formData.marketer_mode === 'existing'
      ? selectedExistingMarketer?.name || ''
      : formData.marketer_name;

  const generatedLinkCodePreview = useMemo(() => {
    if (campaign?.link?.code) return campaign.link.code;
    return buildGeneratedAffiliateCode(activeMarketerName, formData.link_apply_to, 'AUTO');
  }, [campaign?.link?.code, activeMarketerName, formData.link_apply_to]);

  useEffect(() => {
    setTiers(buildInitialTierDrafts(campaign));
    setFormData(buildInitialFormData(campaign));
    setError('');
  }, [campaign?.id]);

  useEffect(() => {
    fetchOptions();
  }, [user?.id]);

  const fetchOptions = async () => {
    if (!user?.id) return;

    try {
      const [{ data: productsData, error: productsError }, { data: storesData, error: storesError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, title, slug, merchant_id, user_id')
            .or(`merchant_id.eq.${user.id},user_id.eq.${user.id}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('id, name, slug, user_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (productsError) {
        console.error('Error fetching seller products for affiliate options:', productsError);
      } else {
        setProducts((productsData || []) as ProductOption[]);
      }

      if (storesError) {
        console.error('Error fetching seller stores for affiliate options:', storesError);
      } else {
        setStores((storesData || []) as StoreOption[]);
      }
    } catch (fetchError) {
      console.error('Error fetching seller affiliate options:', fetchError);
    }
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        localId: createLocalTierId(),
        start_date: getTodayDateInputValue(),
        end_date: '',
        commission_type: 'percentage',
        commission_value: '',
        is_active: true,
      },
    ]);
  };

  const updateTier = (localId: string, patch: Partial<TierDraft>) => {
    setTiers((prev) =>
      prev.map((tier) => (tier.localId === localId ? { ...tier, ...patch } : tier))
    );
  };

  const removeTier = (localId: string) => {
    setTiers((prev) => prev.filter((tier) => tier.localId !== localId));
  };

const validateTiers = () => {
  const today = getTodayDateInputValue();

  const normalized = tiers
    .map((tier) => ({
      ...tier,
      startDate: tier.start_date.trim(),
      endDate: tier.end_date.trim(),
      commissionValueNum: Number(tier.commission_value),
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const tier of normalized) {
    if (!tier.startDate) {
      throw new Error('كل شريحة يجب أن تحتوي على تاريخ بداية');
    }

    if (tier.startDate < today) {
      throw new Error('لا يمكن اختيار تاريخ بداية سابق لتاريخ اليوم');
    }

    if (tier.endDate && tier.endDate < today) {
      throw new Error('لا يمكن اختيار تاريخ نهاية سابق لتاريخ اليوم');
    }

    if (tier.endDate && tier.endDate < tier.startDate) {
      throw new Error('تاريخ النهاية يجب أن يكون أكبر من أو يساوي تاريخ البداية');
    }

    if (tier.commission_value.trim() === '') {
      throw new Error('كل شريحة يجب أن تحتوي على قيمة عمولة');
    }

    if (Number.isNaN(tier.commissionValueNum) || tier.commissionValueNum < 0) {
      throw new Error('قيمة العمولة في الشرائح غير صحيحة');
    }
  }

  for (let i = 0; i < normalized.length - 1; i++) {
    const current = normalized[i];
    const next = normalized[i + 1];

    if (!current.endDate) {
      throw new Error('لا يمكن إضافة شريحة بعد شريحة بدون تاريخ نهاية');
    }

    if (next.startDate <= current.endDate) {
      throw new Error('يوجد تداخل بين شرائح العمولة، عدّل التواريخ بحيث لا تتقاطع');
    }
  }
};

  const createOrUpdateMarketer = async () => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    if (formData.marketer_mode === 'existing') {
      if (!formData.existing_marketer_id) throw new Error('اختر المسوق الموجود');
      return formData.existing_marketer_id;
    }

    if (!formData.marketer_name.trim()) throw new Error('اسم المسوق مطلوب');

    const payload = {
      seller_id: user.id,
      user_id: null,
      name: formData.marketer_name.trim(),
      email: formData.marketer_email.trim() || null,
      phone: formData.marketer_phone.trim() || null,
      notes: formData.marketer_notes.trim() || null,
      is_active: formData.marketer_is_active,
      status: formData.marketer_is_active ? 'active' : 'inactive',
      total_clicks: campaign?.marketer?.total_clicks ?? 0,
      total_sales: campaign?.marketer?.total_sales ?? 0,
      total_earnings: campaign?.marketer?.total_earnings ?? 0,
    };

    if (campaign?.marketer?.id && formData.marketer_mode === 'new') {
      const { error } = await supabase
        .from('affiliate_marketers')
        .update(payload)
        .eq('id', campaign.marketer.id)
        .eq('seller_id', user.id);

      if (error) throw error;
      return campaign.marketer.id;
    }

    const { data, error } = await supabase
      .from('affiliate_marketers')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  };

  const generateUniqueAffiliateCode = async (
    marketerName: string,
    scope: 'product' | 'store' | 'all',
    excludeLinkId?: string
  ) => {
    let attempts = 0;

    while (attempts < 10) {
      const seed = Math.random().toString(36).slice(2, 6).toUpperCase();
      const candidate = buildGeneratedAffiliateCode(marketerName, scope, seed);

      let query = supabase
        .from('affiliate_links')
        .select('id')
        .eq('code', candidate);

      if (excludeLinkId) {
        query = query.neq('id', excludeLinkId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) return candidate;

      attempts += 1;
    }

    throw new Error('تعذر توليد كود رابط فريد، حاول مرة أخرى');
  };

  const createOrUpdateLink = async (marketerId: string) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    if (formData.link_apply_to === 'product' && !formData.link_product_id) {
      throw new Error('اختر المنتج للرابط');
    }

    if (formData.link_apply_to === 'store' && !formData.link_store_id) {
      throw new Error('اختر المتجر للرابط');
    }

    const marketerName =
      formData.marketer_mode === 'existing'
        ? marketers.find((item) => item.id === marketerId)?.name || 'AFF'
        : formData.marketer_name.trim() || 'AFF';

    const normalizedCode = campaign?.link?.code
      ? campaign.link.code
      : await generateUniqueAffiliateCode(marketerName, formData.link_apply_to);

    const payload: Record<string, any> = {
      user_id: user.id,
      seller_id: user.id,
      marketer_id: marketerId || null,
      code: normalizedCode,
      apply_to: formData.link_apply_to,
      product_id: formData.link_apply_to === 'product' ? formData.link_product_id : null,
      store_id: formData.link_apply_to === 'store' ? formData.link_store_id : null,
      description: null,
      is_active: formData.link_is_active,
    };

    if (campaign?.link?.id) {
      const { error } = await supabase
        .from('affiliate_links')
        .update(payload)
        .eq('id', campaign.link.id)
        .eq('seller_id', user.id);

      if (error) throw error;
      return campaign.link.id;
    }

    const { data, error } = await supabase
      .from('affiliate_links')
      .insert({
        ...payload,
        clicks: 0,
        sales: 0,
        earnings: 0,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  };

  const createOrUpdateRule = async (marketerId: string) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    if (formData.link_apply_to === 'product' && !formData.link_product_id) {
      throw new Error('اختر المنتج للعرض');
    }

    if (formData.link_apply_to === 'store' && !formData.link_store_id) {
      throw new Error('اختر المتجر للعرض');
    }

    if (formData.rule_commission_value.trim() === '') {
      throw new Error('أدخل قيمة العمولة الأساسية');
    }

    validateTiers();

    const marketerName =
      formData.marketer_mode === 'new'
        ? formData.marketer_name.trim()
        : marketers.find((item) => item.id === marketerId)?.name || 'أفلييت';

    const payload = {
      seller_id: user.id,
      marketer_id: marketerId,
      rule_name: buildRuleName(marketerName, formData.link_apply_to),
      scope_type: formData.link_apply_to,
      product_id: formData.link_apply_to === 'product' ? formData.link_product_id : null,
      store_id: formData.link_apply_to === 'store' ? formData.link_store_id : null,
      commission_type: formData.rule_commission_type,
      commission_value: Number(formData.rule_commission_value),
      priority: Number(formData.rule_priority || 100),
      is_active: formData.rule_is_active,
      expires_at:
        formData.expiry_mode === 'date' && formData.expiry_date
          ? `${formData.expiry_date}T23:59:59`
          : null,
    };

    let ruleId = campaign?.rule?.id || '';

    if (campaign?.rule?.id) {
      const { error } = await supabase
        .from('affiliate_rules')
        .update(payload)
        .eq('id', campaign.rule.id)
        .eq('seller_id', user.id);

      if (error) throw error;
      ruleId = campaign.rule.id;
    } else {
      const { data, error } = await supabase
        .from('affiliate_rules')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      ruleId = data.id;
    }

    const existingTierIds = (campaign?.rule?.tiers || [])
      .map((tier) => tier.id)
      .filter(Boolean) as string[];

    const currentTierIds = tiers
      .map((tier) => tier.id)
      .filter(Boolean) as string[];

    const tierIdsToDelete = existingTierIds.filter((id) => !currentTierIds.includes(id));

    if (tierIdsToDelete.length > 0) {
      const { error } = await supabase
        .from('affiliate_rule_tiers')
        .delete()
        .in('id', tierIdsToDelete);

      if (error) throw new Error(`فشل حذف بعض الشرائح: ${error.message}`);
    }

    const tiersToUpdate = tiers.filter((tier) => Boolean(tier.id));
    const tiersToInsert = tiers.filter((tier) => !tier.id);

    for (const tier of tiersToUpdate) {
      const { error } = await supabase
        .from('affiliate_rule_tiers')
        .update({
          rule_id: ruleId,
          ...buildLegacyDayRangeFromDateTier(tier),
          commission_type: tier.commission_type,
          commission_value: Number(tier.commission_value),
          is_active: tier.is_active,
        })
        .eq('id', tier.id as string)
        .eq('rule_id', ruleId);

      if (error) {
        throw new Error(`فشل تحديث شريحة عمولة: ${error.message}`);
      }
    }

    if (tiersToInsert.length > 0) {
      const { error } = await supabase.from('affiliate_rule_tiers').insert(
        tiersToInsert.map((tier) => ({
          rule_id: ruleId,
          ...buildLegacyDayRangeFromDateTier(tier),
          commission_type: tier.commission_type,
          commission_value: Number(tier.commission_value),
          is_active: tier.is_active,
        }))
      );

      if (error) {
        throw new Error(`فشل حفظ شرائح العمولة: ${error.message}`);
      }
    }

    return ruleId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setLoading(true);

    try {
      const marketerId = await createOrUpdateMarketer();
      await createOrUpdateLink(marketerId);
      await createOrUpdateRule(marketerId);
      onSuccess();
    } catch (err: any) {
      console.error('Error saving affiliate campaign:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ عرض الأفلييت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={campaign ? 'تعديل عرض التسويق بالعمولة' : 'إنشاء عرض تسويق بالعمولة'}
      subtitle="من نافذة واحدة: اختر مسوقًا أو أنشئ مسوقًا جديدًا، ثم اربط له الرابط وقاعدة العمولة والشرائح."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <SectionCard
          title="المسوق"
          subtitle="اختر مسوقًا موجودًا أو أنشئ مسوقًا جديدًا لهذا العرض"
          icon={<Users className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <SelectableOptionCard
              active={formData.marketer_mode === 'new'}
              title="إنشاء مسوق جديد"
              description="تضيف الاسم وبيانات التواصل من داخل نفس العرض."
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  marketer_mode: 'new',
                  existing_marketer_id: '',
                }))
              }
            />

            <SelectableOptionCard
              active={formData.marketer_mode === 'existing'}
              title="استخدام مسوق موجود"
              description="يرتبط العرض مباشرة بمسوق تمت إضافته سابقًا."
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  marketer_mode: 'existing',
                }))
              }
            />
          </div>

          {formData.marketer_mode === 'existing' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر المسوق <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.existing_marketer_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, existing_marketer_id: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- اختر المسوق --</option>
                {marketers.map((marketer) => (
                  <option key={marketer.id} value={marketer.id}>
                    {marketer.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المسوق <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.marketer_name}
                    onChange={(e) => setFormData({ ...formData, marketer_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={formData.marketer_mode === 'new'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={formData.marketer_email}
                    onChange={(e) => setFormData({ ...formData, marketer_email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.marketer_phone}
                    onChange={(e) => setFormData({ ...formData, marketer_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات داخلية
                  </label>
                  <textarea
                    rows={3}
                    value={formData.marketer_notes}
                    onChange={(e) => setFormData({ ...formData, marketer_notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: مناسب لإعلانات سناب أو المؤثرين..."
                  />
                </div>
              </div>

              <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.marketer_is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, marketer_is_active: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">المسوق نشط</div>
                  <div className="text-sm text-gray-500">
                    سيكون جاهزًا لاستقبال الروابط والعمولات.
                  </div>
                </div>
              </label>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="الرابط التسويقي"
          subtitle="النظام سيولد الكود والرابط تلقائيًا، وأنت فقط تختار أين يذهب الزائر."
          icon={<LinkIcon className="w-5 h-5" />}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-900 mb-2">الكود سيُولد تلقائيًا</div>
              <div className="font-mono text-lg text-blue-700 break-all">{generatedLinkCodePreview}</div>
              <div className="text-xs text-blue-700/80 mt-2">
                يتم توليده تلقائيًا من اسم المسوق مع رمز إضافي لتفادي التكرار.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نطاق التطبيق <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.link_apply_to}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      link_apply_to: e.target.value as 'product' | 'store' | 'all',
                      link_product_id: e.target.value === 'product' ? prev.link_product_id : '',
                      link_store_id: e.target.value === 'store' ? prev.link_store_id : '',
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="product">منتج محدد</option>
                  <option value="store">متجر محدد</option>
                  <option value="all">جميع منتجاتي</option>
                </select>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-900 mb-1">وجهة الرابط الحالية</div>
                <div className="text-sm text-gray-600 leading-7">
                  {formData.link_apply_to === 'product' && 'سيفتح المنتج المحدد مباشرة.'}
                  {formData.link_apply_to === 'store' && 'سيفتح المتجر المحدد مباشرة.'}
                  {formData.link_apply_to === 'all' && 'سيفتح السوق العام مع إظهار منتجات هذا التاجر فقط.'}
                </div>
              </div>

              {formData.link_apply_to === 'product' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر المنتج <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.link_product_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        link_product_id: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- اختر منتج --</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {getDisplayName(product)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.link_apply_to === 'store' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر المتجر <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.link_store_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        link_store_id: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- اختر متجر --</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {getDisplayName(store)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.link_is_active}
              onChange={(e) => setFormData({ ...formData, link_is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <div className="font-medium text-gray-900">الرابط نشط</div>
              <div className="text-sm text-gray-500">
                يمكن استخدامه وتتبع نتائجه إذا كان نشطًا.
              </div>
            </div>
          </label>
        </SectionCard>

        <SectionCard
          title="قاعدة العمولة"
          subtitle="حدد العمولة الأساسية ثم أضف الشرائح الزمنية إذا احتجت"
          icon={<Settings2 className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع العمولة
              </label>
              <select
                value={formData.rule_commission_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rule_commission_type: e.target.value as 'percentage' | 'fixed',
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">قيمة العمولة</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.rule_commission_value}
                onChange={(e) =>
                  setFormData({ ...formData, rule_commission_value: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.rule_commission_type === 'percentage' ? '10' : '25'}
              />
            </div>

          </div>

          <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.rule_is_active}
              onChange={(e) => setFormData({ ...formData, rule_is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <div className="font-medium text-gray-900">القاعدة نشطة</div>
              <div className="text-sm text-gray-500">سيتم احتساب هذه العمولة مباشرة إذا كانت نشطة.</div>
            </div>
          </label>

          <div className="mt-6 rounded-3xl border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">شرائح العمولة حسب التاريخ</h3>
                <p className="text-sm text-gray-500 mt-1">
                  اختيارية. إذا لم تضف شرائح فسيتم استخدام العمولة الأساسية، وإذا أضفت شريحة فسيتم تطبيقها حسب تاريخ الطلب.
                </p>
              </div>

              <button
                type="button"
                onClick={addTier}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة شريحة
              </button>
            </div>

            {tiers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                لا توجد شرائح. سيتم اعتماد العمولة الأساسية فقط.
              </div>
            ) : (
              <div className="space-y-4">
                {tiers.map((tier, index) => (
                  <div key={tier.localId} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-gray-900">الشريحة #{index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeTier(tier.localId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
  <div>
    <label className="block text-xs text-gray-500 mb-2">من التاريخ</label>
    <input
      type="date"
      min={getTodayDateInputValue()}
      value={tier.start_date}
      onChange={(e) =>
        updateTier(tier.localId, {
          start_date: e.target.value,
          end_date:
            tier.end_date && e.target.value && tier.end_date < e.target.value
              ? e.target.value
              : tier.end_date,
        })
      }
      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
      required
    />
  </div>

  <div>
    <label className="block text-xs text-gray-500 mb-2">إلى التاريخ</label>
    <input
      type="date"
      min={tier.start_date || getTodayDateInputValue()}
      value={tier.end_date}
      onChange={(e) => updateTier(tier.localId, { end_date: e.target.value })}
      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
      placeholder="مفتوح"
    />
  </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">نوع العمولة</label>
                        <select
                          value={tier.commission_type}
                          onChange={(e) =>
                            updateTier(tier.localId, {
                              commission_type: e.target.value as 'percentage' | 'fixed',
                            })
                          }
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
                        >
                          <option value="percentage">نسبة %</option>
                          <option value="fixed">مبلغ ثابت</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">القيمة</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.commission_value}
                          onChange={(e) =>
                            updateTier(tier.localId, { commission_value: e.target.value })
                          }
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 bg-white w-full cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tier.is_active}
                            onChange={(e) =>
                              updateTier(tier.localId, { is_active: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">نشطة</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="مدة الصلاحية"
          subtitle="يمكنك تركها مفتوحة أو تحديد تاريخ انتهاء"
          icon={<CalendarRange className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المدة</label>
              <select
                value={formData.expiry_mode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiry_mode: e.target.value as 'none' | 'date',
                    expiry_date: e.target.value === 'date' ? prev.expiry_date : '',
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">بدون تاريخ انتهاء</option>
                <option value="date">ينتهي في تاريخ محدد</option>
              </select>
            </div>

            {formData.expiry_mode === 'date' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الانتهاء <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expiry_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-4">ملخص العرض قبل الحفظ</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 leading-7">
                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-1">المسوق</div>
                  <div>
                    {formData.marketer_mode === 'existing'
                      ? marketers.find((m) => m.id === formData.existing_marketer_id)?.name || '—'
                      : formData.marketer_name || '—'}
                  </div>
                  <div className="text-gray-500">
                    {formData.marketer_mode === 'existing'
                      ? 'مسوق موجود'
                      : formData.marketer_email || formData.marketer_phone || 'بدون تواصل'}
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-1">الرابط</div>
                  <div className="font-mono">{generatedLinkCodePreview || '—'}</div>
                  <div className="text-gray-500">{getApplyToLabel(formData.link_apply_to)}</div>
                </div>

                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-1">العمولة</div>
                  <div>
                    {formatCommission(
                      formData.rule_commission_type,
                      Number(formData.rule_commission_value || 0)
                    )}
                  </div>
                  <div className="text-gray-500">{tiers.length} شرائح إضافية</div>
                </div>

                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-1">الصلاحية</div>
                  <div>
                    {formData.expiry_mode === 'date' && formData.expiry_date
                      ? formData.expiry_date
                      : 'بدون تاريخ انتهاء'}
                  </div>
                  <div className="text-gray-500">{formData.link_is_active ? 'الرابط مفعل' : 'الرابط غير مفعل'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ModalActions
          onClose={onClose}
          submitText={loading ? 'جاري الحفظ...' : campaign ? 'حفظ التعديلات' : 'إنشاء العرض'}
          loading={loading}
        />
      </form>
    </ModalShell>
  );
};

const SelectableOptionCard: React.FC<{
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ active, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-right rounded-2xl border p-4 transition-colors ${
      active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200'
    }`}
  >
    <div className="font-semibold text-gray-900 mb-1">{title}</div>
    <div className="text-sm text-gray-600 leading-7">{description}</div>
  </button>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <div className="rounded-3xl border border-gray-200 bg-white p-5">
    <div className="flex items-start gap-3 mb-5">
      <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'lg' | 'xl';
}> = ({ title, subtitle, onClose, children, size = 'lg' }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div
      className={`bg-white rounded-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl ${
        size === 'xl' ? 'max-w-6xl' : 'max-w-3xl'
      }`}
    >
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-2 max-w-2xl">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
          ×
        </button>
      </div>

      <div className="p-6">{children}</div>
    </div>
  </div>
);

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-start gap-2">
    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>{text}</span>
  </div>
);

const ModalActions: React.FC<{
  onClose: () => void;
  submitText: string;
  loading?: boolean;
}> = ({ onClose, submitText, loading = false }) => (
  <div className="flex gap-4 pt-2">
    <button
      type="button"
      onClick={onClose}
      className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50"
    >
      إلغاء
    </button>
    <button
      type="submit"
      disabled={loading}
      className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-50"
    >
      {submitText}
    </button>
  </div>
);
