import React, { useEffect, useState } from 'react';
import { ShoppingCart, Package, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Product } from '../lib/supabase';

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const [paypalData, setPaypalData] = useState({
    email: '',
    password: ''
  });

  const [formData, setFormData] = useState({
    shippingAddress: '',
    notes: ''
  });

  useEffect(() => {
    if (profile) fetchCartItems();
  }, [profile]);

  const fetchCartItems = async () => {
    try {
      const { data: cartData } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', profile!.id);

      if (!cartData || cartData.length === 0) {
        setCartItems([]);
        return;
      }

      const productIds = cartData.map(item => item.product_id);
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      const enriched = cartData.map(item => ({
        ...item,
        product: productsData?.find(p => p.id === item.product_id)
      }));

      setCartItems(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () =>
    cartItems.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity,
      0
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cartItems.length === 0) {
      setError('السلة فارغة');
      return;
    }

    setProcessing(true);

    try {
      /** ✅ الاستدعاء الصحيح */
      const { data: orderId, error: rpcError } = await supabase
        .rpc('create_order_from_cart');

      if (rpcError) throw rpcError;

      /** الانتقال لصفحة الدفع / النجاح */
      onNavigate(`payment-${orderId}`);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إنشاء الطلب. الرجاء المحاولة مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => onNavigate('marketplace')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          تصفح المنتجات
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex gap-2">
          <AlertCircle />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={processing}
        className="px-6 py-4 bg-blue-600 text-white rounded-lg flex items-center gap-2"
      >
        {processing ? 'جاري المعالجة...' : 'إتمام الدفع'}
        <CreditCard />
      </button>
    </form>
  );
};
