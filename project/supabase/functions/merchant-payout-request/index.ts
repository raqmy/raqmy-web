import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PayoutRequest {
  amount: number;
  bank_account_id: string;
  note?: string;
}

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

    const { amount, bank_account_id, note }: PayoutRequest = await req.json();

    if (!amount || !bank_account_id) {
      return new Response(
        JSON.stringify({ error: 'المبلغ والحساب البنكي مطلوبان' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب التاجر
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

    // التحقق من KYC
    if (merchant.kyc_status !== 'verified') {
      return new Response(
        JSON.stringify({ error: 'يجب التحقق من الهوية أولاً' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من إمكانية السحب
    if (!merchant.can_withdraw) {
      return new Response(
        JSON.stringify({ 
          error: 'السحب غير متاح',
          reason: merchant.withdrawal_block_reason,
          blocked_until: merchant.withdrawal_blocked_until
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (merchant.withdrawal_blocked_until && new Date(merchant.withdrawal_blocked_until) > new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'السحب محظور مؤقتاً',
          blocked_until: merchant.withdrawal_blocked_until
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب الحساب البنكي
    const { data: bankAccount, error: bankError } = await supabase
      .from('merchant_bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .eq('merchant_id', merchant.id)
      .single();

    if (bankError || !bankAccount) {
      return new Response(
        JSON.stringify({ error: 'حساب بنكي غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (bankAccount.verification_status !== 'verified') {
      return new Response(
        JSON.stringify({ error: 'الحساب البنكي غير موثق' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // جلب إعدادات السحب
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['min_withdrawal_amount', 'withdrawal_fee_percentage', 'withdrawal_fee_fixed']);

    const minAmount = parseFloat(settings?.find(s => s.key === 'min_withdrawal_amount')?.value || '100');
    const feePercentage = parseFloat(settings?.find(s => s.key === 'withdrawal_fee_percentage')?.value || '0');
    const feeFixed = parseFloat(settings?.find(s => s.key === 'withdrawal_fee_fixed')?.value || '0');

    // التحقق من الحد الأدنى
    if (amount < minAmount) {
      return new Response(
        JSON.stringify({ 
          error: `الحد الأدنى للسحب ${minAmount} ${wallet.currency}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من الرصيد المتاح
    if (amount > wallet.balance_available) {
      return new Response(
        JSON.stringify({ 
          error: 'الرصيد غير كاف',
          available: wallet.balance_available
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // حساب الرسوم
    const fees = (amount * feePercentage / 100) + feeFixed;
    const amountToTransfer = amount - fees;

    // إنشاء طلب السحب
    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        merchant_id: merchant.id,
        bank_account_id: bank_account_id,
        amount_requested: amount,
        amount_fees: fees,
        amount_to_transfer: amountToTransfer,
        currency: wallet.currency,
        status: 'pending',
        merchant_note: note
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Payout error:', payoutError);
      return new Response(
        JSON.stringify({ error: 'فشل في إنشاء طلب السحب' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تحديث المحفظة
    await supabase
      .from('wallets')
      .update({
        balance_available: wallet.balance_available - amount,
        balance_pending_payout: wallet.balance_pending_payout + amount
      })
      .eq('id', wallet.id);

    // حفظ معاملة
    await supabase.from('transactions_log').insert({
      merchant_id: merchant.id,
      payout_id: payoutRequest.id,
      type: 'payout',
      amount: -amount,
      currency: wallet.currency,
      balance_before: wallet.balance_available,
      balance_after: wallet.balance_available - amount,
      description: `طلب سحب #${payoutRequest.id.slice(0, 8)}`
    });

    // إرسال إشعار للإدارة
    // TODO: Send notification to admins

    // حفظ في audit log
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'payout_requested',
      target_type: 'payout_request',
      target_id: payoutRequest.id,
      details: { amount, bank_account_id }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        payout_request: payoutRequest,
        message: 'تم إرسال طلب السحب بنجاح'
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