import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  Percent,
  DollarSign,
  Package,
  Store as StoreIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CouponsManagementPageProps {
  onNavigate: (page: string) => void;
}

export const CouponsManagementPage: React.FC<CouponsManagementPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchCoupons();
    }
  }, [user]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const enrichedCoupons = await Promise.all(
          data.map(async (coupon) => {
            let productCount = 0;
            let storeCount = 0;

            if (coupon.apply_to === 'specific_products') {
              const { count } = await supabase
                .from('coupon_products')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id);
              productCount = count || 0;
            } else if (coupon.apply_to === 'specific_stores') {
              const { count } = await supabase
                .from('coupon_stores')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id);
              storeCount = count || 0;
            }

            return {
              ...coupon,
              productCount,
              storeCount,
            };
          })
        );

        setCoupons(enrichedCoupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;

    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('حدث خطأ أثناء حذف الكوبون');
    }
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && coupon.is_active) ||
      (filterStatus === 'inactive' && !coupon.is_active);
    return matchesSearch && matchesFilter;
  });

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة أكواد الخصم</h1>
          <p className="text-gray-600">أنشئ وأدر أكواد الخصم لمنتجاتك</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ابحث عن كوبون..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الكوبونات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>كوبون جديد</span>
              </button>
            </div>
          </div>
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد أكواد خصم</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'لم يتم العثور على أكواد خصم مطابقة'
                : 'ابدأ بإنشاء كود خصم جديد'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                إنشاء كوبون
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900 font-mono">
                          {coupon.code}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            coupon.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {coupon.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-4 h-4" />
                              <span>{coupon.discount_value}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" />
                              <span>{coupon.discount_value} ريال</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">•</div>
                        <div className="text-sm text-gray-600">
                          استخدم {coupon.used_count}
                          {coupon.usage_limit && ` من ${coupon.usage_limit}`} مرة
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingCoupon(coupon)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">نطاق التطبيق</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      {coupon.apply_to === 'all' && (
                        <>
                          <Package className="w-4 h-4" />
                          <span>جميع المنتجات</span>
                        </>
                      )}
                      {coupon.apply_to === 'specific_products' && (
                        <>
                          <Package className="w-4 h-4" />
                          <span>{coupon.productCount} منتج</span>
                        </>
                      )}
                      {coupon.apply_to === 'specific_stores' && (
                        <>
                          <StoreIcon className="w-4 h-4" />
                          <span>{coupon.storeCount} متجر</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">تاريخ البداية</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(coupon.start_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</div>
                    <div className="text-sm font-medium text-gray-900">
                      {coupon.end_date
                        ? new Date(coupon.end_date).toLocaleDateString('ar-SA')
                        : 'غير محدد'}
                    </div>
                  </div>
                </div>

                {(coupon.min_purchase_amount > 0 || coupon.max_discount_amount) && (
                  <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
                    {coupon.min_purchase_amount > 0 && (
                      <div className="text-sm text-gray-600">
                        حد أدنى: {coupon.min_purchase_amount} ريال
                      </div>
                    )}
                    {coupon.max_discount_amount && (
                      <div className="text-sm text-gray-600">
                        حد أقصى للخصم: {coupon.max_discount_amount} ريال
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateModal || editingCoupon) && (
        <CouponFormModal
          coupon={editingCoupon}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCoupon(null);
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
};

interface CouponFormModalProps {
  coupon?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const CouponFormModal: React.FC<CouponFormModalProps> = ({ coupon, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || '',
    min_purchase_amount: coupon?.min_purchase_amount || '',
    max_discount_amount: coupon?.max_discount_amount || '',
    usage_limit: coupon?.usage_limit || '',
    start_date: coupon?.start_date
      ? new Date(coupon.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    end_date: coupon?.end_date
      ? new Date(coupon.end_date).toISOString().split('T')[0]
      : '',
    is_active: coupon?.is_active ?? true,
    apply_to: coupon?.apply_to || 'all',
  });

  useEffect(() => {
    fetchUserData();
    if (coupon) {
      fetchCouponRelations();
    }
  }, [coupon]);

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

  const fetchCouponRelations = async () => {
    if (!coupon) return;

    try {
      if (coupon.apply_to === 'specific_products') {
        const { data } = await supabase
          .from('coupon_products')
          .select('product_id')
          .eq('coupon_id', coupon.id);
        if (data) setSelectedProducts(data.map((p) => p.product_id));
      } else if (coupon.apply_to === 'specific_stores') {
        const { data } = await supabase
          .from('coupon_stores')
          .select('store_id')
          .eq('coupon_id', coupon.id);
        if (data) setSelectedStores(data.map((s) => s.store_id));
      }
    } catch (error) {
      console.error('Error fetching coupon relations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const couponData = {
        user_id: user?.id,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        apply_to: formData.apply_to,
      };

      let couponId = coupon?.id;

      if (coupon) {
        const { error: updateError } = await supabase
          .from('discount_coupons')
          .update(couponData)
          .eq('id', coupon.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('discount_coupons')
          .insert(couponData)
          .select()
          .single();
        if (insertError) throw insertError;
        couponId = data.id;
      }

      if (formData.apply_to === 'specific_products') {
        await supabase.from('coupon_products').delete().eq('coupon_id', couponId);
        if (selectedProducts.length > 0) {
          await supabase.from('coupon_products').insert(
            selectedProducts.map((productId) => ({
              coupon_id: couponId,
              product_id: productId,
            }))
          );
        }
      } else if (formData.apply_to === 'specific_stores') {
        await supabase.from('coupon_stores').delete().eq('coupon_id', couponId);
        if (selectedStores.length > 0) {
          await supabase.from('coupon_stores').insert(
            selectedStores.map((storeId) => ({
              coupon_id: couponId,
              store_id: storeId,
            }))
          );
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ الكوبون');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {coupon ? 'تعديل كوبون الخصم' : 'إنشاء كوبون جديد'}
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
                كود الخصم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الخصم <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ريال)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                قيمة الخصم <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد مرات الاستخدام
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="غير محدود"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للشراء (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) =>
                  setFormData({ ...formData, min_purchase_amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى للخصم (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.max_discount_amount}
                onChange={(e) =>
                  setFormData({ ...formData, max_discount_amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="غير محدود"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البداية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الانتهاء
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <option value="all">جميع منتجاتي</option>
              <option value="specific_products">منتجات محددة</option>
              <option value="specific_stores">متاجر محددة</option>
            </select>
          </div>

          {formData.apply_to === 'specific_products' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر المنتجات
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(
                            selectedProducts.filter((id) => id !== product.id)
                          );
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>{product.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.apply_to === 'specific_stores' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر المتاجر
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStores([...selectedStores, store.id]);
                        } else {
                          setSelectedStores(selectedStores.filter((id) => id !== store.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>{store.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
              الكوبون نشط
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
              {loading ? 'جاري الحفظ...' : coupon ? 'حفظ التغييرات' : 'إنشاء الكوبون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
