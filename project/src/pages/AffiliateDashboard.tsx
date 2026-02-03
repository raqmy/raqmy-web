import React, { useEffect, useState } from 'react';
import {
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Eye,
  ShoppingBag,
  Copy,
  Check,
  BarChart3,
  Package,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface AffiliateDashboardProps {
  onNavigate: (page: string) => void;
}

interface AffiliateLink {
  id: string;
  product_id: string;
  code: string;
  created_at: string;
  product?: Product;
}

interface AffiliateStats {
  totalClicks: number;
  totalSales: number;
  totalCommission: number;
  conversionRate: number;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'products'>('overview');
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalClicks: 0,
    totalSales: 0,
    totalCommission: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchAffiliateData();
    }
  }, [profile]);

  const fetchAffiliateData = async () => {
    try {
      const { data: linksData } = await supabase
        .from('affiliate_links')
        .select(`
          *,
          products(*)
        `)
        .eq('user_id', profile!.id);

      const { data: clicksData } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .in('affiliate_link_id', (linksData || []).map((l: any) => l.id));

      const { data: salesData } = await supabase
        .from('affiliate_sales')
        .select('commission_amount')
        .eq('affiliate_user_id', profile!.id);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('visibility', 'marketplace');

      const formattedLinks = linksData?.map((link: any) => ({
        ...link,
        product: link.products,
      })) || [];

      setAffiliateLinks(formattedLinks);
      setAvailableProducts(productsData || []);

      const totalClicks = clicksData?.length || 0;
      const totalSales = salesData?.length || 0;
      const totalCommission = salesData?.reduce((sum, sale) => sum + Number(sale.commission_amount), 0) || 0;
      const conversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;

      setStats({
        totalClicks,
        totalSales,
        totalCommission,
        conversionRate,
      });
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAffiliateLink = async (productId: string) => {
    try {
      const trackingCode = `AFF-${profile!.id.substring(0, 8)}-${productId.substring(0, 8)}-${Date.now()}`;

      const { data, error } = await supabase
        .from('affiliate_links')
        .insert({
          user_id: profile!.id,
          product_id: productId,
          code: trackingCode,
        })
        .select()
        .single();

      if (error) throw error;

      alert('تم إنشاء رابط التسويق بنجاح');
      await fetchAffiliateData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getAffiliateUrl = (code: string, productId: string) => {
    return `${window.location.origin}/?ref=${code}&product=${productId}`;
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة التسويق بالعمولة</h1>
          <p className="text-gray-600">مرحباً {profile?.name}، تتبع أرباحك من التسويق</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'links' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LinkIcon className="w-5 h-5" />
              <span>روابطي</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>المنتجات المتاحة</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stats.totalCommission.toFixed(2)} ريال
                </div>
                <p className="text-sm text-gray-600">إجمالي العمولات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalClicks}</div>
                <p className="text-sm text-gray-600">إجمالي النقرات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalSales}</div>
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stats.conversionRate.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">معدل التحويل</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">ابدأ التسويق الآن!</h2>
              <p className="text-blue-100 mb-6">
                {affiliateLinks.length === 0
                  ? 'اختر منتجاً وابدأ بالتسويق لتحقيق أرباح مستمرة'
                  : 'شارك روابطك واحصل على عمولة من كل عملية بيع'}
              </p>
              <button
                onClick={() => setActiveTab('products')}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                تصفح المنتجات المتاحة
              </button>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">روابط التسويق</h2>
              <p className="text-gray-600">جميع روابطك للتسويق بالعمولة</p>
            </div>

            {affiliateLinks.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد روابط</h3>
                <p className="text-gray-600 mb-6">ابدأ بإنشاء رابط تسويقي من المنتجات المتاحة</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {affiliateLinks.map((link) => (
                  <div key={link.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {link.product?.name || 'منتج'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          كود التتبع: {link.code}
                        </p>
                        <p className="text-xs text-gray-500">
                          تم الإنشاء: {new Date(link.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-blue-600 mb-1">
                          {link.product?.price} {link.product?.currency}
                        </div>
                        <p className="text-xs text-gray-500">سعر المنتج</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-600 break-all" dir="ltr">
                        {getAffiliateUrl(link.code, link.product_id)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            getAffiliateUrl(link.code, link.product_id),
                            link.code
                          )
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {copiedCode === link.code ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>نسخ الرابط</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onNavigate(`product-${link.product_id}`)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        عرض المنتج
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">المنتجات المتاحة للتسويق</h2>
              <p className="text-gray-600">اختر منتجاً وابدأ بالتسويق</p>
            </div>

            {availableProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد منتجات متاحة</h3>
                <p className="text-gray-600">لا توجد منتجات متاحة للتسويق حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableProducts.map((product) => {
                  const hasLink = affiliateLinks.some((link) => link.product_id === product.id);
                  return (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <Package className="w-12 h-12 text-blue-600" />
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                          {product.description || 'منتج رقمي عالي الجودة'}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-xl font-bold text-blue-600">
                            {product.price} {product.currency}
                          </div>
                          <div className="text-sm text-gray-600">{product.sales_count} مبيعات</div>
                        </div>
                        {hasLink ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                          >
                            لديك رابط بالفعل
                          </button>
                        ) : (
                          <button
                            onClick={() => createAffiliateLink(product.id)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            إنشاء رابط تسويقي
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
