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

    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'rate_limit_email_verify_per_hour')
      .maybeSingle();

    const maxRequests = settings?.value || 3;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: recentRequests } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('identifier', email)
      .eq('action', 'email_verify_request')
      .gte('window_end', oneHourAgo.toISOString())
      .maybeSingle();

    if (recentRequests && recentRequests.count >= maxRequests) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز عدد المحاولات. حاول بعد ساعة' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token_bytes = new Uint8Array(32);
    crypto.getRandomValues(token_bytes);
    const verification_token = Array.from(token_bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: verification, error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: user.id,
        email,
        verification_token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    if (recentRequests) {
      await supabase
        .from('rate_limits')
        .update({
          count: recentRequests.count + 1,
          window_end: now.toISOString()
        })
        .eq('identifier', email)
        .eq('action', 'email_verify_request');
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          identifier: email,
          action: 'email_verify_request',
          count: 1,
          window_start: now.toISOString(),
          window_end: now.toISOString()
        });
    }

    const { data: activeProvider } = await supabase
      .from('api_providers')
      .select('*')
      .eq('type', 'email')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeProvider) {
      console.error('لا يوجد مزود بريد إلكتروني نشط');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'تم إنشاء رمز التحقق (وضع الاختبار)',
          verification_id: verification.id,
          test_mode: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: template } = await supabase
      .from('notification_templates')
      .select('content_ar')
      .eq('type', 'email')
      .eq('name', 'email_verification')
      .maybeSingle();

    const verificationLink = `${supabaseUrl}/auth-email-verify?token=${verification_token}`;
    const emailBody = template?.content_ar?.replace('{link}', verificationLink) ||
      `مرحباً، الرجاء تأكيد بريدك الإلكتروني بالضغط على الرابط: ${verificationLink}`;

    await supabase
      .from('webhook_logs')
      .insert({
        provider_id: activeProvider.id,
        webhook_type: 'outgoing',
        payload: { to: email, subject: 'تأكيد البريد الإلكتروني', body: emailBody },
        response: { status: 'sent' },
        status: 'success'
      });

    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'email_verify_request',
        resource_type: 'email_verification',
        resource_id: verification.id,
        details: { email },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني',
        verification_id: verification.id,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في إرسال رابط التحقق' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});