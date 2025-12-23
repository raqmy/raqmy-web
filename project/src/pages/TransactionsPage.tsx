import React, { useEffect, useState } from 'react';
import { Receipt, Filter, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TransactionsPageProps {
  onNavigate: (page: string) => void;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  platform_fee: number;
  merchant_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  merchant_name?: string;
  product_name?: string;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [stats, setStats] = useState({
    total: 0,
    platformFees: 0,
    merchantAmount: 0,
  });

  useEffect(() => {
    if (profile) {
      loadTransactions();
    }
  }, [profile, filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('payments')
        .select(`
          *,
          orders!inner(
            *,
            products(name),
            stores(merchant_id, users_profile(name))
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        query = query.eq('orders.stores.merchant_id', profile!.id);
      }

      const now = new Date();
      let startDate: Date | null = null;

      if (filter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (filter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (filter === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        type: item.orders?.subscription_id ? 'subscription' : 'product',
        amount: item.amount,
        platform_fee: item.platform_fee || 0,
        merchant_amount: item.merchant_amount || 0,
        payment_method: item.payment_method || 'paymob',
        status: item.status,
        created_at: item.created_at,
        merchant_name: item.orders?.stores?.users_profile?.name || 'غير معروف',
        product_name: item.orders?.products?.name || item.orders?.subscription_id || 'غير محدد',
      }));

      setTransactions(formatted);

      const total = formatted.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const platformFees = formatted.reduce((sum: number, t: Transaction) => sum + t.platform_fee, 0);
      const merchantAmount = formatted.reduce((sum: number, t: Transaction) => sum + t.merchant_amount, 0);

      setStats({ total, platformFees, merchantAmount });
    } catch (err: any) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

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
            <Receipt className="w-8 h-8 text-orange-500" />
            المعاملات المالية
          </h1>
          <p className="text-gray-600 mt-2">جميع عمليات الدفع والمعاملات المالية</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">إجمالي المبالغ</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total.toFixed(2)} ريال</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">نصيب المنصة</p>
            <p className="text-2xl font-bold text-orange-600">{stats.platformFees.toFixed(2)} ريال</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">نصيب التجار</p>
            <p className="text-2xl font-bold text-green-600">{stats.merchantAmount.toFixed(2)} ريال</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 items-center">
          <Filter className="w-5 h-5 text-gray-600" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'today' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'week' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            الأسبوع
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'month' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            الشهر
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد معاملات</h3>
            <p className="text-gray-600">لم تتم أي عمليات دفع في الفترة المحددة</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم العملية</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                    {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاجر</th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نصيب المنصة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نصيب التاجر</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وسيلة الدفع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-gray-600">
                          #{transaction.id.substring(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === 'subscription'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {transaction.type === 'subscription' ? 'اشتراك' : 'منتج'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{transaction.product_name}</span>
                      </td>
                      {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{transaction.merchant_name}</span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {transaction.amount.toFixed(2)} ريال
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-orange-600 font-medium">
                          {transaction.platform_fee.toFixed(2)} ريال
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-green-600 font-medium">
                          {transaction.merchant_amount.toFixed(2)} ريال
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">Paymob</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
