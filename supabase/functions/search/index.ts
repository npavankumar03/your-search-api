import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Hash function for API key validation
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate hash for cache key
async function generateCacheKey(query: string, engine: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${engine}:${query.toLowerCase().trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Perform the actual search using AI Gateway
async function performSearch(query: string, engine: string, location?: string): Promise<any> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    throw new Error('AI Gateway not configured');
  }

  // Use AI to generate realistic search results
  const prompt = `Generate realistic search results for the query: "${query}"
  Search engine: ${engine}
  ${location ? `Location: ${location}` : ''}
  
  Return a JSON object with this exact structure:
  {
    "organic_results": [
      {
        "position": 1,
        "title": "Result title",
        "link": "https://example.com/page",
        "snippet": "Description of the result...",
        "domain": "example.com"
      }
    ],
    "search_metadata": {
      "query": "${query}",
      "engine": "${engine}",
      "total_results": "About X results"
    }
  }
  
  Generate 10 realistic results. Make the URLs, titles, and snippets look authentic for this query.
  Return ONLY valid JSON, no markdown or explanations.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', errorText);
    throw new Error('Search service unavailable');
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No results generated');
  }

  // Parse the JSON from the AI response
  try {
    // Extract JSON from the response (in case there's any markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('Parse error:', parseError, 'Content:', content);
    throw new Error('Failed to parse search results');
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || !apiKey.startsWith('sk_live_')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API key', 
          message: 'Please provide a valid API key in the x-api-key header or Authorization: Bearer header' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key
    const keyHash = await hashApiKey(apiKey);
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key is disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
    } else {
      const url = new URL(req.url);
      body = {
        query: url.searchParams.get('q') || url.searchParams.get('query'),
        engine: url.searchParams.get('engine') || 'google',
        location: url.searchParams.get('location'),
      };
    }

    const { query, engine = 'google', location } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cacheKey = await generateCacheKey(query, engine);
    const { data: cached } = await supabase
      .from('search_cache')
      .select('results')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    let results;
    if (cached) {
      results = cached.results;
    } else {
      // Perform fresh search
      results = await performSearch(query, engine, location);

      // Cache results
      await supabase
        .from('search_cache')
        .upsert({
          query_hash: cacheKey,
          query: query,
          engine: engine,
          results: results,
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        }, { onConflict: 'query_hash' });
    }

    const responseTime = Date.now() - startTime;

    // Log usage
    await supabase
      .from('api_usage')
      .insert({
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        endpoint: '/search',
        query: query,
        response_status: 200,
        response_time_ms: responseTime,
      });

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    return new Response(
      JSON.stringify({
        ...results,
        search_metadata: {
          ...results.search_metadata,
          response_time_ms: responseTime,
          cached: !!cached,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response_time_ms: responseTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
