import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'يجب تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'غير مصرح - مطلوب صلاحيات إدارية' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payout_id, reason } = await req.json();

    if (!payout_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'معرف طلب السحب وسبب الرفض مطلوبين' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: payout, error: fetchError } = await supabase
      .from('payout_requests')
      .select(`
        *,
        wallet:wallets!payout_requests_merchant_id_fkey(*)
      `)
      .eq('id', payout_id)
      .single();

    if (fetchError || !payout) {
      return new Response(
        JSON.stringify({ error: 'طلب السحب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payout.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'لا يمكن رفض طلب بهذه الحالة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: now.toISOString(),
        rejection_reason: reason
      })
      .eq('id', payout_id);

    if (updateError) throw updateError;

    const { error: walletError } = await supabase
      .from('wallets')
      .update({
        balance_available: payout.wallet.balance_available + payout.amount_requested,
        balance_pending_payout: payout.wallet.balance_pending_payout - payout.amount_requested
      })
      .eq('merchant_id', payout.merchant_id);

    if (walletError) throw walletError;

    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: payout.wallet.id,
        type: 'payout_rejected',
        amount: payout.amount_requested,
        balance_after: payout.wallet.balance_available + payout.amount_requested,
        description: 'إرجاع مبلغ طلب سحب مرفوض',
        metadata: { payout_id, reason }
      });

    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'payout_rejected',
        resource_type: 'payout_request',
        resource_id: payout_id,
        details: { merchant_id: payout.merchant_id, amount: payout.amount_requested, reason },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم رفض طلب السحب وإرجاع المبلغ'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في رفض طلب السحب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});