import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">SearchAPI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
            Documentation
          </Link>
          <Link to="/job-scraper" className="text-muted-foreground hover:text-foreground transition-colors">
            Job Scraper
          </Link>
          <a href="#playground" className="text-muted-foreground hover:text-foreground transition-colors">
            Playground
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="#playground">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Try Free API
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
