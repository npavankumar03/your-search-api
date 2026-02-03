const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ATS Platform configurations
const ATS_PLATFORMS = {
  greenhouse: {
    name: 'Greenhouse',
    searchUrl: (query: string, page: number) => 
      `https://boards.greenhouse.io/embed/job_board?for=${encodeURIComponent(query)}&page=${page}`,
    jobsApiUrl: (company: string) => 
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
  },
  lever: {
    name: 'Lever',
    searchUrl: (company: string) => 
      `https://jobs.lever.co/${company}`,
  },
  smartrecruiters: {
    name: 'SmartRecruiters',
    apiUrl: (company: string, offset: number) => 
      `https://api.smartrecruiters.com/v1/companies/${company}/postings?offset=${offset}&limit=100`,
  },
  ashbyhq: {
    name: 'AshbyHQ',
    apiUrl: (company: string) => 
      `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`,
  },
  jobvite: {
    name: 'Jobvite',
    searchUrl: (company: string) => 
      `https://jobs.jobvite.com/${company}/jobs`,
  },
  jazzhr: {
    name: 'JazzHR',
    searchUrl: (company: string) => 
      `https://${company}.applytojob.com/apply`,
  },
  bamboohr: {
    name: 'BambooHR',
    searchUrl: (company: string) => 
      `https://${company}.bamboohr.com/careers`,
  },
};

