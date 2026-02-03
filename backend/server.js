const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const CACHE_DIR = process.env.CACHE_DIR || '/tmp/searchapi-cache';
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 100; // Max cached queries

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Simple LRU cache index
let cacheIndex = [];

function generateCacheKey(query, engine) {
  return crypto.createHash('md5').update(`${engine}:${query.toLowerCase().trim()}`).digest('hex');
}

function getCachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function getFromCache(key) {
  const filePath = getCachePath(key);
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.expires > Date.now()) {
        // Move to front of LRU
        cacheIndex = cacheIndex.filter(k => k !== key);
        cacheIndex.unshift(key);
        return data.results;
      }
      // Expired, delete
      fs.unlinkSync(filePath);
    }
  } catch (e) {}
  return null;
}

function saveToCache(key, results) {
  // LRU eviction
  while (cacheIndex.length >= MAX_CACHE_SIZE) {
    const oldKey = cacheIndex.pop();
    try { fs.unlinkSync(getCachePath(oldKey)); } catch (e) {}
  }
  
  const filePath = getCachePath(key);
  const data = { results, expires: Date.now() + CACHE_TTL };
  fs.writeFileSync(filePath, JSON.stringify(data));
  cacheIndex.unshift(key);
}

// Lightweight HTML fetch with native http/https
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000
    };
    
    const req = client.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHTML(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Fast regex-based HTML parsing (no cheerio dependency)
function extractDuckDuckGoResults(html) {
  const results = [];
  // Match result blocks
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  
  // Alternative approach: split by result divs
  const blocks = html.split(/class="result\s/i).slice(1, 11);
  
  for (const block of blocks) {
    try {
      // Extract URL
      const urlMatch = block.match(/class="result__a"[^>]*href="([^"]*)"/i);
      // Extract title
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]*)/i);
      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      
      if (urlMatch && titleMatch) {
        let url = urlMatch[1];
        // Decode DDG redirect URL
        if (url.includes('uddg=')) {
          const uddg = url.match(/uddg=([^&]*)/);
          if (uddg) url = decodeURIComponent(uddg[1]);
        }
        
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        
        if (title && url.startsWith('http')) {
          let domain = 'unknown';
          try { domain = new URL(url).hostname; } catch (e) {}
          
          results.push({
            position: results.length + 1,
            title,
            link: url,
            snippet: snippet || 'No description',
            domain
          });
        }
      }
    } catch (e) {}
  }
  return results;
}

function extractBingResults(html) {
  const results = [];
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
        try { domain = new URL(url).hostname; } catch (e) {}
        
        results.push({
          position: results.length + 1,
          title,
          link: url,
          snippet: snippet || 'No description',
          domain
        });
      }
    } catch (e) {}
  }
  return results;
}

function extractGoogleResults(html) {
  const results = [];
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
        try { domain = new URL(url).hostname; } catch (e) {}
        
        results.push({
          position: results.length + 1,
          title,
          link: url,
          snippet: snippet || 'No description',
          domain
        });
      }
    } catch (e) {}
  }
  return results;
}

async function search(query, engine = 'duckduckgo') {
  const urls = {
    duckduckgo: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`,
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`
  };
  
  const extractors = {
    duckduckgo: extractDuckDuckGoResults,
    bing: extractBingResults,
    google: extractGoogleResults
  };
  
  const url = urls[engine] || urls.duckduckgo;
  const extractor = extractors[engine] || extractors.duckduckgo;
  
  const html = await fetchHTML(url);
  return extractor(html);
}

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

// Parse query string
function parseQuery(url) {
  const params = {};
  const queryString = url.split('?')[1];
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
  }
  return params;
}

// Main HTTP server (no Express overhead)
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  
  const url = req.url.split('?')[0];
  
  // Health check
  if (url === '/health') {
    const memUsage = process.memoryUsage();
    return res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      memory_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      cache_size: cacheIndex.length
    }));
  }
  
  // Root endpoint
  if (url === '/' && req.method === 'GET') {
    return res.end(JSON.stringify({
      name: 'SearchAPI',
      version: '2.0.0-lite',
      endpoints: { search: 'POST /search', health: 'GET /health' }
    }));
  }
  
  // Search endpoint
  if (url === '/search') {
    const startTime = Date.now();
    
    try {
      let query, engine;
      
      if (req.method === 'POST') {
        const body = await parseBody(req);
        query = body.query;
        engine = body.engine || 'duckduckgo';
      } else {
        const params = parseQuery(req.url);
        query = params.q || params.query;
        engine = params.engine || 'duckduckgo';
      }
      
      if (!query) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Missing query parameter' }));
      }
      
      engine = engine.toLowerCase();
      const cacheKey = generateCacheKey(query, engine);
      
      // Check cache
      const cached = getFromCache(cacheKey);
      if (cached) {
        return res.end(JSON.stringify({
          organic_results: cached,
          search_metadata: {
            query, engine,
            total_results: `About ${cached.length} results`,
            response_time_ms: Date.now() - startTime,
            cached: true
          }
        }));
      }
      
      // Perform search
      const results = await search(query, engine);
      saveToCache(cacheKey, results);
      
      return res.end(JSON.stringify({
        organic_results: results,
        search_metadata: {
          query, engine,
          total_results: `About ${results.length} results`,
          response_time_ms: Date.now() - startTime,
          cached: false
        }
      }));
      
    } catch (error) {
      res.writeHead(500);
      return res.end(JSON.stringify({
        error: error.message || 'Search failed',
        response_time_ms: Date.now() - startTime
      }));
    }
  }
  
  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SearchAPI v2.0-lite running on port ${PORT}`);
  console.log(`Memory: ~${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`Cache: ${CACHE_DIR} (max ${MAX_CACHE_SIZE} entries)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
