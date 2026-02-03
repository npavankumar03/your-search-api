const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML fetch with redirect handling
async function fetchHTML(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// DuckDuckGo parser (most reliable, no blocking)
function extractDuckDuckGoResults(html: string) {
  const results: any[] = [];
  const blocks = html.split(/class="result\s/i).slice(1, 11);
  
  for (const block of blocks) {
    try {
      const urlMatch = block.match(/class="result__a"[^>]*href="([^"]*)"/i);
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]*)/i);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      
      if (urlMatch && titleMatch) {
        let url = urlMatch[1];
        if (url.includes('uddg=')) {
          const uddg = url.match(/uddg=([^&]*)/);
          if (uddg) url = decodeURIComponent(uddg[1]);
        }
        
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        
        if (title && url.startsWith('http')) {
          let domain = 'unknown';
          try { domain = new URL(url).hostname; } catch {}
          
          results.push({
            position: results.length + 1,
            title,
            link: url,
            snippet: snippet || 'No description',
            domain
          });
        }
      }
    } catch {}
  }
  return results;
}

// Bing parser (fallback)
function extractBingResults(html: string) {
  const results: any[] = [];
  const blocks = html.split(/class="b_algo"/i).slice(1, 11);
  
  for (const block of blocks) {
    try {
      const urlMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]*)"/i);
      const titleMatch = block.match(/<a[^>]*>([^<]*)<\/a>/i);
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      
      if (urlMatch && titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const url = urlMatch[1];
        
        let domain = 'unknown';
        try { domain = new URL(url).hostname; } catch {}
        
        results.push({
          position: results.length + 1,
          title,
          link: url,
          snippet: snippet || 'No description',
          domain
        });
      }
    } catch {}
  }
  return results;
}

// Google parser (may get blocked)
function extractGoogleResults(html: string) {
  const results: any[] = [];
  const blocks = html.split(/<div class="g"/i).slice(1, 11);
  
  for (const block of blocks) {
    try {
      const urlMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]*)"/i);
      const titleMatch = block.match(/<h3[^>]*>([^<]*)<\/h3>/i);
      const snippetMatch = block.match(/class="VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      
      if (urlMatch && titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const url = urlMatch[1];
        
        let domain = 'unknown';
        try { domain = new URL(url).hostname; } catch {}
        
        results.push({
          position: results.length + 1,
          title,
          link: url,
          snippet: snippet || 'No description',
          domain
        });
      }
    } catch {}
  }
  return results;
}

// Search with fallback engines
async function searchWithFallback(query: string, preferredEngine: string) {
  const engines = [
    { name: 'duckduckgo', url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, parser: extractDuckDuckGoResults },
    { name: 'bing', url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`, parser: extractBingResults },
    { name: 'google', url: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`, parser: extractGoogleResults },
  ];
  
  // Reorder to put preferred engine first
  const orderedEngines = [
    ...engines.filter(e => e.name === preferredEngine),
    ...engines.filter(e => e.name !== preferredEngine)
  ];
  
  let lastError = null;
  
  for (const engine of orderedEngines) {
    try {
      console.log(`Trying ${engine.name}...`);
      const html = await fetchHTML(engine.url);
      const results = engine.parser(html);
      
      if (results.length > 0) {
        return { results, engine: engine.name };
      }
      console.log(`${engine.name} returned 0 results, trying next...`);
    } catch (err) {
      console.error(`${engine.name} failed:`, err);
      lastError = err;
    }
  }
  
  throw lastError || new Error('All search engines failed');
}

// Simple hash for cache key
function hashQuery(query: string, engine: string): string {
  const str = `${engine}:${query.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    let query: string;
    let engine: string = 'duckduckgo';

    if (req.method === 'POST') {
      const body = await req.json();
      query = body.query;
      engine = body.engine || 'duckduckgo';
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get('q') || url.searchParams.get('query') || '';
      engine = url.searchParams.get('engine') || 'duckduckgo';
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache using Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const queryHash = hashQuery(query, engine);

    // Try to get from cache
    const cacheResponse = await fetch(
      `${supabaseUrl}/rest/v1/search_cache?query_hash=eq.${queryHash}&expires_at=gt.${new Date().toISOString()}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (cacheResponse.ok) {
      const cacheData = await cacheResponse.json();
      if (cacheData.length > 0) {
        console.log('Cache hit');
        return new Response(
          JSON.stringify({
            organic_results: cacheData[0].results,
            search_metadata: {
              query,
              engine: cacheData[0].engine,
              total_results: `About ${cacheData[0].results.length} results`,
              response_time_ms: Date.now() - startTime,
              cached: true
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Perform search with fallback
    const { results, engine: usedEngine } = await searchWithFallback(query, engine);

    // Cache results (1 hour TTL)
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/search_cache`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        query_hash: queryHash,
        query,
        engine: usedEngine,
        results,
        expires_at: expiresAt,
      }),
    });

    return new Response(
      JSON.stringify({
        organic_results: results,
        search_metadata: {
          query,
          engine: usedEngine,
          total_results: `About ${results.length} results`,
          response_time_ms: Date.now() - startTime,
          cached: false
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Search failed',
        response_time_ms: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
