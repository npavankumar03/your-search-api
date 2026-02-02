import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  ArrowLeft, 
  Copy, 
  Check,
  Code,
  Terminal,
  BookOpen,
  Server,
  Key,
  Globe,
  Shield,
  Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Documentation = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const curlExample = `curl -X POST "${API_BASE_URL}/search" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk_live_YOUR_API_KEY" \\
  -d '{
    "query": "best coffee shops in NYC",
    "engine": "google",
    "location": "New York, USA"
  }'`;

  const pythonExample = `import requests

API_KEY = "sk_live_YOUR_API_KEY"
API_URL = "${API_BASE_URL}/search"

def search(query: str, engine: str = "google", location: str = None):
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    
    payload = {
        "query": query,
        "engine": engine
    }
    
    if location:
        payload["location"] = location
    
    response = requests.post(API_URL, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

# Example usage
results = search("best coffee shops in NYC", location="New York, USA")
print(results)

# Access organic results
for result in results.get("organic_results", []):
    print(f"{result['position']}. {result['title']}")
    print(f"   URL: {result['link']}")
    print(f"   {result['snippet']}")
    print()`;

  const nodeExample = `const API_KEY = "sk_live_YOUR_API_KEY";
const API_URL = "${API_BASE_URL}/search";

async function search(query, engine = "google", location = null) {
  const payload = { query, engine };
  if (location) payload.location = location;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  return response.json();
}

// Example usage
(async () => {
  try {
    const results = await search("best coffee shops in NYC", "google", "New York, USA");
    console.log(results);

    // Access organic results
    results.organic_results?.forEach((result, index) => {
      console.log(\`\${result.position}. \${result.title}\`);
      console.log(\`   URL: \${result.link}\`);
      console.log(\`   \${result.snippet}\\n\`);
    });
  } catch (error) {
    console.error("Search failed:", error);
  }
})();`;

  const phpExample = `<?php

$API_KEY = "sk_live_YOUR_API_KEY";
$API_URL = "${API_BASE_URL}/search";

function search($query, $engine = "google", $location = null) {
    global $API_KEY, $API_URL;
    
    $payload = [
        "query" => $query,
        "engine" => $engine
    ];
    
    if ($location) {
        $payload["location"] = $location;
    }
    
    $ch = curl_init($API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "x-api-key: $API_KEY"
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP error: $httpCode");
    }
    
    return json_decode($response, true);
}

// Example usage
$results = search("best coffee shops in NYC", "google", "New York, USA");
print_r($results);

// Access organic results
foreach ($results["organic_results"] ?? [] as $result) {
    echo "{$result['position']}. {$result['title']}\\n";
    echo "   URL: {$result['link']}\\n";
    echo "   {$result['snippet']}\\n\\n";
}`;

  const goExample = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const (
    APIKey = "sk_live_YOUR_API_KEY"
    APIURL = "${API_BASE_URL}/search"
)

