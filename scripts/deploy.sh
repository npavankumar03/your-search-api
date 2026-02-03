#!/bin/bash
# One-Click Deploy Script for SearchAPI
# Usage: curl -sSL https://your-repo/deploy.sh | bash -s YOUR_SERVER_IP
# Or: ./deploy.sh YOUR_SERVER_IP
set -e

SERVER_IP="${1:-}"
APP_DIR="/var/www/searchapi"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Check if running on server or deploying remotely
if [ -z "$SERVER_IP" ]; then
    # Running directly on server
    log "Running on local server..."
    REMOTE=false
else
    log "Deploying to $SERVER_IP..."
    REMOTE=true
fi

deploy_local() {
    log "Setting up SearchAPI on this server..."
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        log "Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        log "Installing Nginx..."
        apt-get install -y nginx
    fi
    
    # Create directories
    mkdir -p $APP_DIR/backend $APP_DIR/frontend /var/log/searchapi
    
    # Create the optimized backend server
    log "Creating backend server..."
    cat > $APP_DIR/backend/server.js << 'SERVERJS'
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const CACHE_DIR = '/var/cache/searchapi';
const CACHE_TTL = 3600000;
const MAX_CACHE_SIZE = 100;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

let cacheIndex = [];

function generateCacheKey(q, e) {
  return crypto.createHash('md5').update(`${e}:${q.toLowerCase().trim()}`).digest('hex');
}

function getCachePath(k) { return path.join(CACHE_DIR, `${k}.json`); }

function getFromCache(k) {
  try {
    const p = getCachePath(k);
    if (fs.existsSync(p)) {
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (d.expires > Date.now()) {
        cacheIndex = cacheIndex.filter(x => x !== k);
        cacheIndex.unshift(k);
        return d.results;
      }
      fs.unlinkSync(p);
    }
  } catch (e) {}
  return null;
}

function saveToCache(k, r) {
  while (cacheIndex.length >= MAX_CACHE_SIZE) {
    const old = cacheIndex.pop();
    try { fs.unlinkSync(getCachePath(old)); } catch (e) {}
  }
  fs.writeFileSync(getCachePath(k), JSON.stringify({ results: r, expires: Date.now() + CACHE_TTL }));
  cacheIndex.unshift(k);
}

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHTML(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractDDG(html) {
  const results = [];
  const blocks = html.split(/class="result\s/i).slice(1, 11);
  for (const b of blocks) {
    try {
      const urlM = b.match(/class="result__a"[^>]*href="([^"]*)"/i);
      const titleM = b.match(/class="result__a"[^>]*>([^<]*)/i);
      const snippetM = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      if (urlM && titleM) {
        let url = urlM[1];
        if (url.includes('uddg=')) {
          const u = url.match(/uddg=([^&]*)/);
          if (u) url = decodeURIComponent(u[1]);
        }
        const title = titleM[1].replace(/<[^>]*>/g, '').trim();
        const snippet = snippetM ? snippetM[1].replace(/<[^>]*>/g, '').trim() : '';
        if (title && url.startsWith('http')) {
          let domain = 'unknown';
          try { domain = new URL(url).hostname; } catch (e) {}
          results.push({ position: results.length + 1, title, link: url, snippet: snippet || 'No description', domain });
        }
      }
    } catch (e) {}
  }
  return results;
}

async function search(query, engine = 'duckduckgo') {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchHTML(url);
  return extractDDG(html);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve({}); } });
  });
}

