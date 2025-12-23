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

    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return new Response(
        JSON.stringify({ error: 'حساب التاجر غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      const { data: accounts, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ accounts }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { bank_name, account_holder_name, account_number, iban, swift_code, bank_country, bank_city, bank_branch } = body;

      if (!bank_name || !account_holder_name || !account_number) {
        return new Response(
          JSON.stringify({ error: 'البيانات المطلوبة: bank_name, account_holder_name, account_number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const maskedNumber = account_number.slice(0, 4) + '****' + account_number.slice(-4);

      const { data: account, error } = await supabase
        .from('bank_accounts')
        .insert({
          merchant_id: merchant.id,
          bank_name,
          account_holder_name,
          account_number,
          account_number_masked: maskedNumber,
          iban: iban || null,
          swift_code: swift_code || null,
          bank_country: bank_country || null,
          bank_city: bank_city || null,
          bank_branch: bank_branch || null,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'bank_account_added',
          resource_type: 'bank_account',
          resource_id: account.id,
          details: { bank_name, masked_number: maskedNumber },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إضافة الحساب البنكي بنجاح',
          account: {
            ...account,
            account_number: undefined
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'طريقة غير مدعومة' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في إدارة الحسابات البنكية' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});