-- Create user_tables for custom duplicate filtering
CREATE TABLE public.user_job_tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  job_count integer NOT NULL DEFAULT 0
);

-- Create junction table for jobs in user tables
CREATE TABLE public.user_table_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id uuid NOT NULL REFERENCES public.user_job_tables(id) ON DELETE CASCADE,
  job_url_hash text NOT NULL,
  job_url text NOT NULL,
  job_title text,
  company_name text,
  ats_platform text NOT NULL,
  location text,
  posting_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(table_id, job_url_hash)
);

-- Enable RLS
ALTER TABLE public.user_job_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_table_jobs ENABLE ROW LEVEL SECURITY;

-- Public access policies (since no auth)
CREATE POLICY "Anyone can read user job tables" ON public.user_job_tables FOR SELECT USING (true);
CREATE POLICY "Anyone can create user job tables" ON public.user_job_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user job tables" ON public.user_job_tables FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete user job tables" ON public.user_job_tables FOR DELETE USING (true);

CREATE POLICY "Anyone can read user table jobs" ON public.user_table_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create user table jobs" ON public.user_table_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user table jobs" ON public.user_table_jobs FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_table_jobs_hash ON public.user_table_jobs(table_id, job_url_hash);
CREATE INDEX idx_user_table_jobs_table_id ON public.user_table_jobs(table_id);