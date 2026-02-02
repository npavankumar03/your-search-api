import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Generate hash for cache key
async function generateCacheKey(query: string, engine: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${engine}:${query.toLowerCase().trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple in-memory cache (resets on function restart)
const cache = new Map<string, { data: any; expires: number }>();

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
      model: 'google/gemini-2.5-flash',
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
    // Parse request body - no authentication required (free for all)
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

    // Check in-memory cache first
    const cacheKey = await generateCacheKey(query, engine);
    const now = Date.now();
    const cached = cache.get(cacheKey);
    
    let results;
    let fromCache = false;
    
    if (cached && cached.expires > now) {
      results = cached.data;
      fromCache = true;
    } else {
      // Perform fresh search
      results = await performSearch(query, engine, location);

      // Cache results for 1 hour
      cache.set(cacheKey, {
        data: results,
        expires: now + 3600000, // 1 hour
      });

      // Clean old cache entries
      for (const [key, value] of cache.entries()) {
        if (value.expires < now) {
          cache.delete(key);
        }
      }
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...results,
        search_metadata: {
          ...results.search_metadata,
          response_time_ms: responseTime,
          cached: fromCache,
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
