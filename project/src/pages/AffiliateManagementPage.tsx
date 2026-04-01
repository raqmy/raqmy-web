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
  ArrowLeft,
  Wand2,
  Workflow,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CopyLinkButton } from '../components/shared/CopyLinkButton';

interface AffiliateManagementPageProps {
  onNavigate: (page: string) => void;
}

type ViewMode = 'overview' | 'marketers' | 'links' | 'rules';
type CreateMode = 'marketer' | 'link' | 'rule' | 'full';

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

const getDisplayName = (item?: { name?: string | null; title?: string | null } | null) =>
  item?.title || item?.name || 'بدون اسم';

const getApplyToLabel = (value?: string | null) => {
  switch (value) {
    case 'product':
      return 'منتج محدد';
    case 'store':
      return 'متجر محدد';
    case 'all':
      return 'جميع المنتجات';
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

export const AffiliateManagementPage: React.FC<AffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);

  const [marketers, setMarketers] = useState<AffiliateMarketerRow[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRow[]>([]);
  const [rules, setRules] = useState<AffiliateRuleRow[]>([]);

  const [showCreateWizard, setShowCreateWizard] = useState(false);

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
      console.error('Error fetching marketers:', error);
      return;
    }

    setMarketers((data || []) as AffiliateMarketerRow[]);
  };

  const fetchLinks = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('affiliate_links')
      .select(`
        *,
        marketer:affiliate_marketers(id, name),
        product:products(*),
        store:stores(*)
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return;
    }

    setLinks((data || []) as AffiliateLinkRow[]);
  };

  const fetchRules = async () => {
    if (!user?.id) return;

    const { data: rulesData, error: rulesError } = await supabase
      .from('affiliate_rules')
      .select(`
        *,
        marketer:affiliate_marketers(id, name),
        product:products(*),
        store:stores(*)
      `)
      .eq('seller_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (rulesError) {
      console.error('Error fetching rules:', rulesError);
      return;
    }

    const ruleIds = (rulesData || []).map((rule: any) => rule.id);
    let tiersMap = new Map<string, AffiliateRuleTierRow[]>();

    if (ruleIds.length > 0) {
      const { data: tiersData, error: tiersError } = await supabase
        .from('affiliate_rule_tiers')
        .select('*')
        .in('rule_id', ruleIds)
        .order('day_from', { ascending: true });

      if (tiersError) {
        console.error('Error fetching rule tiers:', tiersError);
      } else {
        tiersMap = new Map<string, AffiliateRuleTierRow[]>();
        (tiersData || []).forEach((tier: any) => {
          const key = tier.rule_id;
          const current = tiersMap.get(key) || [];
          current.push(tier as AffiliateRuleTierRow);
          tiersMap.set(key, current);
        });
      }
    }

    const normalizedRules = (rulesData || []).map((rule: any) => ({
      ...rule,
      tiers: tiersMap.get(rule.id) || [],
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

  const marketerNameMap = useMemo(() => {
    return new Map(marketers.map((marketer) => [marketer.id, marketer.name]));
  }, [marketers]);

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
      conversion: totalClicks > 0 ? `${((totalSales / totalClicks) * 100).toFixed(1)}%` : '0.0%',
    };
  }, [marketers, links, rules]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMarketerId('all');
    setStatusFilter('all');
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
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sm mb-4">
                  <Sparkles className="w-4 h-4" />
                  مركز إدارة الأفلييت
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-3">إدارة التسويق بالعمولة</h1>
                <p className="text-white/90 max-w-2xl leading-7">
                  لوحة موحدة للمسوقين والروابط وقواعد العمولة والشرائح الزمنية، بحيث تقدر تدير النظام كامل من مكان واحد بشكل واضح وعملي.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 min-w-[320px]">
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
                  label="قواعد العمولة"
                  value={overviewStats.activeRules}
                  icon={<Settings2 className="w-5 h-5" />}
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
                  onClick={() => setShowCreateWizard(true)}
                  icon={<Wand2 className="w-4 h-4" />}
                  label="إنشاء جديد"
                  primary
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800 leading-7">
              بدل التشتت بين ثلاث نوافذ مستقلة، صار عندك الآن <strong>إنشاء موحد</strong>:
              تقدر تضيف مسوق فقط، أو رابط فقط، أو قاعدة عمولة فقط، أو تنشئ كل شيء مرة واحدة بتدفق مرتب وواضح.
            </div>
          </div>

          <div className="p-4 lg:p-6 border-b border-gray-100 bg-gray-50/70">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الكود أو المنتج أو المتجر..."
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
              <OverviewSection
                stats={overviewStats}
                marketers={marketers}
                links={links}
                rules={rules}
                onNavigate={onNavigate}
                onEditMarketer={(marketer) => setEditingMarketer(marketer)}
                onEditLink={(link) => setEditingLink(link)}
                onEditRule={(rule) => setEditingRule(rule)}
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

      {showCreateWizard && (
        <AffiliateCreateWizardModal
          marketers={marketers}
          onClose={() => setShowCreateWizard(false)}
          onSuccess={() => {
            setShowCreateWizard(false);
            fetchAllData();
          }}
        />
      )}

      {editingMarketer && (
        <MarketerFormModal
          marketer={editingMarketer}
          onClose={() => {
            setEditingMarketer(null);
          }}
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
          onClose={() => {
            setEditingLink(null);
          }}
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
          onClose={() => {
            setEditingRule(null);
          }}
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

const OverviewSection: React.FC<{
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
    conversion: string;
  };
  marketers: AffiliateMarketerRow[];
  links: AffiliateLinkRow[];
  rules: AffiliateRuleRow[];
  onNavigate: (page: string) => void;
  onEditMarketer: (marketer: AffiliateMarketerRow) => void;
  onEditLink: (link: AffiliateLinkRow) => void;
  onEditRule: (rule: AffiliateRuleRow) => void;
}> = ({ stats, marketers, links, rules, onNavigate, onEditLink, onEditRule }) => {
  const topMarketers = [...marketers]
    .sort((a, b) => Number(b.total_earnings || 0) - Number(a.total_earnings || 0))
    .slice(0, 3);

  const topLinks = [...links]
    .sort((a, b) => Number(b.earnings || 0) - Number(a.earnings || 0))
    .slice(0, 3);

  const latestRules = [...rules].slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <OverviewStatCard
          title="إجمالي المسوقين"
          value={stats.totalMarketers}
          subValue={`${stats.activeMarketers} نشط`}
          icon={<Users className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="إجمالي الروابط"
          value={stats.totalLinks}
          subValue={`${stats.activeLinks} نشط`}
          icon={<LinkIcon className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="المبيعات من الأفلييت"
          value={stats.totalSales}
          subValue={`معدل التحويل ${stats.conversion}`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <OverviewStatCard
          title="إجمالي الأرباح"
          value={formatMoney(stats.totalEarnings)}
          subValue={`${stats.totalRules} قاعدة عمولة`}
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <PanelCard
          title="أفضل المسوقين"
          subtitle="أعلى أداء حسب الأرباح"
          icon={<Users className="w-5 h-5" />}
        >
          {topMarketers.length === 0 ? (
            <EmptyMiniState text="لا يوجد مسوقون بعد" />
          ) : (
            <div className="space-y-3">
              {topMarketers.map((marketer) => (
                <div key={marketer.id} className="rounded-2xl border border-gray-100 p-4 bg-gray-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{marketer.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Number(marketer.total_sales || 0)} مبيعات • {Number(marketer.total_clicks || 0)} نقرات
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-violet-700">{formatMoney(marketer.total_earnings)}</div>
                      <button
                        onClick={() => onNavigate(`marketer-analytics-${marketer.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title="أفضل الروابط"
          subtitle="أعلى الروابط أداءً"
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
          subtitle="إدارة القواعد والشرائح الزمنية"
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
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">كيف صار النظام الآن أوضح؟</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 leading-7">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>المسوقون والروابط والقواعد داخل مركز واحد بدل تشتيت الإدارة.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>قواعد العمولة تدعم قاعدة عامة أو على منتج أو متجر.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>إمكانية إضافة شرائح حسب الأيام مثل 0-7 و 8-30 بشكل واضح.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />
                <span>زر إنشاء واحد يفتح لك مسار مرتب بدل ثلاث نوافذ منفصلة مربكة.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
        <p className="text-gray-600">ابدأ بإضافة مسوقين ثم أنشئ لهم قواعد وروابط واضحة.</p>
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
        <p className="text-gray-600">أنشئ روابطك مع ربطها بالمسوق والمنتج أو المتجر بطريقة واضحة.</p>
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
                          ? 'جميع المنتجات'
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
                          ? 'جميع متاجر التاجر'
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
        <p className="text-gray-600">ابدأ بإنشاء قاعدة عامة أو على منتج أو متجر، ثم أضف الشرائح حسب الأيام.</p>
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

interface AffiliateCreateWizardModalProps {
  marketers: AffiliateMarketerRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const AffiliateCreateWizardModal: React.FC<AffiliateCreateWizardModalProps> = ({
  marketers,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [mode, setMode] = useState<CreateMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [marketerSource, setMarketerSource] = useState<'new' | 'existing'>('new');

  const [marketerData, setMarketerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    is_active: true,
  });

  const [linkData, setLinkData] = useState({
    code: '',
    apply_to: 'product' as 'product' | 'store' | 'all',
    product_id: '',
    store_id: '',
    marketer_id: '',
    description: '',
    is_active: true,
  });

  const [ruleData, setRuleData] = useState({
    marketer_id: '',
    scope_type: 'all' as 'product' | 'store' | 'all',
    product_id: '',
    store_id: '',
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: '',
    priority: '100',
    is_active: true,
  });

  const [tiers, setTiers] = useState<TierDraft[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!user?.id) return;

      try {
        const [{ data: productsData }, { data: storesData }] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        setProducts((productsData || []) as ProductOption[]);
        setStores((storesData || []) as StoreOption[]);
      } catch (fetchError) {
        console.error('Error fetching wizard options:', fetchError);
      }
    };

    fetchOptions();
  }, [user?.id]);

  const resetError = () => setError('');

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

  const validateLinkCode = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error('كود الرابط مطلوب');

    const { data: existingCodeRow, error: existingCodeError } = await supabase
      .from('affiliate_links')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existingCodeError) throw existingCodeError;
    if (existingCodeRow) {
      throw new Error('كود الرابط مستخدم بالفعل، اختر كودًا مختلفًا');
    }

    return normalizedCode;
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

  const createMarketer = async () => {
    if (!user?.id) throw new Error('المستخدم غير موجود');
    if (!marketerData.name.trim()) throw new Error('اسم المسوق مطلوب');

    const payload = {
      seller_id: user.id,
      user_id: null,
      name: marketerData.name.trim(),
      email: marketerData.email.trim() || null,
      phone: marketerData.phone.trim() || null,
      notes: marketerData.notes.trim() || null,
      is_active: marketerData.is_active,
      status: marketerData.is_active ? 'active' : 'inactive',
      total_clicks: 0,
      total_sales: 0,
      total_earnings: 0,
    };

    const { data, error: insertError } = await supabase
      .from('affiliate_marketers')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) throw insertError;
    return data.id as string;
  };

  const createLink = async (resolvedMarketerId?: string | null) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    const normalizedCode = await validateLinkCode(linkData.code);

    if (linkData.apply_to === 'product' && !linkData.product_id) {
      throw new Error('اختر المنتج للرابط');
    }

    if (linkData.apply_to === 'store' && !linkData.store_id) {
      throw new Error('اختر المتجر للرابط');
    }

    const payload: Record<string, any> = {
      user_id: user.id,
      seller_id: user.id,
      code: normalizedCode,
      apply_to: linkData.apply_to,
      marketer_id: resolvedMarketerId || linkData.marketer_id || null,
      description: linkData.description.trim() || null,
      is_active: linkData.is_active,
      clicks: 0,
      sales: 0,
      earnings: 0,
      product_id: null,
      store_id: null,
    };

    if (linkData.apply_to === 'product') {
      payload.product_id = linkData.product_id;
    } else if (linkData.apply_to === 'store') {
      payload.store_id = linkData.store_id;
    }

    const { data, error: insertError } = await supabase
      .from('affiliate_links')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) throw insertError;
    return data.id as string;
  };

  const createRule = async (resolvedMarketerId?: string | null) => {
    if (!user?.id) throw new Error('المستخدم غير موجود');

    const marketerIdToUse = resolvedMarketerId || ruleData.marketer_id;
    if (!marketerIdToUse) throw new Error('اختر المسوق للقاعدة');

    if (ruleData.scope_type === 'product' && !ruleData.product_id) {
      throw new Error('اختر المنتج للقاعدة');
    }

    if (ruleData.scope_type === 'store' && !ruleData.store_id) {
      throw new Error('اختر المتجر للقاعدة');
    }

    if (ruleData.commission_value.trim() === '') {
      throw new Error('أدخل قيمة العمولة الأساسية');
    }

    validateTiers();

    const payload = {
      seller_id: user.id,
      marketer_id: marketerIdToUse,
      scope_type: ruleData.scope_type,
      product_id: ruleData.scope_type === 'product' ? ruleData.product_id : null,
      store_id: ruleData.scope_type === 'store' ? ruleData.store_id : null,
      commission_type: ruleData.commission_type,
      commission_value: Number(ruleData.commission_value),
      priority: Number(ruleData.priority || 100),
      is_active: ruleData.is_active,
    };

    const { data: insertedRule, error: insertError } = await supabase
      .from('affiliate_rules')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) throw insertError;

    if (tiers.length > 0) {
      const tierPayload = tiers.map((tier) => ({
        rule_id: insertedRule.id,
        day_from: Number(tier.day_from || 0),
        day_to: tier.day_to.trim() === '' ? null : Number(tier.day_to),
        commission_type: tier.commission_type,
        commission_value: Number(tier.commission_value),
        is_active: tier.is_active,
      }));

      const { error: tierInsertError } = await supabase
        .from('affiliate_rule_tiers')
        .insert(tierPayload);

      if (tierInsertError) throw tierInsertError;
    }

    return insertedRule.id as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !mode) return;

    setError('');
    setLoading(true);

    try {
      if (mode === 'marketer') {
        await createMarketer();
      }

      if (mode === 'link') {
        await createLink();
      }

      if (mode === 'rule') {
        await createRule();
      }

      if (mode === 'full') {
        let marketerIdToUse = '';

        if (marketerSource === 'existing') {
          if (!linkData.marketer_id) {
            throw new Error('اختر المسوق الموجود');
          }
          marketerIdToUse = linkData.marketer_id;
        } else {
          marketerIdToUse = await createMarketer();
        }

        await createLink(marketerIdToUse);

        await createRule(
          marketerSource === 'existing' ? marketerIdToUse : marketerIdToUse
        );
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error in affiliate create wizard:', err);
      setError(err.message || 'حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setLoading(false);
    }
  };

  const modeLabel =
    mode === 'marketer'
      ? 'إضافة مسوق فقط'
      : mode === 'link'
      ? 'إنشاء رابط فقط'
      : mode === 'rule'
      ? 'إنشاء قاعدة عمولة فقط'
      : mode === 'full'
      ? 'إعداد كامل'
      : '';

  const shouldShowMarketerSection =
    mode === 'marketer' || (mode === 'full' && marketerSource === 'new');

  const shouldShowLinkSection = mode === 'link' || mode === 'full';
  const shouldShowRuleSection = mode === 'rule' || mode === 'full';

  const resolvedRuleMarketerId =
    mode === 'rule'
      ? ruleData.marketer_id
      : mode === 'full'
      ? marketerSource === 'existing'
        ? linkData.marketer_id
        : 'سيتم استخدام المسوق الجديد'
      : '';

  return (
    <ModalShell
      title="إنشاء جديد"
      subtitle="اختر المسار المناسب ثم أكمل الخطوات بشكل مرتب. تقدر تنشئ مسوق فقط، أو رابط فقط، أو قاعدة فقط، أو كل شيء مرة واحدة."
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-6">
        {error && <ErrorBox text={error} />}

        {!mode ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-l from-blue-50 to-violet-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                  <Workflow className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">اختر طريقة الإنشاء</h3>
                  <p className="text-sm text-gray-600 leading-7">
                    هذه النافذة توحد كل العمليات في مكان واحد. اختر فقط ما تحتاجه بدل التنقل بين نوافذ متعددة.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WizardModeCard
                title="إضافة مسوق"
                description="أنشئ مسوقًا جديدًا فقط بدون رابط وبدون قاعدة عمولة."
                icon={<Users className="w-6 h-6" />}
                onClick={() => {
                  resetError();
                  setMode('marketer');
                }}
              />
              <WizardModeCard
                title="إنشاء رابط"
                description="أنشئ رابطًا مباشرة، مع إمكانية ربطه بمسوق موجود أو تركه بدون مسوق."
                icon={<LinkIcon className="w-6 h-6" />}
                onClick={() => {
                  resetError();
                  setMode('link');
                }}
              />
              <WizardModeCard
                title="إضافة قاعدة عمولة"
                description="أنشئ قاعدة عمولة عامة أو على منتج أو متجر، مع شرائح حسب الأيام."
                icon={<Settings2 className="w-6 h-6" />}
                onClick={() => {
                  resetError();
                  setMode('rule');
                }}
              />
              <WizardModeCard
                title="إعداد كامل"
                description="أنشئ مسوقًا ورابطًا وقاعدة عمولة معًا في تدفق واحد مرتب."
                icon={<Wand2 className="w-6 h-6" />}
                onClick={() => {
                  resetError();
                  setMode('full');
                }}
                primary
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode(null);
                    setError('');
                  }}
                  className="w-10 h-10 rounded-2xl border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="text-sm text-gray-500 mb-1">المسار الحالي</div>
                  <div className="text-xl font-bold text-gray-900">{modeLabel}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <TagChip text={mode === 'full' ? 'يشمل كل العناصر' : 'إنشاء مخصص'} success />
                <TagChip text="خطوات موحدة وواضحة" />
              </div>
            </div>

            {mode === 'full' && (
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="font-bold text-gray-900 mb-3">اختيار المسوق في الإعداد الكامل</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectableOptionCard
                    active={marketerSource === 'new'}
                    title="إنشاء مسوق جديد"
                    description="سينشئ لك مسوقًا جديدًا ثم يربط الرابط والقاعدة به تلقائيًا."
                    onClick={() => {
                      setMarketerSource('new');
                      setLinkData((prev) => ({ ...prev, marketer_id: '' }));
                      setRuleData((prev) => ({ ...prev, marketer_id: '' }));
                    }}
                  />
                  <SelectableOptionCard
                    active={marketerSource === 'existing'}
                    title="استخدام مسوق موجود"
                    description="سيتم تخطي إنشاء المسوق وربط الرابط والقاعدة بمسوق موجود."
                    onClick={() => {
                      setMarketerSource('existing');
                    }}
                  />
                </div>

                {marketerSource === 'existing' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اختر المسوق الموجود <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={linkData.marketer_id}
                      onChange={(e) => {
                        setLinkData((prev) => ({ ...prev, marketer_id: e.target.value }));
                        setRuleData((prev) => ({ ...prev, marketer_id: e.target.value }));
                      }}
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
                )}
              </div>
            )}

            {shouldShowMarketerSection && (
              <SectionCard
                title="بيانات المسوق"
                subtitle="تعبئة بيانات المسوق الذي تريد إنشاءه"
                icon={<Users className="w-5 h-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المسوق <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={marketerData.name}
                      onChange={(e) => setMarketerData({ ...marketerData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={shouldShowMarketerSection}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={marketerData.email}
                      onChange={(e) => setMarketerData({ ...marketerData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={marketerData.phone}
                      onChange={(e) => setMarketerData({ ...marketerData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات داخلية</label>
                    <textarea
                      rows={4}
                      value={marketerData.notes}
                      onChange={(e) => setMarketerData({ ...marketerData, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: هذا المسوق مناسب لإعلانات تيك توك أو جمهور معين..."
                    />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketerData.is_active}
                    onChange={(e) => setMarketerData({ ...marketerData, is_active: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">المسوق نشط</div>
                    <div className="text-sm text-gray-500">يمكنه استقبال الروابط والعمولات إذا كان نشطًا.</div>
                  </div>
                </label>
              </SectionCard>
            )}

            {shouldShowLinkSection && (
              <SectionCard
                title="بيانات الرابط"
                subtitle="إنشاء رابط تتبع واضح للمسوق أو للحملة"
                icon={<LinkIcon className="w-5 h-5" />}
              >
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-7 mb-5">
                  الرابط هنا مخصص للتتبع والتوزيع، بينما نسبة العمولة نفسها تُدار من قواعد العمولة.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود الرابط <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={linkData.code}
                      onChange={(e) =>
                        setLinkData({ ...linkData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
                      placeholder="AFF2024"
                      required={shouldShowLinkSection}
                    />
                  </div>

                  {mode === 'link' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">المسوق (اختياري)</label>
                      <select
                        value={linkData.marketer_id}
                        onChange={(e) => setLinkData({ ...linkData, marketer_id: e.target.value })}
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
                  )}

                  <div className={mode === 'link' ? 'md:col-span-2' : 'md:col-span-2'}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نطاق التطبيق <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={linkData.apply_to}
                      onChange={(e) =>
                        setLinkData({
                          ...linkData,
                          apply_to: e.target.value as 'product' | 'store' | 'all',
                          product_id: e.target.value === 'product' ? linkData.product_id : '',
                          store_id: e.target.value === 'store' ? linkData.store_id : '',
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="product">منتج محدد</option>
                      <option value="store">متجر محدد</option>
                      <option value="all">جميع منتجاتي</option>
                    </select>
                  </div>

                  {linkData.apply_to === 'product' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اختر المنتج <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={linkData.product_id}
                        onChange={(e) => setLinkData({ ...linkData, product_id: e.target.value })}
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

                  {linkData.apply_to === 'store' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اختر المتجر <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={linkData.store_id}
                        onChange={(e) => setLinkData({ ...linkData, store_id: e.target.value })}
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
                      value={linkData.description}
                      onChange={(e) => setLinkData({ ...linkData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: رابط حملة انستغرام للمسوق فلان"
                    />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkData.is_active}
                    onChange={(e) => setLinkData({ ...linkData, is_active: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">الرابط نشط</div>
                    <div className="text-sm text-gray-500">يمكن استخدامه وتتبع نتائجه إذا كان نشطًا.</div>
                  </div>
                </label>
              </SectionCard>
            )}

            {shouldShowRuleSection && (
              <SectionCard
                title="قاعدة العمولة"
                subtitle="حدد العمولة الأساسية ثم أضف الشرائح الزمنية إذا احتجت"
                icon={<Settings2 className="w-5 h-5" />}
              >
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800 leading-7 mb-5">
                  مثال احترافي: عمولة أساسية 10%، ثم شريحة من 0 إلى 7 أيام = 20%، ومن 8 إلى 30 = 12%، وبعدها يرجع للعمولة الأساسية.
                </div>

                {mode === 'rule' && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المسوق <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ruleData.marketer_id}
                      onChange={(e) => setRuleData({ ...ruleData, marketer_id: e.target.value })}
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
                )}

                {mode === 'full' && (
                  <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-7">
                    <strong>المسوق المستخدم لهذه القاعدة:</strong>{' '}
                    {resolvedRuleMarketerId || 'سيتم تحديده بعد إكمال البيانات'}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع القاعدة <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ruleData.scope_type}
                      onChange={(e) =>
                        setRuleData({
                          ...ruleData,
                          scope_type: e.target.value as 'product' | 'store' | 'all',
                          product_id: e.target.value === 'product' ? ruleData.product_id : '',
                          store_id: e.target.value === 'store' ? ruleData.store_id : '',
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
                      value={ruleData.priority}
                      onChange={(e) => setRuleData({ ...ruleData, priority: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100"
                    />
                  </div>
                </div>

                {ruleData.scope_type === 'product' && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المنتج <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ruleData.product_id}
                      onChange={(e) => setRuleData({ ...ruleData, product_id: e.target.value })}
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

                {ruleData.scope_type === 'store' && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المتجر <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ruleData.store_id}
                      onChange={(e) => setRuleData({ ...ruleData, store_id: e.target.value })}
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
                      value={ruleData.commission_type}
                      onChange={(e) =>
                        setRuleData({
                          ...ruleData,
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
                      value={ruleData.commission_value}
                      onChange={(e) => setRuleData({ ...ruleData, commission_value: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={ruleData.commission_type === 'percentage' ? '10' : '25'}
                    />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleData.is_active}
                    onChange={(e) => setRuleData({ ...ruleData, is_active: e.target.checked })}
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
            )}

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">ملخص قبل الحفظ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 leading-7">
                    {shouldShowMarketerSection && (
                      <div className="rounded-2xl bg-white border border-gray-200 p-4">
                        <div className="font-semibold text-gray-900 mb-1">المسوق</div>
                        <div>{marketerData.name || '—'}</div>
                        <div className="text-gray-500">{marketerData.email || marketerData.phone || 'بدون تواصل'}</div>
                      </div>
                    )}

                    {shouldShowLinkSection && (
                      <div className="rounded-2xl bg-white border border-gray-200 p-4">
                        <div className="font-semibold text-gray-900 mb-1">الرابط</div>
                        <div className="font-mono">{linkData.code || '—'}</div>
                        <div className="text-gray-500">{getApplyToLabel(linkData.apply_to)}</div>
                      </div>
                    )}

                    {shouldShowRuleSection && (
                      <div className="rounded-2xl bg-white border border-gray-200 p-4">
                        <div className="font-semibold text-gray-900 mb-1">قاعدة العمولة</div>
                        <div>{formatCommission(ruleData.commission_type, Number(ruleData.commission_value || 0))}</div>
                        <div className="text-gray-500">
                          {getScopeTypeLabel(ruleData.scope_type)} • {tiers.length} شرائح
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <ModalActions
              onClose={onClose}
              submitText={loading ? 'جاري التنفيذ...' : 'حفظ العملية'}
              loading={loading}
            />
          </form>
        )}
      </div>
    </ModalShell>
  );
};

const WizardModeCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}> = ({ title, description, icon, onClick, primary = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-right rounded-3xl border p-5 transition-all hover:shadow-md ${
      primary
        ? 'border-violet-200 bg-gradient-to-l from-violet-50 to-blue-50'
        : 'border-gray-200 bg-white hover:border-blue-200'
    }`}
  >
    <div className="flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          primary ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="font-bold text-gray-900 text-lg mb-1">{title}</div>
        <div className="text-sm text-gray-600 leading-7">{description}</div>
      </div>
    </div>
  </button>
);

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
      subtitle="أنشئ مسوقًا واحدًا ثم اربط له القواعد والروابط من نفس اللوحة."
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

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-7">
          المسوق هنا هو الشخص فقط، أما العمولة فتُدار من تبويب <strong>قواعد العمولة</strong> بحيث تقدر تضبط عمولة عامة أو حسب المنتج أو المتجر أو الأيام.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات داخلية</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="مثال: هذا المسوق متخصص بإعلانات تيك توك أو جمهور معين..."
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
    apply_to: (link?.apply_to as 'product' | 'store' | 'all') || 'product',
    product_id: link?.product_id || '',
    store_id: link?.store_id || '',
    marketer_id: link?.marketer_id || '',
    description: link?.description || '',
    is_active: link?.is_active ?? true,
  });

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      const [{ data: productsData, error: productsError }, { data: storesData, error: storesError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (productsError) console.error('Error fetching products:', productsError);
      if (storesError) console.error('Error fetching stores:', storesError);

      setProducts((productsData || []) as ProductOption[]);
      setStores((storesData || []) as StoreOption[]);
    } catch (fetchError) {
      console.error('Error fetching user data:', fetchError);
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
      title={link ? 'تعديل رابط التسويق' : 'إنشاء رابط تسويق جديد'}
      subtitle="أنشئ رابطًا واضحًا واربطه بالمسوق والنطاق المناسب، بينما العمولة نفسها تُدار من قواعد العمولة."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 leading-7">
          الرابط هنا مخصص للتتبع والتوزيع، أما نسبة العمولة الأساسية أو الشرائح الزمنية فتُدار من تبويب <strong>قواعد العمولة</strong>.
        </div>

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
              placeholder="AFF2024"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              يفضل أن يكون الكود واضحًا ومميزًا للمسوق أو الحملة.
            </p>
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
            <option value="product">منتج محدد</option>
            <option value="store">متجر محدد</option>
            <option value="all">جميع منتجاتي</option>
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
            placeholder="مثال: رابط حملة انستغرام للمسوق فلان"
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
    if (!user?.id) return;

    try {
      const [{ data: productsData, error: productsError }, { data: storesData, error: storesError }] =
        await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (productsError) console.error(productsError);
      if (storesError) console.error(storesError);

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

      const payload = {
        seller_id: user.id,
        marketer_id: formData.marketer_id,
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
        const { error: deleteTiersError } = await supabase
          .from('affiliate_rule_tiers')
          .delete()
          .in('id', tierIdsToDelete);

        if (deleteTiersError) throw deleteTiersError;
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
          const { error: updateTierError } = await supabase
            .from('affiliate_rule_tiers')
            .update(tierPayload)
            .eq('id', tier.id);

          if (updateTierError) throw updateTierError;
        } else {
          const { error: insertTierError } = await supabase
            .from('affiliate_rule_tiers')
            .insert(tierPayload);

          if (insertTierError) throw insertTierError;
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving affiliate rule:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ قاعدة العمولة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={rule ? 'تعديل قاعدة العمولة' : 'إنشاء قاعدة عمولة جديدة'}
      subtitle="اضبط العمولة الأساسية ثم أضف شرائح حسب الأيام إذا كنت تريد عمولة مختلفة بمرور الوقت."
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorBox text={error} />}

        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800 leading-7">
          مثال احترافي: عمولة أساسية 10%، ثم شريحة من 0 إلى 7 أيام = 20%، ومن 8 إلى 30 = 12%، وبعدها يرجع للعمولة الأساسية.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع العمولة الأساسية
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قيمة العمولة الأساسية
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.commission_value}
              onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={formData.commission_type === 'percentage' ? '10' : '25'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الأولوية
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
            />
            <p className="mt-2 text-xs text-gray-500">
              الرقم الأقل يعني أولوية أعلى.
            </p>
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
          submitText={loading ? 'جاري الحفظ...' : rule ? 'حفظ القاعدة' : 'إنشاء القاعدة'}
          loading={loading}
        />
      </form>
    </ModalShell>
  );
};

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
        size === 'xl' ? 'max-w-5xl' : 'max-w-3xl'
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
