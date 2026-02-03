import React, { useEffect, useState } from 'react';
import { Shield, Plus, Edit, Trash2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminManagementPageProps {
  onNavigate: (page: string) => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export const AdminManagementPage: React.FC<AdminManagementPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (profile && profile.role === 'superadmin') {
      loadAdmins();
    }
  }, [profile]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users_profile')
        .select('id, name, email, role, created_at')
        .in('role', ['admin', 'superadmin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (err: any) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (admin?: AdminUser) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        email: admin.email,
        password: '',
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        password: '',
      });
    }
    setShowModal(true);
    setMessage(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) {
        throw new Error('الاسم والبريد الإلكتروني مطلوبان');
      }

      if (!editingAdmin && !formData.password) {
        throw new Error('كلمة المرور مطلوبة للمسؤول الجديد');
      }

      if (editingAdmin) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
        };

        const { error } = await supabase
          .from('users_profile')
          .update(updateData)
          .eq('id', editingAdmin.id);

        if (error) throw error;

        if (formData.password) {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            editingAdmin.id,
            { password: formData.password }
          );
          if (authError) {
            console.warn('Password update may require admin API access');
          }
        }

        setMessage({ type: 'success', text: 'تم تحديث بيانات المسؤول بنجاح' });
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users_profile')
            .update({ role: 'admin', name: formData.name })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }

        setMessage({ type: 'success', text: 'تمت إضافة المسؤول بنجاح' });
      }

      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
        loadAdmins();
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل الحفظ' });
    }
  };

  const handleDelete = async (adminId: string, adminEmail: string) => {
    if (adminId === profile?.id) {
      alert('لا يمكنك حذف حسابك الخاص');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف المسؤول ${adminEmail}؟`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users_profile')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'تم حذف المسؤول بنجاح' });
      setTimeout(() => setMessage(null), 3000);
      await loadAdmins();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('فشل الحذف: ' + err.message);
    }
  };

  if (profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600 mb-6">هذه الصفحة متاحة للمدير الرئيسي فقط</p>
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-orange-500" />
            إدارة حسابات المسؤولين
          </h1>
          <p className="text-gray-600 mt-2">إضافة وتعديل وحذف حسابات المسؤولين</p>
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
            إضافة مسؤول جديد
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإضافة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{admin.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{admin.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        admin.role === 'superadmin'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {admin.role === 'superadmin' ? 'مدير رئيسي' : 'مسؤول'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(admin.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(admin)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {admin.id !== profile?.id && admin.role !== 'superadmin' && (
                        <button
                          onClick={() => handleDelete(admin.id, admin.email)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingAdmin ? 'تعديل بيانات المسؤول' : 'إضافة مسؤول جديد'}
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
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="اسم المسؤول"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="admin@example.com"
                    disabled={!!editingAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور {!editingAdmin && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder={editingAdmin ? 'اتركه فارغاً إذا لم ترغب في تغييره' : 'كلمة المرور'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600"
                >
                  {editingAdmin ? 'حفظ التعديلات' : 'إضافة'}
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
