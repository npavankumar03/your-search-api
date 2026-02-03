# 🚀 SearchAPI - Linux Hosting Guide

## One-Click Deploy (Recommended)

SSH into your VPS and run:

```bash
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/deploy.sh | bash
```

That's it! The script will:
- Install Node.js 20.x and Nginx
- Deploy the zero-dependency backend
- Configure systemd with auto-restart
- Set up Nginx reverse proxy
- Configure memory limits (128MB max)

---

## Manual Installation

### Prerequisites

- Ubuntu 20.04+ / Debian 11+
- Root access
- 512MB RAM minimum

### Step 1: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
```

### Step 2: Create Directories

```bash
mkdir -p /var/www/searchapi/backend
mkdir -p /var/log/searchapi
mkdir -p /var/cache/searchapi
```

### Step 3: Upload Backend

Copy `backend/server.js` to your server:

```bash
scp backend/server.js root@YOUR_IP:/var/www/searchapi/backend/
```

### Step 4: Create Systemd Service

```bash
cat > /etc/systemd/system/searchapi.service << 'EOF'
[Unit]
Description=SearchAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=PORT=3001
MemoryMax=128M
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable searchapi
systemctl start searchapi
```

### Step 5: Configure Nginx

```bash
cat > /etc/nginx/sites-available/searchapi << 'EOF'
server {
    listen 80;
    server_name _;

    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
    }

    gzip on;
    gzip_types application/json;
}
EOF

ln -sf /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## Test the API

```bash
# Health check
curl http://YOUR_IP/health

# Search
curl -X POST http://YOUR_IP/search \
  -H "Content-Type: application/json" \
  -d '{"query": "hello world"}'
```

---

## Management Commands

```bash
# View logs
tail -f /var/log/searchapi/backend.log

# Restart service
systemctl restart searchapi

# Check status
systemctl status searchapi

# Check memory usage
curl http://localhost:3001/health
```

---

## Resource Usage

| Metric | Value |
|--------|-------|
| RAM (idle) | ~15MB |
| RAM (max) | 128MB (limited) |
| Dependencies | 0 (zero npm packages) |
| Disk (cache) | <10MB |

---

## HTTPS (Optional)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Search with JSON body |
| GET | `/search?q=query` | Search with query params |
| GET | `/health` | Health check with memory stats |

### Request

```json
{
  "query": "search term",
  "engine": "duckduckgo"
}
```

### Response

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
    "query": "search term",
    "engine": "duckduckgo",
    "cached": false,
    "response_time_ms": 245
  }
}
```
