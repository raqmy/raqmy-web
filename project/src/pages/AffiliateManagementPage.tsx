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
  Package,
  Store as StoreIcon,
  CalendarRange,
  Target,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Megaphone,
  CheckSquare,
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
  product_ids?: string[];
  store_ids?: string[];
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
  product_ids?: string[];
  store_ids?: string[];
};

type AffiliateRuleTierRow = {
  id: string;
  rule_id: string;
  day_from?: number | null;
  day_to?: number | null;
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
  day_from: string;
  day_to: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: string;
  is_active: boolean;
};

type UnifiedCampaignRow = {
  id: string;
  marketer: AffiliateMarketerRow | null;
  link: AffiliateLinkRow | null;
  rule: AffiliateRuleRow | null;
  title: string;
};

type UnifiedAffiliateForm = {
  marketer_mode: 'new' | 'existing';
  existing_marketer_id: string;

  marketer_name: string;
  marketer_email: string;
  marketer_phone: string;
  marketer_notes: string;
  marketer_is_active: boolean;

  link_code: string;
  link_apply_to: 'product' | 'store' | 'all';
  link_product_id: string;
  link_store_id: string;
  link_product_ids: string[];
  link_store_ids: string[];
  link_description: string;
  link_is_active: boolean;

  rule_scope_type: 'product' | 'store' | 'all';
  rule_product_id: string;
  rule_store_id: string;
  rule_product_ids: string[];
  rule_store_ids: string[];
  rule_commission_type: 'percentage' | 'fixed';
  rule_commission_value: string;
  rule_priority: string;
  rule_is_active: boolean;

  expiry_mode: 'none' | 'date';
  expiry_date: string;
};

type ScopeFilter = 'all' | 'product' | 'store' | 'catalog';

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

