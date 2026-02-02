import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a client with the user's token for auth verification
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseAnonKey) {
      throw new Error('Missing SUPABASE_ANON_KEY');
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '7d';

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();
    
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get usage statistics
    const { data: usage, error: usageError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (usageError) {
      throw new Error('Failed to fetch usage data');
    }

    // Calculate statistics
    const totalRequests = usage?.length || 0;
    const successfulRequests = usage?.filter(u => u.response_status === 200).length || 0;
    const avgResponseTime = usage?.length 
      ? Math.round(usage.reduce((sum, u) => sum + u.response_time_ms, 0) / usage.length)
      : 0;

    // Group by day for chart data
    const dailyUsage: Record<string, number> = {};
    usage?.forEach(u => {
      const day = u.created_at.split('T')[0];
      dailyUsage[day] = (dailyUsage[day] || 0) + 1;
    });

    // Recent requests (last 10)
    const recentRequests = usage?.slice(0, 10).map(u => ({
      id: u.id,
      endpoint: u.endpoint,
      query: u.query,
      status: u.response_status,
      responseTime: u.response_time_ms,
      timestamp: u.created_at,
    }));

    return new Response(
      JSON.stringify({
        summary: {
          totalRequests,
          successfulRequests,
          errorRequests: totalRequests - successfulRequests,
          avgResponseTime,
          successRate: totalRequests ? Math.round((successfulRequests / totalRequests) * 100) : 0,
        },
        dailyUsage: Object.entries(dailyUsage).map(([date, count]) => ({
          date,
          requests: count,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        recentRequests,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Usage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
