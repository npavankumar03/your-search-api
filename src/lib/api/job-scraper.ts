import { supabase } from '@/integrations/supabase/client';

export interface JobLink {
  job_url: string;
  job_url_hash: string;
  job_title: string | null;
  company_name: string | null;
  ats_platform: string;
  location: string | null;
  posting_date: string | null;
}

export interface ScrapeMetadata {
  total_jobs: number;
  offset: number;
  limit: number;
  has_more: boolean;
  platform_stats: Record<string, number>;
  duplicates_filtered: number;
  response_time_ms: number;
  session_id: string | null;
}

export interface ScrapeResponse {
  success: boolean;
  jobs?: JobLink[];
  metadata?: ScrapeMetadata;
  error?: string;
}

export interface ScrapeOptions {
  query: string;
  platforms: string[];
  limit: number;
  offset?: number;
  filterDuplicates?: boolean;
  sessionId?: string | null;
}

export const ATS_PLATFORMS = [
  { id: 'greenhouse', name: 'Greenhouse', color: '#3ab24a' },
  { id: 'lever', name: 'Lever', color: '#6366f1' },
  { id: 'smartrecruiters', name: 'SmartRecruiters', color: '#0ea5e9' },
  { id: 'ashbyhq', name: 'AshbyHQ', color: '#8b5cf6' },
  { id: 'jobvite', name: 'Jobvite', color: '#f97316' },
  { id: 'jazzhr', name: 'JazzHR', color: '#ec4899' },
  { id: 'bamboohr', name: 'BambooHR', color: '#22c55e' },
];

export const LIMIT_OPTIONS = [
  { value: 400, label: '400 jobs' },
  { value: 500, label: '500 jobs' },
  { value: 1000, label: '1,000 jobs' },
  { value: 2000, label: '2,000 jobs' },
];

export async function scrapeJobs(options: ScrapeOptions): Promise<ScrapeResponse> {
  const { data, error } = await supabase.functions.invoke('scrape-jobs', {
    body: {
      query: options.query,
      platforms: options.platforms,
      limit: options.limit,
      offset: options.offset || 0,
      filterDuplicates: options.filterDuplicates ?? true,
      sessionId: options.sessionId,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

export async function fetchMoreJobs(sessionId: string, offset: number): Promise<ScrapeResponse> {
  const { data, error } = await supabase.functions.invoke('scrape-jobs', {
    body: {
      sessionId,
      offset,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

export function generateCSV(jobs: JobLink[]): string {
  const headers = ['Job Title', 'Company', 'ATS Platform', 'Location', 'Posting Date', 'Job URL'];
  const rows = jobs.map(job => [
    job.job_title || '',
    job.company_name || '',
    job.ats_platform,
    job.location || '',
    job.posting_date ? new Date(job.posting_date).toLocaleDateString() : '',
    job.job_url,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCSV(jobs: JobLink[], filename: string = 'job-links.csv'): void {
  const csv = generateCSV(jobs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
