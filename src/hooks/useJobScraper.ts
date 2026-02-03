import { useState, useCallback } from 'react';
import { scrapeJobs, JobLink, ScrapeMetadata, ScrapeOptions } from '@/lib/api/job-scraper';

interface UseJobScraperState {
  jobs: JobLink[];
  metadata: ScrapeMetadata | null;
  isLoading: boolean;
  error: string | null;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export function useJobScraper() {
  const [state, setState] = useState<UseJobScraperState>({
    jobs: [],
    metadata: null,
    isLoading: false,
    error: null,
    progress: { current: 0, total: 0, percentage: 0 },
  });

  const scrape = useCallback(async (options: Omit<ScrapeOptions, 'offset' | 'sessionId'>) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      jobs: [],
      metadata: null,
      progress: { current: 0, total: options.limit, percentage: 0 },
    }));

    try {
      let allJobs: JobLink[] = [];
      let sessionId: string | null = null;
      let hasMore = true;
      let offset = 0;

      while (hasMore && allJobs.length < options.limit) {
        const response = await scrapeJobs({
          ...options,
          offset,
          sessionId,
        });

        if (!response.success || !response.jobs) {
          throw new Error(response.error || 'Failed to scrape jobs');
        }

        allJobs = [...allJobs, ...response.jobs];
        sessionId = response.metadata?.session_id || null;
        hasMore = response.metadata?.has_more || false;
        offset += 100;

        const percentage = Math.min((allJobs.length / options.limit) * 100, 100);

        setState(prev => ({
          ...prev,
          jobs: allJobs,
          metadata: response.metadata || null,
          progress: {
            current: allJobs.length,
            total: response.metadata?.total_jobs || options.limit,
            percentage,
          },
        }));

        // Small delay between batches to avoid overwhelming the UI
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));

      return { success: true, jobs: allJobs };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      jobs: [],
      metadata: null,
      isLoading: false,
      error: null,
      progress: { current: 0, total: 0, percentage: 0 },
    });
  }, []);

  return {
    ...state,
    scrape,
    reset,
  };
}
