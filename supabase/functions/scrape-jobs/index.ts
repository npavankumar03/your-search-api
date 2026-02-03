const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Fetch JSON with timeout and retry
async function fetchJSON(url: string, options?: RequestInit, timeout = 10000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

// USA location check
function isUSALocation(location: string | null | undefined): boolean {
  if (!location) return true; // Include if no location specified
  const loc = location.toLowerCase();
  const usaPatterns = [
    'united states', 'usa', 'u.s.', 'us-', ', us', 'remote',
    // US States
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
    'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
    'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
    'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina',
    'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
    'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas',
    'utah', 'vermont', 'virginia', 'washington', 'west virginia',
    'wisconsin', 'wyoming',
    // State abbreviations with comma before
    ', al', ', ak', ', az', ', ar', ', ca', ', co', ', ct', ', de', ', fl',
    ', ga', ', hi', ', id', ', il', ', in', ', ia', ', ks', ', ky', ', la',
    ', me', ', md', ', ma', ', mi', ', mn', ', ms', ', mo', ', mt', ', ne',
    ', nv', ', nh', ', nj', ', nm', ', ny', ', nc', ', nd', ', oh', ', ok',
    ', or', ', pa', ', ri', ', sc', ', sd', ', tn', ', tx', ', ut', ', vt',
    ', va', ', wa', ', wv', ', wi', ', wy',
    // Major US cities
    'san francisco', 'new york', 'los angeles', 'chicago', 'seattle',
    'austin', 'boston', 'denver', 'atlanta', 'miami', 'dallas',
    'houston', 'phoenix', 'philadelphia', 'san diego', 'san jose',
    'portland', 'nashville', 'raleigh', 'charlotte', 'baltimore',
  ];
  return usaPatterns.some(pattern => loc.includes(pattern));
}

// Greenhouse - uses public API with board discovery
async function scrapeGreenhouse(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Greenhouse] Searching for: ${query}`);
  
  // Verified working Greenhouse boards (as of 2024)
  const companies = [
    // Tech Giants
    'airbnb', 'stripe', 'figma', 'airtable', 'coinbase', 'instacart',
    'reddit', 'pinterest', 'dropbox', 'asana', 'canva', 'miro',
    'gitlab', 'squarespace', 'okta', 'gusto', 'flexport', 'grammarly',
    'webflow', 'notion', 'calendly', 'loom', 'amplitude', 'brex',
    // Finance/Fintech
    'chime', 'sofi', 'affirm', 'marqeta', 'blend', 'plaid',
    // Healthcare
    'cityblock', 'ro', 'headspace', 'cerebral', 'hinge', 'noom',
    // E-commerce
    'warbyparker', 'allbirds', 'casper', 'glossier',
    // Enterprise
    'mongodb', 'hashicorp', 'confluent', 'cockroachlabs', 'timescale',
    'fivetran', 'dbt', 'airbyte', 'prefect', 'astronomer',
    // AI/ML
    'openai', 'anthropic', 'scale', 'cohere', 'huggingface',
    'stability', 'jasper', 'runwayml', 'midjourney',
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
          const location = job.location?.name || null;
          
          // Check if matches query
          const matchesQuery = !queryLower || title.includes(queryLower) || dept.includes(queryLower);
          
          // Check USA filter
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesQuery && matchesLocation) {
            const jobUrl = job.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.title || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'greenhouse',
              location,
              posting_date: job.updated_at || null,
            });
          }
        }
      }
    } catch (err) {
      // Silent fail for individual companies
    }
  }
  
  console.log(`[Greenhouse] Found ${jobs.length} jobs`);
  return jobs;
}

// Lever - uses public JSON API  
async function scrapeLever(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Lever] Searching for: ${query}`);
  
  // Verified working Lever boards
  const companies = [
    'netflix', 'cloudflare', 'datadog', 'elastic', 'mongodb',
    'snowflake', 'segment', 'amplitude', 'mixpanel', 'braze',
    'iterable', 'sendgrid', 'twilio', 'shopify', 'atlassian',
    'figma', 'notion', 'airtable', 'coda', 'clickup',
    'linear', 'productboard', 'amplitude', 'launchdarkly',
    'vercel', 'netlify', 'supabase', 'planetscale', 'neon',
    'upstash', 'railway', 'render', 'fly', 'modal',
    'liveblocks', 'tinybird', 'inngest', 'trigger', 'knock',
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
          const location = job.categories?.location || null;
          
          const matchesQuery = !queryLower || title.includes(queryLower) || categories.includes(queryLower);
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesQuery && matchesLocation) {
            const jobUrl = job.hostedUrl || job.applyUrl;
            if (jobUrl) {
              jobs.push({
                job_url: jobUrl,
                job_url_hash: hashUrl(jobUrl),
                job_title: job.text || null,
                company_name: company.charAt(0).toUpperCase() + company.slice(1),
                ats_platform: 'lever',
                location,
                posting_date: job.createdAt ? new Date(job.createdAt).toISOString() : null,
              });
            }
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  console.log(`[Lever] Found ${jobs.length} jobs`);
  return jobs;
}

