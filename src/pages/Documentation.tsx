import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Copy, Check, Terminal, Server, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Documentation = () => {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  // Use placeholder for user's server IP
  const apiEndpoint = 'http://YOUR_SERVER_IP:3001/search';

  const codeExamples = {
    curl: `curl -X POST "http://YOUR_SERVER_IP:3001/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "best restaurants in NYC", "engine": "duckduckgo"}'`,
    
    python: `import requests

response = requests.post(
    "http://YOUR_SERVER_IP:3001/search",
    json={
        "query": "best restaurants in NYC",
        "engine": "duckduckgo"
    }
)

results = response.json()
print(results)`,
    
    javascript: `const response = await fetch("http://YOUR_SERVER_IP:3001/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    query: "best restaurants in NYC",
    engine: "duckduckgo"
  })
});

const results = await response.json();
console.log(results);`,
    
    php: `<?php
$ch = curl_init("http://YOUR_SERVER_IP:3001/search");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "query" => "best restaurants in NYC",
        "engine" => "duckduckgo"
    ])
]);

$response = curl_exec($ch);
$results = json_decode($response, true);
print_r($results);
?>`,

    go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    payload := map[string]string{
        "query":  "best restaurants in NYC",
        "engine": "duckduckgo",
    }
    body, _ := json.Marshal(payload)

    resp, err := http.Post(
        "http://YOUR_SERVER_IP:3001/search",
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    var results map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&results)
    fmt.Println(results)
}`,
  };

  const nginxConfig = `# /etc/nginx/sites-available/searchapi
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    # Frontend static files
    location / {
        root /var/www/searchapi/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /search {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /var/www/searchapi/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}`;

  const backendSystemd = `# /etc/systemd/system/searchapi-backend.service
[Unit]
Description=SearchAPI Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production

# Logging
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log

[Install]
WantedBy=multi-user.target`;

  const deployScript = `#!/bin/bash
# deploy.sh - Complete deployment script for Linux VM
set -e

echo "=== SearchAPI Full Deployment ==="

# Configuration
APP_DIR="/var/www/searchapi"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="/var/log/searchapi"

# Create directories
sudo mkdir -p $APP_DIR $BACKEND_DIR $FRONTEND_DIR $LOG_DIR
sudo chown -R $USER:$USER $APP_DIR
sudo chown -R www-data:www-data $LOG_DIR

# Navigate to app directory
cd $APP_DIR

# If repo exists, pull; otherwise clone
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone YOUR_REPO_URL .
fi

# ===== BACKEND SETUP =====
echo "Setting up backend..."
cd $BACKEND_DIR

# Copy backend files (adjust path as needed)
cp -r $APP_DIR/backend/* ./

# Install backend dependencies
npm install --production

# ===== FRONTEND SETUP =====
echo "Setting up frontend..."
cd $FRONTEND_DIR

# Copy frontend source
cp -r $APP_DIR/src $APP_DIR/public $APP_DIR/index.html $APP_DIR/package.json $APP_DIR/vite.config.ts $APP_DIR/tailwind.config.ts ./

# Create .env with API URL
echo "VITE_API_URL=http://YOUR_SERVER_IP:3001" > .env

# Install and build frontend
npm install
npm run build

# ===== SERVICES =====
echo "Configuring services..."

# Restart backend service
sudo systemctl daemon-reload
sudo systemctl enable searchapi-backend
sudo systemctl restart searchapi-backend

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "=== Deployment Complete ==="
echo "Frontend: http://YOUR_SERVER_IP"
echo "API: http://YOUR_SERVER_IP:3001/search"
echo ""
echo "Check backend status: sudo systemctl status searchapi-backend"
echo "Check backend logs: sudo tail -f /var/log/searchapi/backend.log"`;

  const quickSetup = `#!/bin/bash
# quick-setup.sh - One-time server setup
set -e

echo "=== SearchAPI Server Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx and Git
sudo apt install -y nginx git

# Create app directories
sudo mkdir -p /var/www/searchapi/{backend,frontend}
sudo mkdir -p /var/log/searchapi
sudo chown -R $USER:$USER /var/www/searchapi
sudo chown -R www-data:www-data /var/log/searchapi

# Create systemd service for backend
sudo tee /etc/systemd/system/searchapi-backend.service > /dev/null << 'EOF'
[Unit]
Description=SearchAPI Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/searchapi/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production
StandardOutput=append:/var/log/searchapi/backend.log
StandardError=append:/var/log/searchapi/error.log

[Install]
WantedBy=multi-user.target
EOF

# Enable backend service
sudo systemctl daemon-reload
sudo systemctl enable searchapi-backend

# Open firewall ports
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp

echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Copy your code to /var/www/searchapi/"
echo "2. Configure Nginx at /etc/nginx/sites-available/searchapi"
echo "3. Run: sudo ln -s /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/"
echo "4. Run: sudo systemctl start searchapi-backend"
echo "5. Run: sudo systemctl reload nginx"`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SearchAPI</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            API <span className="text-gradient">Documentation</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Self-hosted search API. No external dependencies. 100% on your server.
          </p>
        </div>

        {/* Architecture Overview */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Architecture</h2>
          </div>
          
          <div className="glass-card p-6">
            <pre className="text-sm font-mono text-muted-foreground overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────┐
│                      Your Linux VM                               │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Nginx (Port 80)                                        │   │
│   │  ├── / → Static Frontend (React app)                   │   │
│   │  └── /search → Proxy to Backend :3001                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Node.js Backend (Port 3001)                            │   │
│   │  ├── DuckDuckGo scraper (no API key needed)            │   │
│   │  ├── Bing scraper (fallback)                           │   │
│   │  └── In-memory cache (1 hour TTL)                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘`}
            </pre>
            <p className="text-muted-foreground text-sm mt-4">
              Everything runs on your Linux server. The backend scrapes DuckDuckGo/Bing for real search results - no external API keys required.
            </p>
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Quick Start</h2>
          </div>
          
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">API Endpoint (replace YOUR_SERVER_IP)</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(apiEndpoint, 'endpoint')}
              >
                {copiedBlock === 'endpoint' ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <code className="text-lg text-primary font-mono break-all">{apiEndpoint}</code>
          </div>

          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
            </TabsList>

            {Object.entries(codeExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <div className="relative glass-card p-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(code, lang)}
                  >
                    {copiedBlock === lang ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {code}
                  </pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* API Reference */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">API Reference</h2>
          </div>

          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">POST /search</h3>
              <p className="text-muted-foreground mb-4">Perform a web search query using real scraping.</p>
              
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Request Body</h4>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono mb-4">
{`{
  "query": string,     // Required: Search query
  "engine": string     // Optional: "duckduckgo" (default), "bing"
}`}
              </pre>

              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Response</h4>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono">
{`{
  "organic_results": [
    {
      "position": 1,
      "title": "Result Title",
      "link": "https://example.com/page",
      "snippet": "Description of the result...",
      "domain": "example.com"
    }
  ],
  "search_metadata": {
    "query": "your query",
    "engine": "duckduckgo",
    "total_results": "About 10 results",
    "response_time_ms": 245,
    "cached": false
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">GET /health</h3>
              <p className="text-muted-foreground mb-4">Health check endpoint.</p>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono">
{`{
  "status": "ok",
  "uptime": 3600.5
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Linux Deployment */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Linux VM Deployment</h2>
          </div>

          <div className="space-y-8">
            {/* Quick Setup Script */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Step 1: Quick Server Setup</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(quickSetup, 'quicksetup')}
                >
                  {copiedBlock === 'quicksetup' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Run this script once to set up your server with all dependencies:
              </p>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-64 overflow-y-auto">
                {quickSetup}
              </pre>
            </div>

            {/* Copy Files */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Step 2: Copy Application Files</h3>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# On your local machine, copy the backend folder to your server:
scp -r ./backend/* user@YOUR_SERVER_IP:/var/www/searchapi/backend/

# Copy the frontend source (or use git clone):
scp -r ./src ./public ./index.html ./package.json ./vite.config.ts ./tailwind.config.ts \\
    user@YOUR_SERVER_IP:/var/www/searchapi/frontend/

# SSH into your server
ssh user@YOUR_SERVER_IP

# Install backend dependencies
cd /var/www/searchapi/backend
npm install --production

# Create frontend .env and build
cd /var/www/searchapi/frontend
echo "VITE_API_URL=http://YOUR_SERVER_IP:3001" > .env
npm install
npm run build`}
              </pre>
            </div>

            {/* Nginx Config */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Step 3: Configure Nginx</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(nginxConfig, 'nginx')}
                >
                  {copiedBlock === 'nginx' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">
                {nginxConfig}
              </pre>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Save config and enable site
sudo nano /etc/nginx/sites-available/searchapi
# Paste the config above, save and exit

sudo ln -s /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t
sudo systemctl reload nginx`}
              </pre>
            </div>

            {/* Backend Service */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Step 4: Backend Systemd Service</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(backendSystemd, 'systemd')}
                >
                  {copiedBlock === 'systemd' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">
                {backendSystemd}
              </pre>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Start the backend service
sudo systemctl start searchapi-backend
sudo systemctl status searchapi-backend

# View logs
sudo tail -f /var/log/searchapi/backend.log`}
              </pre>
            </div>

            {/* Deploy Script */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Full Deploy Script (Optional)</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(deployScript, 'deploy')}
                >
                  {copiedBlock === 'deploy' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                For automated deployments from Git:
              </p>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-64 overflow-y-auto">
                {deployScript}
              </pre>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Caching & Performance</h2>
          </div>

          <div className="glass-card p-6">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>In-memory cache:</strong> Results cached for 1 hour per unique query+engine combination</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>No rate limits:</strong> You control the server - add rate limiting as needed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Real results:</strong> Scrapes DuckDuckGo/Bing HTML pages for actual search results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>No external APIs:</strong> Zero third-party dependencies or API keys</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-16">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Troubleshooting</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Backend won't start?</p>
                <pre className="bg-secondary/50 p-2 rounded mt-1 font-mono">
                  sudo journalctl -u searchapi-backend -f
                </pre>
              </div>
              <div>
                <p className="font-medium">Frontend not loading?</p>
                <pre className="bg-secondary/50 p-2 rounded mt-1 font-mono">
                  sudo nginx -t && sudo tail -f /var/log/nginx/error.log
                </pre>
              </div>
              <div>
                <p className="font-medium">API returning errors?</p>
                <pre className="bg-secondary/50 p-2 rounded mt-1 font-mono">
                  curl http://localhost:3001/health
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Documentation;
