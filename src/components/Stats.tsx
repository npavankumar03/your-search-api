const stats = [
  { value: "10B+", label: "API Requests Served" },
  { value: "50K+", label: "Active Developers" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<2s", label: "Avg Response Time" },
];

const Stats = () => {
  return (
    <section className="py-20 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold glow-text mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