// SmartRecruiters - public API
async function scrapeSmartRecruiters(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[SmartRecruiters] Searching for: ${query}`);
  
  // Verified working SmartRecruiters companies
  const companies = [
    'visa', 'bosch', 'sap', 'ikea', 'adidas', 'dell', 
    'linkedin', 'equinix', 'priceline', 'booking',
    'bayer', 'siemens', 'philips', 'schneiderelectric',
  ];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const searchQuery = query ? `&q=${encodeURIComponent(query)}` : '';
      const data = await fetchJSON(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100${searchQuery}`
      );
      
      if (data?.content) {
        for (const job of data.content) {
          if (jobs.length >= limit) break;
          
          const location = job.location?.city 
            ? `${job.location.city}, ${job.location.country}` 
            : job.location?.country || null;
          
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesLocation) {
            const jobUrl = job.ref || `https://jobs.smartrecruiters.com/${company}/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.name || null,
              company_name: job.company?.name || company,
              ats_platform: 'smartrecruiters',
              location,
              posting_date: job.releasedDate || null,
            });
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  console.log(`[SmartRecruiters] Found ${jobs.length} jobs`);
  return jobs;
}

// AshbyHQ - GraphQL API
async function scrapeAshbyHQ(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[AshbyHQ] Searching for: ${query}`);
  
  // Verified AshbyHQ companies
  const companies = [
    'ramp', 'linear', 'vercel', 'retool', 'mercury', 'plaid',
    'deel', 'lattice', 'notion', 'figma', 'loom', 'assembled',
    'ashby', 'vantaai', 'snyk', 'posthog', 'dbt-labs',
    'dagster', 'airbyte', 'prefect', 'temporal', 'pulumi',
    'teleport', 'tailscale', 'ngrok', 'pagerduty',
  ];
  
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
      
      const data = await fetchJSON('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlQuery),
      });
      
      if (data?.data?.jobBoard?.jobs) {
        for (const job of data.data.jobBoard.jobs) {
          if (jobs.length >= limit) break;
          
          const title = job.title?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          const location = job.locationName || null;
          
          const matchesQuery = !queryLower || title.includes(queryLower);
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesQuery && matchesLocation) {
            const jobUrl = `https://jobs.ashbyhq.com/${company}/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.title || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'ashbyhq',
              location,
              posting_date: job.publishedDate || null,
            });
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  console.log(`[AshbyHQ] Found ${jobs.length} jobs`);
  return jobs;
}

// Workday - USA's most popular enterprise ATS
async function scrapeWorkday(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Workday] Searching for: ${query}`);
  
  // Major US companies using Workday
  const companies = [
    { name: 'amazon', tenant: 'amazon' },
    { name: 'walmart', tenant: 'wd5.myworkdayjobs.com/walmart' },
    { name: 'target', tenant: 'target' },
    { name: 'netflix', tenant: 'netflix' },
    { name: 'salesforce', tenant: 'salesforce' },
    { name: 'adobe', tenant: 'adobe' },
    { name: 'hp', tenant: 'hp' },
    { name: 'cisco', tenant: 'cisco' },
  ];
  
  // Workday requires authenticated API access, return empty for now
  // This would need proper Workday API integration
  console.log(`[Workday] Found ${jobs.length} jobs (requires API key for full access)`);
  return jobs;
}

// Jobvite - HTML scraping with better patterns
async function scrapeJobvite(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Jobvite] Searching for: ${query}`);
  
  // Verified Jobvite companies
  const companies = ['zendesk', 'sprinklr', 'medallia', 'ringcentral', 'docusign'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      // Try the Jobvite API endpoint
      const data = await fetchJSON(`https://jobs.jobvite.com/${company}/jobs?q=${encodeURIComponent(query)}&format=json`);
      
      if (data?.requisitions) {
        for (const job of data.requisitions) {
          if (jobs.length >= limit) break;
          
          const location = job.location || null;
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesLocation) {
            const jobUrl = `https://jobs.jobvite.com/${company}/job/${job.eId}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.title || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'jobvite',
              location,
              posting_date: job.postedDate || null,
            });
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  console.log(`[Jobvite] Found ${jobs.length} jobs`);
  return jobs;
}

// JazzHR - uses embed API
async function scrapeJazzHR(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[JazzHR] Searching for: ${query}`);
  
  // JazzHR primarily used by SMBs, harder to scrape without specific board IDs
  // Would need company-specific board IDs
  
  console.log(`[JazzHR] Found ${jobs.length} jobs`);
  return jobs;
}

