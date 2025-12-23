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

    const { payout_id, notes } = await req.json();

    if (!payout_id) {
      return new Response(
        JSON.stringify({ error: 'معرف طلب السحب مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: payout, error: fetchError } = await supabase
      .from('payout_requests')
      .select(`
        *,
        merchant:merchants!payout_requests_merchant_id_fkey(*),
        bank_account:bank_accounts!payout_requests_bank_account_id_fkey(*),
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
        JSON.stringify({ error: 'لا يمكن قبول طلب بهذه الحالة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'processing',
        approved_by: user.id,
        approved_at: now.toISOString(),
        admin_notes: notes || null
      })
      .eq('id', payout_id);

    if (updateError) throw updateError;

    const { data: activeProvider } = await supabase
      .from('api_providers')
      .select('*')
      .eq('type', 'bank')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeProvider) {
      await supabase
        .from('payout_requests')
        .update({
          status: 'paid',
          paid_at: now.toISOString(),
          admin_notes: (notes || '') + ' (وضع الاختبار - لا يوجد مزود بنكي)'
        })
        .eq('id', payout_id);

      await supabase
        .from('wallets')
        .update({
          balance_pending_payout: payout.wallet.balance_pending_payout - payout.amount_requested
        })
        .eq('merchant_id', payout.merchant_id);

      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: payout.wallet.id,
          type: 'payout',
          amount: -payout.amount_to_transfer,
          balance_after: payout.wallet.balance_pending_payout - payout.amount_requested,
          description: 'سحب مبلغ إلى الحساب البنكي (وضع الاختبار)',
          metadata: { payout_id, test_mode: true }
        });

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'payout_approved_test',
          resource_type: 'payout_request',
          resource_id: payout_id,
          details: { merchant_id: payout.merchant_id, amount: payout.amount_requested, test_mode: true },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم قبول وتنفيذ طلب السحب (وضع الاختبار)',
          test_mode: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('webhook_logs')
      .insert({
        provider_id: activeProvider.id,
        webhook_type: 'outgoing',
        payload: {
          bank_account: payout.bank_account,
          amount: payout.amount_to_transfer,
          currency: payout.currency,
          reference: payout_id
        },
        response: { status: 'processing' },
        status: 'success'
      });

    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'payout_approved',
        resource_type: 'payout_request',
        resource_id: payout_id,
        details: { merchant_id: payout.merchant_id, amount: payout.amount_requested },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم قبول طلب السحب وإرساله للمزود البنكي'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في قبول طلب السحب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});