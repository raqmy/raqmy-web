import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyRequest {
  request_id: string;
  otp_code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { request_id, otp_code }: VerifyRequest = await req.json();

    if (!request_id || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'بيانات غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // جلب طلب OTP
    const { data: otpRequest, error: fetchError } = await supabase
      .from('otp_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !otpRequest) {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح أو منتهي' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من انتهاء الصلاحية
    const now = new Date();
    const expiresAt = new Date(otpRequest.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('otp_requests')
        .update({ status: 'expired' })
        .eq('id', request_id);

      return new Response(
        JSON.stringify({ error: 'انتهت صلاحية الرمز' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من عدد المحاولات
    if (otpRequest.attempts >= otpRequest.max_attempts) {
      await supabase
        .from('otp_requests')
        .update({ status: 'failed' })
        .eq('id', request_id);

      return new Response(
        JSON.stringify({ error: 'تم تجاوز عدد المحاولات' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تشفير OTP المدخل
    const encoder = new TextEncoder();
    const data = encoder.encode(otp_code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // مقارنة الهاش
    if (inputHash !== otpRequest.otp_code_hash) {
      // زيادة عداد المحاولات
      const newAttempts = otpRequest.attempts + 1;
      const newStatus = newAttempts >= otpRequest.max_attempts ? 'failed' : 'pending';
      
      await supabase
        .from('otp_requests')
        .update({ 
          attempts: newAttempts,
          status: newStatus 
        })
        .eq('id', request_id);

      return new Response(
        JSON.stringify({ 
          error: 'الرمز غير صحيح',
          attempts_remaining: otpRequest.max_attempts - newAttempts
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // التحقق ناجح!
    await supabase
      .from('otp_requests')
      .update({ 
        status: 'verified',
        verified_at: now.toISOString()
      })
      .eq('id', request_id);

    // تحديث phone_verified للمستخدم إذا كان موجوداً
    if (otpRequest.user_id) {
      await supabase
        .from('users_profile')
        .update({ 
          phone_verified: true,
          phone_verified_at: now.toISOString(),
          phone: otpRequest.phone
        })
        .eq('id', otpRequest.user_id);

      // تحديث merchant إذا كان بائعاً
      await supabase
        .from('merchants')
        .update({ phone_verified: true })
        .eq('user_id', otpRequest.user_id);
    }

    // حفظ في audit_logs
    await supabase.from('admin_audit_logs').insert({
      admin_id: otpRequest.user_id,
      action: 'phone_verified',
      target_type: 'otp_request',
      target_id: request_id,
      details: { phone: otpRequest.phone, purpose: otpRequest.purpose }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'تم التحقق بنجاح',
        phone: otpRequest.phone
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