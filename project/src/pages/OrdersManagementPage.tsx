import React, { useEffect, useState } from 'react';
import { Package, Eye, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface OrdersManagementPageProps {
  onNavigate: (page: string) => void;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  created_at: string;
  payment_reference: string;
  buyer?: {
    id: string;
    name: string;
    email: string;
  };
  items_count?: number;
}

export const OrdersManagementPage: React.FC<OrdersManagementPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'completed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    if (profile) {
      fetchOrders();
    }
  }, [profile]);

  const fetchOrders = async () => {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', profile!.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        const buyerIds = [...new Set(ordersData.map(o => o.user_id))];
        const { data: usersData } = await supabase
          .from('users_profile')
          .select('id, name, email')
          .in('id', buyerIds);

        const enrichedOrders = await Promise.all(
          ordersData.map(async (order) => {
            const { data: itemsData } = await supabase
              .from('order_items')
              .select('id')
              .eq('order_id', order.id);

            return {
              ...order,
              buyer: usersData?.find(u => u.id === order.user_id),
              items_count: itemsData?.length || 0
            };
          })
        );

        setOrders(enrichedOrders);

        const totalOrders = enrichedOrders.length;
        const totalRevenue = enrichedOrders
          .filter(o => o.status === 'paid' || o.status === 'completed')
          .reduce((sum, o) => sum + Number(o.total_amount), 0);
        const pendingOrders = enrichedOrders.filter(o => o.status === 'pending' || o.status === 'paid').length;
        const completedOrders = enrichedOrders.filter(o => o.status === 'completed').length;

        setStats({ totalOrders, totalRevenue, pendingOrders, completedOrders });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'failed':
        return 'فشل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الطلبات</h1>
          <p className="text-gray-600">تتبع وإدارة جميع طلبات عملائك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalOrders}</div>
            <p className="text-sm text-gray-600">إجمالي الطلبات</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalRevenue.toFixed(2)} ريال</div>
            <p className="text-sm text-gray-600">إجمالي الأرباح</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingOrders}</div>
            <p className="text-sm text-gray-600">طلبات قيد المعالجة</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.completedOrders}</div>
            <p className="text-sm text-gray-600">طلبات مكتملة</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              الكل ({orders.length})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'paid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              مدفوعة ({orders.filter((o) => o.status === 'paid').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'completed' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              مكتملة ({orders.filter((o) => o.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              قيد الانتظار ({orders.filter((o) => o.status === 'pending').length})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-600">لم يتم استلام أي طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        طلب #{order.order_number}
                      </h3>
                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">العميل</p>
                        <p className="font-semibold text-gray-900">{order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">الهاتف</p>
                        <p className="font-semibold text-gray-900" dir="ltr">{order.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">التاريخ</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(order.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600 mb-1">المبلغ الإجمالي</p>
                    <p className="text-2xl font-bold text-blue-600">{order.total_amount.toFixed(2)} ريال</p>
                    <p className="text-xs text-gray-500 mt-1">{order.items_count} منتج</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض التفاصيل</span>
                  </button>
                  {order.status === 'paid' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>تأكيد الإكمال</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">تفاصيل الطلب</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">معلومات الطلب</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">رقم الطلب</p>
                      <p className="font-semibold">{selectedOrder.order_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">الحالة</p>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span>{getStatusText(selectedOrder.status)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">اسم العميل</p>
                      <p className="font-semibold">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">البريد الإلكتروني</p>
                      <p className="font-semibold" dir="ltr">{selectedOrder.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">رقم الهاتف</p>
                      <p className="font-semibold" dir="ltr">{selectedOrder.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">المبلغ الإجمالي</p>
                      <p className="font-semibold text-blue-600">{selectedOrder.total_amount.toFixed(2)} ريال</p>
                    </div>
                  </div>
                </div>

                {selectedOrder.shipping_address && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">عنوان الشحن</h3>
                    <p className="text-gray-700">{selectedOrder.shipping_address}</p>
                  </div>
                )}

                {selectedOrder.payment_reference && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">رقم مرجع الدفع</h3>
                    <p className="text-sm font-mono text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedOrder.payment_reference}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedOrder.status === 'paid' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      تأكيد إتمام الطلب
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
