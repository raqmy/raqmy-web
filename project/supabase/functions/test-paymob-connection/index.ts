import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TestRequest {
  api_key: string;
  integration_id: string;
  hmac_secret: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('غير مصرح');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('غير مصرح');
    }

    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      throw new Error('يجب أن تكون مديراً');
    }

    const { api_key, integration_id, hmac_secret }: TestRequest = await req.json();

    if (!api_key || !integration_id || !hmac_secret) {
      throw new Error('جميع الحقول مطلوبة');
    }

    const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: api_key.trim() }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Paymob error:', errorText);
      throw new Error('فشل الاتصال بـ Paymob - تحقق من API Key');
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error('لم نتمكن من الحصول على token من Paymob');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم الاتصال بنجاح! المفاتيح صحيحة.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Test connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'خطأ في الاتصال',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});