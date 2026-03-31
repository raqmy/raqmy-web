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
  BarChart3,
  Search,
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

export const AffiliateManagementPage: React.FC<AffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'marketers' | 'links'>('marketers');
  const [marketers, setMarketers] = useState<AffiliateMarketerRow[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMarketerModal, setShowMarketerModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingMarketer, setEditingMarketer] = useState<AffiliateMarketerRow | null>(null);
  const [editingLink, setEditingLink] = useState<AffiliateLinkRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, activeTab]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (activeTab === 'marketers') {
        await fetchMarketers();
      } else {
        await fetchLinks();
      }
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
        product:products(id, name, title, slug),
        store:stores(id, name, title, slug)
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return;
    }

    setLinks((data || []) as AffiliateLinkRow[]);
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
      fetchMarketers();
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
      fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('حدث خطأ أثناء حذف الرابط');
    }
  };

  const filteredMarketers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return marketers;

    return marketers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [marketers, searchQuery]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return links;

    return links.filter((l) => {
      const code = (l.code || '').toLowerCase();
      const marketerName = (l.marketer?.name || '').toLowerCase();
      const productName = getDisplayName(l.product).toLowerCase();
      const storeName = getDisplayName(l.store).toLowerCase();
      return (
        code.includes(q) ||
        marketerName.includes(q) ||
        productName.includes(q) ||
        storeName.includes(q)
      );
    });
  }, [links, searchQuery]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            إدارة التسويق بالعمولة
          </h1>
          <p className="text-gray-600">أدر المسوقين وروابط التسويق بالعمولة</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-4 p-6">
              <button
                onClick={() => setActiveTab('marketers')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === 'marketers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>المسوقين ({marketers.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('links')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === 'links'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span>الروابط ({links.length})</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'marketers' ? 'ابحث عن مسوق...' : 'ابحث عن رابط...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() =>
                  activeTab === 'marketers'
                    ? setShowMarketerModal(true)
                    : setShowLinkModal(true)
                }
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>{activeTab === 'marketers' ? 'إضافة مسوق' : 'إضافة رابط'}</span>
              </button>
            </div>

            {activeTab === 'marketers' ? (
              <MarketersTab
                marketers={filteredMarketers}
                onEdit={setEditingMarketer}
                onDelete={handleDeleteMarketer}
                onViewAnalytics={(marketerId) =>
                  onNavigate(`marketer-analytics-${marketerId}`)
                }
              />
            ) : (
              <LinksTab
                links={filteredLinks}
                onEdit={setEditingLink}
                onDelete={handleDeleteLink}
              />
            )}
          </div>
        </div>
      </div>

      {(showMarketerModal || editingMarketer) && (
        <MarketerFormModal
          marketer={editingMarketer}
          onClose={() => {
            setShowMarketerModal(false);
            setEditingMarketer(null);
          }}
          onSuccess={() => {
            setShowMarketerModal(false);
            setEditingMarketer(null);
            fetchMarketers();
          }}
        />
      )}

      {(showLinkModal || editingLink) && (
        <LinkFormModal
          link={editingLink}
          marketers={marketers}
          onClose={() => {
            setShowLinkModal(false);
            setEditingLink(null);
          }}
          onSuccess={() => {
            setShowLinkModal(false);
            setEditingLink(null);
            fetchLinks();
          }}
        />
      )}
    </div>
  );
};

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
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد مسوقين</h3>
        <p className="text-gray-600">ابدأ بإضافة مسوقين للترويج لمنتجاتك</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {marketers.map((marketer) => {
        const isActive = marketer.is_active ?? marketer.status === 'active';

        return (
          <div
            key={marketer.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{marketer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isActive ? 'نشط' : 'غير نشط'}
                    </span>

                    {marketer.status && (
                      <span className="text-sm text-gray-600">
                        الحالة: {marketer.status === 'active' ? 'نشط' : marketer.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewAnalytics(marketer.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="عرض التحليلات"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEdit(marketer)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(marketer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <MousePointerClick className="w-4 h-4" />
                  <span className="text-xs">النقرات</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {marketer.total_clicks || 0}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">المبيعات</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {marketer.total_sales || 0}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">الأرباح</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {Number(marketer.total_earnings || 0).toFixed(2)} ر.س
                </div>
              </div>
            </div>

            {(marketer.email || marketer.phone) && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                {marketer.email && (
                  <div className="text-sm text-gray-600">📧 {marketer.email}</div>
                )}
                {marketer.phone && (
                  <div className="text-sm text-gray-600">📱 {marketer.phone}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface LinksTabProps {
  links: AffiliateLinkRow[];
  onEdit: (link: AffiliateLinkRow) => void;
  onDelete: (linkId: string) => void;
}

const LinksTab: React.FC<LinksTabProps> = ({ links, onEdit, onDelete }) => {
  if (links.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد روابط</h3>
        <p className="text-gray-600">ابدأ بإنشاء روابط تسويق بالعمولة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {links.map((link) => (
        <div
          key={link.id}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-mono">{link.code}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        link.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {link.is_active ? 'نشط' : 'غير نشط'}
                    </span>

                    <span className="text-sm text-gray-600">
                      {getApplyToLabel(link.apply_to)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {link.product && (
                  <div className="text-sm text-gray-600">
                    📦 المنتج: {getDisplayName(link.product)}
                  </div>
                )}

                {link.store && (
                  <div className="text-sm text-gray-600">
                    🏪 المتجر: {getDisplayName(link.store)}
                  </div>
                )}

                {link.marketer && (
                  <div className="text-sm text-gray-600">
                    👤 المسوق: {link.marketer.name || 'بدون اسم'}
                  </div>
                )}

                {link.apply_to === 'all' && (
                  <div className="text-sm text-gray-600">🌐 جميع منتجات التاجر</div>
                )}

                {link.description && (
                  <div className="text-sm text-gray-500">{link.description}</div>
                )}
              </div>

              <CopyLinkButton
                url={`${window.location.origin}?ref=${link.code}`}
                label="نسخ رابط التسويق"
                variant="minimal"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(link)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(link.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <div className="text-xs text-gray-600 mb-1">النقرات</div>
              <div className="text-xl font-bold text-gray-900">{link.clicks || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">المبيعات</div>
              <div className="text-xl font-bold text-gray-900">{link.sales || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">الأرباح</div>
              <div className="text-xl font-bold text-gray-900">
                {Number(link.earnings || 0).toFixed(2)} ر.س
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">معدل التحويل</div>
              <div className="text-xl font-bold text-gray-900">
                {(link.clicks || 0) > 0
                  ? (((link.sales || 0) / (link.clicks || 0)) * 100).toFixed(1)
                  : '0'}
                %
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {marketer ? 'تعديل المسوق' : 'إضافة مسوق جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المسوق <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            نسبة العمولة لم تعد تُحفظ داخل المسوق نفسه، بل تُدار عبر قواعد العمولة وروابط الأفلييت.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active_marketer"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="is_active_marketer" className="text-sm text-gray-700 cursor-pointer">
              المسوق نشط
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
              {loading ? 'جاري الحفظ...' : marketer ? 'حفظ التغييرات' : 'إضافة المسوق'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
            .select('id, name, title, slug')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('id, name, title, slug')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (productsError) console.error('Error fetching products:', productsError);
      if (storesError) console.error('Error fetching stores:', storesError);

      setProducts((productsData || []) as ProductOption[]);
      setStores((storesData || []) as StoreOption[]);
    } catch (error) {
      console.error('Error fetching user data:', error);
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
      setError(err.message || 'حدث خطأ أثناء حفظ الرابط');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {link ? 'تعديل رابط التسويق' : 'إنشاء رابط تسويق جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            نسبة العمولة لم تعد تُحفظ داخل الرابط نفسه، بل تأتي لاحقًا من قواعد العمولة الخاصة بالأفلييت.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كود الرابط <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
              placeholder="AFF2024"
              required
            />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {marketers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المسوق (اختياري)
              </label>
              <select
                value={formData.marketer_id}
                onChange={(e) => setFormData({ ...formData, marketer_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الرابط
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: رابط لحملة إعلانية على فيسبوك"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active_link"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="is_active_link" className="text-sm text-gray-700 cursor-pointer">
              الرابط نشط
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
              {loading ? 'جاري الحفظ...' : link ? 'حفظ التغييرات' : 'إنشاء الرابط'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
