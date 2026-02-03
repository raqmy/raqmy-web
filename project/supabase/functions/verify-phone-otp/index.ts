import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  otp: string;
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

    const { otp }: RequestBody = await req.json();

    if (!otp || otp.trim().length !== 6) {
      throw new Error('رمز التحقق يجب أن يكون 6 أرقام');
    }

    const { data: verificationRecords, error: fetchError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error('فشل التحقق من رمز التحقق');
    }

    if (!verificationRecords || verificationRecords.length === 0) {
      throw new Error('لم يتم العثور على رمز تحقق. يرجى طلب رمز جديد');
    }

    const record = verificationRecords[0];

    if (new Date(record.expires_at) < new Date()) {
      await supabaseClient
        .from('phone_verifications')
        .delete()
        .eq('id', record.id);

      throw new Error('انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد');
    }

    if (record.attempts >= 5) {
      await supabaseClient
        .from('phone_verifications')
        .delete()
        .eq('id', record.id);

      throw new Error('لقد تجاوزت الحد الأقصى للمحاولات. يرجى طلب رمز جديد');
    }

    const otpHash = await hashOTP(otp.trim());

    if (otpHash !== record.otp_hash) {
      await supabaseClient
        .from('phone_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);

      const remainingAttempts = 5 - (record.attempts + 1);
      throw new Error(`رمز التحقق غير صحيح. المحاولات المتبقية: ${remainingAttempts}`);
    }

    const { error: updateError } = await supabaseClient
      .from('users_profile')
      .update({
        phone: record.phone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update profile error:', updateError);
      throw new Error('فشل تحديث حالة التحقق');
    }

    await supabaseClient
      .from('phone_verifications')
      .delete()
      .eq('user_id', user.id);

    console.log('✅ Phone verified successfully for user:', user.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم التحقق من رقم الجوال بنجاح',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in verify-phone-otp:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ أثناء التحقق من رمز التحقق',
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
