import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function verifyPaymobSignature(payload: any, hmacKey: string): boolean {
  try {
    const {
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      id,
      integration_id,
      is_3d_secure,
      is_auth,
      is_capture,
      is_refunded,
      is_standalone_payment,
      is_voided,
      order,
      owner,
      pending,
      source_data_pan,
      source_data_sub_type,
      source_data_type,
      success,
    } = payload.obj;

    const concatenatedString = [
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      id,
      integration_id,
      is_3d_secure,
      is_auth,
      is_capture,
      is_refunded,
      is_standalone_payment,
      is_voided,
      order?.id || order,
      owner,
      pending,
      source_data_pan,
      source_data_sub_type,
      source_data_type,
      success,
    ].join('');

    const hash = createHmac('sha512', hmacKey)
      .update(concatenatedString)
      .digest('hex');

    return hash === payload.hmac;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let webhookLogId: string | null = null;

  try {
    const payload = await req.json();

    // Create webhook log
    const { data: webhookLog } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'paymob',
        event_type: payload.type || 'transaction',
        raw_payload: payload,
        status: 'pending',
      })
      .select()
      .single();

    webhookLogId = webhookLog?.id;

    // Get HMAC key
    const { data: hmacKeyData } = await supabase
      .from('payment_provider_keys')
      .select('key_value')
      .eq('provider', 'paymob')
      .eq('key_name', 'hmac_key')
      .single();

    if (!hmacKeyData) {
      throw new Error('HMAC key not found');
    }

    // Verify signature
    if (!verifyPaymobSignature(payload, hmacKeyData.key_value)) {
      throw new Error('Invalid signature');
    }

    const transaction = payload.obj;
    const orderId = transaction.order?.merchant_order_id || transaction.order;

    if (!orderId) {
      throw new Error('Order ID not found in payload');
    }

    // Get payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*, orders!inner(*)')
      .eq('orders.id', orderId)
      .single();

    if (!payment) {
      throw new Error(`Payment not found for order: ${orderId}`);
    }

    // Process based on transaction success
    if (transaction.success === true && !transaction.pending) {
      // Payment successful
      const { error: processError } = await supabase.rpc('process_successful_payment', {
        p_payment_id: payment.id,
        p_provider_transaction_id: transaction.id.toString(),
        p_completed_at: new Date().toISOString(),
      });

      if (processError) {
        throw processError;
      }

      // Update webhook log
      await supabase
        .from('webhook_logs')
        .update({
          status: 'success',
          processed_at: new Date().toISOString(),
          parsed_data: {
            payment_id: payment.id,
            order_id: orderId,
            transaction_id: transaction.id,
            amount: transaction.amount_cents / 100,
          },
        })
        .eq('id', webhookLogId);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (transaction.success === false || transaction.error_occured === 'true') {
      // Payment failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          metadata: { error: transaction, updated_at: new Date().toISOString() },
        })
        .eq('id', payment.id);

      await supabase
        .from('orders')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      await supabase
        .from('webhook_logs')
        .update({
          status: 'success',
          processed_at: new Date().toISOString(),
          parsed_data: {
            payment_id: payment.id,
            order_id: orderId,
            status: 'failed',
          },
        })
        .eq('id', webhookLogId);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment failure recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (transaction.pending === true) {
      // Payment pending
      await supabase
        .from('payments')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      await supabase
        .from('webhook_logs')
        .update({
          status: 'success',
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLogId);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);

    if (webhookLogId) {
      await supabase
        .from('webhook_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLogId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
