import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authorization = request.headers.get('Authorization') ?? '';
    const body = await request.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authorization.replace('Bearer ', '').trim();

    const {
      data: { user: caller },
      error: callerError
    } = await adminClient.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: permissionRow } = await adminClient
      .from('role_permissions')
      .select('can_create')
      .eq('role', callerProfile.role)
      .eq('module_key', 'users')
      .single();

    if (!permissionRow?.can_create) {
      return new Response(JSON.stringify({ error: 'Insufficient permission' }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: invitedUser, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(body.email, {
        data: {
          full_name: body.full_name
        }
      });

    if (inviteError || !invitedUser.user) {
      return new Response(JSON.stringify({ error: inviteError?.message ?? 'Invite failed' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: profile, error: upsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: invitedUser.user.id,
          email: body.email,
          full_name: body.full_name,
          phone: body.phone ?? null,
          role: body.role ?? 'cashier',
          is_active: true
        },
        {
          onConflict: 'id'
        }
      )
      .select('*')
      .single();

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(
      JSON.stringify({
        user: profile
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message ?? 'Unexpected error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
