import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Copy, Check, Loader2 } from 'lucide-react';

const Playground = () => {
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('best coffee shops in NYC');
  const [engine, setEngine] = useState('google');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runSearch = async () => {
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }
    if (!query) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            query,
            engine,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Search failed');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    const code = `const response = await fetch('${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey || 'YOUR_API_KEY'}'
  },
  body: JSON.stringify({
    query: '${query}',
    engine: '${engine}'
  })
});

const data = await response.json();`;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="docs" className="py-24 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            API <span className="glow-text">Playground</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Test the API right here. Enter your API key and try a search.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8">
            {/* Input controls */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-1">
                <label className="text-sm text-muted-foreground mb-2 block">API Key</label>
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-sm text-muted-foreground mb-2 block">Search Query</label>
                <Input
                  placeholder="Enter your search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Engine</label>
                <Select value={engine} onValueChange={setEngine}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="bing">Bing</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <Button
                onClick={runSearch}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Search
              </Button>
              <Button
                variant="outline"
                onClick={copyCode}
                className="border-border"
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-primary" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copy Code
              </Button>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg mb-6">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* Result display */}
            {result && (
              <div className="code-block max-h-96 overflow-auto">
                <pre className="text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {!result && !error && (
              <div className="code-block">
                <pre className="text-sm text-muted-foreground">
{`// Response will appear here
{
  "organic_results": [
    {
      "position": 1,
      "title": "Result title",
      "link": "https://example.com",
      "snippet": "Description..."
    }
  ],
  "search_metadata": {
    "query": "${query}",
    "engine": "${engine}",
    "response_time_ms": 245
  }
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Playground;
