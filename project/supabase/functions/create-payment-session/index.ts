import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentSessionRequest {
  orderId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId }: PaymentSessionRequest = await req.json();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      throw new Error('Order already paid');
    }

    const { data: settings } = await supabase
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings?.is_active) {
      throw new Error('Payment system is not active');
    }

    const platformFee = Math.round(
      (order.total_amount * (settings.global_commission_percentage || 0)) / 100 * 100
    ) / 100;
    const sellerAmount = order.total_amount - platformFee;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: user.id,
        seller_id: order.seller_id,
        amount_total: order.total_amount,
        platform_fee: platformFee,
        gateway_fee: 0,
        seller_amount: sellerAmount,
        commission_rate_used: settings.global_commission_percentage,
        provider: 'paymob',
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error('Failed to create payment record');
    }

    const { data: paymobConfig, error: keysError } = await supabase
      .from('payment_provider_keys')
      .select('api_key, integration_id, hmac_secret')
      .eq('provider', 'paymob')
      .eq('is_active', true)
      .maybeSingle();

    if (keysError || !paymobConfig) {
      throw new Error('Paymob keys not configured. Please add keys in payment settings.');
    }

    if (!paymobConfig.api_key || !paymobConfig.integration_id || !paymobConfig.hmac_secret) {
      throw new Error('Incomplete Paymob configuration');
    }

    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: paymobConfig.api_key,
      }),
    });

    const authData = await authResponse.json();
    if (!authData.token) {
      throw new Error('Failed to get Paymob auth token');
    }

    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authData.token,
        delivery_needed: false,
        amount_cents: Math.round(order.total_amount * 100),
        currency: 'SAR',
        merchant_order_id: orderId,
        items: [],
      }),
    });

    const orderData = await orderResponse.json();
    if (!orderData.id) {
      throw new Error('Failed to create Paymob order');
    }

    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authData.token,
        amount_cents: Math.round(order.total_amount * 100),
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          email: order.customer_email,
          first_name: order.customer_name.split(' ')[0],
          last_name: order.customer_name.split(' ').slice(1).join(' ') || 'Customer',
          phone_number: order.customer_phone,
          country: 'SA',
          city: 'Riyadh',
          street: 'NA',
          building: 'NA',
          floor: 'NA',
          apartment: 'NA',
        },
        currency: 'SAR',
        integration_id: parseInt(paymobConfig.integration_id),
      }),
    });

    const paymentKeyData = await paymentKeyResponse.json();
    if (!paymentKeyData.token) {
      throw new Error('Failed to get payment key');
    }

    const iframeId = paymobConfig.integration_id;
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKeyData.token}`;

    await supabase
      .from('payments')
      .update({
        provider_reference: orderData.id.toString(),
        provider_payment_url: paymentUrl,
      })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_url: paymentUrl,
        token: paymentKeyData.token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Payment session error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});