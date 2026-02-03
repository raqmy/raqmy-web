import React, { useEffect, useState } from 'react';
import { Settings, Plus, Edit, Trash2, AlertCircle, CheckCircle, Power, TestTube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminVerificationApisPageProps {
  onNavigate: (page: string) => void;
}

interface ApiProvider {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'bank';
  config: any;
  is_active: boolean;
  is_test_mode: boolean;
  rate_limits?: any;
  retry_policy?: any;
  allowed_countries?: string[];
  created_at: string;
}

export const AdminVerificationApisPage: React.FC<AdminVerificationApisPageProps> = ({ onNavigate }) => {
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email' | 'bank'>('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'sms' as 'sms' | 'email' | 'bank',
    is_active: false,
    is_test_mode: true,
    api_key: '',
    api_secret: '',
    sender_id: '',
    from_email: '',
    from_name: '',
  });

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      loadProviders();
    }
  }, [profile, filterType]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-providers`;
      const url = filterType !== 'all' ? `${apiUrl}?type=${filterType}` : apiUrl;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setProviders(result.providers || []);
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (provider?: ApiProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        type: provider.type,
        is_active: provider.is_active,
        is_test_mode: provider.is_test_mode,
        api_key: provider.config?.api_key || '',
        api_secret: provider.config?.api_secret || '',
        sender_id: provider.config?.sender_id || '',
        from_email: provider.config?.from_email || '',
        from_name: provider.config?.from_name || '',
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        type: 'sms',
        is_active: false,
        is_test_mode: true,
        api_key: '',
        api_secret: '',
        sender_id: '',
        from_email: '',
        from_name: '',
      });
    }
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.api_key) {
        throw new Error('الاسم ومفتاح API مطلوبان');
      }

      const config: any = {
        api_key: formData.api_key,
      };

      if (formData.api_secret) config.api_secret = formData.api_secret;
      if (formData.type === 'sms' && formData.sender_id) config.sender_id = formData.sender_id;
      if (formData.type === 'email') {
        config.from_email = formData.from_email;
        config.from_name = formData.from_name;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-providers`;
      const url = editingProvider ? `${apiUrl}?id=${editingProvider.id}` : apiUrl;
      const method = editingProvider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          config,
          is_active: formData.is_active,
          is_test_mode: formData.is_test_mode,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({
        type: 'success',
        text: editingProvider ? 'تم تحديث المزود بنجاح' : 'تمت إضافة المزود بنجاح'
      });

      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
        loadProviders();
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل الحفظ' });
    }
  };

  const handleToggleActive = async (provider: ApiProvider) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-providers?id=${provider.id}`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !provider.is_active,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({
        type: 'success',
        text: provider.is_active ? 'تم تعطيل المزود' : 'تم تفعيل المزود'
      });
      setTimeout(() => setMessage(null), 3000);
      await loadProviders();
    } catch (err: any) {
      console.error('Toggle error:', err);
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (providerId: string, providerName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المزود ${providerName}؟`)) {
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-providers?id=${providerId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setMessage({ type: 'success', text: 'تم حذف المزود بنجاح' });
      setTimeout(() => setMessage(null), 3000);
      await loadProviders();
    } catch (err: any) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sms': return 'رسائل SMS';
      case 'email': return 'البريد الإلكتروني';
      case 'bank': return 'التحويلات البنكية';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8 text-orange-500" />
            إدارة مزودي خدمات التحقق
          </h1>
          <p className="text-gray-600 mt-2">إضافة وتعديل مزودي خدمات SMS والبريد الإلكتروني والتحويلات البنكية</p>
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

        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterType === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType('sms')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterType === 'sms'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              SMS
            </button>
            <button
              onClick={() => setFilterType('email')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterType === 'email'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setFilterType('bank')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                filterType === 'bank'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Bank
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة مزود جديد
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المزود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوضع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإضافة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    لا توجد مزودات خدمة
                  </td>
                </tr>
              ) : (
                providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{provider.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getTypeLabel(provider.type)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(provider)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          provider.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {provider.is_active ? 'نشط' : 'معطل'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                          provider.is_test_mode
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <TestTube className="w-3 h-3" />
                        {provider.is_test_mode ? 'اختبار' : 'إنتاج'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(provider.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(provider)}
                          className="text-blue-600 hover:text-blue-800"
                          title="تعديل"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(provider.id, provider.name)}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingProvider ? 'تعديل المزود' : 'إضافة مزود جديد'}
              </h2>

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
                    اسم المزود <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="مثال: Twilio SMS"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الخدمة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    disabled={!!editingProvider}
                  >
                    <option value="sms">رسائل SMS</option>
                    <option value="email">البريد الإلكتروني</option>
                    <option value="bank">التحويلات البنكية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مفتاح API <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="API Key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    السر (API Secret)
                  </label>
                  <input
                    type="password"
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    placeholder="API Secret (اختياري)"
                  />
                </div>

                {formData.type === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      معرف المرسل (Sender ID)
                    </label>
                    <input
                      type="text"
                      value={formData.sender_id}
                      onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="مثال: RAQMI"
                    />
                  </div>
                )}

                {formData.type === 'email' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني للمرسل
                      </label>
                      <input
                        type="email"
                        value={formData.from_email}
                        onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="noreply@raqmi.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المرسل
                      </label>
                      <input
                        type="text"
                        value={formData.from_name}
                        onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="منصة رقمي"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">نشط</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_test_mode}
                      onChange={(e) => setFormData({ ...formData, is_test_mode: e.target.checked })}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">وضع الاختبار</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600"
                >
                  {editingProvider ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
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
