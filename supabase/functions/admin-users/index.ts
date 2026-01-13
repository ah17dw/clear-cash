import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user's token to check permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.user.id;
    console.log('User ID:', userId);

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Failed to check permissions' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!isAdmin) {
      console.log('User is not admin');
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Admin client with service role key for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log('Admin action:', action, params);

    switch (action) {
      case 'list_users': {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers();
        if (error) throw error;

        // Get roles for all users
        const { data: roles } = await adminClient.from('user_roles').select('*');
        
        // Get profiles
        const { data: profiles } = await adminClient.from('profiles').select('*');

        const enrichedUsers = users.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          display_name: profiles?.find(p => p.user_id === user.id)?.display_name || null,
          roles: roles?.filter(r => r.user_id === user.id).map(r => r.role) || []
        }));

        return new Response(JSON.stringify({ users: enrichedUsers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete_user': {
        const { user_id } = params;
        if (!user_id) throw new Error('user_id required');
        
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;

        console.log('Deleted user:', user_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_password': {
        const { user_id, password } = params;
        if (!user_id || !password) throw new Error('user_id and password required');

        const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (error) throw error;

        console.log('Updated password for user:', user_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'invite_user': {
        const { email } = params;
        if (!email) throw new Error('email required');

        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);
        if (error) throw error;

        console.log('Invited user:', email);
        return new Response(JSON.stringify({ success: true, user: data.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'set_role': {
        const { user_id, role } = params;
        if (!user_id || !role) throw new Error('user_id and role required');

        // Remove existing roles and add new one
        await adminClient.from('user_roles').delete().eq('user_id', user_id);
        
        if (role !== 'none') {
          const { error } = await adminClient.from('user_roles').insert({ user_id, role });
          if (error) throw error;
        }

        console.log('Set role for user:', user_id, role);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_audit_logs': {
        const { data, error } = await adminClient
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) throw error;

        return new Response(JSON.stringify({ logs: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin function error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});