const matchRuleForLink = (link: AffiliateLinkRow, rules: AffiliateRuleRow[]) => {
  if (!link.marketer_id) return null;

  const linkProductIds = uniqueIds([...(link.product_ids || []), link.product_id]);
  const linkStoreIds = uniqueIds([...(link.store_ids || []), link.store_id]);

  const candidates = rules.filter((rule) => {
    if (rule.marketer_id !== link.marketer_id) return false;

    const ruleProductIds = uniqueIds([...(rule.product_ids || []), rule.product_id]);
    const ruleStoreIds = uniqueIds([...(rule.store_ids || []), rule.store_id]);

    if (rule.scope_type === 'all' && link.apply_to === 'all') return true;

    if (rule.scope_type === 'product' && link.apply_to === 'product') {
      return ruleProductIds.some((id) => linkProductIds.includes(id));
    }

    if (rule.scope_type === 'store' && link.apply_to === 'store') {
      return ruleStoreIds.some((id) => linkStoreIds.includes(id));
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
    const names = uniqueIds([
      ...(campaign.link?.product_ids || []),
      ...(campaign.rule?.product_ids || []),
      campaign.link?.product_id,
      campaign.rule?.product_id,
    ]);

    if (names.length > 1) return `${names.length} منتجات محددة`;
    return getDisplayName(campaign.link?.product || campaign.rule?.product);
  }

  if (scope === 'store') {
    const names = uniqueIds([
      ...(campaign.link?.store_ids || []),
      ...(campaign.rule?.store_ids || []),
      campaign.link?.store_id,
      campaign.rule?.store_id,
    ]);

    if (names.length > 1) return `${names.length} متاجر محددة`;
    return getDisplayName(campaign.link?.store || campaign.rule?.store);
  }

  return 'جميع منتجاتي';
};

export const AffiliateManagementPage: React.FC<AffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [marketers, setMarketers] = useState<AffiliateMarketerRow[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRow[]>([]);
  const [rules, setRules] = useState<AffiliateRuleRow[]>([]);

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
      await Promise.all([fetchMarketers(), fetchLinks(), fetchRules()]);
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

    const linkIds = uniqueIds(linksRows.map((item) => item.id));
    const marketerIds = uniqueIds(linksRows.map((item) => item.marketer_id));
    const productIds = uniqueIds(linksRows.map((item) => item.product_id));
    const storeIds = uniqueIds(linksRows.map((item) => item.store_id));

    let marketerMap = new Map<string, AffiliateMarketerRow>();
    let productMap = new Map<string, ProductOption>();
    let storeMap = new Map<string, StoreOption>();
    let linkProductIdsMap = new Map<string, string[]>();
    let linkStoreIdsMap = new Map<string, string[]>();

    if (marketerIds.length > 0) {
      const { data: marketersData, error: marketersError } = await supabase
        .from('affiliate_marketers')
        .select('id, name, email, phone, status, is_active, seller_id, user_id, notes, total_clicks, total_sales, total_earnings')
        .in('id', marketerIds);

      if (marketersError) {
        console.error('Error fetching link marketers:', marketersError);
      } else {
        marketerMap = buildMarketerMap((marketersData || []) as AffiliateMarketerRow[]);
      }
    }

    if (linkIds.length > 0) {
      const [
        { data: linkProductsData, error: linkProductsError },
        { data: linkStoresData, error: linkStoresError },
      ] = await Promise.all([
        supabase
          .from('affiliate_link_products')
          .select('affiliate_link_id, product_id')
          .in('affiliate_link_id', linkIds),
        supabase
          .from('affiliate_link_stores')
          .select('affiliate_link_id, store_id')
          .in('affiliate_link_id', linkIds),
      ]);

      if (linkProductsError) {
        console.error('Error fetching affiliate link products:', linkProductsError);
      } else {
        (linkProductsData || []).forEach((row: any) => {
          const current = linkProductIdsMap.get(row.affiliate_link_id) || [];
          current.push(row.product_id);
          linkProductIdsMap.set(row.affiliate_link_id, current);
        });
      }

      if (linkStoresError) {
        console.error('Error fetching affiliate link stores:', linkStoresError);
      } else {
        (linkStoresData || []).forEach((row: any) => {
          const current = linkStoreIdsMap.get(row.affiliate_link_id) || [];
          current.push(row.store_id);
          linkStoreIdsMap.set(row.affiliate_link_id, current);
        });
      }

      linkProductIdsMap.forEach((ids) => ids.forEach((id) => productIds.push(id)));
      linkStoreIdsMap.forEach((ids) => ids.forEach((id) => storeIds.push(id)));
    }

    const uniqueProductIds = uniqueIds(productIds);
    const uniqueStoreIds = uniqueIds(storeIds);

    if (uniqueProductIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, name, slug')
        .in('id', uniqueProductIds);

      if (productsError) {
        console.error('Error fetching link products:', productsError);
      } else {
        productMap = buildProductMap((productsData || []) as ProductOption[]);
      }
    }

    if (uniqueStoreIds.length > 0) {
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, title, name, slug')
        .in('id', uniqueStoreIds);

      if (storesError) {
        console.error('Error fetching link stores:', storesError);
      } else {
        storeMap = buildStoreMap((storesData || []) as StoreOption[]);
      }
    }

    const normalizedLinks = linksRows.map((item) => {
      const mappedProductIds = uniqueIds([
        ...(linkProductIdsMap.get(item.id) || []),
        item.product_id,
      ]);
      const mappedStoreIds = uniqueIds([
        ...(linkStoreIdsMap.get(item.id) || []),
        item.store_id,
      ]);

      return {
        ...item,
        marketer: item.marketer_id ? marketerMap.get(item.marketer_id) || null : null,
        product: item.product_id ? productMap.get(item.product_id) || null : null,
        store: item.store_id ? storeMap.get(item.store_id) || null : null,
        product_ids: mappedProductIds,
        store_ids: mappedStoreIds,
      };
    }) as AffiliateLinkRow[];

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
    let ruleProductIdsMap = new Map<string, string[]>();
    let ruleStoreIdsMap = new Map<string, string[]>();

    if (ruleIds.length > 0) {
      const [
        { data: tiersData, error: tiersError },
        { data: ruleProductsData, error: ruleProductsError },
        { data: ruleStoresData, error: ruleStoresError },
      ] = await Promise.all([
        supabase
          .from('affiliate_rule_tiers')
          .select('*')
          .in('rule_id', ruleIds)
          .order('day_from', { ascending: true }),
        supabase
          .from('affiliate_rule_products')
          .select('affiliate_rule_id, product_id')
          .in('affiliate_rule_id', ruleIds),
        supabase
          .from('affiliate_rule_stores')
          .select('affiliate_rule_id, store_id')
          .in('affiliate_rule_id', ruleIds),
      ]);

      if (tiersError) {
        console.error('Error fetching rule tiers:', tiersError);
      } else {
        (tiersData || []).forEach((tier: any) => {
          const current = tiersMap.get(tier.rule_id) || [];
          current.push(tier as AffiliateRuleTierRow);
          tiersMap.set(tier.rule_id, current);
        });
      }

      if (ruleProductsError) {
        console.error('Error fetching affiliate rule products:', ruleProductsError);
      } else {
        (ruleProductsData || []).forEach((row: any) => {
          const current = ruleProductIdsMap.get(row.affiliate_rule_id) || [];
          current.push(row.product_id);
          ruleProductIdsMap.set(row.affiliate_rule_id, current);
        });
      }

      if (ruleStoresError) {
        console.error('Error fetching affiliate rule stores:', ruleStoresError);
      } else {
        (ruleStoresData || []).forEach((row: any) => {
          const current = ruleStoreIdsMap.get(row.affiliate_rule_id) || [];
          current.push(row.store_id);
          ruleStoreIdsMap.set(row.affiliate_rule_id, current);
        });
      }

      ruleProductIdsMap.forEach((ids) => ids.forEach((id) => productIds.push(id)));
      ruleStoreIdsMap.forEach((ids) => ids.forEach((id) => storeIds.push(id)));
    }

    if (marketerIds.length > 0) {
      const { data: marketersData, error: marketersError } = await supabase
        .from('affiliate_marketers')
        .select('id, name, email, phone, status, is_active, seller_id, user_id, notes, total_clicks, total_sales, total_earnings')
        .in('id', marketerIds);

      if (marketersError) {
        console.error('Error fetching rule marketers:', marketersError);
      } else {
        marketerMap = buildMarketerMap((marketersData || []) as AffiliateMarketerRow[]);
      }
    }

    const uniqueProductIds = uniqueIds(productIds);
    const uniqueStoreIds = uniqueIds(storeIds);

    if (uniqueProductIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, name, slug')
        .in('id', uniqueProductIds);

      if (productsError) {
        console.error('Error fetching rule products:', productsError);
      } else {
        productMap = buildProductMap((productsData || []) as ProductOption[]);
      }
    }

    if (uniqueStoreIds.length > 0) {
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, title, name, slug')
        .in('id', uniqueStoreIds);

      if (storesError) {
        console.error('Error fetching rule stores:', storesError);
      } else {
        storeMap = buildStoreMap((storesData || []) as StoreOption[]);
      }
    }

    const normalizedRules = rulesRows.map((item) => {
      const mappedProductIds = uniqueIds([
        ...(ruleProductIdsMap.get(item.id) || []),
        item.product_id,
      ]);
      const mappedStoreIds = uniqueIds([
        ...(ruleStoreIdsMap.get(item.id) || []),
        item.store_id,
      ]);

      return {
        ...item,
        marketer: item.marketer_id ? marketerMap.get(item.marketer_id) || null : null,
        product: item.product_id ? productMap.get(item.product_id) || null : null,
        store: item.store_id ? storeMap.get(item.store_id) || null : null,
        tiers: tiersMap.get(item.id) || [],
        product_ids: mappedProductIds,
        store_ids: mappedStoreIds,
      };
    }) as AffiliateRuleRow[];

    setRules(normalizedRules);
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

        const { error: deleteRuleProductsError } = await supabase
          .from('affiliate_rule_products')
          .delete()
          .eq('affiliate_rule_id', campaign.rule.id);

        if (deleteRuleProductsError) throw deleteRuleProductsError;

        const { error: deleteRuleStoresError } = await supabase
          .from('affiliate_rule_stores')
          .delete()
          .eq('affiliate_rule_id', campaign.rule.id);

        if (deleteRuleStoresError) throw deleteRuleStoresError;

        const { error: deleteRuleError } = await supabase
          .from('affiliate_rules')
          .delete()
          .eq('id', campaign.rule.id)
          .eq('seller_id', user?.id);

        if (deleteRuleError) throw deleteRuleError;
      }

      if (campaign.link?.id) {
        const { error: deleteLinkProductsError } = await supabase
          .from('affiliate_link_products')
          .delete()
          .eq('affiliate_link_id', campaign.link.id);

        if (deleteLinkProductsError) throw deleteLinkProductsError;

        const { error: deleteLinkStoresError } = await supabase
          .from('affiliate_link_stores')
          .delete()
          .eq('affiliate_link_id', campaign.link.id);

        if (deleteLinkStoresError) throw deleteLinkStoresError;

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

  const unifiedCampaigns = useMemo(() => {
    const fromLinks: UnifiedCampaignRow[] = links.map((link) => {
      const marketer =
        marketers.find((marketer) => marketer.id === link.marketer_id) || null;
      const rule = matchRuleForLink(link, rules);
      const marketerName = marketer?.name || link.marketer?.name || 'بدون مسوق';
      const scopeLabel = getApplyToLabel(link.apply_to);

      return {
        id: `campaign-link-${link.id}`,
        marketer,
        link,
        rule,
        title: `${marketerName} • ${scopeLabel}`,
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

        return {
          id: `campaign-rule-${rule.id}`,
          marketer,
          link: null,
          rule,
          title: `${marketer?.name || rule.marketer?.name || 'مسوق'} • قاعدة فقط`,
        } as UnifiedCampaignRow;
      });

    return [...fromLinks, ...ruleOnly];
  }, [links, rules, marketers]);

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
      (sum, item) => sum + Number(item.link?.clicks || item.marketer?.total_clicks || 0),
      0
    );
    const totalSales = unifiedCampaigns.reduce(
      (sum, item) => sum + Number(item.link?.sales || item.marketer?.total_sales || 0),
      0
    );
    const totalEarnings = unifiedCampaigns.reduce(
      (sum, item) => sum + Number(item.link?.earnings || item.marketer?.total_earnings || 0),
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
                          value={campaign.link?.clicks || campaign.marketer?.total_clicks || 0}
                        />
                        <MetricCard
                          icon={<TrendingUp className="w-4 h-4" />}
                          label="المبيعات"
                          value={campaign.link?.sales || campaign.marketer?.total_sales || 0}
                        />
                        <MetricCard
                          icon={<DollarSign className="w-4 h-4" />}
                          label="الأرباح"
                          value={formatMoney(
                            campaign.link?.earnings || campaign.marketer?.total_earnings || 0
                          )}
                        />
                        <MetricCard
                          icon={<Target className="w-4 h-4" />}
                          label="التحويل"
                          value={conversionRate(
                            campaign.link?.clicks || 0,
                            campaign.link?.sales || 0
                          )}
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
                        <CopyLinkButton
                          url={`${window.location.origin}?ref=${campaign.link.code}`}
                          label="نسخ رابط العرض"
                          variant="minimal"
                        />
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
                    <h4 className="font-bold text-gray-900">شرائح العمولة حسب الأيام</h4>
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
                          <MiniInfo label="من اليوم" value={String(tier.day_from ?? 0)} />
                          <MiniInfo
                            label="إلى اليوم"
                            value={tier.day_to !== null && tier.day_to !== undefined ? String(tier.day_to) : 'مفتوح'}
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

  const initialTiers: TierDraft[] =
    campaign?.rule?.tiers?.map((tier) => ({
      id: tier.id,
      localId: tier.id || createLocalTierId(),
      day_from: tier.day_from?.toString() ?? '0',
      day_to: tier.day_to?.toString() ?? '',
      commission_type: (tier.commission_type as 'percentage' | 'fixed') || 'percentage',
      commission_value: tier.commission_value?.toString() ?? '',
      is_active: tier.is_active ?? true,
    })) || [];

  const [tiers, setTiers] = useState<TierDraft[]>(initialTiers);

  const [formData, setFormData] = useState<UnifiedAffiliateForm>({
    marketer_mode: campaign?.marketer ? 'existing' : 'new',
    existing_marketer_id:
      campaign?.marketer?.id || campaign?.rule?.marketer_id || campaign?.link?.marketer_id || '',

    marketer_name: campaign?.marketer?.name || '',
    marketer_email: campaign?.marketer?.email || '',
    marketer_phone: campaign?.marketer?.phone || '',
    marketer_notes: campaign?.marketer?.notes || '',
    marketer_is_active: campaign?.marketer?.is_active ?? true,

    link_code: campaign?.link?.code || '',
    link_apply_to: (campaign?.link?.apply_to as 'product' | 'store' | 'all') || 'all',
    link_product_id: campaign?.link?.product_id || '',
    link_store_id: campaign?.link?.store_id || '',
    link_product_ids: uniqueIds([...(campaign?.link?.product_ids || []), campaign?.link?.product_id]),
    link_store_ids: uniqueIds([...(campaign?.link?.store_ids || []), campaign?.link?.store_id]),
    link_description: campaign?.link?.description || '',
    link_is_active: campaign?.link?.is_active ?? true,

    rule_scope_type: (campaign?.rule?.scope_type as 'product' | 'store' | 'all') || 'all',
    rule_product_id: campaign?.rule?.product_id || '',
    rule_store_id: campaign?.rule?.store_id || '',
    rule_product_ids: uniqueIds([...(campaign?.rule?.product_ids || []), campaign?.rule?.product_id]),
    rule_store_ids: uniqueIds([...(campaign?.rule?.store_ids || []), campaign?.rule?.store_id]),
    rule_commission_type: (campaign?.rule?.commission_type as 'percentage' | 'fixed') || 'percentage',
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

  useEffect(() => {
    fetchOptions();
  }, [user?.id]);

  useEffect(() => {
    if (campaign?.link?.id || campaign?.rule?.id) {
      fetchExistingMappings();
    }
  }, [campaign?.link?.id, campaign?.rule?.id]);

  const fetchByOwnerFallback = async <T extends Record<string, any>>(
    table: string,
    selectClause: string,
    ownerColumns: string[]
  ): Promise<T[]> => {
    if (!user?.id) return [];

    for (const column of ownerColumns) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select(selectClause)
          .eq(column, user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as T[];
        }
      } catch (err) {
        console.error(`Error fetching ${table} with ${column}:`, err);
      }
    }

    for (const column of ownerColumns) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select(selectClause)
          .eq(column, user.id);

        if (!error && data && data.length > 0) {
          return data as T[];
        }
      } catch (err) {
        console.error(`Fallback error fetching ${table} with ${column}:`, err);
      }
    }

    return [];
  };

  const fetchOptions = async () => {
    if (!user?.id) return;

    try {
      const [productsData, storesData] = await Promise.all([
        fetchByOwnerFallback<ProductOption>('products', 'id, name, title, slug', [
          'user_id',
          'seller_id',
          'merchant_id',
          'owner_id',
        ]),
        fetchByOwnerFallback<StoreOption>('stores', 'id, name, title, slug', [
          'user_id',
          'seller_id',
          'merchant_id',
          'owner_id',
        ]),
      ]);

      setProducts(productsData || []);
      setStores(storesData || []);
    } catch (fetchError) {
      console.error('Error fetching seller affiliate options:', fetchError);
    }
  };

  const fetchExistingMappings = async () => {
    try {
      if (campaign?.link?.id) {
        const [
          { data: linkProductsData, error: linkProductsError },
          { data: linkStoresData, error: linkStoresError },
        ] = await Promise.all([
          supabase
            .from('affiliate_link_products')
            .select('product_id')
            .eq('affiliate_link_id', campaign.link.id),
          supabase
            .from('affiliate_link_stores')
            .select('store_id')
            .eq('affiliate_link_id', campaign.link.id),
        ]);

        if (!linkProductsError || !linkStoresError) {
          const linkProductIds = uniqueIds([
            ...((linkProductsData || []).map((row: any) => row.product_id)),
            campaign.link.product_id,
          ]);
          const linkStoreIds = uniqueIds([
            ...((linkStoresData || []).map((row: any) => row.store_id)),
            campaign.link.store_id,
          ]);

          setFormData((prev) => ({
            ...prev,
            link_product_ids: linkProductIds,
            link_store_ids: linkStoreIds,
            link_product_id: linkProductIds[0] || '',
            link_store_id: linkStoreIds[0] || '',
          }));
        }
      }

      if (campaign?.rule?.id) {
        const [
          { data: ruleProductsData, error: ruleProductsError },
          { data: ruleStoresData, error: ruleStoresError },
        ] = await Promise.all([
          supabase
            .from('affiliate_rule_products')
            .select('product_id')
            .eq('affiliate_rule_id', campaign.rule.id),
          supabase
            .from('affiliate_rule_stores')
            .select('store_id')
            .eq('affiliate_rule_id', campaign.rule.id),
        ]);

        if (!ruleProductsError || !ruleStoresError) {
          const ruleProductIds = uniqueIds([
            ...((ruleProductsData || []).map((row: any) => row.product_id)),
            campaign.rule.product_id,
          ]);
          const ruleStoreIds = uniqueIds([
            ...((ruleStoresData || []).map((row: any) => row.store_id)),
            campaign.rule.store_id,
          ]);

          setFormData((prev) => ({
            ...prev,
            rule_product_ids: ruleProductIds,
            rule_store_ids: ruleStoreIds,
            rule_product_id: ruleProductIds[0] || '',
            rule_store_id: ruleStoreIds[0] || '',
          }));
        }
      }
    } catch (fetchError) {
      console.error('Error fetching existing affiliate mappings:', fetchError);
    }
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        localId: createLocalTierId(),
        day_from: '0',
        day_to: '',
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

  const toggleSelectedId = (currentIds: string[], value: string) => {
    return currentIds.includes(value)
      ? currentIds.filter((id) => id !== value)
      : [...currentIds, value];
  };

  const validateTiers = () => {
    for (const tier of tiers) {
      if (tier.commission_value.trim() === '') {
        throw new Error('كل شريحة يجب أن تحتوي على قيمة عمولة');
      }

      if (Number(tier.day_from) < 0) {
        throw new Error('يوم البداية في الشرائح لا يمكن أن يكون أقل من 0');
      }

      if (tier.day_to.trim() !== '' && Number(tier.day_to) < Number(tier.day_from)) {
        throw new Error('يوم النهاية يجب أن يكون أكبر من أو يساوي يوم البداية');
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

  const syncLinkMappings = async (linkId: string) => {
    const selectedProductIds =
      formData.link_apply_to === 'product' ? uniqueIds(formData.link_product_ids) : [];
    const selectedStoreIds =
      formData.link_apply_to === 'store' ? uniqueIds(formData.link_store_ids) : [];

    const { error: deleteProductsError } = await supabase
      .from('affiliate_link_products')
      .delete()
      .eq('affiliate_link_id', linkId);

    if (deleteProductsError) throw deleteProductsError;

    const { error: deleteStoresError } = await supabase
      .from('affiliate_link_stores')
      .delete()
      .eq('affiliate_link_id', linkId);

    if (deleteStoresError) throw deleteStoresError;

    if (selectedProductIds.length > 0) {
      const { error } = await supabase.from('affiliate_link_products').insert(
        selectedProductIds.map((productId) => ({
          affiliate_link_id: linkId,
          product_id: productId,
        }))
      );

      if (error) throw error;
    }

    if (selectedStoreIds.length > 0) {
      const { error } = await supabase.from('affiliate_link_stores').insert(
        selectedStoreIds.map((storeId) => ({
          affiliate_link_id: linkId,
          store_id: storeId,
        }))
      );

      if (error) throw error;
    }
  };

  const syncRuleMappings = async (ruleId: string) => {
    const selectedProductIds =
      formData.rule_scope_type === 'product' ? uniqueIds(formData.rule_product_ids) : [];
    const selectedStoreIds =
      formData.rule_scope_type === 'store' ? uniqueIds(formData.rule_store_ids) : [];

    const { error: deleteProductsError } = await supabase
      .from('affiliate_rule_products')
      .delete()
      .eq('affiliate_rule_id', ruleId);

    if (deleteProductsError) throw deleteProductsError;

    const { error: deleteStoresError } = await supabase
      .from('affiliate_rule_stores')
      .delete()
      .eq('affiliate_rule_id', ruleId);

    if (deleteStoresError) throw deleteStoresError;

    if (selectedProductIds.length > 0) {
      const { error } = await supabase.from('affiliate_rule_products').insert(
        selectedProductIds.map((productId) => ({
          affiliate_rule_id: ruleId,
          product_id: productId,
        }))
      );

      if (error) throw error;
    }

    if (selectedStoreIds.length > 0) {
      const { error } = await supabase.from('affiliate_rule_stores').insert(
        selectedStoreIds.map((storeId) => ({
          affiliate_rule_id: ruleId,
          store_id: storeId,
        }))
      );

      if (error) throw error;
    }
  };

  const createOrUpdateLink = async (marketerId: string) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    const normalizedCode = formData.link_code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('كود الرابط مطلوب');

    const selectedLinkProductIds =
      formData.link_apply_to === 'product' ? uniqueIds(formData.link_product_ids) : [];
    const selectedLinkStoreIds =
      formData.link_apply_to === 'store' ? uniqueIds(formData.link_store_ids) : [];

    if (formData.link_apply_to === 'product' && selectedLinkProductIds.length === 0) {
      throw new Error('اختر منتجًا واحدًا على الأقل للرابط');
    }

    if (formData.link_apply_to === 'store' && selectedLinkStoreIds.length === 0) {
      throw new Error('اختر متجرًا واحدًا على الأقل للرابط');
    }

    const { data: existingCodeRow, error: existingCodeError } = await supabase
      .from('affiliate_links')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existingCodeError) throw existingCodeError;

    if (existingCodeRow && (!campaign?.link || existingCodeRow.id !== campaign.link.id)) {
      throw new Error('كود الرابط مستخدم بالفعل، اختر كودًا مختلفًا');
    }

    const payload: Record<string, any> = {
      user_id: user.id,
      seller_id: user.id,
      marketer_id: marketerId || null,
      code: normalizedCode,
      apply_to: formData.link_apply_to,
      product_id: formData.link_apply_to === 'product' ? selectedLinkProductIds[0] || null : null,
      store_id: formData.link_apply_to === 'store' ? selectedLinkStoreIds[0] || null : null,
      description: formData.link_description.trim() || null,
      is_active: formData.link_is_active,
    };

    let linkId = campaign?.link?.id || '';

    if (campaign?.link?.id) {
      const { error } = await supabase
        .from('affiliate_links')
        .update(payload)
        .eq('id', campaign.link.id)
        .eq('seller_id', user.id);

      if (error) throw error;
      linkId = campaign.link.id;
    } else {
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
      linkId = data.id as string;
    }

    await syncLinkMappings(linkId);

    return linkId;
  };

  const createOrUpdateRule = async (marketerId: string) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    const selectedRuleProductIds =
      formData.rule_scope_type === 'product' ? uniqueIds(formData.rule_product_ids) : [];
    const selectedRuleStoreIds =
      formData.rule_scope_type === 'store' ? uniqueIds(formData.rule_store_ids) : [];

    if (formData.rule_scope_type === 'product' && selectedRuleProductIds.length === 0) {
      throw new Error('اختر منتجًا واحدًا على الأقل للقاعدة');
    }

    if (formData.rule_scope_type === 'store' && selectedRuleStoreIds.length === 0) {
      throw new Error('اختر متجرًا واحدًا على الأقل للقاعدة');
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
      rule_name: buildRuleName(marketerName, formData.rule_scope_type),
      scope_type: formData.rule_scope_type,
      product_id:
        formData.rule_scope_type === 'product' ? selectedRuleProductIds[0] || null : null,
      store_id:
        formData.rule_scope_type === 'store' ? selectedRuleStoreIds[0] || null : null,
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

    await syncRuleMappings(ruleId);

    const existingTierIds = new Set((campaign?.rule?.tiers || []).map((tier) => tier.id));
    const currentTierIds = new Set(
      tiers.filter((tier) => tier.id).map((tier) => tier.id as string)
    );
    const tierIdsToDelete = [...existingTierIds].filter((id) => !currentTierIds.has(id));

    if (tierIdsToDelete.length > 0) {
      const { error } = await supabase
        .from('affiliate_rule_tiers')
        .delete()
        .in('id', tierIdsToDelete);

      if (error) throw error;
    }

    for (const tier of tiers) {
      const tierPayload = {
        rule_id: ruleId,
        day_from: Number(tier.day_from || 0),
        day_to: tier.day_to.trim() === '' ? null : Number(tier.day_to),
        commission_type: tier.commission_type,
        commission_value: Number(tier.commission_value),
        is_active: tier.is_active,
      };

      if (tier.id) {
        const { error } = await supabase
          .from('affiliate_rule_tiers')
          .update(tierPayload)
          .eq('id', tier.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('affiliate_rule_tiers')
          .insert(tierPayload);

        if (error) throw error;
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

  const selectedLinkProductNames = products
    .filter((product) => formData.link_product_ids.includes(product.id))
    .map((product) => getDisplayName(product));

  const selectedLinkStoreNames = stores
    .filter((store) => formData.link_store_ids.includes(store.id))
    .map((store) => getDisplayName(store));

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
                  setFormData({ ...formData, existing_marketer_id: e.target.value })
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
          subtitle="أنشئ كود ورابط تسويق خاص بمنتج أو متجر أو كل منتجاتك"
          icon={<LinkIcon className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كود الرابط <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.link_code}
                onChange={(e) =>
                  setFormData({ ...formData, link_code: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
                placeholder="AFF2024"
                required
              />
            </div>

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
                    rule_scope_type: e.target.value as 'product' | 'store' | 'all',
                    link_product_id: '',
                    link_store_id: '',
                    link_product_ids: [],
                    link_store_ids: [],
                    rule_product_id: '',
                    rule_store_id: '',
                    rule_product_ids: [],
                    rule_store_ids: [],
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="product">منتجات محددة</option>
                <option value="store">متاجر محددة</option>
                <option value="all">جميع منتجاتي</option>
              </select>
            </div>

            {formData.link_apply_to === 'product' && (
              <div className="md:col-span-2">
                <MultiSelectCard
                  title="اختر المنتجات"
                  subtitle="يمكنك اختيار أكثر من منتج لهذا العرض"
                  icon={<Package className="w-5 h-5" />}
                  options={products}
                  selectedIds={formData.link_product_ids}
                  emptyText="لا توجد منتجات متاحة لعرضها"
                  onToggle={(productId) =>
                    setFormData((prev) => {
                      const ids = toggleSelectedId(prev.link_product_ids, productId);
                      return {
                        ...prev,
                        link_product_ids: ids,
                        link_product_id: ids[0] || '',
                        rule_product_ids: ids,
                        rule_product_id: ids[0] || '',
                      };
                    })
                  }
                />
              </div>
            )}

            {formData.link_apply_to === 'store' && (
              <div className="md:col-span-2">
                <MultiSelectCard
                  title="اختر المتاجر"
                  subtitle="يمكنك اختيار أكثر من متجر لهذا العرض"
                  icon={<StoreIcon className="w-5 h-5" />}
                  options={stores}
                  selectedIds={formData.link_store_ids}
                  emptyText="لا توجد متاجر متاحة لعرضها"
                  onToggle={(storeId) =>
                    setFormData((prev) => {
                      const ids = toggleSelectedId(prev.link_store_ids, storeId);
                      return {
                        ...prev,
                        link_store_ids: ids,
                        link_store_id: ids[0] || '',
                        rule_store_ids: ids,
                        rule_store_id: ids[0] || '',
                      };
                    })
                  }
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف الرابط</label>
              <textarea
                rows={3}
                value={formData.link_description}
                onChange={(e) => setFormData({ ...formData, link_description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: رابط حملة انستغرام أو تيك توك"
              />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.rule_priority}
                onChange={(e) => setFormData({ ...formData, rule_priority: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
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
                <h3 className="text-lg font-bold text-gray-900">شرائح العمولة حسب الأيام</h3>
                <p className="text-sm text-gray-500 mt-1">
                  اختيارية. إذا لم تضف شرائح فسيتم استخدام العمولة الأساسية.
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
                        <label className="block text-xs text-gray-500 mb-2">من اليوم</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={tier.day_from}
                          onChange={(e) => updateTier(tier.localId, { day_from: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">إلى اليوم</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={tier.day_to}
                          onChange={(e) => updateTier(tier.localId, { day_to: e.target.value })}
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
                  <div className="font-mono">{formData.link_code || '—'}</div>
                  <div className="text-gray-500">
                    {getApplyToLabel(formData.link_apply_to)}
                    {formData.link_apply_to === 'product' &&
                      ` • ${formData.link_product_ids.length} منتج`}
                    {formData.link_apply_to === 'store' &&
                      ` • ${formData.link_store_ids.length} متجر`}
                  </div>
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
                  <div className="text-gray-500">أولوية {formData.rule_priority || '100'}</div>
                </div>
              </div>

              {formData.link_apply_to === 'product' && selectedLinkProductNames.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-2">المنتجات المحددة</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedLinkProductNames.map((name) => (
                      <TagChip key={name} text={name} />
                    ))}
                  </div>
                </div>
              )}

              {formData.link_apply_to === 'store' && selectedLinkStoreNames.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-2">المتاجر المحددة</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedLinkStoreNames.map((name) => (
                      <TagChip key={name} text={name} />
                    ))}
                  </div>
                </div>
              )}
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

const MultiSelectCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  options: Array<ProductOption | StoreOption>;
  selectedIds: string[];
  emptyText: string;
  onToggle: (id: string) => void;
}> = ({ title, subtitle, icon, options, selectedIds, emptyText, onToggle }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
      </div>
    </div>

    {options.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        {emptyText}
      </div>
    ) : (
      <>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <CheckSquare className="w-4 h-4" />
          <span>المحدد حاليًا: {selectedIds.length}</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {options.map((option) => {
            const checked = selectedIds.includes(option.id);

            return (
              <label
                key={option.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                  checked
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{getDisplayName(option)}</div>
                  <div className="text-xs text-gray-500 mt-1" dir="ltr">
                    {option.slug ? `/${option.slug}` : option.id}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.id)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            );
          })}
        </div>
      </>
    )}
  </div>
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
