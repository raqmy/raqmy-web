import React, { useEffect, useState } from 'react';
import {
  Users,
  Link as LinkIcon,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Eye,
  BarChart3,
  Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CopyLinkButton } from '../components/shared/CopyLinkButton';

interface AffiliateManagementPageProps {
  onNavigate: (page: string) => void;
}

export const AffiliateManagementPage: React.FC<AffiliateManagementPageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'marketers' | 'links'>('marketers');
  const [marketers, setMarketers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMarketerModal, setShowMarketerModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingMarketer, setEditingMarketer] = useState<any>(null);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
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
    const { data, error } = await supabase
      .from('affiliate_marketers')
      .select('*')
      .eq('seller_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMarketers(data);
    }
  };

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select(`
        *,
        product:products(id, name),
        store:stores(id, name),
        marketer:affiliate_marketers(id, name)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLinks(data);
    }
  };

  const handleDeleteMarketer = async (marketerId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المسوق؟')) return;

    try {
      const { error } = await supabase
        .from('affiliate_marketers')
        .delete()
        .eq('id', marketerId);

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
        .eq('id', linkId);

      if (error) throw error;
      fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('حدث خطأ أثناء حذف الرابط');
    }
  };

  const filteredMarketers = marketers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLinks = links.filter((l) =>
    l.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  marketers: any[];
  onEdit: (marketer: any) => void;
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
      {marketers.map((marketer) => (
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
                      marketer.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {marketer.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {marketer.commission_rate}% عمولة
                  </span>
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
                {marketer.total_clicks}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">المبيعات</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {marketer.total_sales}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">الأرباح</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {marketer.total_earnings.toFixed(2)} ر.س
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
      ))}
    </div>
  );
};

interface LinksTabProps {
  links: any[];
  onEdit: (link: any) => void;
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
                  <div className="flex items-center gap-2 mt-1">
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
                      {link.commission_rate}% عمولة
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {link.product && (
                  <div className="text-sm text-gray-600">
                    📦 المنتج: {link.product.name}
                  </div>
                )}
                {link.store && (
                  <div className="text-sm text-gray-600">
                    🏪 المتجر: {link.store.name}
                  </div>
                )}
                {link.marketer && (
                  <div className="text-sm text-gray-600">
                    👤 المسوق: {link.marketer.name}
                  </div>
                )}
                {link.apply_to === 'all' && (
                  <div className="text-sm text-gray-600">🌐 جميع المنتجات</div>
                )}
              </div>

              <CopyLinkButton
                url={`${window.location.origin}/#/aff-${link.code}`}
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
              <div className="text-xl font-bold text-gray-900">{link.clicks}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">المبيعات</div>
              <div className="text-xl font-bold text-gray-900">{link.sales}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">الأرباح</div>
              <div className="text-xl font-bold text-gray-900">
                {parseFloat(link.earnings || 0).toFixed(2)} ر.س
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">معدل التحويل</div>
              <div className="text-xl font-bold text-gray-900">
                {link.clicks > 0
                  ? ((link.sales / link.clicks) * 100).toFixed(1)
                  : 0}
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
  marketer?: any;
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
    commission_rate: marketer?.commission_rate || '10',
    notes: marketer?.notes || '',
    is_active: marketer?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        seller_id: user?.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        commission_rate: parseFloat(formData.commission_rate),
        notes: formData.notes || null,
        is_active: formData.is_active,
      };

      if (marketer) {
        const { error: updateError } = await supabase
          .from('affiliate_marketers')
          .update(data)
          .eq('id', marketer.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('affiliate_marketers')
          .insert(data);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة العمولة (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.commission_rate}
              onChange={(e) =>
                setFormData({ ...formData, commission_rate: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
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
  link?: any;
  marketers: any[];
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
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: link?.code || '',
    commission_rate: link?.commission_rate || '10',
    apply_to: link?.apply_to || 'product',
    product_id: link?.product_id || '',
    store_id: link?.store_id || '',
    marketer_id: link?.marketer_id || '',
    description: link?.description || '',
    is_active: link?.is_active ?? true,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [{ data: productsData }, { data: storesData }] = await Promise.all([
        supabase.from('products').select('id, name').eq('user_id', user?.id),
        supabase.from('stores').select('id, name').eq('user_id', user?.id),
      ]);

      if (productsData) setProducts(productsData);
      if (storesData) setStores(storesData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: any = {
        user_id: user?.id,
        code: formData.code.toUpperCase(),
        commission_rate: parseFloat(formData.commission_rate),
        apply_to: formData.apply_to,
        marketer_id: formData.marketer_id || null,
        description: formData.description || null,
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
          .eq('id', link.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('affiliate_links')
          .insert(data);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                نسبة العمولة (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission_rate}
                onChange={(e) =>
                  setFormData({ ...formData, commission_rate: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نطاق التطبيق <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.apply_to}
              onChange={(e) => setFormData({ ...formData, apply_to: e.target.value })}
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
                    {product.name}
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
                    {store.name}
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
