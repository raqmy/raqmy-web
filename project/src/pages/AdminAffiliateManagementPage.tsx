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
  Sparkles,
  Settings2,
  Package,
  Store as StoreIcon,
  CalendarRange,
  Eye,
  SlidersHorizontal,
  Target,
  CheckCircle2,
  AlertCircle,
  Layers3,
  Megaphone,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CopyLinkButton } from '../components/shared/CopyLinkButton';

interface AdminAffiliateManagementPageProps {
  onNavigate: (page: string) => void;
}

type ViewMode = 'overview' | 'campaigns' | 'marketers' | 'links' | 'rules';

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

type UnifiedCampaignForm = {
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
  link_description: string;
  link_is_active: boolean;

  rule_scope_type: 'product' | 'store' | 'all';
  rule_product_id: string;
  rule_store_id: string;
  rule_commission_type: 'percentage' | 'fixed';
  rule_commission_value: string;
  rule_priority: string;
  rule_is_active: boolean;
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
      return 'جميع المنصة';
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

const matchRuleForLink = (
  link: AffiliateLinkRow,
  rules: AffiliateRuleRow[],
  marketerNameMap: Map<string, string>
) => {
  if (!link.marketer_id) return null;

  const candidates = rules.filter((rule) => {
    if (rule.marketer_id !== link.marketer_id) return false;

    if (rule.scope_type === 'all' && link.apply_to === 'all') return true;
    if (rule.scope_type === 'product' && link.apply_to === 'product' && rule.product_id === link.product_id) return true;
    if (rule.scope_type === 'store' && link.apply_to === 'store' && rule.store_id === link.store_id) return true;

    return false;
  });

  if (candidates.length === 0) {
    const fallback = rules.filter((rule) => rule.marketer_id === link.marketer_id && rule.scope_type === 'all');
    if (fallback.length === 0) return null;

    return [...fallback].sort(
      (a, b) => Number(a.priority || 100) - Number(b.priority || 100)
    )[0];
  }

  return [...candidates].sort(
    (a, b) => Number(a.priority || 100) - Number(b.priority || 100)
  )[0];
};

export const AdminAffiliateManagementPage: React.FC<AdminAffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user, profile } = useAuth() as any;

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);

  const [marketers, setMarketers] = useState<AffiliateMarketerRow[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRow[]>([]);
  const [rules, setRules] = useState<AffiliateRuleRow[]>([]);

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<UnifiedCampaignRow | null>(null);
  const [editingMarketer, setEditingMarketer] = useState<AffiliateMarketerRow | null>(null);
  const [editingLink, setEditingLink] = useState<AffiliateLinkRow | null>(null);
  const [editingRule, setEditingRule] = useState<AffiliateRuleRow | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
      console.error('Error fetching admin marketers:', error);
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
      console.error('Error fetching admin links:', linksError);
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
        .select('id, name, email, phone, status, is_active, seller_id, user_id')
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
        .select('id, title, slug')
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
    .or(`seller_id.eq.${user.id},user_id.eq.${user.id}`)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (rulesError) {
    console.error('Error fetching admin rules:', rulesError);
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
      .order('day_from', { ascending: true });

    if (tiersError) {
      console.error('Error fetching admin rule tiers:', tiersError);
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
      .select('id, name, email, phone, status, is_active, seller_id, user_id')
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
      .select('id, title, slug')
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

  const handleDeleteMarketer = async (marketerId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المسوق؟')) return;

    try {
      const { error } = await supabase
        .from('affiliate_marketers')
        .delete()
        .eq('id', marketerId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      fetchAllData();
    } catch (error) {
      console.error('Error deleting marketer:', error);
      alert('حدث خطأ أثناء حذف المسوق');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرابط؟')) return;

    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('id', linkId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      fetchAllData();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('حدث خطأ أثناء حذف الرابط');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف قاعدة العمولة؟ سيتم حذف الشرائح المرتبطة بها أيضًا.')) {
      return;
    }

    try {
      const { error: tiersError } = await supabase
        .from('affiliate_rule_tiers')
        .delete()
        .eq('rule_id', ruleId);

      if (tiersError) throw tiersError;

      const { error: ruleError } = await supabase
        .from('affiliate_rules')
        .delete()
        .eq('id', ruleId)
        .eq('seller_id', user?.id);

      if (ruleError) throw ruleError;

      fetchAllData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('حدث خطأ أثناء حذف قاعدة العمولة');
    }
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

  const marketerNameMap = useMemo(() => {
    return new Map(marketers.map((marketer) => [marketer.id, marketer.name]));
  }, [marketers]);

  const unifiedCampaigns = useMemo(() => {
    const fromLinks: UnifiedCampaignRow[] = links.map((link) => {
      const marketer =
        marketers.find((marketer) => marketer.id === link.marketer_id) || null;
      const rule = matchRuleForLink(link, rules, marketerNameMap);

      const scopeLabel = getApplyToLabel(link.apply_to);
      const marketerName = marketer?.name || link.marketer?.name || 'بدون مسوق';

      return {
        id: `campaign-link-${link.id}`,
        marketer,
        link,
        rule,
        title: `${marketerName} • ${scopeLabel}`,
      };
    });

    const ruleOnly = rules
      .filter((rule) => !links.some((link) => matchRuleForLink(link, [rule], marketerNameMap)?.id === rule.id))
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
  }, [links, rules, marketers, marketerNameMap]);

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return unifiedCampaigns.filter((campaign) => {
      const marketerName = (campaign.marketer?.name || campaign.rule?.marketer?.name || '').toLowerCase();
      const code = (campaign.link?.code || '').toLowerCase();
      const title = (campaign.title || '').toLowerCase();
      const productName = getDisplayName(campaign.link?.product || campaign.rule?.product).toLowerCase();
      const storeName = getDisplayName(campaign.link?.store || campaign.rule?.store).toLowerCase();
      const isActive =
        (campaign.link?.is_active ?? true) === true &&
        (campaign.rule?.is_active ?? true) === true &&
        (campaign.marketer?.is_active ?? true) === true;

      const matchesQuery =
        !q ||
        marketerName.includes(q) ||
        code.includes(q) ||
        title.includes(q) ||
        productName.includes(q) ||
        storeName.includes(q);

      const matchesMarketer =
        selectedMarketerId === 'all' ||
        campaign.marketer?.id === selectedMarketerId ||
        campaign.rule?.marketer_id === selectedMarketerId ||
        campaign.link?.marketer_id === selectedMarketerId;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesQuery && matchesMarketer && matchesStatus;
    });
  }, [unifiedCampaigns, searchQuery, selectedMarketerId, statusFilter]);

  const filteredMarketers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return marketers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const isActive = (m.is_active ?? m.status === 'active') === true;

      const matchesQuery =
        !q || name.includes(q) || email.includes(q) || phone.includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesQuery && matchesStatus;
    });
  }, [marketers, searchQuery, statusFilter]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return links.filter((l) => {
      const code = (l.code || '').toLowerCase();
      const marketerName = (
        l.marketer?.name ||
        marketerNameMap.get(l.marketer_id || '') ||
        ''
      ).toLowerCase();
      const productName = getDisplayName(l.product).toLowerCase();
      const storeName = getDisplayName(l.store).toLowerCase();
      const isActive = l.is_active === true;

      const matchesQuery =
        !q ||
        code.includes(q) ||
        marketerName.includes(q) ||
        productName.includes(q) ||
        storeName.includes(q);

      const matchesMarketer =
        selectedMarketerId === 'all' || l.marketer_id === selectedMarketerId;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesQuery && matchesMarketer && matchesStatus;
    });
  }, [links, searchQuery, selectedMarketerId, statusFilter, marketerNameMap]);

  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return rules.filter((rule) => {
      const marketerName = (
        rule.marketer?.name ||
        marketerNameMap.get(rule.marketer_id) ||
        ''
      ).toLowerCase();

      const scopeName =
        rule.scope_type === 'product'
          ? getDisplayName(rule.product).toLowerCase()
          : rule.scope_type === 'store'
          ? getDisplayName(rule.store).toLowerCase()
          : 'all';

      const isActive = rule.is_active === true;

      const matchesQuery =
        !q ||
        marketerName.includes(q) ||
        scopeName.includes(q) ||
        getScopeTypeLabel(rule.scope_type).toLowerCase().includes(q);

      const matchesMarketer =
        selectedMarketerId === 'all' || rule.marketer_id === selectedMarketerId;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesQuery && matchesMarketer && matchesStatus;
    });
  }, [rules, searchQuery, selectedMarketerId, statusFilter, marketerNameMap]);

  const overviewStats = useMemo(() => {
    const totalClicks = marketers.reduce((sum, item) => sum + Number(item.total_clicks || 0), 0);
    const totalSales = marketers.reduce((sum, item) => sum + Number(item.total_sales || 0), 0);
    const totalEarnings = marketers.reduce((sum, item) => sum + Number(item.total_earnings || 0), 0);
    const activeMarketers = marketers.filter((item) => (item.is_active ?? item.status === 'active') === true).length;
    const activeLinks = links.filter((item) => item.is_active === true).length;
    const activeRules = rules.filter((item) => item.is_active === true).length;

    return {
      totalClicks,
      totalSales,
      totalEarnings,
      activeMarketers,
      totalMarketers: marketers.length,
      totalLinks: links.length,
      activeLinks,
      totalRules: rules.length,
      activeRules,
      totalCampaigns: unifiedCampaigns.length,
      conversion: totalClicks > 0 ? `${((totalSales / totalClicks) * 100).toFixed(1)}%` : '0.0%',
    };
  }, [marketers, links, rules, unifiedCampaigns]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMarketerId('all');
    setStatusFilter('all');
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
          <p className="text-gray-600 mb-4">هذه الصفحة مخصصة للإدارة فقط</p>
          <button
            onClick={() => onNavigate('admin-dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            العودة للوحة الإدارة
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل إدارة التسويق بالعمولة للمنصة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl overflow-hidden bg-gradient-to-l from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-lg">
          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm mb-4">
                  <ShieldCheck className="w-4 h-4" />
                  أفلييت المنصة
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-3">إدارة التسويق بالعمولة للمنصة</h1>
                <p className="text-white/90 max-w-2xl leading-7">
                  من هنا تدير أفلييت رقمي نفسه: المسوقين، الروابط، وقواعد العمولة الخاصة بتسويق المنصة ومنتجاتها ومتاجرها من لوحة الأدمن.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 min-w-[320px]">
                <SummaryMiniCard
                  label="العروض الموحدة"
                  value={overviewStats.totalCampaigns}
                  icon={<Megaphone className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="المسوقون النشطون"
                  value={overviewStats.activeMarketers}
                  icon={<Users className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="الروابط النشطة"
                  value={overviewStats.activeLinks}
                  icon={<LinkIcon className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="إجمالي النقرات"
                  value={overviewStats.totalClicks}
                  icon={<MousePointerClick className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="إجمالي المبيعات"
                  value={overviewStats.totalSales}
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <SummaryMiniCard
                  label="إجمالي الأرباح"
                  value={formatMoney(overviewStats.totalEarnings)}
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                <TopViewTab
                  active={viewMode === 'overview'}
                  onClick={() => setViewMode('overview')}
                  icon={<Layers3 className="w-4 h-4" />}
                  label="نظرة عامة"
                />
                <TopViewTab
                  active={viewMode === 'campaigns'}
                  onClick={() => setViewMode('campaigns')}
                  icon={<Megaphone className="w-4 h-4" />}
                  label={`العروض (${unifiedCampaigns.length})`}
                />
                <TopViewTab
                  active={viewMode === 'marketers'}
                  onClick={() => setViewMode('marketers')}
                  icon={<Users className="w-4 h-4" />}
                  label={`المسوقون (${marketers.length})`}
                />
                <TopViewTab
                  active={viewMode === 'links'}
                  onClick={() => setViewMode('links')}
                  icon={<LinkIcon className="w-4 h-4" />}
                  label={`الروابط (${links.length})`}
                />
                <TopViewTab
                  active={viewMode === 'rules'}
                  onClick={() => setViewMode('rules')}
                  icon={<Settings2 className="w-4 h-4" />}
                  label={`قواعد العمولة (${rules.length})`}
                />
              </div>

              <div className="flex-1"></div>

              <div className="flex flex-wrap gap-2">
                <QuickActionButton
                  onClick={() => {
                    setEditingCampaign(null);
                    setShowCampaignModal(true);
                  }}
                  icon={<Plus className="w-4 h-4" />}
                  label="إنشاء عرض أفلييت"
                  primary
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800 leading-7">
              الإدارة هنا مبنية بشكل أوضح للأدمن: <strong>عرض موحد</strong> يربط المسوق والرابط وقاعدة العمولة في نافذة واحدة، مع بقاء التبويبات التفصيلية للمراجعة والتحكم.
            </div>
          </div>

          <div className="p-4 lg:p-6 border-b border-gray-100 bg-gray-50/70">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث بالمسوق أو الكود أو المنتج أو المتجر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  value={selectedMarketerId}
                  onChange={(e) => setSelectedMarketerId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">كل المسوقين</option>
                  {marketers.map((marketer) => (
                    <option key={marketer.id} value={marketer.id}>
                      {marketer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط فقط</option>
                  <option value="inactive">غير نشط فقط</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  إعادة الضبط
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            {viewMode === 'overview' && (
              <AdminAffiliateOverviewSection
                stats={overviewStats}
                marketers={marketers}
                links={links}
                rules={rules}
                campaigns={unifiedCampaigns}
                onNavigate={onNavigate}
                onEditCampaign={(campaign) => {
                  setEditingCampaign(campaign);
                  setShowCampaignModal(true);
                }}
                onEditLink={(link) => setEditingLink(link)}
                onEditRule={(rule) => setEditingRule(rule)}
              />
            )}

            {viewMode === 'campaigns' && (
              <AdminCampaignsTab
                campaigns={filteredCampaigns}
                onEdit={(campaign) => {
                  setEditingCampaign(campaign);
                  setShowCampaignModal(true);
                }}
                onDelete={handleDeleteCampaign}
              />
            )}

            {viewMode === 'marketers' && (
              <MarketersTab
                marketers={filteredMarketers}
                onEdit={setEditingMarketer}
                onDelete={handleDeleteMarketer}
                onViewAnalytics={(marketerId) => onNavigate(`marketer-analytics-${marketerId}`)}
              />
            )}

            {viewMode === 'links' && (
              <LinksTab
                links={filteredLinks}
                onEdit={setEditingLink}
                onDelete={handleDeleteLink}
              />
            )}

            {viewMode === 'rules' && (
              <RulesTab
                rules={filteredRules}
                onEdit={setEditingRule}
                onDelete={handleDeleteRule}
              />
            )}
          </div>
        </div>
      </div>

      {showCampaignModal && (
        <AdminCampaignFormModal
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

      {editingMarketer && (
        <MarketerFormModal
          marketer={editingMarketer}
          onClose={() => setEditingMarketer(null)}
          onSuccess={() => {
            setEditingMarketer(null);
            fetchAllData();
          }}
        />
      )}

      {editingLink && (
        <LinkFormModal
          link={editingLink}
          marketers={marketers}
          onClose={() => setEditingLink(null)}
          onSuccess={() => {
            setEditingLink(null);
            fetchAllData();
          }}
        />
      )}

      {editingRule && (
        <RuleFormModal
          rule={editingRule}
          marketers={marketers}
          onClose={() => setEditingRule(null)}
          onSuccess={() => {
            setEditingRule(null);
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

const TopViewTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const QuickActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}> = ({ onClick, icon, label, primary = false }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
      primary
        ? 'bg-violet-600 text-white hover:bg-violet-700'
        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const AdminAffiliateOverviewSection: React.FC<{
  stats: {
    totalClicks: number;
    totalSales: number;
    totalEarnings: number;
    activeMarketers: number;
    totalMarketers: number;
    totalLinks: number;
    activeLinks: number;
    totalRules: number;
    activeRules: number;
    totalCampaigns: number;
    conversion: string;
  };
  marketers: AffiliateMarketerRow[];
  links: AffiliateLinkRow[];
  rules: AffiliateRuleRow[];
  campaigns: UnifiedCampaignRow[];
  onNavigate: (page: string) => void;
  onEditCampaign: (campaign: UnifiedCampaignRow) => void;
  onEditLink: (link: AffiliateLinkRow) => void;
  onEditRule: (rule: AffiliateRuleRow) => void;
}> = ({ stats, marketers, links, rules, campaigns, onNavigate, onEditCampaign, onEditLink, onEditRule }) => {
  const topCampaigns = [...campaigns]
    .sort(
      (a, b) =>
        Number(b.link?.earnings || b.marketer?.total_earnings || 0) -
        Number(a.link?.earnings || a.marketer?.total_earnings || 0)
    )
    .slice(0, 3);

  const topLinks = [...links]
    .sort((a, b) => Number(b.earnings || 0) - Number(a.earnings || 0))
    .slice(0, 3);

  const latestRules = [...rules].slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <OverviewStatCard
          title="العروض الموحدة"
          value={stats.totalCampaigns}
          subValue={`${stats.totalLinks} رابط • ${stats.totalRules} قاعدة`}
          icon={<Megaphone className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="إجمالي المسوقين"
          value={stats.totalMarketers}
          subValue={`${stats.activeMarketers} نشط`}
          icon={<Users className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="المبيعات من أفلييت المنصة"
          value={stats.totalSales}
          subValue={`معدل التحويل ${stats.conversion}`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="إجمالي الأرباح"
          value={formatMoney(stats.totalEarnings)}
          subValue={`${stats.activeLinks} روابط نشطة`}
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <PanelCard
          title="أفضل عروض المنصة"
          subtitle="أعلى العروض أداءً"
          icon={<Megaphone className="w-5 h-5" />}
        >
          {topCampaigns.length === 0 ? (
            <EmptyMiniState text="لا توجد عروض بعد" />
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-gray-100 p-4 bg-gray-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{campaign.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {campaign.link?.code || 'بدون رابط'} • {campaign.rule ? formatCommission(campaign.rule.commission_type, campaign.rule.commission_value) : 'بدون قاعدة'}
                      </div>
                    </div>
                    <button
                      onClick={() => onEditCampaign(campaign)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      تعديل
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <MiniMetric label="النقرات" value={campaign.link?.clicks || 0} />
                    <MiniMetric label="المبيعات" value={campaign.link?.sales || 0} />
                    <MiniMetric label="الأرباح" value={formatMoney(campaign.link?.earnings || campaign.marketer?.total_earnings || 0)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title="أفضل الروابط"
          subtitle="روابط المنصة الأعلى أداءً"
          icon={<LinkIcon className="w-5 h-5" />}
        >
          {topLinks.length === 0 ? (
            <EmptyMiniState text="لا توجد روابط بعد" />
          ) : (
            <div className="space-y-3">
              {topLinks.map((link) => (
                <div key={link.id} className="rounded-2xl border border-gray-100 p-4 bg-gray-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900 font-mono">{link.code}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getApplyToLabel(link.apply_to)} • {link.marketer?.name || 'بدون تخصيص'}
                      </div>
                    </div>
                    <button
                      onClick={() => onEditLink(link)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      تعديل
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <MiniMetric label="النقرات" value={link.clicks || 0} />
                    <MiniMetric label="المبيعات" value={link.sales || 0} />
                    <MiniMetric label="الأرباح" value={formatMoney(link.earnings)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title="أحدث قواعد العمولة"
          subtitle="قواعد المنصة والشرائح الزمنية"
          icon={<Settings2 className="w-5 h-5" />}
        >
          {latestRules.length === 0 ? (
            <EmptyMiniState text="لا توجد قواعد عمولة بعد" />
          ) : (
            <div className="space-y-3">
              {latestRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-gray-100 p-4 bg-gray-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">
                        {rule.marketer?.name || 'مسوق غير معروف'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {getScopeTypeLabel(rule.scope_type)} • {formatCommission(rule.commission_type, rule.commission_value)}
                      </div>
                    </div>
                    <button
                      onClick={() => onEditRule(rule)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      تعديل
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <TagChip text={`الأولوية ${rule.priority || 100}`} />
                    <TagChip text={`${rule.tiers?.length || 0} شرائح`} />
                    <TagChip text={rule.is_active ? 'نشطة' : 'غير نشطة'} success={rule.is_active === true} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-gradient-to-l from-blue-50 to-violet-50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">ماذا يدير الأدمن هنا؟</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 leading-7">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>تسويق المنصة نفسها وليس متجر تاجر محدد.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>ربط المسوق والرابط والعمولة في عرض واحد واضح.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>إمكانية التسويق لمنتج أو متجر أو للمنصة بشكل عام.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>عرض تبويبات تفصيلية للمراجعة والتحرير عند الحاجة.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminCampaignsTab: React.FC<{
  campaigns: UnifiedCampaignRow[];
  onEdit: (campaign: UnifiedCampaignRow) => void;
  onDelete: (campaign: UnifiedCampaignRow) => void;
}> = ({ campaigns, onEdit, onDelete }) => {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد عروض أفلييت</h3>
        <p className="text-gray-600">أنشئ عرضًا موحدًا يربط المسوق والرابط وقاعدة العمولة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {campaigns.map((campaign) => {
        const isActive =
          (campaign.marketer?.is_active ?? true) === true &&
          (campaign.link?.is_active ?? true) === true &&
          (campaign.rule?.is_active ?? true) === true;

        return (
          <div
            key={campaign.id}
            className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isActive ? 'نشط' : 'غير نشط'}
                      </span>
                      {campaign.rule && (
                        <TagChip text={formatCommission(campaign.rule.commission_type, campaign.rule.commission_value)} success />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm text-gray-600">
                      <InfoRow
                        icon={<Users className="w-4 h-4" />}
                        label="المسوق"
                        value={campaign.marketer?.name || campaign.rule?.marketer?.name || 'بدون تخصيص'}
                      />
                      <InfoRow
                        icon={<LinkIcon className="w-4 h-4" />}
                        label="الكود"
                        value={campaign.link?.code || 'بدون رابط'}
                      />
                      <InfoRow
                        icon={<Package className="w-4 h-4" />}
                        label="المنتج"
                        value={
                          campaign.link?.apply_to === 'product' || campaign.rule?.scope_type === 'product'
                            ? getDisplayName(campaign.link?.product || campaign.rule?.product)
                            : '—'
                        }
                      />
                      <InfoRow
                        icon={<StoreIcon className="w-4 h-4" />}
                        label="المتجر"
                        value={
                          campaign.link?.apply_to === 'store' || campaign.rule?.scope_type === 'store'
                            ? getDisplayName(campaign.link?.store || campaign.rule?.store)
                            : '—'
                        }
                      />
                    </div>

                    {campaign.link && (
                      <div className="mt-4">
                        <CopyLinkButton
                          url={`${window.location.origin}?ref=${campaign.link.code}`}
                          label="نسخ رابط العرض"
                          variant="minimal"
                        />
                      </div>
                    )}

                    {campaign.rule?.tiers && campaign.rule.tiers.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarRange className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-800">الشرائح حسب الأيام</span>
                        </div>
                        <div className="space-y-2">
                          {campaign.rule.tiers.map((tier) => (
                            <div
                              key={tier.id}
                              className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl bg-white border border-gray-100 px-4 py-3 text-sm"
                            >
                              <div>
                                <span className="text-gray-500">من اليوم:</span>{' '}
                                <span className="font-medium text-gray-900">{tier.day_from ?? 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">إلى اليوم:</span>{' '}
                                <span className="font-medium text-gray-900">{tier.day_to ?? 'مفتوح'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">العمولة:</span>{' '}
                                <span className="font-medium text-gray-900">
                                  {formatCommission(tier.commission_type, tier.commission_value)}
                                </span>
                              </div>
                              <div>
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    tier.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {tier.is_active ? 'نشطة' : 'غير نشطة'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="xl:w-[360px]">
                <div className="grid grid-cols-2 gap-3">
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
                    value={formatMoney(campaign.link?.earnings || campaign.marketer?.total_earnings || 0)}
                  />
                  <MetricCard
                    icon={<Target className="w-4 h-4" />}
                    label="التحويل"
                    value={conversionRate(campaign.link?.clicks || 0, campaign.link?.sales || 0)}
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => onEdit(campaign)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    تعديل العرض
                  </button>
                  <button
                    onClick={() => onDelete(campaign)}
                    className="px-4 py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OverviewStatCard: React.FC<{
  title: string;
  value: string | number;
  subValue: string;
  icon: React.ReactNode;
}> = ({ title, value, subValue, icon }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-500">{subValue}</div>
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

const EmptyMiniState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
    {text}
  </div>
);

const MiniMetric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl bg-white border border-gray-100 px-3 py-3">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="font-bold text-gray-900">{value}</div>
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

interface MarketersTabProps {
  marketers: AffiliateMarketerRow[];
  onEdit: (marketer: AffiliateMarketerRow) => void;
  onDelete: (marketerId: string) => void;
  onViewAnalytics: (marketerId: string) => void;
}

const MarketersTab: React.FC<MarketersTabProps> = ({
  marketers,
  onEdit,
  onDelete,
  onViewAnalytics,
}) => {
  if (marketers.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد مسوقون</h3>
        <p className="text-gray-600">ابدأ بإضافة مسوقين ثم أنشئ لهم عروض وروابط واضحة.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {marketers.map((marketer) => {
        const isActive = marketer.is_active ?? marketer.status === 'active';

        return (
          <div
            key={marketer.id}
            className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-5 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{marketer.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isActive ? 'نشط' : 'غير نشط'}
                    </span>

                    {marketer.email && <TagChip text={marketer.email} />}
                    {marketer.phone && <TagChip text={marketer.phone} />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onViewAnalytics(marketer.id)}
                  className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl"
                  title="عرض التحليلات"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEdit(marketer)}
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(marketer.id)}
                  className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                icon={<MousePointerClick className="w-4 h-4" />}
                label="النقرات"
                value={marketer.total_clicks || 0}
              />
              <MetricCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="المبيعات"
                value={marketer.total_sales || 0}
              />
              <MetricCard
                icon={<DollarSign className="w-4 h-4" />}
                label="الأرباح"
                value={formatMoney(marketer.total_earnings)}
              />
              <MetricCard
                icon={<Target className="w-4 h-4" />}
                label="التحويل"
                value={conversionRate(marketer.total_clicks, marketer.total_sales)}
              />
            </div>

            {marketer.notes && (
              <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 leading-7">
                {marketer.notes}
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

interface LinksTabProps {
  links: AffiliateLinkRow[];
  onEdit: (link: AffiliateLinkRow) => void;
  onDelete: (linkId: string) => void;
}

const LinksTab: React.FC<LinksTabProps> = ({ links, onEdit, onDelete }) => {
  if (links.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد روابط</h3>
        <p className="text-gray-600">أنشئ روابط المنصة مع ربطها بالمسوق أو اتركها عامة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {links.map((link) => (
        <div
          key={link.id}
          className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shrink-0">
                  <LinkIcon className="w-7 h-7 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 font-mono">{link.code}</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        link.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {link.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                    <TagChip text={getApplyToLabel(link.apply_to)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <InfoRow
                      icon={<Users className="w-4 h-4" />}
                      label="المسوق"
                      value={link.marketer?.name || 'بدون تخصيص'}
                    />
                    <InfoRow
                      icon={<Package className="w-4 h-4" />}
                      label="المنتج"
                      value={
                        link.apply_to === 'product'
                          ? getDisplayName(link.product)
                          : link.apply_to === 'all'
                          ? 'المنصة بالكامل'
                          : '—'
                      }
                    />
                    <InfoRow
                      icon={<StoreIcon className="w-4 h-4" />}
                      label="المتجر"
                      value={
                        link.apply_to === 'store'
                          ? getDisplayName(link.store)
                          : link.apply_to === 'all'
                          ? 'المنصة بالكامل'
                          : '—'
                      }
                    />
                    <InfoRow
                      icon={<CalendarRange className="w-4 h-4" />}
                      label="الوصف"
                      value={link.description || 'بدون وصف'}
                    />
                  </div>

                  <div className="mt-4">
                    <CopyLinkButton
                      url={`${window.location.origin}?ref=${link.code}`}
                      label="نسخ رابط التسويق"
                      variant="minimal"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-[360px]">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={<MousePointerClick className="w-4 h-4" />}
                  label="النقرات"
                  value={link.clicks || 0}
                />
                <MetricCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="المبيعات"
                  value={link.sales || 0}
                />
                <MetricCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="الأرباح"
                  value={formatMoney(link.earnings)}
                />
                <MetricCard
                  icon={<Target className="w-4 h-4" />}
                  label="التحويل"
                  value={conversionRate(link.clicks, link.sales)}
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => onEdit(link)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  تعديل الرابط
                </button>
                <button
                  onClick={() => onDelete(link.id)}
                  className="px-4 py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

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
    <div className="font-medium text-gray-800 truncate">{value}</div>
  </div>
);

interface RulesTabProps {
  rules: AffiliateRuleRow[];
  onEdit: (rule: AffiliateRuleRow) => void;
  onDelete: (ruleId: string) => void;
}

const RulesTab: React.FC<RulesTabProps> = ({ rules, onEdit, onDelete }) => {
  if (rules.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <Settings2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد قواعد عمولة</h3>
        <p className="text-gray-600">ابدأ بإنشاء قاعدة عامة أو على منتج أو متجر مع شرائح الأيام.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rules.map((rule) => (
        <div key={rule.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-lg font-bold text-gray-900">
                  {rule.marketer?.name || 'مسوق غير معروف'}
                </span>
                <TagChip text={getScopeTypeLabel(rule.scope_type)} />
                <TagChip text={formatCommission(rule.commission_type, rule.commission_value)} success />
                <TagChip text={`الأولوية ${rule.priority || 100}`} />
                <TagChip text={rule.is_active ? 'نشطة' : 'غير نشطة'} success={rule.is_active === true} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <InfoRow
                  icon={<Users className="w-4 h-4" />}
                  label="المسوق"
                  value={rule.marketer?.name || '—'}
                />
                <InfoRow
                  icon={<Package className="w-4 h-4" />}
                  label="المنتج"
                  value={rule.scope_type === 'product' ? getDisplayName(rule.product) : '—'}
                />
                <InfoRow
                  icon={<StoreIcon className="w-4 h-4" />}
                  label="المتجر"
                  value={rule.scope_type === 'store' ? getDisplayName(rule.store) : '—'}
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarRange className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-800">شرائح العمولة حسب الأيام</span>
                </div>

                {!rule.tiers || rule.tiers.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    لا توجد شرائح. سيتم استخدام العمولة الأساسية لهذه القاعدة.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rule.tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl bg-white border border-gray-100 px-4 py-3 text-sm"
                      >
                        <div>
                          <span className="text-gray-500">من اليوم:</span>{' '}
                          <span className="font-medium text-gray-900">{tier.day_from ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">إلى اليوم:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {tier.day_to ?? 'مفتوح'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">العمولة:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {formatCommission(tier.commission_type, tier.commission_value)}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              tier.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tier.is_active ? 'نشطة' : 'غير نشطة'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="xl:w-[220px]">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                <div className="text-sm text-gray-500 mb-2">ملخص القاعدة</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">العمولة الأساسية</span>
                    <span className="font-bold text-gray-900">
                      {formatCommission(rule.commission_type, rule.commission_value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">عدد الشرائح</span>
                    <span className="font-bold text-gray-900">{rule.tiers?.length || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onEdit(rule)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-white"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => onDelete(rule.id)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface AdminCampaignFormModalProps {
  campaign?: UnifiedCampaignRow | null;
  marketers: AffiliateMarketerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const AdminCampaignFormModal: React.FC<AdminCampaignFormModalProps> = ({
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

  const [formData, setFormData] = useState<UnifiedCampaignForm>({
    marketer_mode: campaign?.marketer ? 'new' : 'existing',
    existing_marketer_id: campaign?.marketer?.id || campaign?.rule?.marketer_id || campaign?.link?.marketer_id || '',

    marketer_name: campaign?.marketer?.name || '',
    marketer_email: campaign?.marketer?.email || '',
    marketer_phone: campaign?.marketer?.phone || '',
    marketer_notes: campaign?.marketer?.notes || '',
    marketer_is_active: campaign?.marketer?.is_active ?? true,

    link_code: campaign?.link?.code || '',
    link_apply_to: (campaign?.link?.apply_to as 'product' | 'store' | 'all') || 'all',
    link_product_id: campaign?.link?.product_id || '',
    link_store_id: campaign?.link?.store_id || '',
    link_description: campaign?.link?.description || '',
    link_is_active: campaign?.link?.is_active ?? true,

    rule_scope_type: (campaign?.rule?.scope_type as 'product' | 'store' | 'all') || 'all',
    rule_product_id: campaign?.rule?.product_id || '',
    rule_store_id: campaign?.rule?.store_id || '',
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
  });

  useEffect(() => {
    fetchOptions();
  }, [user?.id]);

  const fetchOptions = async () => {
    try {
      const [{ data: productsData }, { data: storesData }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('stores')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      setProducts((productsData || []) as ProductOption[]);
      setStores((storesData || []) as StoreOption[]);
    } catch (err) {
      console.error('Error fetching admin affiliate options:', err);
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

    if (campaign?.marketer?.id) {
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

  const createOrUpdateLink = async (marketerId: string) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    const normalizedCode = formData.link_code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('كود الرابط مطلوب');

    if (formData.link_apply_to === 'product' && !formData.link_product_id) {
      throw new Error('اختر المنتج للرابط');
    }

    if (formData.link_apply_to === 'store' && !formData.link_store_id) {
      throw new Error('اختر المتجر للرابط');
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
      product_id: formData.link_apply_to === 'product' ? formData.link_product_id : null,
      store_id: formData.link_apply_to === 'store' ? formData.link_store_id : null,
      description: formData.link_description.trim() || null,
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

    if (formData.rule_scope_type === 'product' && !formData.rule_product_id) {
      throw new Error('اختر المنتج للقاعدة');
    }

    if (formData.rule_scope_type === 'store' && !formData.rule_store_id) {
      throw new Error('اختر المتجر للقاعدة');
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
      product_id: formData.rule_scope_type === 'product' ? formData.rule_product_id : null,
      store_id: formData.rule_scope_type === 'store' ? formData.rule_store_id : null,
      commission_type: formData.rule_commission_type,
      commission_value: Number(formData.rule_commission_value),
      priority: Number(formData.rule_priority || 100),
      is_active: formData.rule_is_active,
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

    const existingTierIds = new Set((campaign?.rule?.tiers || []).map((tier) => tier.id));
    const currentTierIds = new Set(tiers.filter((tier) => tier.id).map((tier) => tier.id as string));
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
      console.error('Error saving admin affiliate campaign:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ عرض الأفلييت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={campaign ? 'تعديل عرض أفلييت المنصة' : 'إنشاء عرض أفلييت جديد للمنصة'}
      subtitle="من نافذة واحدة: اختر مسوقًا أو أنشئ مسوقًا جديدًا، ثم اربط له الرابط وقاعدة العمولة الخاصة بتسويق المنصة."
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
                onChange={(e) => setFormData({ ...formData, existing_marketer_id: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات داخلية</label>
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
                  onChange={(e) => setFormData({ ...formData, marketer_is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">المسوق نشط</div>
                  <div className="text-sm text-gray-500">سيكون جاهزًا لاستقبال الروابط والعمولات.</div>
                </div>
              </label>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="الرابط التسويقي"
          subtitle="أنشئ كود ورابط تسويق خاص بالمنصة أو بمنتج أو متجر"
          icon={<LinkIcon className="w-5 h-5" />}
        >
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-7 mb-5">
            هذا الرابط هو رابط أفلييت خاص بالأدمن لتسويق المنصة أو عناصرها، وليس رابط تاجر مستقل.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كود الرابط <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.link_code}
                onChange={(e) => setFormData({ ...formData, link_code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
                placeholder="RAQMYAFF"
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
                  setFormData({
                    ...formData,
                    link_apply_to: e.target.value as 'product' | 'store' | 'all',
                    link_product_id: e.target.value === 'product' ? formData.link_product_id : '',
                    link_store_id: e.target.value === 'store' ? formData.link_store_id : '',
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="all">المنصة بالكامل</option>
                <option value="product">منتج محدد</option>
                <option value="store">متجر محدد</option>
              </select>
            </div>

            {formData.link_apply_to === 'product' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اختر المنتج <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.link_product_id}
                  onChange={(e) => setFormData({ ...formData, link_product_id: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, link_store_id: e.target.value })}
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف الرابط</label>
              <textarea
                rows={3}
                value={formData.link_description}
                onChange={(e) => setFormData({ ...formData, link_description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: رابط حملة إعلانات المنصة في تيك توك"
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
              <div className="text-sm text-gray-500">يمكن استخدامه وتتبع نتائجه إذا كان نشطًا.</div>
            </div>
          </label>
        </SectionCard>

        <SectionCard
          title="قاعدة العمولة"
          subtitle="حدد عمولة العرض الأساسية ثم أضف الشرائح الزمنية إذا احتجت"
          icon={<Settings2 className="w-5 h-5" />}
        >
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800 leading-7 mb-5">
            مثال: عمولة 10% أولًا، ثم شريحة من 0 إلى 7 أيام = 20%، وبعدها من 8 إلى 30 = 12%.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع القاعدة <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.rule_scope_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rule_scope_type: e.target.value as 'product' | 'store' | 'all',
                    rule_product_id: e.target.value === 'product' ? formData.rule_product_id : '',
                    rule_store_id: e.target.value === 'store' ? formData.rule_store_id : '',
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="all">قاعدة عامة للمنصة</option>
                <option value="product">على منتج محدد</option>
                <option value="store">على متجر محدد</option>
              </select>
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

          {formData.rule_scope_type === 'product' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المنتج <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.rule_product_id}
                onChange={(e) => setFormData({ ...formData, rule_product_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- اختر المنتج --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {getDisplayName(product)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.rule_scope_type === 'store' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المتجر <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.rule_store_id}
                onChange={(e) => setFormData({ ...formData, rule_store_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- اختر المتجر --</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {getDisplayName(store)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع العمولة الأساسية</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">قيمة العمولة الأساسية</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.rule_commission_value}
                onChange={(e) => setFormData({ ...formData, rule_commission_value: e.target.value })}
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
              <div className="text-sm text-gray-500">لن تُستخدم القاعدة إذا كانت غير نشطة.</div>
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
                            onChange={(e) => updateTier(tier.localId, { is_active: e.target.checked })}
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

        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">ملخص العرض قبل الحفظ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700 leading-7">
                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-1">المسوق</div>
                  <div>
                    {formData.marketer_mode === 'existing'
                      ? marketers.find((item) => item.id === formData.existing_marketer_id)?.name || '—'
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
                  <div className="text-gray-500">
                    {getScopeTypeLabel(formData.rule_scope_type)} • {tiers.length} شرائح
                  </div>
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

interface MarketerFormModalProps {
  marketer?: AffiliateMarketerRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MarketerFormModal: React.FC<MarketerFormModalProps> = ({
  marketer,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: marketer?.name || '',
    email: marketer?.email || '',
    phone: marketer?.phone || '',
    notes: marketer?.notes || '',
    is_active: marketer?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setLoading(true);

    try {
      const data = {
        seller_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
        status: formData.is_active ? 'active' : 'inactive',
        total_clicks: marketer?.total_clicks ?? 0,
        total_sales: marketer?.total_sales ?? 0,
        total_earnings: marketer?.total_earnings ?? 0,
      };

      if (marketer) {
        const { error: updateError } = await supabase
          .from('affiliate_marketers')
          .update(data)
          .eq('id', marketer.id)
          .eq('seller_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('affiliate_marketers')
          .insert({
            ...data,
            user_id: null,
          });

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving marketer:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ المسوق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={marketer ? 'تعديل المسوق' : 'إضافة مسوق جديد'}
      subtitle="تحرير بيانات المسوق من لوحة أفلييت المنصة."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم المسوق <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات داخلية</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="مثال: مناسب لحملات المؤثرين أو سناب..."
          />
        </div>

        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <div>
            <div className="font-medium text-gray-900">المسوق نشط</div>
            <div className="text-sm text-gray-500">يمكنه استقبال الروابط والعمولات إذا كان نشطًا.</div>
          </div>
        </label>

        <ModalActions
          onClose={onClose}
          submitText={loading ? 'جاري الحفظ...' : marketer ? 'حفظ التغييرات' : 'إضافة المسوق'}
          loading={loading}
        />
      </form>
    </ModalShell>
  );
};

interface LinkFormModalProps {
  link?: AffiliateLinkRow | null;
  marketers: AffiliateMarketerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const LinkFormModal: React.FC<LinkFormModalProps> = ({
  link,
  marketers,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [formData, setFormData] = useState({
    code: link?.code || '',
    apply_to: (link?.apply_to as 'product' | 'store' | 'all') || 'all',
    product_id: link?.product_id || '',
    store_id: link?.store_id || '',
    marketer_id: link?.marketer_id || '',
    description: link?.description || '',
    is_active: link?.is_active ?? true,
  });

  useEffect(() => {
    fetchGlobalData();
  }, [user?.id]);

  const fetchGlobalData = async () => {
    try {
      const [{ data: productsData }, { data: storesData }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('stores')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      setProducts((productsData || []) as ProductOption[]);
      setStores((storesData || []) as StoreOption[]);
    } catch (fetchError) {
      console.error('Error fetching admin global data:', fetchError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setLoading(true);

    try {
      const normalizedCode = formData.code.trim().toUpperCase();

      if (!normalizedCode) {
        throw new Error('كود الرابط مطلوب');
      }

      if (formData.apply_to === 'product' && !formData.product_id) {
        throw new Error('اختر المنتج');
      }

      if (formData.apply_to === 'store' && !formData.store_id) {
        throw new Error('اختر المتجر');
      }

      const { data: existingCodeRow, error: existingCodeError } = await supabase
        .from('affiliate_links')
        .select('id')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (existingCodeError) {
        throw existingCodeError;
      }

      if (existingCodeRow && (!link || existingCodeRow.id !== link.id)) {
        throw new Error('كود الرابط مستخدم بالفعل، اختر كودًا مختلفًا');
      }

      const data: Record<string, any> = {
        user_id: user.id,
        seller_id: user.id,
        code: normalizedCode,
        apply_to: formData.apply_to,
        marketer_id: formData.marketer_id || null,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (formData.apply_to === 'product') {
        data.product_id = formData.product_id;
        data.store_id = null;
      } else if (formData.apply_to === 'store') {
        data.store_id = formData.store_id;
        data.product_id = null;
      } else {
        data.product_id = null;
        data.store_id = null;
      }

      if (link) {
        const { error: updateError } = await supabase
          .from('affiliate_links')
          .update(data)
          .eq('id', link.id)
          .eq('seller_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('affiliate_links')
          .insert({
            ...data,
            clicks: 0,
            sales: 0,
            earnings: 0,
          });

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving link:', err);

      if (err?.code === '23505') {
        setError('كود الرابط مستخدم بالفعل، اختر كودًا مختلفًا');
      } else {
        setError(err.message || 'حدث خطأ أثناء حفظ الرابط');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={link ? 'تعديل رابط أفلييت المنصة' : 'إنشاء رابط أفلييت جديد'}
      subtitle="تعديل أو إنشاء رابط خاص بتسويق المنصة من جهة الأدمن."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كود الرابط <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
              placeholder="RAQMYAFF"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المسوق (اختياري)</label>
            <select
              value={formData.marketer_id}
              onChange={(e) => setFormData({ ...formData, marketer_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- بدون تخصيص --</option>
              {marketers.map((marketer) => (
                <option key={marketer.id} value={marketer.id}>
                  {marketer.name}
                </option>
              ))}
            </select>
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
                apply_to: e.target.value as 'product' | 'store' | 'all',
                product_id: e.target.value === 'product' ? formData.product_id : '',
                store_id: e.target.value === 'store' ? formData.store_id : '',
              })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="all">المنصة بالكامل</option>
            <option value="product">منتج محدد</option>
            <option value="store">متجر محدد</option>
          </select>
        </div>

        {formData.apply_to === 'product' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المنتج <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
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

        {formData.apply_to === 'store' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المتجر <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">وصف الرابط</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="مثال: حملة المنصة في تيك توك"
          />
        </div>

        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <div>
            <div className="font-medium text-gray-900">الرابط نشط</div>
            <div className="text-sm text-gray-500">يمكن استخدامه وتتبع نتائجه إذا كان نشطًا.</div>
          </div>
        </label>

        <ModalActions
          onClose={onClose}
          submitText={loading ? 'جاري الحفظ...' : link ? 'حفظ التغييرات' : 'إنشاء الرابط'}
          loading={loading}
        />
      </form>
    </ModalShell>
  );
};

interface RuleFormModalProps {
  rule?: AffiliateRuleRow | null;
  marketers: AffiliateMarketerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const RuleFormModal: React.FC<RuleFormModalProps> = ({
  rule,
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
    rule?.tiers?.map((tier) => ({
      id: tier.id,
      localId: tier.id || createLocalTierId(),
      day_from: tier.day_from?.toString() ?? '0',
      day_to: tier.day_to?.toString() ?? '',
      commission_type: (tier.commission_type as 'percentage' | 'fixed') || 'percentage',
      commission_value: tier.commission_value?.toString() ?? '',
      is_active: tier.is_active ?? true,
    })) || [];

  const [formData, setFormData] = useState({
    marketer_id: rule?.marketer_id || '',
    scope_type: (rule?.scope_type as 'product' | 'store' | 'all') || 'all',
    product_id: rule?.product_id || '',
    store_id: rule?.store_id || '',
    commission_type: (rule?.commission_type as 'percentage' | 'fixed') || 'percentage',
    commission_value:
      rule?.commission_value !== null && rule?.commission_value !== undefined
        ? String(rule.commission_value)
        : '',
    priority: rule?.priority !== null && rule?.priority !== undefined ? String(rule.priority) : '100',
    is_active: rule?.is_active ?? true,
  });

  const [tiers, setTiers] = useState<TierDraft[]>(initialTiers);

  useEffect(() => {
    fetchOptions();
  }, [user?.id]);

  const fetchOptions = async () => {
    try {
      const [{ data: productsData }, { data: storesData }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('stores')
          .select('id, name, title, slug')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      setProducts((productsData || []) as ProductOption[]);
      setStores((storesData || []) as StoreOption[]);
    } catch (fetchError) {
      console.error('Error fetching rule options:', fetchError);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setLoading(true);

    try {
      if (!formData.marketer_id) {
        throw new Error('اختر المسوق');
      }

      if (formData.scope_type === 'product' && !formData.product_id) {
        throw new Error('اختر المنتج لهذه القاعدة');
      }

      if (formData.scope_type === 'store' && !formData.store_id) {
        throw new Error('اختر المتجر لهذه القاعدة');
      }

      if (formData.commission_value.trim() === '') {
        throw new Error('أدخل قيمة العمولة الأساسية');
      }

      validateTiers();

      const marketerName =
        marketers.find((item) => item.id === formData.marketer_id)?.name ||
        rule?.marketer?.name ||
        'أفلييت';

      const payload = {
        seller_id: user.id,
        marketer_id: formData.marketer_id,
        rule_name: rule?.rule_name || buildRuleName(marketerName, formData.scope_type),
        scope_type: formData.scope_type,
        product_id: formData.scope_type === 'product' ? formData.product_id : null,
        store_id: formData.scope_type === 'store' ? formData.store_id : null,
        commission_type: formData.commission_type,
        commission_value: Number(formData.commission_value),
        priority: Number(formData.priority || 100),
        is_active: formData.is_active,
      };

      let ruleId = rule?.id || '';

      if (rule) {
        const { error: updateError } = await supabase
          .from('affiliate_rules')
          .update(payload)
          .eq('id', rule.id)
          .eq('seller_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { data: insertedRule, error: insertError } = await supabase
          .from('affiliate_rules')
          .insert(payload)
          .select('id')
          .single();

        if (insertError) throw insertError;
        ruleId = insertedRule.id;
      }

      if (!ruleId && rule?.id) {
        ruleId = rule.id;
      }

      const existingTierIds = new Set((rule?.tiers || []).map((tier) => tier.id));
      const currentTierIds = new Set(tiers.filter((tier) => tier.id).map((tier) => tier.id as string));
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

      onSuccess();
    } catch (err: any) {
      console.error('Error saving rule:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ قاعدة العمولة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={rule ? 'تعديل قاعدة عمولة المنصة' : 'إضافة قاعدة عمولة جديدة'}
      subtitle="إدارة قاعدة عمولة مستقلة من لوحة الأدمن."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المسوق <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.marketer_id}
            onChange={(e) => setFormData({ ...formData, marketer_id: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع القاعدة <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.scope_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scope_type: e.target.value as 'product' | 'store' | 'all',
                  product_id: e.target.value === 'product' ? formData.product_id : '',
                  store_id: e.target.value === 'store' ? formData.store_id : '',
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="all">قاعدة عامة</option>
              <option value="product">على منتج محدد</option>
              <option value="store">على متجر محدد</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {formData.scope_type === 'product' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المنتج <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- اختر المنتج --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {getDisplayName(product)}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.scope_type === 'store' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المتجر <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- اختر المتجر --</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {getDisplayName(store)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع العمولة الأساسية</label>
            <select
              value={formData.commission_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commission_type: e.target.value as 'percentage' | 'fixed',
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">نسبة مئوية %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">قيمة العمولة الأساسية</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.commission_value}
              onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <div>
            <div className="font-medium text-gray-900">القاعدة نشطة</div>
            <div className="text-sm text-gray-500">لن تُستخدم القاعدة إذا كانت غير نشطة.</div>
          </div>
        </label>

        <div className="rounded-3xl border border-gray-200 p-5">
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
                        onChange={(e) => updateTier(tier.localId, { commission_value: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 bg-white w-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tier.is_active}
                          onChange={(e) => updateTier(tier.localId, { is_active: e.target.checked })}
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

        <ModalActions
          onClose={onClose}
          submitText={loading ? 'جاري الحفظ...' : rule ? 'حفظ التغييرات' : 'إضافة القاعدة'}
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
      active
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 bg-white hover:border-blue-200'
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
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
        >
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
