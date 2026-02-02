import { Zap, Shield, Globe, Clock, Code2, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Average response time under 2 seconds. Get real-time search results instantly.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC2 compliant infrastructure with encrypted data transmission and storage.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Access localized results from 195+ countries and 50+ languages.",
  },
  {
    icon: Clock,
    title: "99.9% Uptime",
    description: "Enterprise-grade reliability with redundant infrastructure worldwide.",
  },
  {
    icon: Code2,
    title: "Simple Integration",
    description: "RESTful API with SDKs for Python, Node.js, Ruby, PHP, and more.",
  },
  {
    icon: BarChart3,
    title: "Rich Analytics",
    description: "Detailed usage analytics and monitoring dashboard included.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for <span className="glow-text">Scale</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're a startup or enterprise, our infrastructure handles billions of requests.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card p-8 hover:border-primary/30 transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