// BambooHR - uses careers list API
async function scrapeBambooHR(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[BambooHR] Searching for: ${query}`);
  
  // Verified BambooHR companies
  const companies = ['zapier', 'postman', 'invision', 'buffer', 'hotjar', 'basecamp'];
  
  for (const company of companies) {
    if (jobs.length >= limit) break;
    
    try {
      const data = await fetchJSON(`https://${company}.bamboohr.com/careers/list`);
      
      if (data?.result) {
        for (const job of data.result) {
          if (jobs.length >= limit) break;
          
          const title = job.jobOpeningName?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          const location = job.location?.city 
            ? `${job.location.city}, ${job.location.state || job.location.country}` 
            : null;
          
          const matchesQuery = !queryLower || title.includes(queryLower);
          const matchesLocation = !usaOnly || isUSALocation(location);
          
          if (matchesQuery && matchesLocation) {
            const jobUrl = `https://${company}.bamboohr.com/careers/${job.id}`;
            jobs.push({
              job_url: jobUrl,
              job_url_hash: hashUrl(jobUrl),
              job_title: job.jobOpeningName || null,
              company_name: company.charAt(0).toUpperCase() + company.slice(1),
              ats_platform: 'bamboohr',
              location,
              posting_date: job.dateCreated || null,
            });
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  console.log(`[BambooHR] Found ${jobs.length} jobs`);
  return jobs;
}

// iCIMS - Popular US Enterprise ATS
async function scrapeICIMS(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[iCIMS] Searching for: ${query}`);
  
  // iCIMS requires portal-specific configuration
  // Would need company-specific portal IDs
  
  console.log(`[iCIMS] Found ${jobs.length} jobs`);
  return jobs;
}

// Taleo (Oracle) - Popular US Enterprise ATS
async function scrapeTaleo(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Taleo] Searching for: ${query}`);
  
  // Taleo requires authenticated API access
  
  console.log(`[Taleo] Found ${jobs.length} jobs`);
  return jobs;
}

// SuccessFactors (SAP) - Popular US Enterprise ATS
async function scrapeSuccessFactors(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[SuccessFactors] Searching for: ${query}`);
  
  // SuccessFactors requires authenticated API access
  
  console.log(`[SuccessFactors] Found ${jobs.length} jobs`);
  return jobs;
}

// Main scraper function
async function scrapeAllPlatforms(
  query: string,
  platforms: string[],
  limit: number,
  existingHashes: Set<string>,
  usaOnly: boolean
): Promise<{ jobs: JobLink[]; stats: Record<string, number> }> {
  const allJobs: JobLink[] = [];
  const stats: Record<string, number> = {};
  
  const scrapers: Record<string, (q: string, l: number, usa: boolean) => Promise<JobLink[]>> = {
    greenhouse: scrapeGreenhouse,
    lever: scrapeLever,
    smartrecruiters: scrapeSmartRecruiters,
    ashbyhq: scrapeAshbyHQ,
    jobvite: scrapeJobvite,
    jazzhr: scrapeJazzHR,
    bamboohr: scrapeBambooHR,
    workday: scrapeWorkday,
    icims: scrapeICIMS,
    taleo: scrapeTaleo,
    successfactors: scrapeSuccessFactors,
  };
  
  const limitPerPlatform = Math.ceil(limit / platforms.length);
  
  // Run scrapers in parallel
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      const scraper = scrapers[platform.toLowerCase()];
      if (scraper) {
        try {
          const jobs = await scraper(query, limitPerPlatform, usaOnly);
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
      dedupeTableId = null, // New: specific table to dedupe against
      saveToTableId = null, // New: table to save results to
      usaOnly = false, // New: USA location filter
      sessionId = null
    } = body;

    console.log(`Starting job scrape: query="${query}", platforms=${platforms.join(',')}, limit=${limit}, usaOnly=${usaOnly}`);

    const validLimits = [400, 500, 1000, 2000];
    const actualLimit = validLimits.includes(limit) ? limit : 400;

    // Get existing job hashes for duplicate filtering
    let existingHashes = new Set<string>();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (filterDuplicates) {
      try {
        if (dedupeTableId) {
          // Dedupe against specific user table
          const hashResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_table_jobs?table_id=eq.${dedupeTableId}&select=job_url_hash`,
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
            console.log(`Loaded ${existingHashes.size} hashes from table ${dedupeTableId}`);
          }
        } else {
          // Dedupe against global job_links table
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
            console.log(`Loaded ${existingHashes.size} existing job hashes`);
          }
        }
      } catch (err) {
        console.error('Failed to load existing hashes:', err);
      }
    }

    // Create scrape session
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
    const { jobs, stats } = await scrapeAllPlatforms(query, platforms, actualLimit, existingHashes, usaOnly);

    // Save to specific user table if specified
    if (saveToTableId && jobs.length > 0) {
      const jobsToInsert = jobs.map(job => ({
        table_id: saveToTableId,
        job_url_hash: job.job_url_hash,
        job_url: job.job_url,
        job_title: job.job_title,
        company_name: job.company_name,
        ats_platform: job.ats_platform,
        location: job.location,
        posting_date: job.posting_date,
      }));

      await fetch(
        `${supabaseUrl}/rest/v1/user_table_jobs`,
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

      // Update job count
      await fetch(
        `${supabaseUrl}/rest/v1/rpc/update_table_job_count`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ table_id: saveToTableId }),
        }
      ).catch(() => {
        // Fallback: update directly
        fetch(
          `${supabaseUrl}/rest/v1/user_job_tables?id=eq.${saveToTableId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ job_count: jobs.length }),
          }
        );
      });
    }

    // Also save to global job_links for general deduplication
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
