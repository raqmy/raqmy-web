import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // الحصول على المستخدم من JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
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

    // جلب معلومات التاجر
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: 'حساب تاجر غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب المحفظة
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('merchant_id', merchant.id)
      .single();

    if (walletError) {
      return new Response(
        JSON.stringify({ error: 'فشل في جلب المحفظة' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // حساب متى ستتوفر المبالغ المحجوزة
    const { data: holdTransactions } = await supabase
      .from('transactions_log')
      .select('created_at, amount')
      .eq('merchant_id', merchant.id)
      .eq('type', 'hold')
      .gte('created_at', new Date(Date.now() - wallet.hold_period_hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    // حساب المبلغ المتوقع تحريره ومتى
    let nextReleaseAmount = 0;
    let nextReleaseAt = null;
    if (holdTransactions && holdTransactions.length > 0) {
      const oldestHold = holdTransactions[0];
      const releaseTime = new Date(oldestHold.created_at);
      releaseTime.setHours(releaseTime.getHours() + wallet.hold_period_hours);
      nextReleaseAmount = oldestHold.amount;
      nextReleaseAt = releaseTime.toISOString();
    }

    // جلب طلبات السحب الأخيرة
    const { data: recentPayouts } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('requested_at', { ascending: false })
      .limit(5);

    // جلب آخر معاملات
    const { data: recentTransactions } = await supabase
      .from('transactions_log')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        wallet: {
          balance_total: wallet.balance_total,
          balance_available: wallet.balance_available,
          balance_hold: wallet.balance_hold,
          balance_pending_payout: wallet.balance_pending_payout,
          total_earned: wallet.total_earned,
          total_withdrawn: wallet.total_withdrawn,
          currency: wallet.currency,
          hold_period_hours: wallet.hold_period_hours,
          last_payout_at: wallet.last_payout_at,
          next_release: {
            amount: nextReleaseAmount,
            at: nextReleaseAt
          }
        },
        merchant: {
          kyc_status: merchant.kyc_status,
          can_withdraw: merchant.can_withdraw,
          withdrawal_blocked_until: merchant.withdrawal_blocked_until
        },
        recent_payouts: recentPayouts || [],
        recent_transactions: recentTransactions || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});