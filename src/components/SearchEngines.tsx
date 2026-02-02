import { Search, Globe } from "lucide-react";

const engines = [
  { name: "DuckDuckGo", icon: Search, color: "text-orange-400" },
  { name: "Bing", icon: Globe, color: "text-blue-400" },
];

const SearchEngines = () => {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Search Engines <span className="glow-text">Supported</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real search results via web scraping. No external API keys required.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 max-w-md mx-auto">
          {engines.map((engine, index) => (
            <div
              key={engine.name}
              className="glass-card p-6 text-center hover:border-primary/50 transition-all duration-300 group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <engine.icon className={`w-10 h-10 mx-auto mb-3 ${engine.color} group-hover:scale-110 transition-transform`} />
              <span className="text-sm font-medium">{engine.name}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <span className="text-muted-foreground">100% self-hosted. No external dependencies.</span>
        </div>
      </div>
    </section>
  );
};

export default SearchEngines;
