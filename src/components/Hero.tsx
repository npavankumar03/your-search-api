import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
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
              Powered by AI • 100% Free • No Auth Required
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Free & Open
            <br />
            <span className="glow-text">Search API</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            A completely free search API with no authentication required. 
            Self-host the frontend on your Linux server, API backend runs on cloud.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 text-lg" asChild>
              <a href="#playground">
                <ArrowRight className="mr-2 w-5 h-5" />
                Try It Now
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-secondary px-8 h-14 text-lg" asChild>
              <a href="/docs">
                <Play className="mr-2 w-5 h-5" />
                View Docs
              </a>
            </Button>
          </div>

          {/* Code Preview */}
          <div className="glass-card p-6 text-left max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="ml-4 text-sm text-muted-foreground font-mono">example.sh</span>
            </div>
            <pre className="code-block overflow-x-auto">
              <code className="text-sm">
{`# No API key needed - completely free!
curl -X POST "https://fcemwlfmgszodrprvpzu.supabase.co/functions/v1/search" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "best coffee shops in NYC",
    "engine": "google"
  }'`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
