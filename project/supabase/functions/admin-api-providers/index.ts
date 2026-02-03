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
    const providerId = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (providerId) {
        const { data: provider, error } = await supabase
          .from('api_providers')
          .select('*')
          .eq('id', providerId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ provider }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const type = url.searchParams.get('type');
        let query = supabase
          .from('api_providers')
          .select('*')
          .order('created_at', { ascending: false });

        if (type) {
          query = query.eq('type', type);
        }

        const { data: providers, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ providers }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, type, config, is_active, is_test_mode, rate_limits, retry_policy, allowed_countries } = body;

      if (!name || !type || !config) {
        return new Response(
          JSON.stringify({ error: 'البيانات المطلوبة: name, type, config' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['sms', 'email', 'bank'].includes(type)) {
        return new Response(
          JSON.stringify({ error: 'نوع المزود غير صالح (sms, email, bank)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: provider, error } = await supabase
        .from('api_providers')
        .insert({
          name,
          type,
          config,
          is_active: is_active || false,
          is_test_mode: is_test_mode !== false,
          rate_limits,
          retry_policy,
          allowed_countries
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'api_provider_created',
          resource_type: 'api_provider',
          resource_id: provider.id,
          details: { name, type },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ success: true, provider }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      if (!providerId) {
        return new Response(
          JSON.stringify({ error: 'معرف المزود مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const updates: any = {};

      if (body.name !== undefined) updates.name = body.name;
      if (body.config !== undefined) updates.config = body.config;
      if (body.is_active !== undefined) updates.is_active = body.is_active;
      if (body.is_test_mode !== undefined) updates.is_test_mode = body.is_test_mode;
      if (body.rate_limits !== undefined) updates.rate_limits = body.rate_limits;
      if (body.retry_policy !== undefined) updates.retry_policy = body.retry_policy;
      if (body.allowed_countries !== undefined) updates.allowed_countries = body.allowed_countries;

      const { data: provider, error } = await supabase
        .from('api_providers')
        .update(updates)
        .eq('id', providerId)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'api_provider_updated',
          resource_type: 'api_provider',
          resource_id: providerId,
          details: updates,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ success: true, provider }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      if (!providerId) {
        return new Response(
          JSON.stringify({ error: 'معرف المزود مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('api_providers')
        .delete()
        .eq('id', providerId);

      if (error) throw error;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'api_provider_deleted',
          resource_type: 'api_provider',
          resource_id: providerId,
          details: {},
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        });

      return new Response(
        JSON.stringify({ success: true, message: 'تم حذف المزود بنجاح' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'طريقة غير مدعومة' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ في إدارة المزودات' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});