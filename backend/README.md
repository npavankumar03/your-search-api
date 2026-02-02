# SearchAPI Backend

Self-hosted search API backend using web scraping (DuckDuckGo/Bing). No external API keys required.

## Features

- 🔍 Real search results via web scraping
- 🚀 In-memory caching (1 hour TTL)
- 🌐 DuckDuckGo + Bing engines
- 🔒 No external dependencies
- ⚡ Fast response times

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3001
```

## API Endpoints

### POST /search
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best coffee shops NYC", "engine": "duckduckgo"}'
```

### GET /search
```bash
curl "http://localhost:3001/search?q=best+coffee+shops&engine=duckduckgo"
```

### GET /health
```bash
curl http://localhost:3001/health
```

## Configuration

Set environment variables:

```bash
PORT=3001  # Server port (default: 3001)
```

## Production Deployment

1. Install PM2 or use systemd
2. Run with `NODE_ENV=production`
3. Put behind Nginx for SSL

### Systemd Service

```ini
[Unit]
Description=SearchAPI Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Response Format

```json
{
  "organic_results": [
    {
      "position": 1,
      "title": "Result Title",
      "link": "https://example.com",
      "snippet": "Description...",
      "domain": "example.com"
    }
  ],
  "search_metadata": {
    "query": "search query",
    "engine": "duckduckgo",
    "total_results": "About 10 results",
    "response_time_ms": 245,
    "cached": false
  }
}
```

## Supported Search Engines

- `google` (default) - Main search engine
- `duckduckgo` - Privacy-focused, no tracking
- `bing` - Microsoft search engine
