import { AlertCircle, Briefcase, FileText, Shield, Zap } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { JobScraperForm } from '@/components/job-scraper/JobScraperForm';
import { JobResultsTable } from '@/components/job-scraper/JobResultsTable';
import { ScrapeProgress } from '@/components/job-scraper/ScrapeProgress';
import { ExportActions } from '@/components/job-scraper/ExportActions';
import { useJobScraper } from '@/hooks/useJobScraper';

const JobScraper = () => {
  const { jobs, metadata, isLoading, error, progress, scrape, reset } = useJobScraper();

  const handleSubmit = async (options: {
    query: string;
    platforms: string[];
    limit: number;
    filterDuplicates: boolean;
    dedupeTableId: string | null;
    saveToTableId: string | null;
  }) => {
    await scrape(options);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background glow effects */}
        <div className="hero-glow bg-primary/30 top-20 -left-40" />
        <div className="hero-glow bg-[hsl(var(--glow-purple))]/20 top-40 right-0" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Briefcase className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm text-primary font-medium">ATS Job Scraper</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Extract Job Links from
              <span className="glow-text block">7 Major ATS Platforms</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Scrape direct job posting links from Greenhouse, Lever, SmartRecruiters, 
              AshbyHQ, Jobvite, JazzHR, and BambooHR. Export to CSV for easy analysis.
            </p>
          </div>

          {/* Features badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm">Up to 2,000 Jobs</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm">Duplicate Filtering</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">CSV Export</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Search Form Card */}
            <div className="glass-card p-6 md:p-8">
              <JobScraperForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Progress */}
            {(isLoading || jobs.length > 0) && (
              <div className="glass-card p-6">
                <ScrapeProgress
                  progress={progress}
                  metadata={metadata}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Export Actions */}
            {jobs.length > 0 && (
              <ExportActions jobs={jobs} onReset={reset} isLoading={isLoading} />
            )}

            {/* Results Table */}
            {jobs.length > 0 && (
              <div className="glass-card p-6">
                <JobResultsTable jobs={jobs} isLoading={isLoading} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Enter Keywords</h3>
                <p className="text-sm text-muted-foreground">
                  Specify job roles or keywords to filter relevant positions, or leave empty for all jobs.
                </p>
              </div>
              
              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Select Platforms</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which ATS platforms to scrape and how many results you want.
                </p>
              </div>
              
              <div className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Export Results</h3>
                <p className="text-sm text-muted-foreground">
                  Download as CSV or copy all links. Duplicates from previous searches are automatically filtered.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default JobScraper;
