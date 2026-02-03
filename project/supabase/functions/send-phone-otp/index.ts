import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  phone: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { phone }: RequestBody = await req.json();

    if (!phone || phone.trim().length === 0) {
      throw new Error('رقم الجوال مطلوب');
    }

    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    if (!phoneRegex.test(phone.trim())) {
      throw new Error('رقم الجوال غير صحيح');
    }

    const { data: existingRecords } = await supabaseClient
      .from('phone_verifications')
      .select('last_sent_at, attempts')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingRecords && existingRecords.length > 0) {
      const lastSent = new Date(existingRecords[0].last_sent_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;

      if (diffSeconds < 60) {
        throw new Error(`يرجى الانتظار ${Math.ceil(60 - diffSeconds)} ثانية قبل إعادة الإرسال`);
      }
    }

    const { data: todayRecords } = await supabaseClient
      .from('phone_verifications')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (todayRecords && todayRecords.length >= 10) {
      throw new Error('لقد تجاوزت الحد الأقصى لإرسال رموز التحقق اليوم');
    }

    await supabaseClient
      .from('phone_verifications')
      .delete()
      .eq('user_id', user.id);

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: insertError } = await supabaseClient
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone: phone.trim(),
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        last_sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('فشل حفظ رمز التحقق');
    }

    console.log('==============================================');
    console.log('📱 OTP للمستخدم:', user.email);
    console.log('📞 رقم الجوال:', phone);
    console.log('🔢 رمز التحقق:', otp);
    console.log('⏰ صالح حتى:', expiresAt.toISOString());
    console.log('==============================================');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-phone-otp:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ أثناء إرسال رمز التحقق',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
