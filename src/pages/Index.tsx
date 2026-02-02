import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SearchEngines from "@/components/SearchEngines";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Playground from "@/components/Playground";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <SearchEngines />
      <Stats />
      <Features />
      <Pricing />
      <Playground />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