// Simple hash function for deduplication
function hashUrl(url: string): string {
  let hash = 0;
  const str = url.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Fetch HTML with timeout
async function fetchHTML(url: string, timeout = 15000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetch JSON with timeout
async function fetchJSON(url: string, options?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

interface JobLink {
  job_url: string;
  job_url_hash: string;
  job_title: string | null;
  company_name: string | null;
  ats_platform: string;
  location: string | null;
  posting_date: string | null;
}

// Scrape Greenhouse jobs via their public API
async function scrapeGreenhouse(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Greenhouse] Searching for companies matching: ${query}`);
  
  // Common tech companies on Greenhouse - search by company board
  const companies = [
    'airbnb', 'stripe', 'figma', 'notion', 'airtable', 'discord', 'plaid',
    'coinbase', 'robinhood', 'doordash', 'instacart', 'lyft', 'uber',
    'twitch', 'reddit', 'pinterest', 'snap', 'tiktok', 'spotify',
    'netflix', 'dropbox', 'asana', 'monday', 'canva', 'miro',
  ];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const data = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
      
      if (data?.jobs) {
        for (const job of data.jobs) {
          if (jobs.length >= limit) break;
          
          const title = job.title?.toLowerCase() || '';
          const dept = job.departments?.[0]?.name?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          
          if (title.includes(queryLower) || dept.includes(queryLower) || queryLower === '') {
            const jobUrl = job.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.title || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'greenhouse',
              location: job.location?.name || null,
              posting_date: job.updated_at || null,
            });
          }
        }
      }
    } catch (err) {
      console.log(`[Greenhouse] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[Greenhouse] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape Lever jobs
async function scrapeLever(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Lever] Searching for: ${query}`);
  
  const companies = [
    'twitch', 'netflix', 'databricks', 'confluent', 'hashicorp',
    'cloudflare', 'datadog', 'elastic', 'mongodb', 'snowflake',
    'segment', 'amplitude', 'mixpanel', 'braze', 'iterable',
  ];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const data = await fetchJSON(`https://api.lever.co/v0/postings/${company}?mode=json`);
      
      if (Array.isArray(data)) {
        for (const job of data) {
          if (jobs.length >= limit) break;
          
          const title = job.text?.toLowerCase() || '';
          const categories = JSON.stringify(job.categories || {}).toLowerCase();
          const queryLower = query.toLowerCase();
          
          if (title.includes(queryLower) || categories.includes(queryLower) || queryLower === '') {
            const jobUrl = job.hostedUrl || job.applyUrl;
            if (jobUrl) {
              jobs.push({
                job_url: jobUrl,
                job_url_hash: hashUrl(jobUrl),
                job_title: job.text || null,
                company_name: company.charAt(0).toUpperCase() + company.slice(1),
                ats_platform: 'lever',
                location: job.categories?.location || null,
                posting_date: job.createdAt ? new Date(job.createdAt).toISOString() : null,
              });
            }
          }
        }
      }
    } catch (err) {
      console.log(`[Lever] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[Lever] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape SmartRecruiters jobs
async function scrapeSmartRecruiters(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[SmartRecruiters] Searching for: ${query}`);
  
  const companies = ['visa', 'adidas', 'bosch', 'sap', 'ikea', 'mcdonalds'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const data = await fetchJSON(`https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`);
      
      if (data?.content) {
        for (const job of data.content) {
          if (jobs.length >= limit) break;
          
          const title = job.name?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          
          if (title.includes(queryLower) || queryLower === '') {
            const jobUrl = job.ref || `https://jobs.smartrecruiters.com/${company}/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.name || null,
              company_name: job.company?.name || company,
              ats_platform: 'smartrecruiters',
              location: job.location?.city ? `${job.location.city}, ${job.location.country}` : null,
              posting_date: job.releasedDate || null,
            });
          }
        }
      }
    } catch (err) {
      console.log(`[SmartRecruiters] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[SmartRecruiters] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape AshbyHQ jobs via GraphQL API
async function scrapeAshbyHQ(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[AshbyHQ] Searching for: ${query}`);
  
  const companies = ['notion', 'ramp', 'plaid', 'figma', 'linear', 'vercel', 'retool'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const graphqlQuery = {
        operationName: 'ApiJobBoardWithTeams',
        variables: { organizationHostedJobsPageName: company },
        query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
            jobs {
              id
              title
              locationName
              employmentType
              publishedDate
            }
          }
        }`
      };
      
      const response = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
      });
      
      const data = await response.json();
      
      if (data?.data?.jobBoard?.jobs) {
        for (const job of data.data.jobBoard.jobs) {
          if (jobs.length >= limit) break;
          
          const title = job.title?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          
          if (title.includes(queryLower) || queryLower === '') {
            const jobUrl = `https://jobs.ashbyhq.com/${company}/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.title || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'ashbyhq',
              location: job.locationName || null,
              posting_date: job.publishedDate || null,
            });
          }
        }
      }
    } catch (err) {
      console.log(`[AshbyHQ] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[AshbyHQ] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape Jobvite (HTML parsing)
async function scrapeJobvite(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Jobvite] Searching for: ${query}`);
  
  const companies = ['zendesk', 'sprinklr', 'medallia'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const html = await fetchHTML(`https://jobs.jobvite.com/${company}/search?q=${encodeURIComponent(query)}`);
      
      // Parse job links from HTML
      const jobMatches = html.matchAll(/<a[^>]*href="(\/[^"]*\/job\/[^"]+)"[^>]*>([^<]+)<\/a>/gi);
      
      for (const match of jobMatches) {
        if (jobs.length >= limit) break;
        
        const jobUrl = `https://jobs.jobvite.com${match[1]}`;
        jobs.push({
          job_url: jobUrl,
          job_url_hash: hashUrl(jobUrl),
          job_title: match[2]?.trim() || null,
          company_name: company.charAt(0).toUpperCase() + company.slice(1),
          ats_platform: 'jobvite',
          location: null,
          posting_date: null,
        });
      }
    } catch (err) {
      console.log(`[Jobvite] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[Jobvite] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape JazzHR (HTML parsing)
async function scrapeJazzHR(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[JazzHR] Searching for: ${query}`);
  
  // JazzHR uses company-specific subdomains
  const companies = ['acmecorp', 'techstartup', 'innovate'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const html = await fetchHTML(`https://${company}.applytojob.com/apply`);
      
      // Parse job links
      const jobMatches = html.matchAll(/<a[^>]*href="([^"]*\/apply\/[^"]+)"[^>]*>([^<]*)<\/a>/gi);
      
      for (const match of jobMatches) {
        if (jobs.length >= limit) break;
        
        const jobUrl = match[1].startsWith('http') ? match[1] : `https://${company}.applytojob.com${match[1]}`;
        const title = match[2]?.trim();
        
        if (title && (title.toLowerCase().includes(query.toLowerCase()) || query === '')) {
          jobs.push({
            job_url: jobUrl,
            job_url_hash: hashUrl(jobUrl),
            job_title: title,
            company_name: company,
            ats_platform: 'jazzhr',
            location: null,
            posting_date: null,
          });
        }
      }
    } catch (err) {
      console.log(`[JazzHR] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[JazzHR] Found ${jobs.length} jobs`);
  return jobs;
}

// Scrape BambooHR (HTML parsing)
async function scrapeBambooHR(query: string, limit: number): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[BambooHR] Searching for: ${query}`);
  
  const companies = ['zapier', 'buffer', 'automattic', 'gitlab'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      // BambooHR has a JSON API for job listings
      const data = await fetchJSON(`https://${company}.bamboohr.com/careers/list`);
      
      if (data?.result) {
        for (const job of data.result) {
          if (jobs.length >= limit) break;
          
          const title = job.jobOpeningName?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          
          if (title.includes(queryLower) || queryLower === '') {
            const jobUrl = `https://${company}.bamboohr.com/careers/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.jobOpeningName || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'bamboohr',
              location: job.location?.city ? `${job.location.city}, ${job.location.state}` : null,
              posting_date: job.dateCreated || null,
            });
          }
        }
      }
    } catch (err) {
      console.log(`[BambooHR] Failed for ${company}:`, err);
    }
  }
  
  console.log(`[BambooHR] Found ${jobs.length} jobs`);
  return jobs;
}

// Main scraper function that runs all platforms
async function scrapeAllPlatforms(
  query: string,
  platforms: string[],
  limit: number,
  existingHashes: Set<string>
): Promise<{ jobs: JobLink[]; stats: Record<string, number> }> {
  const allJobs: JobLink[] = [];
  const stats: Record<string, number> = {};
  
  const scrapers: Record<string, (q: string, l: number) => Promise<JobLink[]>> = {
    greenhouse: scrapeGreenhouse,
    lever: scrapeLever,
    smartrecruiters: scrapeSmartRecruiters,
    ashbyhq: scrapeAshbyHQ,
    jobvite: scrapeJobvite,
    jazzhr: scrapeJazzHR,
    bamboohr: scrapeBambooHR,
  };
  
  const limitPerPlatform = Math.ceil(limit / platforms.length);
  
  // Run scrapers in parallel with controlled concurrency
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      const scraper = scrapers[platform.toLowerCase()];
      if (scraper) {
        try {
          const jobs = await scraper(query, limitPerPlatform);
          return { platform, jobs };
        } catch (err) {
          console.error(`[${platform}] Scraper failed:`, err);
          return { platform, jobs: [] };
        }
      }
      return { platform, jobs: [] };
    })
  );
  
  // Collect results and filter duplicates
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { platform, jobs } = result.value;
      stats[platform] = 0;
      
      for (const job of jobs) {
        if (!existingHashes.has(job.job_url_hash) && allJobs.length < limit) {
          allJobs.push(job);
          stats[platform]++;
        }
      }
    }
  }
  
  return { jobs: allJobs, stats };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { 
      query = '', 
      platforms = ['greenhouse', 'lever', 'smartrecruiters', 'ashbyhq', 'jobvite', 'jazzhr', 'bamboohr'],
      limit = 400,
      offset = 0,
      filterDuplicates = true,
      sessionId = null
    } = body;

    console.log(`Starting job scrape: query="${query}", platforms=${platforms.join(',')}, limit=${limit}`);

    // Validate limit
    const validLimits = [400, 500, 1000, 2000];
    const actualLimit = validLimits.includes(limit) ? limit : 400;

    // Get existing job hashes for duplicate filtering
    let existingHashes = new Set<string>();
    
    if (filterDuplicates) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      try {
        const hashResponse = await fetch(
          `${supabaseUrl}/rest/v1/job_links?select=job_url_hash`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        
        if (hashResponse.ok) {
          const hashes = await hashResponse.json();
          existingHashes = new Set(hashes.map((h: any) => h.job_url_hash));
          console.log(`Loaded ${existingHashes.size} existing job hashes for deduplication`);
        }
      } catch (err) {
        console.error('Failed to load existing hashes:', err);
      }
    }

    // Create scrape session
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let scrapeSessionId = sessionId;
    if (!scrapeSessionId) {
      const sessionResponse = await fetch(
        `${supabaseUrl}/rest/v1/scrape_sessions`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            search_query: query,
            platforms,
            requested_limit: actualLimit,
            status: 'in_progress',
          }),
        }
      );
      
      if (sessionResponse.ok) {
        const [session] = await sessionResponse.json();
        scrapeSessionId = session.id;
      }
    }

    // Scrape all platforms
    const { jobs, stats } = await scrapeAllPlatforms(query, platforms, actualLimit, existingHashes);

    // Save new jobs to database
    if (jobs.length > 0) {
      const jobsToInsert = jobs.map(job => ({
        ...job,
        search_query: query,
      }));

      await fetch(
        `${supabaseUrl}/rest/v1/job_links`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
          },
          body: JSON.stringify(jobsToInsert),
        }
      );
    }

    // Update session status
    if (scrapeSessionId) {
      await fetch(
        `${supabaseUrl}/rest/v1/scrape_sessions?id=eq.${scrapeSessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobs_found: jobs.length,
            duplicates_filtered: existingHashes.size,
            status: 'completed',
            completed_at: new Date().toISOString(),
          }),
        }
      );
    }

    const responseTime = Date.now() - startTime;
    console.log(`Scrape completed: ${jobs.length} jobs found in ${responseTime}ms`);

    // Return paginated results
    const paginatedJobs = jobs.slice(offset, offset + 100);

    return new Response(
      JSON.stringify({
        success: true,
        jobs: paginatedJobs,
        metadata: {
          total_jobs: jobs.length,
          offset,
          limit: 100,
          has_more: offset + 100 < jobs.length,
          platform_stats: stats,
          duplicates_filtered: existingHashes.size,
          response_time_ms: responseTime,
          session_id: scrapeSessionId,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Scrape failed',
        response_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
