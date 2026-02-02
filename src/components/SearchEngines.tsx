import { Search, Globe, Chrome } from "lucide-react";

const engines = [
  { name: "Google", icon: Chrome, color: "text-green-400", main: true },
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

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {engines.map((engine, index) => (
            <div
              key={engine.name}
              className={`glass-card p-6 text-center hover:border-primary/50 transition-all duration-300 group cursor-pointer ${engine.main ? 'ring-2 ring-primary/50' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {engine.main && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Main</span>
              )}
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