function parseQuery(url) {
  const params = {};
  const qs = url.split('?')[1];
  if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
  return params;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  
  const url = req.url.split('?')[0];
  
  if (url === '/health') {
    return res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()), memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }));
  }
  
  if (url === '/' && req.method === 'GET') {
    return res.end(JSON.stringify({ name: 'SearchAPI', version: '2.0.0-lite' }));
  }
  
  if (url === '/search') {
    const start = Date.now();
    try {
      let query, engine;
      if (req.method === 'POST') { const b = await parseBody(req); query = b.query; engine = b.engine || 'duckduckgo'; }
      else { const p = parseQuery(req.url); query = p.q || p.query; engine = p.engine || 'duckduckgo'; }
      
      if (!query) { res.writeHead(400); return res.end(JSON.stringify({ error: 'Missing query' })); }
      
      const cacheKey = generateCacheKey(query, engine);
      const cached = getFromCache(cacheKey);
      if (cached) return res.end(JSON.stringify({ organic_results: cached, search_metadata: { query, engine, cached: true, response_time_ms: Date.now() - start } }));
      
      const results = await search(query, engine);
      saveToCache(cacheKey, results);
      return res.end(JSON.stringify({ organic_results: results, search_metadata: { query, engine, cached: false, response_time_ms: Date.now() - start } }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }
  
  res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => console.log(`SearchAPI running on port ${PORT}`));
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
SERVERJS

    # Create systemd service with auto-restart
    log "Creating systemd service..."
    cat > /etc/systemd/system/searchapi.service << 'SYSTEMD'
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
Environment=NODE_ENV=production
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log
# Memory limits for small VPS
MemoryMax=128M
MemoryHigh=100M

[Install]
WantedBy=multi-user.target
SYSTEMD

    # Create nginx config
    log "Configuring Nginx..."
    SERVER_IP=$(hostname -I | awk '{print $1}')
    cat > /etc/nginx/sites-available/searchapi << NGINX
server {
    listen 80;
    server_name $SERVER_IP _;

    location / {
        root /var/www/searchapi/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
NGINX

    ln -sf /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Create cache directory
    mkdir -p /var/cache/searchapi
    
    # Start services
    log "Starting services..."
    systemctl daemon-reload
    systemctl enable searchapi
    systemctl restart searchapi
    nginx -t && systemctl reload nginx
    
    # Configure firewall
    if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 22/tcp
        ufw --force enable
    fi
    
    log "Deployment complete!"
    echo ""
    echo "================================================"
    echo "  SearchAPI is now running!"
    echo "================================================"
    echo ""
    echo "  API: http://$SERVER_IP/search"
    echo "  Health: http://$SERVER_IP/health"
    echo ""
    echo "  Test:"
    echo "  curl -X POST http://$SERVER_IP/search -H 'Content-Type: application/json' -d '{\"query\": \"hello world\"}'"
    echo ""
    echo "  Logs: tail -f /var/log/searchapi/backend.log"
    echo "  Status: systemctl status searchapi"
    echo ""
}

deploy_remote() {
    log "Deploying to remote server $SERVER_IP..."
    
    # Copy this script to server and run it
    ssh root@$SERVER_IP 'bash -s' << 'REMOTESCRIPT'
set -e
APP_DIR="/var/www/searchapi"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "[✓] Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "[✓] Installing Nginx..."
    apt-get install -y nginx
fi

mkdir -p $APP_DIR/backend $APP_DIR/frontend /var/log/searchapi /var/cache/searchapi
REMOTESCRIPT

    # Copy backend
    log "Copying backend..."
    scp backend/server.js root@$SERVER_IP:/var/www/searchapi/backend/
    
    # Copy and build frontend if exists
    if [ -d "dist" ]; then
        log "Copying frontend..."
        scp -r dist/* root@$SERVER_IP:/var/www/searchapi/frontend/
    fi
    
    # Setup services
    ssh root@$SERVER_IP "bash -s" << REMOTESETUP
set -e

# Create systemd service
cat > /etc/systemd/system/searchapi.service << 'SYSTEMD'
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
Environment=NODE_ENV=production
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log
MemoryMax=128M

[Install]
WantedBy=multi-user.target
SYSTEMD

# Create nginx config
cat > /etc/nginx/sites-available/searchapi << 'NGINX'
server {
    listen 80;
    server_name $SERVER_IP _;
    
    location / {
        root /var/www/searchapi/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:3001;
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
NGINX

ln -sf /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable searchapi
systemctl restart searchapi
nginx -t && systemctl reload nginx

echo "[✓] Deployment complete!"
REMOTESETUP

    echo ""
    log "Deployment complete!"
    echo ""
    echo "  API: http://$SERVER_IP/search"
    echo "  Test: curl -X POST http://$SERVER_IP/search -H 'Content-Type: application/json' -d '{\"query\": \"hello\"}'"
}

# Main
if [ "$REMOTE" = true ]; then
    deploy_remote
else
    deploy_local
fi
