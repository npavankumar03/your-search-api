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

  const apiEndpoint = 'https://fcemwlfmgszodrprvpzu.supabase.co/functions/v1/search';

  const codeExamples = {
    curl: `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "best restaurants in NYC", "engine": "google"}'`,
    
    python: `import requests

response = requests.post(
    "${apiEndpoint}",
    json={
        "query": "best restaurants in NYC",
        "engine": "google"
    }
)

results = response.json()
print(results)`,
    
    javascript: `const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    query: "best restaurants in NYC",
    engine: "google"
  })
});

const results = await response.json();
console.log(results);`,
    
    php: `<?php
$ch = curl_init("${apiEndpoint}");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "query" => "best restaurants in NYC",
        "engine" => "google"
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
        "engine": "google",
    }
    body, _ := json.Marshal(payload)

    resp, err := http.Post(
        "${apiEndpoint}",
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
    server_name your-domain.com;

    # Serve the frontend static files
    root /var/www/searchapi/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}`;

  const buildScript = `#!/bin/bash
# deploy.sh - Run this on your Linux server

# Clone or pull latest code
cd /var/www/searchapi
git pull origin main

# Install dependencies and build
npm install
npm run build

# Restart Nginx
sudo systemctl reload nginx

echo "Deployment complete!"`;

  const systemdService = `# /etc/systemd/system/searchapi.service
[Unit]
Description=SearchAPI Static Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/searchapi
ExecStart=/usr/bin/npx serve -s dist -l 3000
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target`;

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
            Free, open search API. No authentication required.
          </p>
        </div>

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
              <span className="text-sm font-medium text-muted-foreground">API Endpoint</span>
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
              <p className="text-muted-foreground mb-4">Perform a web search query.</p>
              
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Request Body</h4>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono mb-4">
{`{
  "query": string,     // Required: Search query
  "engine": string,    // Optional: "google" (default), "bing", "yahoo"
  "location": string   // Optional: Location context
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
    "engine": "google",
    "total_results": "About X results",
    "response_time_ms": 245,
    "cached": false
  }
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
            <h2 className="text-2xl font-bold">Linux Server Deployment</h2>
          </div>

          <div className="space-y-8">
            {/* Architecture Overview */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Architecture</h3>
              <div className="bg-secondary/30 p-4 rounded-lg mb-4">
                <pre className="text-sm font-mono text-muted-foreground">
{`┌─────────────────────────────────────────────────────────────┐
│                    Your Linux Server                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Nginx (Port 80/443)                                │   │
│  │  ├── Serves static frontend (HTML/CSS/JS)          │   │
│  │  └── SSL termination via Certbot                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ API calls from browser
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Lovable Cloud (Backend)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Edge Functions                                     │   │
│  │  └── /search - Handles all search requests         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘`}
                </pre>
              </div>
              <p className="text-muted-foreground text-sm">
                Your Linux server hosts the static frontend. The API runs on Lovable Cloud - 
                no backend code needed on your server.
              </p>
            </div>

            {/* Step 1: Prerequisites */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Step 1: Prerequisites</h3>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Verify installations
node --version && nginx -v && git --version`}
              </pre>
            </div>

            {/* Step 2: Clone & Build */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Step 2: Clone & Build</h3>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Create web directory
sudo mkdir -p /var/www/searchapi
sudo chown $USER:$USER /var/www/searchapi

# Clone your repository (replace with your repo URL)
cd /var/www/searchapi
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Install dependencies and build
npm install
npm run build`}
              </pre>
            </div>

            {/* Step 3: Nginx Config */}
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
{`# Enable the site
sudo ln -s /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx`}
              </pre>
            </div>

            {/* Step 4: SSL */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Step 4: SSL with Certbot (Recommended)</h3>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run`}
              </pre>
            </div>

            {/* Optional: Systemd */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Optional: Systemd Service (for serve)</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(systemdService, 'systemd')}
                >
                  {copiedBlock === 'systemd' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                If you prefer using `serve` instead of Nginx for static files:
              </p>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">
                {systemdService}
              </pre>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable searchapi
sudo systemctl start searchapi
sudo systemctl status searchapi`}
              </pre>
            </div>

            {/* Deploy Script */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Deployment Script</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(buildScript, 'deploy')}
                >
                  {copiedBlock === 'deploy' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                {buildScript}
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
            <h2 className="text-2xl font-bold">Rate Limits & Caching</h2>
          </div>

          <div className="glass-card p-6">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span><strong>No rate limits</strong> - Free and unlimited usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span><strong>1-hour caching</strong> - Repeated queries return cached results instantly</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span><strong>No authentication</strong> - Just send requests, no API keys needed</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2024 SearchAPI. Open and free for everyone.</p>
        </div>
      </footer>
    </div>
  );
};

export default Documentation;
