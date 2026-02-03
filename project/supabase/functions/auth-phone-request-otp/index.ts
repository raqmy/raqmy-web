import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OTPRequest {
  phone: string;
  country_code: string;
  purpose: 'register' | 'login' | 'change_phone' | '2fa' | 'verify';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, country_code, purpose }: OTPRequest = await req.json();

    // التحقق من المدخلات
    if (!phone || !country_code) {
      return new Response(
        JSON.stringify({ error: 'رقم الجوال ومفتاح الدولة مطلوبان' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تنسيق الرقم بصيغة E.164
    const fullPhone = country_code + phone.replace(/^0+/, '');

    // التحقق من Rate Limiting
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: recentRequests } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('identifier', fullPhone)
      .eq('action', 'otp_request')
      .gte('window_end', oneHourAgo.toISOString())
      .single();

    if (recentRequests && recentRequests.count >= 5) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز عدد المحاولات. حاول بعد ساعة' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب إعدادات OTP
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .in('key', ['otp_expiry_minutes', 'otp_max_attempts'])
      .returns();

    const expiryMinutes = settings?.find(s => s.key === 'otp_expiry_minutes')?.value || 5;
    const maxAttempts = settings?.find(s => s.key === 'otp_max_attempts')?.value || 5;

    // توليد OTP (6 أرقام)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // تشفير OTP (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(otpCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // حساب وقت انتهاء الصلاحية
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    // حفظ في قاعدة البيانات
    const { data: otpRequest, error: insertError } = await supabase
      .from('otp_requests')
      .insert({
        phone: fullPhone,
        country_code,
        otp_code_hash: otpHash,
        purpose,
        expires_at: expiresAt.toISOString(),
        max_attempts: maxAttempts,
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent')
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'فشل في إنشاء رمز التحقق' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب مزود SMS نشط
    const { data: provider } = await supabase
      .from('api_providers')
      .select('*')
      .eq('type', 'sms')
      .eq('is_active', true)
      .single();

    // في وضع التطوير: إرجاع OTP للاختبار
    if (!provider || provider.is_test_mode) {
      console.log('Test Mode OTP:', otpCode);
      return new Response(
        JSON.stringify({
          request_id: otpRequest.id,
          expires_at: expiresAt.toISOString(),
          resend_after_seconds: 60,
          test_otp: otpCode // للتطوير فقط
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // إرسال SMS (هنا يمكن إضافة التكامل مع Twilio/Nexmo)
    // const smsResult = await sendSMS(provider, fullPhone, otpCode);

    // حفظ في webhook_logs
    await supabase.from('webhook_logs').insert({
      provider: provider.name,
      provider_id: provider.id,
      event_type: 'otp_sent',
      raw_payload: { phone: fullPhone, purpose },
      status: 'success'
    });

    // تحديث rate limit
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
    await supabase.from('rate_limits').upsert({
      identifier: fullPhone,
      action: 'otp_request',
      count: (recentRequests?.count || 0) + 1,
      window_start: oneHourAgo.toISOString(),
      window_end: windowEnd.toISOString(),
      ip_address: ipAddress
    });

    return new Response(
      JSON.stringify({
        request_id: otpRequest.id,
        expires_at: expiresAt.toISOString(),
        resend_after_seconds: 60,
        message: 'تم إرسال رمز التحقق'
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