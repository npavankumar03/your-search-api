# SearchAPI Backend (v2.0 Lite)

Zero-dependency Node.js search API. Uses only built-in modules.

## Features

- 🚀 **Zero dependencies** - No npm install needed
- 💾 **File-based cache** - Persistent across restarts
- ⚡ **~15MB RAM** - Runs on smallest VPS
- 🔄 **Auto-restart** - systemd with memory limits
- 🔍 **DuckDuckGo/Bing/Google** - Multiple engines

## Quick Start

```bash
# No npm install needed!
node server.js
```

## One-Click Deploy

On your VPS:
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/deploy.sh | bash
```

Or from your local machine:
```bash
./scripts/deploy.sh YOUR_SERVER_IP
```

## API

```bash
# POST
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "hello world"}'

# GET
curl "http://localhost:3001/search?q=hello+world"

# Health
curl http://localhost:3001/health
```

## Response

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
    "query": "hello world",
    "engine": "duckduckgo",
    "cached": false,
    "response_time_ms": 245
  }
}
```

## Resource Usage

| Metric | Value |
|--------|-------|
| RAM (idle) | ~15MB |
| RAM (under load) | ~25MB |
| CPU | Minimal |
| Disk (cache) | <10MB |

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)
- `CACHE_DIR` - Cache directory (default: /tmp/searchapi-cache)

## Systemd Service

The deploy script creates this automatically:

```ini
[Unit]
Description=SearchAPI Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
MemoryMax=128M

[Install]
WantedBy=multi-user.target
```

Commands:
```bash
systemctl status searchapi
systemctl restart searchapi
journalctl -u searchapi -f
```
