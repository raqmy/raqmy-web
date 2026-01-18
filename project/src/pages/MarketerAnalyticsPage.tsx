import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Calendar,
  BarChart3,
  Package,
  Link as LinkIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MarketerAnalyticsPageProps {
  marketerId: string;
  onNavigate: (page: string) => void;
}

export const MarketerAnalyticsPage: React.FC<MarketerAnalyticsPageProps> = ({
  marketerId,
  onNavigate,
}) => {
  const [marketer, setMarketer] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  useEffect(() => {
    fetchAnalytics();
  }, [marketerId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: marketerData } = await supabase
        .from('affiliate_marketers')
        .select('*')
        .eq('id', marketerId)
        .maybeSingle();

      if (!marketerData) {
        onNavigate('seller-dashboard');
        return;
      }

      setMarketer(marketerData);

      const { data: linksData } = await supabase
        .from('affiliate_links')
        .select(`
          *,
          product:products(id, name),
          store:stores(id, name)
        `)
        .eq('marketer_id', marketerId);

      if (linksData) {
        setLinks(linksData);

        const linkIds = linksData.map((l) => l.id);

        let dateFilter: any = {};
        if (timeRange !== 'all') {
          const days =
            timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          dateFilter = { clicked_at: `gte.${startDate.toISOString()}` };
        }

        const [{ data: clicksData }, { data: salesData }] = await Promise.all([
          supabase
            .from('affiliate_clicks')
            .select('*')
            .in('affiliate_link_id', linkIds)
            .order('clicked_at', { ascending: false }),
          supabase
            .from('affiliate_sales')
            .select('*')
            .in('affiliate_link_id', linkIds)
            .order('created_at', { ascending: false }),
        ]);

        if (clicksData) setClicks(clicksData);
        if (salesData) setSales(salesData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التحليلات...</p>
        </div>
      </div>
    );
  }

  if (!marketer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">المسوق غير موجود</h2>
          <button
            onClick={() => onNavigate('seller-dashboard')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.commission_amount), 0);
  const pendingRevenue = sales
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + parseFloat(s.commission_amount), 0);
  const paidRevenue = sales
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + parseFloat(s.commission_amount), 0);
  const conversionRate = clicks.length > 0 ? (sales.length / clicks.length) * 100 : 0;

  const clicksByDay = clicks.reduce((acc: any, click) => {
    const date = new Date(click.clicked_at).toLocaleDateString('ar-SA');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const salesByDay = sales.reduce((acc: any, sale) => {
    const date = new Date(sale.created_at).toLocaleDateString('ar-SA');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate('seller-dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>العودة</span>
          </button>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7days">آخر 7 أيام</option>
            <option value="30days">آخر 30 يوم</option>
            <option value="90days">آخر 90 يوم</option>
            <option value="all">الكل</option>
          </select>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{marketer.name}</h1>
              <p className="text-purple-100">تحليلات الأداء التفصيلية</p>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-6">
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              {marketer.commission_rate}% نسبة العمولة
            </span>
            <span
              className={`px-4 py-2 rounded-full text-sm ${
                marketer.is_active ? 'bg-green-500/30' : 'bg-red-500/30'
              }`}
            >
              {marketer.is_active ? 'نشط' : 'غير نشط'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">إجمالي النقرات</h3>
              <MousePointerClick className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{clicks.length}</p>
            <p className="text-sm text-gray-500 mt-1">من جميع الروابط</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">إجمالي المبيعات</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{sales.length}</p>
            <p className="text-sm text-gray-500 mt-1">عملية بيع ناجحة</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">الأرباح الكلية</h3>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">ريال سعودي</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">معدل التحويل</h3>
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {conversionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">من النقرات للمبيعات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">حالة العمولات</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">قيد الانتظار</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {pendingRevenue.toFixed(2)} ر.س
                  </p>
                </div>
                <div className="text-yellow-700">
                  {sales.filter((s) => s.status === 'pending').length} عملية
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">تم الدفع</p>
                  <p className="text-2xl font-bold text-green-700">
                    {paidRevenue.toFixed(2)} ر.س
                  </p>
                </div>
                <div className="text-green-700">
                  {sales.filter((s) => s.status === 'paid').length} عملية
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">روابط التسويق</h3>
            {links.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد روابط لهذا المسوق
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-mono font-semibold text-gray-900">{link.code}</p>
                        {link.product && (
                          <p className="text-sm text-gray-600">{link.product.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{link.clicks} نقرة</p>
                      <p className="text-sm font-semibold text-green-600">
                        {link.sales} مبيعة
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">آخر المبيعات</h3>
          {sales.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              لا توجد مبيعات بعد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      التاريخ
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      العمولة
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      النسبة
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(sale.created_at).toLocaleString('ar-SA')}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {parseFloat(sale.commission_amount).toFixed(2)} ر.س
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sale.commission_rate}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sale.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : sale.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : sale.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {sale.status === 'paid'
                            ? 'مدفوعة'
                            : sale.status === 'approved'
                            ? 'موافق عليها'
                            : sale.status === 'cancelled'
                            ? 'ملغاة'
                            : 'قيد الانتظار'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {Object.keys(clicksByDay).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">النقرات اليومية</h3>
            <div className="space-y-2">
              {Object.entries(clicksByDay)
                .slice(0, 7)
                .map(([date, count]: any) => (
                  <div key={date} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-600">{date}</div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full flex items-center justify-end px-3 text-white text-sm font-semibold"
                          style={{
                            width: `${Math.min(
                              (count / Math.max(...Object.values(clicksByDay))) * 100,
                              100
                            )}%`,
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
