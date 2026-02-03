import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, AlertCircle, TestTube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PaymentSettingsPageProps {
  onNavigate: (page: string) => void;
}

export const PaymentSettingsPage: React.FC<PaymentSettingsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    api_key: '',
    integration_id: '',
    hmac_secret: '',
  });

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      loadKeys();
    }
  }, [profile]);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_provider_keys')
        .select('*')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          api_key: data.api_key || '',
          integration_id: data.integration_id || '',
          hmac_secret: data.hmac_secret || '',
        });
      }
    } catch (err: any) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: 'خطأ في تحميل الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!formData.api_key || !formData.integration_id || !formData.hmac_secret) {
        throw new Error('جميع الحقول مطلوبة');
      }

      const { data: existing } = await supabase
        .from('payment_provider_keys')
        .select('id')
        .eq('provider', 'paymob')
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('payment_provider_keys')
          .update({
            api_key: formData.api_key.trim(),
            integration_id: formData.integration_id.trim(),
            hmac_secret: formData.hmac_secret.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_provider_keys')
          .insert({
            provider: 'paymob',
            api_key: formData.api_key.trim(),
            integration_id: formData.integration_id.trim(),
            hmac_secret: formData.hmac_secret.trim(),
            is_active: true,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'تم حفظ إعدادات الدفع بنجاح' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: err.message || 'فشل حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);

    try {
      if (!formData.api_key || !formData.integration_id || !formData.hmac_secret) {
        throw new Error('يرجى إدخال جميع الحقول أولاً');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('غير مصرح');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-paymob-connection`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: formData.api_key.trim(),
          integration_id: formData.integration_id.trim(),
          hmac_secret: formData.hmac_secret.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '✔ تعمل - المفاتيح صحيحة!' });
      } else {
        setMessage({ type: 'error', text: `✘ المفاتيح خاطئة - ${result.error || 'خطأ في الاتصال'}` });
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setMessage({ type: 'error', text: `✘ المفاتيح خاطئة - ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600 mb-6">هذه الصفحة متاحة للمشرفين فقط</p>
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
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8 text-orange-500" />
            إعدادات بوابة الدفع Paymob
          </h1>
          <p className="text-gray-600 mt-2">قم بإدخال مفاتيح Paymob API الخاصة بمنصتك</p>
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAYMOB_API_KEY <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="أدخل API Key من Paymob"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAYMOB_INTEGRATION_ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.integration_id}
                onChange={(e) => setFormData({ ...formData, integration_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="أدخل Integration ID"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAYMOB_HMAC_SECRET <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.hmac_secret}
                onChange={(e) => setFormData({ ...formData, hmac_secret: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="أدخل HMAC Secret"
                dir="ltr"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                💡 <strong>كيفية الحصول على المفاتيح:</strong>
              </p>
              <p className="text-sm text-blue-600 mt-1">
                1. سجّل الدخول إلى لوحة تحكم Paymob<br />
                2. اذهب إلى Settings → API Keys<br />
                3. انسخ المفاتيح الثلاثة وألصقها هنا
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">اختبار الاتصال</h2>
          <p className="text-sm text-gray-600 mb-4">
            تحقق من صحة المفاتيح عن طريق إجراء اتصال تجريبي مع Paymob
          </p>
          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            <TestTube className="w-5 h-5" />
            {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </button>
        </div>
      </div>
    </div>
  );
};
