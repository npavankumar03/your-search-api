-- Table to store scraped job links for duplicate management
CREATE TABLE public.job_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_url TEXT NOT NULL,
  job_url_hash TEXT NOT NULL,
  job_title TEXT,
  company_name TEXT,
  ats_platform TEXT NOT NULL,
  location TEXT,
  posting_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_query TEXT,
  CONSTRAINT unique_job_url_hash UNIQUE (job_url_hash)
);

-- Create index for fast duplicate lookups
CREATE INDEX idx_job_links_url_hash ON public.job_links (job_url_hash);
CREATE INDEX idx_job_links_ats_platform ON public.job_links (ats_platform);
CREATE INDEX idx_job_links_created_at ON public.job_links (created_at DESC);

-- Table to log scraping sessions
CREATE TABLE public.scrape_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  requested_limit INTEGER NOT NULL DEFAULT 400,
  jobs_found INTEGER NOT NULL DEFAULT 0,
  duplicates_filtered INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_scrape_sessions_status ON public.scrape_sessions (status);

-- Enable RLS
ALTER TABLE public.job_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for job links (for duplicate checking)
CREATE POLICY "Anyone can read job links" 
ON public.job_links 
FOR SELECT 
USING (true);

-- System can insert job links
CREATE POLICY "System can insert job links" 
ON public.job_links 
FOR INSERT 
WITH CHECK (true);

-- Public read access for scrape sessions
CREATE POLICY "Anyone can read scrape sessions" 
ON public.scrape_sessions 
FOR SELECT 
USING (true);

-- System can manage scrape sessions
CREATE POLICY "System can insert scrape sessions" 
ON public.scrape_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update scrape sessions" 
ON public.scrape_sessions 
FOR UPDATE 
USING (true);