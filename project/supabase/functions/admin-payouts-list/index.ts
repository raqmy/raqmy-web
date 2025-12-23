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

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const merchant_id = url.searchParams.get('merchant_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('payout_requests')
      .select(`
        *,
        merchant:merchants!payout_requests_merchant_id_fkey(
          id,
          business_name,
          kyc_status
        ),
        bank_account:bank_accounts!payout_requests_bank_account_id_fkey(
          id,
          bank_name,
          account_number_masked,
          account_holder_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (merchant_id) {
      query = query.eq('merchant_id', merchant_id);
    }

    const { data: payouts, error, count } = await query;

    if (error) throw error;

    const { data: stats } = await supabase
      .from('payout_requests')
      .select('status, amount_requested')
      .not('status', 'in', '(cancelled)');

    const statistics = {
      total: count || 0,
      pending: stats?.filter(p => p.status === 'pending').length || 0,
      processing: stats?.filter(p => p.status === 'processing').length || 0,
      paid: stats?.filter(p => p.status === 'paid').length || 0,
      rejected: stats?.filter(p => p.status === 'rejected').length || 0,
      total_amount_pending: stats
        ?.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount_requested), 0) || 0,
      total_amount_processing: stats
        ?.filter(p => p.status === 'processing')
        .reduce((sum, p) => sum + parseFloat(p.amount_requested), 0) || 0,
      total_amount_paid: stats
        ?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount_requested), 0) || 0
    };

    return new Response(
      JSON.stringify({ 
        payouts,
        statistics,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في جلب طلبات السحب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});