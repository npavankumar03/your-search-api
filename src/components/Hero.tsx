import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glows */}
      <div className="hero-glow bg-glow-cyan top-1/4 left-1/4 -translate-x-1/2" />
      <div className="hero-glow bg-glow-purple top-1/3 right-1/4 translate-x-1/2" />
      <div className="hero-glow bg-glow-blue bottom-1/4 left-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-secondary/50 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Powered by AI • No rate limits
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Your Own Search
            <br />
            <span className="glow-text">API Platform</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Build and deploy your own search API. Generate API keys, track usage, 
            and serve real-time search results to your applications.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 text-lg">
                {user ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-border hover:bg-secondary px-8 h-14 text-lg" asChild>
              <a href="#docs">
                <Play className="mr-2 w-5 h-5" />
                Try Playground
              </a>
            </Button>
          </div>

          {/* Code Preview */}
          <div className="glass-card p-6 text-left max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="ml-4 text-sm text-muted-foreground font-mono">api-example.js</span>
            </div>
            <pre className="code-block overflow-x-auto">
              <code className="text-sm">
{`const response = await fetch('https://your-api.searchapi.io/search', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    engine: 'google',
    query: 'best coffee shops',
    location: 'New York, NY'
  })
});

const results = await response.json();
console.log(results.organic_results);`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
