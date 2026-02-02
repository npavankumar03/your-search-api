import { Search, ShoppingBag, Map, Image, Video, Newspaper } from "lucide-react";

const engines = [
  { name: "Google Search", icon: Search, color: "text-primary" },
  { name: "Google Shopping", icon: ShoppingBag, color: "text-glow-purple" },
  { name: "Google Maps", icon: Map, color: "text-green-400" },
  { name: "Google Images", icon: Image, color: "text-glow-blue" },
  { name: "YouTube", icon: Video, color: "text-red-400" },
  { name: "Google News", icon: Newspaper, color: "text-yellow-400" },
];

const SearchEngines = () => {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            20+ Search Engines <span className="glow-text">Supported</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Access structured data from all major search engines and platforms with a single unified API.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <span className="text-muted-foreground">+ Bing, Yahoo, DuckDuckGo, Baidu, Yandex, and more...</span>
        </div>
      </div>
    </section>
  );
};

export default SearchEngines;
