const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow all origins for development, restrict in production if needed
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// In-memory cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

// Generate cache key
function generateCacheKey(query, engine) {
  return crypto.createHash('sha256').update(`${engine}:${query.toLowerCase().trim()}`).digest('hex');
}

// Clean expired cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires < now) {
      cache.delete(key);
    }
  }
}

// DuckDuckGo HTML search scraper
async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results = [];

  $('.result').each((index, element) => {
    if (index >= 10) return false; // Limit to 10 results

    const titleEl = $(element).find('.result__a');
    const snippetEl = $(element).find('.result__snippet');
    const linkEl = $(element).find('.result__url');

    const title = titleEl.text().trim();
    const link = titleEl.attr('href');
    const snippet = snippetEl.text().trim();
    const displayUrl = linkEl.text().trim();

    // Extract actual URL from DuckDuckGo redirect
    let actualUrl = link;
    if (link && link.includes('uddg=')) {
      try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        actualUrl = decodeURIComponent(urlParams.get('uddg') || link);
      } catch (e) {
        actualUrl = link;
      }
    }

    if (title && actualUrl) {
      let domain = displayUrl;
      try {
        domain = new URL(actualUrl).hostname;
      } catch (e) {
        domain = displayUrl || 'unknown';
      }

      results.push({
        position: results.length + 1,
        title,
        link: actualUrl,
        snippet: snippet || 'No description available',
        domain
      });
    }
  });

  return results;
}

// Bing search scraper as fallback
async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });

  if (!response.ok) {
    throw new Error(`Bing returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results = [];

  $('.b_algo').each((index, element) => {
    if (index >= 10) return false;

    const titleEl = $(element).find('h2 a');
    const snippetEl = $(element).find('.b_caption p');
    
    const title = titleEl.text().trim();
    const link = titleEl.attr('href');
    const snippet = snippetEl.text().trim();

    if (title && link) {
      let domain = 'unknown';
      try {
        domain = new URL(link).hostname;
      } catch (e) {}

      results.push({
        position: results.length + 1,
        title,
        link,
        snippet: snippet || 'No description available',
        domain
      });
    }
  });

  return results;
}

// Main search endpoint
app.post('/search', async (req, res) => {
  const startTime = Date.now();

  try {
    const { query, engine = 'duckduckgo', location } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    // Check cache
    const cacheKey = generateCacheKey(query, engine);
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expires > now) {
      const responseTime = Date.now() - startTime;
      return res.json({
        organic_results: cached.data,
        search_metadata: {
          query,
          engine,
          total_results: `About ${cached.data.length} results`,
          response_time_ms: responseTime,
          cached: true
        }
      });
    }

    // Perform search based on engine
    let results;
    const searchEngine = engine.toLowerCase();

    if (searchEngine === 'bing') {
      results = await searchBing(query);
    } else {
      // Default to DuckDuckGo
      results = await searchDuckDuckGo(query);
    }

    // Cache results
    cache.set(cacheKey, {
      data: results,
      expires: now + CACHE_TTL
    });

    // Clean old cache entries periodically
    if (Math.random() < 0.1) {
      cleanCache();
    }

    const responseTime = Date.now() - startTime;

    res.json({
      organic_results: results,
      search_metadata: {
        query,
        engine: searchEngine,
        total_results: `About ${results.length} results`,
        response_time_ms: responseTime,
        cached: false
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Search error:', error.message);

    res.status(500).json({
      error: error.message || 'Search failed',
      response_time_ms: responseTime
    });
  }
});

// GET endpoint for convenience
app.get('/search', async (req, res) => {
  req.body = {
    query: req.query.q || req.query.query,
    engine: req.query.engine || 'duckduckgo',
    location: req.query.location
  };

  // Forward to POST handler
  const startTime = Date.now();

  try {
    const { query, engine = 'duckduckgo' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const cacheKey = generateCacheKey(query, engine);
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expires > now) {
      const responseTime = Date.now() - startTime;
      return res.json({
        organic_results: cached.data,
        search_metadata: {
          query,
          engine,
          total_results: `About ${cached.data.length} results`,
          response_time_ms: responseTime,
          cached: true
        }
      });
    }

    let results;
    if (engine.toLowerCase() === 'bing') {
      results = await searchBing(query);
    } else {
      results = await searchDuckDuckGo(query);
    }

    cache.set(cacheKey, {
      data: results,
      expires: now + CACHE_TTL
    });

    const responseTime = Date.now() - startTime;

    res.json({
      organic_results: results,
      search_metadata: {
        query,
        engine: engine.toLowerCase(),
        total_results: `About ${results.length} results`,
        response_time_ms: responseTime,
        cached: false
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Search error:', error.message);
    res.status(500).json({
      error: error.message || 'Search failed',
      response_time_ms: responseTime
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SearchAPI',
    version: '1.0.0',
    endpoints: {
      search: 'POST /search',
      health: 'GET /health'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SearchAPI backend running on http://0.0.0.0:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /search - Search with body { query, engine }`);
  console.log(`  GET /search?q=query&engine=duckduckgo`);
  console.log(`  GET /health - Health check`);
});
