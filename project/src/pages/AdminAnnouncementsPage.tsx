import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Edit, Trash2, AlertCircle, CheckCircle, X, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminAnnouncementsPageProps {
  onNavigate: (page: string) => void;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'merchants' | 'customers';
  start_date: string;
  end_date: string | null;
  status: 'active' | 'deleted';
  created_at: string;
  dismissal_count?: number;
}

export const AdminAnnouncementsPage: React.FC<AdminAnnouncementsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: 'all' as 'all' | 'merchants' | 'customers',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    status: 'active' as 'active' | 'deleted',
  });

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      loadAnnouncements();
    }
  }, [profile]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data: announcementsData, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const announcementsWithStats = await Promise.all(
        (announcementsData || []).map(async (announcement) => {
          const { count } = await supabase
            .from('announcement_dismissed_by_users')
            .select('id', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id);

          return {
            ...announcement,
            dismissal_count: count || 0,
          };
        })
      );

      setAnnouncements(announcementsWithStats);
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        target_audience: announcement.target_audience,
        start_date: new Date(announcement.start_date).toISOString().slice(0, 16),
        end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().slice(0, 16) : '',
        status: announcement.status,
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        target_audience: 'all',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        status: 'active',
      });
    }
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      setMessage({ type: 'error', text: 'العنوان والمحتوى مطلوبان' });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        title: formData.title,
        content: formData.content,
        target_audience: formData.target_audience,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.status,
        created_by: profile!.id,
      };

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(dataToSave)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'تم تحديث الرسالة بنجاح' });
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(dataToSave);

        if (error) throw error;
        setMessage({ type: 'success', text: 'تم إنشاء الرسالة بنجاح' });
      }

      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
        loadAnnouncements();
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الرسالة "${title}"؟\nسيتم حذفها نهائياً من جميع المستخدمين.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'تم حذف الرسالة بنجاح' });
      setTimeout(() => setMessage(null), 3000);
      await loadAnnouncements();
    } catch (err: any) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getAudienceText = (audience: string) => {
    switch (audience) {
      case 'all': return 'الجميع';
      case 'merchants': return 'التجار فقط';
      case 'customers': return 'العملاء فقط';
      default: return audience;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'نشطة' : 'محذوفة';
  };

  const isAnnouncementActive = (announcement: Announcement) => {
    if (announcement.status !== 'active') return false;
    const now = new Date();
    const start = new Date(announcement.start_date);
    const end = announcement.end_date ? new Date(announcement.end_date) : null;

    if (now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600 mb-6">هذه الصفحة متاحة للإداريين فقط</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-orange-500" />
            الرسائل العامة
          </h1>
          <p className="text-gray-600 mt-2">إدارة الإعلانات والرسائل للمستخدمين</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة رسالة جديدة
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجمهور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البدء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تم إخفاؤها</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    لا توجد رسائل
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{announcement.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{announcement.content}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getAudienceText(announcement.target_audience)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(announcement.start_date).toLocaleDateString('ar-SA')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {announcement.end_date
                          ? new Date(announcement.end_date).toLocaleDateString('ar-SA')
                          : 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusColor(announcement.status)}`}>
                          {getStatusText(announcement.status)}
                        </span>
                        {isAnnouncementActive(announcement) && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 w-fit">
                            قيد العرض
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{announcement.dismissal_count || 0} مستخدم</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(announcement)}
                          className="text-blue-600 hover:text-blue-800"
                          title="تعديل"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, announcement.title)}
                          className="text-red-600 hover:text-red-800"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAnnouncement ? 'تعديل الرسالة' : 'إضافة رسالة جديدة'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {message.text}
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الرسالة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="مثال: تحديثات جديدة في المنصة"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    محتوى الرسالة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="اكتب نص الرسالة هنا..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الجمهور المستهدف <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">الجميع</option>
                    <option value="merchants">التجار فقط</option>
                    <option value="customers">العملاء فقط</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ بدء الظهور <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ انتهاء الظهور
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">اتركه فارغاً للعرض الدائم</p>
                  </div>
                </div>

                {editingAnnouncement && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحالة
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="active">نشطة</option>
                      <option value="deleted">محذوفة</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {saving ? 'جاري الحفظ...' : editingAnnouncement ? 'حفظ التعديلات' : 'حفظ ونشر'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
