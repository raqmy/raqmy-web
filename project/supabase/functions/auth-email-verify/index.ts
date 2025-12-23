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

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'رمز التحقق مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('verification_token', token)
      .maybeSingle();

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({ error: 'رمز التحقق غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verification.status === 'verified') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم التحقق من البريد الإلكتروني مسبقاً',
          already_verified: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const expiresAt = new Date(verification.expires_at);

    if (now > expiresAt) {
      await supabase
        .from('email_verifications')
        .update({ status: 'expired' })
        .eq('id', verification.id);

      return new Response(
        JSON.stringify({ error: 'انتهت صلاحية رمز التحقق' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verification.status === 'failed' || verification.status === 'expired') {
      return new Response(
        JSON.stringify({ error: 'رمز التحقق غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('email_verifications')
      .update({ 
        status: 'verified',
        verified_at: now.toISOString()
      })
      .eq('id', verification.id);

    await supabase
      .from('users_profile')
      .update({ 
        email_verified: true,
        email_verified_at: now.toISOString()
      })
      .eq('id', verification.user_id);

    await supabase
      .from('audit_logs')
      .insert({
        user_id: verification.user_id,
        action: 'email_verified',
        resource_type: 'email_verification',
        resource_id: verification.id,
        details: { email: verification.email },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم التحقق من البريد الإلكتروني بنجاح'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في التحقق من البريد الإلكتروني' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});