type SearchRequest struct {
    Query    string \`json:"query"\`
    Engine   string \`json:"engine"\`
    Location string \`json:"location,omitempty"\`
}

type OrganicResult struct {
    Position int    \`json:"position"\`
    Title    string \`json:"title"\`
    Link     string \`json:"link"\`
    Snippet  string \`json:"snippet"\`
    Domain   string \`json:"domain"\`
}

type SearchResponse struct {
    OrganicResults []OrganicResult \`json:"organic_results"\`
    SearchMetadata map[string]any  \`json:"search_metadata"\`
}

func search(query, engine, location string) (*SearchResponse, error) {
    payload := SearchRequest{
        Query:    query,
        Engine:   engine,
        Location: location,
    }

    jsonData, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("POST", APIURL, bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", APIKey)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var result SearchResponse
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }

    return &result, nil
}

func main() {
    results, err := search("best coffee shops in NYC", "google", "New York, USA")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    for _, r := range results.OrganicResults {
        fmt.Printf("%d. %s\\n", r.Position, r.Title)
        fmt.Printf("   URL: %s\\n", r.Link)
        fmt.Printf("   %s\\n\\n", r.Snippet)
    }
}`;

  const responseExample = `{
  "organic_results": [
    {
      "position": 1,
      "title": "Best Coffee Shops in NYC - Time Out",
      "link": "https://timeout.com/newyork/restaurants/best-coffee-shops-nyc",
      "snippet": "Discover the best coffee shops in NYC with our curated list of top cafes...",
      "domain": "timeout.com"
    },
    {
      "position": 2,
      "title": "Top 20 Coffee Shops in New York City",
      "link": "https://example.com/nyc-coffee",
      "snippet": "From artisanal roasters to cozy neighborhood spots...",
      "domain": "example.com"
    }
  ],
  "search_metadata": {
    "query": "best coffee shops in NYC",
    "engine": "google",
    "total_results": "About 45,000,000 results",
    "response_time_ms": 245,
    "cached": false
  }
}`;

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={() => copyCode(code, id)}
      >
        {copiedCode === id ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
      <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm">
        <code className="text-muted-foreground">{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">SearchAPI</span>
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Documentation</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            API Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            SearchAPI Reference
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Complete guide to integrating SearchAPI into your applications with code examples in multiple languages.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            Quick Start
          </h2>
          
          <div className="glass-card p-6 mb-6">
            <h3 className="font-semibold mb-4">1. Get Your API Key</h3>
            <p className="text-muted-foreground mb-4">
              Sign up and generate an API key from your <Link to="/dashboard" className="text-primary hover:underline">dashboard</Link>. 
              Your key will look like: <code className="bg-secondary px-2 py-1 rounded">sk_live_xxxxxxxx...</code>
            </p>
          </div>

          <div className="glass-card p-6 mb-6">
            <h3 className="font-semibold mb-4">2. Make Your First Request</h3>
            <CodeBlock code={curlExample} language="bash" id="curl-quick" />
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">3. Parse the Response</h3>
            <CodeBlock code={responseExample} language="json" id="response" />
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Authentication
          </h2>
          
          <div className="glass-card p-6">
            <p className="text-muted-foreground mb-4">
              All API requests require authentication using your API key. You can pass it in one of two ways:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2">Option 1: x-api-key Header (Recommended)</h4>
                <code className="text-sm text-muted-foreground">x-api-key: sk_live_YOUR_API_KEY</code>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2">Option 2: Authorization Bearer Header</h4>
                <code className="text-sm text-muted-foreground">Authorization: Bearer sk_live_YOUR_API_KEY</code>
              </div>
            </div>

            <div className="mt-6 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
              <h4 className="font-semibold text-destructive mb-2">⚠️ Security Warning</h4>
              <p className="text-sm text-muted-foreground">
                Never expose your API key in client-side code or public repositories. 
                Always make API calls from your backend server.
              </p>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            API Endpoints
          </h2>
          
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded">POST</span>
              <code className="text-lg font-mono">/search</code>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Perform a search query and get organic results.
            </p>

            <h4 className="font-semibold mb-3">Request Body Parameters</h4>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4">Parameter</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Required</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-primary">query</td>
                    <td className="py-3 pr-4 text-muted-foreground">string</td>
                    <td className="py-3 pr-4"><span className="text-primary">Yes</span></td>
                    <td className="py-3 text-muted-foreground">The search query string</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-primary">engine</td>
                    <td className="py-3 pr-4 text-muted-foreground">string</td>
                    <td className="py-3 pr-4 text-muted-foreground">No</td>
                    <td className="py-3 text-muted-foreground">Search engine: "google", "bing", "duckduckgo" (default: "google")</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-primary">location</td>
                    <td className="py-3 pr-4 text-muted-foreground">string</td>
                    <td className="py-3 pr-4 text-muted-foreground">No</td>
                    <td className="py-3 text-muted-foreground">Geographic location for localized results</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold mb-3">Response Fields</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4">Field</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-primary">organic_results</td>
                    <td className="py-3 pr-4 text-muted-foreground">array</td>
                    <td className="py-3 text-muted-foreground">Array of search results with position, title, link, snippet, domain</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-primary">search_metadata</td>
                    <td className="py-3 pr-4 text-muted-foreground">object</td>
                    <td className="py-3 text-muted-foreground">Query info, response time, cache status</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6 text-primary" />
            Code Examples
          </h2>
          
          <Tabs defaultValue="python" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
            </TabsList>
            
            <TabsContent value="python">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Python (requests library)</h3>
                <CodeBlock code={pythonExample} language="python" id="python" />
                <p className="text-sm text-muted-foreground mt-4">
                  Install dependencies: <code className="bg-secondary px-2 py-1 rounded">pip install requests</code>
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="node">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Node.js (fetch)</h3>
                <CodeBlock code={nodeExample} language="javascript" id="node" />
                <p className="text-sm text-muted-foreground mt-4">
                  Works with Node.js 18+ (native fetch) or install node-fetch for older versions.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="curl">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">cURL</h3>
                <CodeBlock code={curlExample} language="bash" id="curl" />
              </div>
            </TabsContent>
            
            <TabsContent value="php">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">PHP (cURL)</h3>
                <CodeBlock code={phpExample} language="php" id="php" />
              </div>
            </TabsContent>
            
            <TabsContent value="go">
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Go</h3>
                <CodeBlock code={goExample} language="go" id="go" />
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Rate Limits & Caching */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Rate Limits & Caching
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Rate Limits</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• No strict rate limits currently enforced</li>
                <li>• Fair usage policy applies</li>
                <li>• Contact us for high-volume needs</li>
              </ul>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Response Caching</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Results are cached for 1 hour</li>
                <li>• Cache key: query + engine combination</li>
                <li>• <code className="bg-secondary px-1 rounded">cached: true</code> in metadata indicates a cached response</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Error Handling */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Error Handling
          </h2>
          
          <div className="glass-card p-6">
            <p className="text-muted-foreground mb-4">
              The API returns standard HTTP status codes and JSON error responses:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Error</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono">400</td>
                    <td className="py-3 pr-4 text-destructive">Missing query parameter</td>
                    <td className="py-3 text-muted-foreground">The query field is required</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono">401</td>
                    <td className="py-3 pr-4 text-destructive">Invalid API key</td>
                    <td className="py-3 text-muted-foreground">API key missing or invalid</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono">403</td>
                    <td className="py-3 pr-4 text-destructive">API key is disabled</td>
                    <td className="py-3 text-muted-foreground">The API key has been revoked</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono">500</td>
                    <td className="py-3 pr-4 text-destructive">Internal server error</td>
                    <td className="py-3 text-muted-foreground">Server-side error occurred</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Error Response Format</h4>
              <CodeBlock 
                code={`{
  "error": "Invalid API key",
  "message": "Please provide a valid API key in the x-api-key header"
}`} 
                language="json" 
                id="error" 
              />
            </div>
          </div>
        </section>

        {/* Deployment Guide */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" />
            Linux Server Deployment
          </h2>
          
          <div className="glass-card p-6">
            <p className="text-muted-foreground mb-6">
              Deploy the SearchAPI dashboard to your Linux server. The backend (edge functions) runs on Lovable Cloud automatically.
            </p>

            <h3 className="font-semibold mb-4">Prerequisites</h3>
            <ul className="space-y-2 text-muted-foreground mb-6">
              <li>• Node.js 18+ installed</li>
              <li>• Nginx or Apache for reverse proxy (optional)</li>
              <li>• PM2 or systemd for process management</li>
            </ul>

            <h3 className="font-semibold mb-4">Step 1: Clone & Build</h3>
            <CodeBlock 
              code={`# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
npm install

# Build for production
npm run build`} 
              language="bash" 
              id="deploy-1" 
            />

            <h3 className="font-semibold mt-6 mb-4">Step 2: Serve with Nginx</h3>
            <CodeBlock 
              code={`# /etc/nginx/sites-available/searchapi
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/searchapi/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/searchapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx`} 
              language="bash" 
              id="deploy-2" 
            />

            <h3 className="font-semibold mt-6 mb-4">Step 3: SSL with Certbot</h3>
            <CodeBlock 
              code={`# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically`} 
              language="bash" 
              id="deploy-3" 
            />

            <div className="mt-6 p-4 bg-primary/10 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">📌 Important Notes</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• The backend (edge functions) are hosted on Lovable Cloud - no server setup needed for API</li>
                <li>• Only the React dashboard needs to be deployed to your server</li>
                <li>• API calls from your users go directly to the edge functions</li>
                <li>• Make sure your domain's DNS points to your server's IP</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Create your account and generate your first API key in seconds.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign Up Free
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© 2024 SearchAPI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Documentation;
