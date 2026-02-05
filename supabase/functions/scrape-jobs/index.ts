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

// USA location check - ACCEPT jobs without location (benefit of doubt), REJECT explicit non-USA
function isUSALocation(location: string | null | undefined): boolean {
  // If no location specified, ACCEPT (benefit of doubt for US companies)
  if (!location || location.trim() === '') return true;
  const loc = location.toLowerCase().trim();
  
  // Explicit non-USA locations to REJECT
  const nonUSAPatterns = [
    // Canada
    'canada', 'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'edmonton',
    'ontario', 'british columbia', 'quebec', 'alberta', 'manitoba', 'saskatchewan',
    // UK & Europe
    'uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'england', 'scotland', 'wales',
    'germany', 'berlin', 'munich', 'frankfurt', 'hamburg',
    'france', 'paris', 'lyon', 'marseille',
    'spain', 'madrid', 'barcelona',
    'italy', 'rome', 'milan',
    'netherlands', 'amsterdam', 'rotterdam',
    'ireland', 'dublin',
    'poland', 'warsaw', 'krakow',
    'portugal', 'lisbon',
    'sweden', 'stockholm',
    'norway', 'oslo',
    'denmark', 'copenhagen',
    'finland', 'helsinki',
    'austria', 'vienna',
    'switzerland', 'zurich', 'geneva',
    'belgium', 'brussels',
    'czech', 'prague',
    'romania', 'bucharest',
    'hungary', 'budapest',
    // Middle East & Africa
    'israel', 'tel aviv',
    'south africa', 'johannesburg', 'cape town',
    'uae', 'dubai', 'abu dhabi',
    // Asia Pacific
    'india', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune', 'kolkata', 'noida', 'gurgaon',
    'china', 'beijing', 'shanghai', 'shenzhen', 'guangzhou', 'hangzhou',
    'japan', 'tokyo', 'osaka',
    'singapore',
    'australia', 'sydney', 'melbourne', 'brisbane', 'perth',
    'new zealand', 'auckland', 'wellington',
    'philippines', 'manila',
    'vietnam', 'ho chi minh', 'hanoi',
    'thailand', 'bangkok',
    'indonesia', 'jakarta',
    'malaysia', 'kuala lumpur',
    'taiwan', 'taipei',
    'hong kong',
    'korea', 'seoul',
    // Latin America
    'brazil', 'sao paulo', 'rio',
    'mexico', 'mexico city', 'guadalajara',
    'argentina', 'buenos aires',
    'colombia', 'bogota', 'medellin',
    'chile', 'santiago',
    'peru', 'lima',
    // EMEA / APAC / LATAM region codes
    'emea', 'apac', 'latam', 'europe', 'asia', 'eu only', 'uk only',
  ];
  
  // REJECT if location explicitly mentions non-USA
  if (nonUSAPatterns.some(pattern => loc.includes(pattern))) {
    return false;
  }
  
  // ACCEPT - if not explicitly non-USA, assume USA (these are US companies mostly)
  // Also explicitly match USA patterns for certainty
  const usaPatterns = ['united states', 'usa', 'u.s.a', 'u.s.', 'america'];
  
  if (usaPatterns.some(pattern => loc.includes(pattern))) {
    return true;
  }
  
  // Check for US state abbreviations
  const stateAbbrevMatch = loc.match(/(^|,\s*|\s)(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)(\s|,|$)/i);
  if (stateAbbrevMatch) {
    return true;
  }
  
  // Remote jobs - ACCEPT (most are US-based from US companies)
  if (loc.includes('remote')) {
    return true;
  }
  
  // DEFAULT: ACCEPT - benefit of doubt for US company job boards
  return true;
}

// Check if job was posted within last 30 days
function isRecentJob(postingDate: string | null | undefined): boolean {
  if (!postingDate) return true; // Include if no date (can't filter)
  try {
    const posted = new Date(postingDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return posted >= thirtyDaysAgo;
  } catch {
    return true; // Include if date parsing fails
  }
}

// ===================== COMPANY LISTS FROM CSV =====================

// Ashby companies (2000+ from CSV)
const ASHBY_COMPANIES = [
  'openai', 'kraken.com', 'flock-safety', 'perplexity', 'oneapp', 'notion', 'tenex', '1password',
  'whatnot', 'scribd', 'hims-and-hers', 'lilt', 'serverobotics', 'evenup', 'vanta', 'ramp',
  'socure', 'skydio', 'mach', 'confluent', 'radai', 'bjakcareer', 'onebrief', 'airapps',
  'dandy', 'quora', 'elevenlabs', 'rula', 'suno', 'writer', 'zip', 'bestow', 'clickup',
  'crusoe', 'hadrian-automation', 'rain', 'abridge', 'hippocratic-ai', 'lambda', 'meridianlink',
  'decagon', 'kikoff', 'netic', 'oscilar', 'sentilink', 'pear', 'permitflow', 'solace',
  'chainlink-labs', 'cohere', 'quartermaster', 'auditboard', 'camunda', 'commure', 'replit',
  'docker', 'lime', 'rapdev', 'sardine', 'wealth-com', 'assembledhq', 'deepgram', 'harvey',
  'meter', 'tessera-labs', 'candidhealth', 'roboflow', 'upside', 'atlan', 'baseten', 'betterup',
  'hockeystack', 'tools-for-humanity', 'webai', 'airwallex', 'arbiter-ai', 'cobot', 'delinea',
  'flosports', 'g2i', 'handshake', 'ontic', 'par-technology', 'patreon', 'real', 'eightsleep',
  'goodparty', 'reflect-orbital', 'second-nature', 'span', 'truelogic', 'weave', 'yobi',
  'anglehealth', 'bayesianhealth', 'canals', 'claylabs', 'growthx-ai', 'hoplynk', 'horizon3ai',
  'latitudecareers', 'lavendo', 'stedi', 'ambient.ai', 'blackpoint-cyber', 'brinc', 'column',
  'deel', 'humatahealth', 'jasper-ai', 'opengov', 'render', 'sierra', 'tilthq', 'traba',
  'adaption', 'atroposhealth', 'base-power', 'centivo', 'ema', 'etched', 'fluidstack',
  'gallatin', 'lilt-corporate', 'machinify', 'meshy', 'raspberry', 'sleeper', 'tennr', 'zapier',
  'akasa', 'cointracker', 'cyberhaven', 'graymatter-robotics', 'langchain', 'mercor', 'mural',
  'nest-health', 'norm-ai', 'outliant', 'parafin', 'pluralis-research', 'radar', 'reducto',
  'sandboxaq', 'scrunch-ai', 'valon', 'versemedical', 'achira', 'airgarage', 'binance.us',
  'brigit', 'classdojo', 'equip', 'happyrobot.ai', 'intus', 'ironcladhq', 'kindred', 'kodex',
  'monarchmoney', 'neon-health', 'scribe', 'socket', 'spearbit', 'sunday', 'uipath', 'assured',
  'basis-research', 'firecrawl', 'found', 'grindr-llc', 'hackerone', 'harmattan-ai', 'helion',
  'homevision', 'hopper', 'jerry.ai', 'jump-app', 'liquid-ai', 'lovable', 'mainstay', 'middesk',
  'mux', 'nexxen', 'people-data-labs', 'qualified', 'range', 'sesame', 'tapcheck', 'tarro',
  'titan-ai', 'virtahealth', 'withpulley', 'worldly', 'articul8', 'astronomer',
  'chainalysis-careers', 'citizen-health', 'clipboard', 'crogl', 'cruxclimate', 'dave',
  'demandbase', 'echo', 'evertune', 'fieldguide', 'freed', 'imprint', 'iodine-software',
  'kalshi', 'lgads', 'mai', 'maticrobots', 'n1', 'nerdwallet', 'nestveterinary', 'persona.ai',
  'prompt', 'relevanceai', 'sciemo', 'supabase', 'tavily', 'tensorwave', 'thebotcompany',
  'toogeza', 'traversal', 'vultr', 'acorns', 'aetherflux', 'alembic', 'ambiencehealthcare',
  'ansiblehealth', 'antares', 'anysignal', 'atomicsemi', 'augmodo', 'carian', 'compa',
  'compscience', 'crackenagi', 'distyl', 'eliseai', 'finvari', 'gecko-robotics', 'hatch',
  'havocai', 'healthaxis', 'homebase', 'jellyfish', 'jump', 'justwin', 'kit', 'lorikeet',
  'markarch', 'noetica', 'observeinc', 'oligo', 'oneleet', 'optery', 'p-1-ai', 'panoptyc',
  'pear-vc', 'planera', 'promise', 'protegrity', 'quilter', 'rho', 'safelease', 'sentry',
  'suzy', 'tabs', 'topline-pro', 'trace-machina', 'twelve-labs', 'unit410', 'yutori',
  'ziplines', 'zippymh', 'zyphra', '1mind', 'altimate', 'amca', 'apollo-graphql', 'artisan',
  'bland', 'broccoli', 'camber', 'cape', 'catena-labs', 'coderabbit', 'cred-platform',
  'dailypay', 'dominion-dynamics', 'elicit', 'epistemix', 'formenergy', 'frontcareers', 'g2',
  'gamechanger', 'gridunity', 'harperinsure', 'headstart', 'healnow', 'higharc', 'hiya',
  'infinity-constellation', 'kin', 'kong', 'magicschool', 'medal', 'medraai', 'mirage',
  'monq', 'mudflap', 'netgear', 'nextlinklabs', 'nexxa', 'niramedical', 'noda-ai', 'numeral',
  'observable-space', 'omni', 'orchard', 'phantom', 'posthog', 'pragmatike', 'preludesecurity',
  'profound', 'rebuy', 'red6', 'renuity', 'replicant', 'rescale', 'riveron', 'shiftkey',
  'skelar', 'speak', 'stack-ai', 'substack', 'tandem', 'togal-ai', 'tonal', 'transgrid-energy',
  'two-dots', 'vitvio', 'voxel', 'workos', 'aidkit', 'airops', 'antimetal', 'apiphany',
  'arb-interactive', 'arcade-ai', 'ashby', 'axionray', 'bastion', 'blockworks', 'braintrust',
  'brightwheel', 'centralhq', 'characterbio', 'chief', 'close', 'coder', 'continua',
  'cuesta-partners', 'delve', 'drata', 'duckbill', 'eloquentai', 'far.ai', 'find-tempo',
  'freshpaint', 'furiosa-ai', 'general-counsel-ai', 'genesis-therapeutics', 'goodship',
  'goventi', 'gridium', 'helius', 'highlightta', 'illumio', 'infisical', 'instructure',
  'january', 'junipersquare', 'lendable', 'lilt-production', 'limble', 'lynk', 'maximustribe',
  'northwoodspace', 'obvio', 'odyssey', 'onoshealth', 'orca', 'ouro-careers-page', 'palettelabs',
  'percepta', 'phare', 'poshmark', 'prophet-security', 'railway', 'rainforest-pay', 'read-ai',
  'reevo', 'replicated', 'rillet', 'ruby-labs', 'sailorhealth', 'sciforium', 'semperis',
  'simpleclosure', 'siro', 'skiffra-ai', 'smalls', 'southgeeks', 'stepful', 'sunnydata',
  'taekus', 'technitask', 'terranova', 'thatgamecompany', 'turnkey', 'twenty', 'vanilla',
  'videa.ai', 'watershed', 'xbowcareers', 'zefr', '0g', 'agent', 'anrok', 'answersnow',
  'anyscale', 'artemisanalytics', 'auger', 'august-health', 'aurelian', 'axle-health', 'barti',
  'beaconai', 'beamimpact', 'benepass', 'braiins', 'brainco', 'brevis-network', 'cambio',
  'cognition', 'craft.co', 'crosby', 'd-matrix', 'darwin', 'datacurve', 'devsavant',
  'directive', 'distributed-spectrum', 'dorafactory', 'dorahacks', 'dune', 'earnedwealth',
  'edvisorly', 'eye-security', 'eyetell', 'fathom.video', 'finni-health', 'fluency', 'flux',
  'focused', 'fortreum', 'foundationhealthcareers', 'furtherai', 'geoforce', 'gigaml', 'glide',
  'gptzero', 'greenlite', 'gridcare', 'haydenai', 'helm-ai', 'impulse', 'lark', 'latent',
  'livekit', 'lumilens', 'lyric', 'madhive', 'mangomint', 'maybern', 'mazedesign', 'mazehq',
  'mechanize', 'megazone', 'mindbeam', 'mintlify', 'moxfive', 'nabla', 'neon', 'newfront',
  'nudge', 'omi', 'opusclip', 'pactfi', 'pearlhealth', 'personainc.ai', 'popl', 'prokeep',
  'prolego', 'pulse', 'qawolf', 'reflectionai', 'reflexrobotics', 'replo', 'retell-ai', 'rogo',
  'roompricegenie', 'rythm', 'screenverse', 'seconddinner', 'seneca', 'sevenai', 'siftstack',
  'silnahealth.com', 'solink', 'starbridge', 'statista', 'statsig', 'swoop', 'taaraconnect',
  'tenexlabs', 'terrafirma', 'the-global-talent-co', 'the-zebra', 'tnt-growth', 'todyl',
  'tremendous', 'trunk-tools', 'twodots', 'tycho-ai', 'valonvm', 'vorticity', 'wander',
  'wellth', 'wynd-labs', 'yotta', 'zencastr', 'anthropic', 'discord', 'linear', 'cloudflare',
  'brex', 'lattice', 'superhuman', 'warp', 'sanity', 'mapbox', 'replicate', 'pinecone',
  'weaviate', 'llamaindex', 'pika', 'ideogram', 'genmo', 'gamma', 'vercel', 'railway',
  'inngest', 'clerk', 'nango', 'liveblocks', 'tinybird', 'trigger', 'knock', 'orb',
];

// Greenhouse companies (2500+ from CSV)
const GREENHOUSE_COMPANIES = [
  // Tech Giants & Unicorns
  'airbnb', 'stripe', 'figma', 'airtable', 'coinbase', 'instacart', 'reddit', 'pinterest',
  'dropbox', 'asana', 'canva', 'miro', 'gitlab', 'squarespace', 'okta', 'gusto', 'flexport',
  'grammarly', 'webflow', 'notion', 'calendly', 'loom', 'amplitude', 'brex', 'chime', 'sofi',
  'affirm', 'marqeta', 'blend', 'plaid', 'cityblock', 'ro', 'headspace', 'cerebral', 'hinge',
  'noom', 'warbyparker', 'allbirds', 'casper', 'glossier', 'mongodb', 'hashicorp', 'confluent',
  'cockroachlabs', 'timescale', 'fivetran', 'dbt', 'airbyte', 'prefect', 'astronomer', 'openai',
  'anthropic', 'scale', 'cohere', 'huggingface', 'stability', 'jasper', 'runwayml',
  // Companies from CSV
  '10xgenomics', '174powerglobal', '1password', '7shifts', '8451', 'a1msolutions', 'aarkiinc',
  'abacusfinancegroup', 'abarca', 'abbyy', 'abodo', 'absurdventures', 'acadia', 'acadiainc',
  'acadianassetmanagementllc', 'acadiapharmaceuticals', 'acryldata', 'adelphiresearch',
  'aechelontechnology', 'aegworldwide', 'affinipay1', 'afresh', 'afscareersmarketplace',
  'agecareers', 'agilesixv2', 'agoda', 'aift', 'airship', 'airspace', 'airwallex', 'akunacapital',
  'alertmedia', 'aligntech', 'alixpartners', 'allarahealth', 'allencontrolsystems',
  'allenintegratedsolutions', 'alltech', 'alpenlabs', 'alphafmcroles', 'altoslabs', 'alu',
  'alvys', 'amendconsulting', 'amenitiz', 'amount', 'amwell', 'analyst1', 'analyticservicesinc',
  'anaplan', 'antenna', 'anteriad', 'anyscale', 'aottechnologies', 'appdirect', 'appian',
  'applytopassagehealth', 'applytowhoosh', 'aquasec', 'aquia', 'archlynkllc', 'arcticwolfnetworks',
  'arctouch', 'ardengeospatial', 'array', 'arsys2', 'ascellahealth', 'ascentds', 'ascertain',
  'assemblyai', 'assuredguaranty', 'atek', 'atlassp', 'attotude', 'auditboard', 'augmentcomputing',
  'auth0', 'authenticx', 'autods', 'avegantcorp', 'aviatrix', 'axs', 'ayahealthcare',
  'azuritypharmaceuticals', 'b12', 'babelstreet', 'babylist', 'backblaze', 'bailedjobs',
  'bairesdev', 'barbaricum', 'bedrockrobotics', 'beewise', 'beta', 'betasoftsystems', 'betterment',
  'beyondfinance', 'beyondmissioncapable', 'bigid', 'bilderlings', 'bioptimus8', 'blacksky',
  'blackthornposting', 'blastpoint', 'blockstream', 'bloomerang', 'blueroseresearch', 'bluestaq',
  'bobsled', 'boldbusiness', 'bootcampinstructionalengagement', 'breezeway', 'bridgebio',
  'bseglobal', 'bstock', 'bstocksolutions', 'btig27', 'builder', 'buyersedgeplatformllc',
  'buzzrx', 'byheart', 'cafortune', 'cais', 'cakeai', 'calahealth', 'calicolabs', 'callibrity',
  'cambly', 'candex', 'candidly', 'canva', 'capitalfarmcredit', 'capstoneinvestmentpartners',
  'careportalinc', 'carrumhealth', 'casemanagementconsulting', 'casper', 'catapultsports',
  'cayabacare', 'caylent', 'ccah', 'cdataindia', 'censys', 'centriahealthcare', 'centrumhealth',
  'cerebral', 'ceribell', 'cerulacare', 'chainalysis', 'chargepoint', 'charliehealth',
  'chicagotrading', 'chicagotradingreferral', 'circle', 'circleso', 'civisanalytics', 'cleo',
  'clinchoice', 'clipboard', 'clockworksystems', 'cloudbeds', 'cloverhealth', 'clsgroup',
  'cobaltio', 'cobaltservicepartners', 'cockroachlabs', 'coda', 'coefficient', 'cognitotherapeutics',
  'color', 'commerceiq', 'compasspathways', 'compeerfinancial', 'compoundeye', 'concentric',
  'conga', 'connatix', 'connecteam', 'connectedcannabis', 'connectwise', 'connerstrongbuckelew',
  'consumeredge', 'convertkit', 'coreone', 'corestory', 'corpaxe', 'correlationone', 'cortex',
  'couchbaseinc', 'coursera', 'covetool', 'cranialtechnologies', 'crescendohealth', 'crescolabs',
  'cresta', 'crexi', 'criticalmass', 'crunchbase', 'cti', 'culturebiosciences', 'curaleaf',
  'curri', 'd2consulting', 'd2l', 'dashlane', 'datacor', 'datadoghq', 'dataseersai', 'datavant',
  'daybreakhealth', 'dbeaver', 'dbt', 'decisions', 'deepintent', 'deepwatch', 'desbytech',
  'devfuturetalent', 'devo', 'devtechnology', 'dexisconsultinggroup', 'dhpace', 'digibeeinc',
  'digitalocean', 'digitalocean98', 'diligent', 'diligentcorporation', 'diligentrobotics',
  'dimagi', 'dispatchhealthmanagement', 'distrokid', 'divcowest', 'divergehealth', 'dlhcorporation',
  'dominodatalab', 'domo', 'doordash', 'dotdashmeredith', 'dotmatics', 'drips', 'dtljobs',
  'dudeperfect', 'dxacirca', 'dyopath', 'easyship', 'edenhealth', 'edged', 'edged_infrastructure',
  'edmentum', 'edreports', 'education', 'effectual', 'efficientcomputer', 'eknengineering',
  'elasticco', 'electric', 'eleoshealth', 'emergingtalentrm', 'emplififr', 'ennoblecare',
  'ensco', 'entain', 'entera', 'enterpret', 'environmentalscienceassociates', 'epicbio', 'eplus',
  'eridan', 'etchedai', 'etelligentgroup', 'ethernovia', 'ethyca', 'everag', 'everdriven',
  'evermore', 'everpass', 'evertrue', 'evismart', 'evolutioniq', 'evolver', 'evolvevacationrental',
  'exabeam', 'excella', 'exiger', 'expel', 'expelconfidential', 'experian', 'extenteam',
  'fairlife', 'falconx', 'faradayfuture', 'fashionnova', 'federato', 'fedml', 'feedzai', 'fetch',
  'fidelityguarantylifeinternships', 'figure', 'firmpilotailawfirmmarketing', 'fleetio', 'fliff',
  'flovisionsolutions', 'flyzipline', 'fool', 'forbes', 'formationbio', 'formstack', 'forter',
  'fortisgames', 'fortra', 'fourhands', 'franklincovey', 'freeformfuturecorp', 'freestar',
  'freestonecapitalmanagement', 'freshprints', 'friendlyfranchisees', 'fulfil', 'fullstacklabs',
  'furtherearlycareer', 'galaxydigitalservices', 'galileofinancialtechnologies', 'gatherai',
  'gatikaiinc', 'genuine', 'getcruise', 'ghd', 'ghx', 'gipathfinder', 'github', 'gmrmarketing',
  'godaddy', 'goodnotes', 'goodtime', 'googlefiber', 'goprocareers', 'gotorq', 'gradientai',
  'gradle', 'graft', 'grahamcapitalmanagement', 'granum', 'grassrootsanalytics', 'gravwell',
  'greenpointtechnologies', 'greenhouse', 'greenlight', 'greymatterrobotics', 'gridwise',
  'growth', 'gtri', 'gundersenprivateequity', 'gyrolift', 'hallow', 'harness', 'harveyconsulting',
  'hellosign', 'hfi', 'highspot', 'hinge', 'hired', 'hiringbranch', 'hopin', 'hosplify',
  'hotjar', 'huntersstrategygroup', 'hypergiant', 'idealist', 'illumina', 'imply', 'incode',
  'indigofair', 'influitive', 'informaconnect', 'instabase', 'instacart', 'intercom', 'invesco',
  'iovlabs', 'ipreo', 'ironclad', 'ironmountain', 'janestreet', 'jasper', 'jobcase', 'jobcloud',
  'jobrapido', 'jolt', 'jumio', 'junglescout', 'justworks', 'karma', 'keen', 'keeper',
  'kettle', 'keystonestrategy', 'kira', 'klaviyo', 'klook', 'knopp', 'kontakt', 'koser',
  'kpmg', 'lacework', 'latitude', 'launchpotato', 'learnlux', 'lgelectronics', 'liftoff',
  'm3', 'mantrahealth', 'manychat', 'masterclass', 'mattermost', 'medeanalytics', 'medeloop',
  'mediacurrent', 'medialabaiinc', 'meriton', 'midihealth', 'mindbody', 'mindsquareag',
  'minitab', 'mlbevents', 'mobilityware', 'mochihealth', 'momence', 'monumentsoftwareinc',
  'monzo', 'morsecorp', 'moveworks', 'mqreferrals', 'mrbeastyoutube', 'nooks', 'northbeam',
  'notion', 'nyiso', 'okx', 'onevest', 'openai', 'opendoor', 'openloop', 'opentable',
  'ottoaviation', 'pagerhealth', 'pansophiclearning', 'paretocaptiveservicesllc', 'pathrobotics',
  'patientpoint', 'pax8', 'peakenergy', 'perscholashires', 'phiture2', 'physicsx', 'pingidentity',
  'pioneersquarelabs', 'planetlabs', 'publicinput', 'qgenda', 'qohash', 'readyset29',
  'redcellpartners', 'reflective', 'relativityspace', 'remotereferralboardinternaluseonly',
  'renaissancelearning', 'resortpass', 'rhymetec', 'roo', 'saltsecurity', 'scoutmotors',
  'seamlessai', 'seatgeek', 'seekout', 'sesamm', 'setpoint', 'shopify', 'shopltk', 'signifyd95',
  'siriuspoint', 'skildai-careers', 'smartasset', 'smartbear', 'snorkelai', 'sparrow',
  'spauldingridge', 'spektrum', 'srm', 'stackblitz', 'stackexchange', 'steercrm', 'stellarcyber',
  'stellarhealth', 'stratacareers', 'studycontractors', 'surveymonkey', 'swanbitcoin',
  'sweetgreen', 'teravision', 'thedigitrustgroup', 'theoakleafgroup', 'theoncologyinstitute',
  'theoriamedical', 'thesciongroupllc', 'thetradedesk', 'tide', 'torcrobotics', 'torq',
  'toshibaglobalcommercesolutions', 'travelperk', 'ttcglobal', 'turing', 'uareai', 'udemy',
  'unanet', 'unframe', 'universalaudio', 'updater', 'valon', 'vannahealth', 'vectranetworks',
  'veriforce', 'vertexservicepartners', 'verticalbridge', 'via', 'viamrobotics', 'virtahealth',
  'voxmedia', 'voyagertechnologiesinc', 'wavemm1', 'whatnot', 'wirewheel', 'wiz', 'wonderschool',
  'wrike', 'ylopo', 'yotpo', 'zetasummerinternship',
];

// Lever companies (700+ from CSV)
const LEVER_COMPANIES = [
  'jobgether', 'veeva', 'zoox', 'thinkahead', 'spotify', 'rackspace', 'palantir', 'attentive',
  'cesiumastro', 'brillio-2', 'includedhealth', 'aledade', 'voleon', 'webfx', 'bluelightconsulting',
  'anchorage', 'oowlish', 'shieldai', 'welocalize', 'whoop', 'beta', 'owner', 'imo-online',
  'ro', 'saronic', '3pillarglobal', 'aifund', 'arsiem', 'super-com', 'arcadia', 'luxurypresence',
  'vida', 'workos', 'cyderes', 'goodleap', 'bhhc', 'extremenetworks', 'gohighlevel', 'gopuff',
  'penumbrainc', 'questanalytics', 'zuru', 'agile-defense', 'articulate', 'filevine',
  'pointclickcare', 'trilogyfederal', 'wpromote', 'certik', 'field-ai', 'toptal', 'atmosera',
  'captivateiq', 'crypto', 'hhaexchange', 'kiddom', 'nominal', 'openx', 'perrknight',
  'blackcloak', 'chownow', 'cognite', 'desbytech', 'everbridge', 'ion', 'lumindigital',
  'matchgroup', 'mistral', 'pano', 'prosper', 'quizlet-2', 'rover', 'starcompliance',
  'activecampaign', 'analyticpartners', 'anavationllc', 'basis', 'bluesight', 'doranjones',
  'drivetrain', 'endpointclinical', 'missionwired', 'modeln', 'nava', 'pingwind', 'pryon',
  'regard', 'tryjeeves', 'uvcyber', 'anovium', 'arraylabs.io', 'bhg-inc', 'biointellisense',
  'bumbleinc', 'ccmr3', 'cimgroup', 'coalfire', 'color', 'curri', 'dnb', 'dodmg', 'entefy',
  'gauntlet', 'hive', 'isee', 'kraken123', 'loftorbital', 'offchainlabs', 'orcabiosystems',
  'plaid', 'redwoodcu', 'sensortower', 'shippo', 'swordhealth', 'teleport', 'tendo',
  'theathletic', 'trueplatform', 'waabi', 'windfalldata', 'additionwealth', 'allegiantair',
  'altarum', 'butterpayments', 'canarytechnologies', 'chefrobotics', 'danson-solutions',
  'dronesense', 'espace', 'foodsmart', 'glsllc', 'hatchit', 'jumpcloud', 'lightedge',
  'lumafield', 'mactores', 'nextech', 'omnidian', 'pattern', 'peerspace', 'radformation',
  'revealtech', 'spreedly', 'teecom', 'truezerotech', 'upguard', 'wealthfinancialtechnologies',
  'workwave', 'apptegy', 'artera', 'avivesolutions', 'bolster', 'cologix', 'coupa',
  'dronedeploy', 'fi', 'galvanick', 'insomniacdesign', 'ispace-inc', 'latitudeinc',
  'leverdemo-8', 'loopreturns', 'lyrahealth', 'magnals', 'magnetforensics', 'metabase',
  'npowermedicine', 'picklerobot', 'pivotal', 'playonsports', 'plus-2', 'protolabs',
  'reliable', 'robust-ai', 'saviynt', 'smart-working-solutions', 'talentneuron',
  'theblockcrypto', 'wyetechllc', 'xsolla', '2os', 'accurate', 'agiloft', 'airslate',
  'alertus', 'allata', 'anysignal', 'audinate', 'authentic8', 'binance', 'bounteous',
  'brightwheel', 'caremessage', 'cents', 'cgsfederal', 'ciandt', 'cmgx', 'cognitiv',
  'corebts', 'egen', 'elementsolutions', 'estenda', 'fliff', 'gausslabs', 'grailbio',
  'gridware', 'houzz', 'hrl', 'netflix', 'cloudflare', 'datadog', 'elastic', 'mongodb',
  'snowflake', 'segment', 'amplitude', 'mixpanel', 'braze', 'iterable', 'sendgrid',
  'twilio', 'shopify', 'atlassian', 'figma', 'notion', 'airtable', 'coda', 'clickup',
  'linear', 'productboard', 'launchdarkly', 'vercel', 'netlify', 'supabase', 'planetscale',
  'neon', 'upstash', 'railway', 'render', 'fly', 'modal', 'liveblocks', 'tinybird',
  'inngest', 'trigger', 'knock',
];

// SmartRecruiters companies (1400+ from CSV)
const SMARTRECRUITERS_COMPANIES = [
  'oneclick-ui', 'sonsoftinc', 'servicenow', 'experian', 'paloaltonetworks2', 'visa',
  'atriagroupllc', 'prosidianconsulting', 'krgtechnologyinc', 'nbcuniversal3', 'usm2',
  '360itprofessionals1', 'boschgroup', 'captechconsulting', 'integratedresourcesinc',
  'sonomaconsultinginc', 'nagarro1', 'intuitive', 'dev2', 'eurofins',
  'nextlevelbusinessservicesinc2', 'tectammina', 'collabera2', 'artechinformationsystemllc',
  'miratech1', 'comtechllc2', 'nielseniq', 'sgs', 'svtechsystemsinc1', 'mindlance2',
  'aristanetworks', 'devoteam', 'hitachisolutions', 'jobsforhumanity', 'publicstorage',
  'sandisk', 'satechnologiesinc4', 'fortunebrands', 'pyramidit1', 'soprasteria1', 'linkedin3',
  'talan', 'eproinc', 'jobsbridge1', 'turnitinllc', 'quantix', 'stemxpert1', 'abbvie',
  'cyberark1', 'louisdreyfuscompany', 'procoretechnologies', 'brightspeed', 'averydennison',
  'bluestone', 'canva', 'continental', 'kgstechnologygroupinc', 'llnl', 'aecom2', 'solidigm',
  'betasoftsystems3', 'cityofnewyork', 'lancesoftinc2', 'logicalparadigm1',
  'procomconsultantsgroup', 'renesaselectronics', 'saxonglobal', 'dstaff', 'freshworks',
  'harvarduniversity', 'itexcel2', 'northwesternmedicine', 'sqexpetsllc', 'usitsolutionsinc',
  'ustechsolutions2', 'atpco1', 'cricut', 'forbesadvisor', 'informagroupplc',
  'mcdonaldscorporation', 'sutherland', 'testingxperts', 'tietoevry1', 'trigyntechnologies1',
  'westerndigital', 'wjcompany', 'ayrglobalitsolutionsinc', 'dominos', 'insilicologix',
  'psgglobalsolutions2', 'sia', 'itexcelllc', 'xinnovit', 'agileenterprisesolutions',
  'altisource', 'aretetechnologiesinc', 'deegitinc3', 'infojiniinc1', 'lenmarconsultinginc',
  'mattelinc', 'netcompany1', 'version1', 'wellmarkinc', 'axiado', 'bet3651', 'blend360',
  'ifs1', 'info-ways', 'intelliswiftinc', 'oteemoinc', 'paynearme', 'technologynavigators',
  'thenielsencompany', 'askitconsulting', 'cystemslogicinc1', 'deliveryhero',
  'derextechnologiesinc', 'equinox', 'esolvitinc', 'implifyinc', 'linksolutionsinc',
  'metasys', 'paconsulting', 'paradigminfotech', 'procomservices', 'samsungsdsa',
  'smartrecruiters', 'thealtipgroup', 'tmsllc', 'turnertownsend', 'veoliaenvironnementsa',
  'vitol', 'agtechnologies1', 'altersolutions', 'assent', 'betasoftsysteminc', 'chabeztech',
  'codersdatallc', 'coface', 'cygnusprofessionalsinc2', 'dellfortechnologies', 'entain',
  'exparteinc', 'flywire1', 'globalchannelmanagementinc', 'idealforcellc', 'msxinternational',
  'precisiontechnologies1', 'respecinc', 'sajixsoftwaresolutionprivatelimited', 'sbtglobalinc',
  'syngentagroup', 'technogen', 'wix2', 'accionlabs2', 'achieve1', 'aumovio', 'betsol',
  'catasyshealth', 'crowellmoring', 'davidweekleyhomes', 'guardanthealth', 'visa', 'bosch',
  'sap', 'ikea', 'adidas', 'dell', 'linkedin', 'equinix', 'priceline', 'booking', 'bayer',
  'siemens', 'philips', 'schneiderelectric', 'tmobile', 'square', 'wise',
];

// Jobvite companies (250+ from CSV)
const JOBVITE_COMPANIES = [
  'leantechio', 'ness', 'windriver', 'varonis-internal', 'versa-networks', 'internetbrands',
  'isoftstone', 'windward-consulting', 'zones', 'ninjaone', 'parkland', 'pulsepoint',
  'synergy', 'actionet', 'biofiredx', 'carfax', 'evgo', 'loandepot', 'saama', 'sikichcareers',
  'uplight', 'innio', 'barracuda-networks-inc', 'careers', 'egnyte', 'evolvconsulting',
  'imprivata', 'cmgfi', 'forescout', 'insurity', 'itechag', 'lifenethealth', 'onecoprd',
  'vaniamgroup', 'amerisavecareers', 'avercareers', 'biomarin', 'double-negative-visual-effects',
  'edgeautonomy-careers', 'healthmapsolutions', 'leadventure', 'mini-circuits', 'neogenomics',
  'optimizely', 'parts-town', 'psi-pax', 'rivasolutions', 'simaai', 'transdevna-careers',
  'varonis', 'ventanamicro', 'webmd', 'windward', 'xdin', 'yodlee', 'absolute', 'bankerstoolbox',
  'braviumconsulting', 'civicplus', 'decisiveinstincts', 'epma', 'glidewelldental',
  'highpoint-global', 'idtus', 'nlight', 'oreilly-media', 'peopleconnectstaffing',
  'pointofrental', 'rhi', 'samtec', 'src-inc', 'victaulic', '4ccareers', 'aarete', 'agilysys',
  'blountfinefoods', 'brinkshome', 'dodgeconstructionnetwork', 'dotsecurity', 'dwt',
  'enphase-energy', 'equitymethods', 'garten', 'iboss', 'iowaclinic', 'lhhcareers',
  'marketshare', 'metaphaseconsulting', 'myhrpartnerinc', 'natixis', 'nuscale-power',
  'onsetech', 'ookla', 'openlending', 'panasas', 'pih', 'praxis-engineering',
  'probablymonsters', 'riskspan', 'siriuspoint', 'techsmith', 'trianz', 'vmdsystems',
  'zodiac', '360insights', '3degrees', 'act-on-software', 'aculocity', 'ainsworth',
  'alivecor', 'amberstudiocareers', 'amerisave', 'androcles-group', 'arcusbiosciencescareers',
  'arrise', 'aryaka', 'ashcompanies', 'asus', 'avaap-careers', 'ayla-networks', 'barracuda',
  'behaviorfrontiers', 'brahma', 'ccsfundraising', 'ccu', 'cei', 'chiefind',
  'communityoptions', 'consumer-tech', 'creditassociates', 'daveramsey', 'devo', 'dneg',
  'edelmanfinancialengines', 'edgeautonomy', 'emoneyadvisor', 'emoneyadvisor-review',
  'engagesmart', 'everyday-health-professional', 'feedingamerica', 'fieldcore', 'firstbank',
  'firstcash-holdings-inc', 'fullpower', 'gigamon', 'groupon', 'gvwgroup', 'harmonic',
  'hnicareers', 'hoar', 'idt', 'incontact', 'innio-test', 'inrix', 'invue', 'ip-infusion',
  'jobs-gigait', 'kymanox', 'kymetacorp', 'laserfiche', 'leadventure-india',
  'lean-solutions-group', 'leopardo', 'lincolnindustries', 'liquid-robotics-inc', 'longos',
  'lowensteinsandler', 'manhattanstrategy', 'maplesgroup', 'marvelmarketers', 'mattamyhomes',
  'mccarthy-building-co', 'medallia', 'meridianit', 'meridianlink', 'multivac', 'myeyedr',
  'nessusa', 'nice-actimize-old', 'nmr-consulting', 'oakwood-systems-group-inc',
  'orsini-healthcare', 'ovt', 'panynj', 'pathoras', 'patternai', 'peloton', 'pilgrims',
  'planful', 'praxisengineering', 'progress', 'qa-integration-migration', 'qtc',
  'recurrent-energy', 'redalpha', 'relatient', 'resgroup', 'resolver', 'responsetek',
  'rightpoint', 'rodan-and-fields-llc', 'rrpartners', 'sakura', 'samtec-ch', 'samtec-sp',
  'sdipresence', 'sews', 'sikich', 'sitecore', 'smart-communications', 'sofi', 'spartan',
  'starwoodhotels', 'suffolkuniversity', 'sumitomo-electric', 'symetri-usa',
  'synergyinsurance', 'tanium', 'themergermarketgroup', 'theopusgroup',
  'torrancememorialjobs', 'travis-credit-union', 'viking-cloud', 'vipre-security-group',
  'vistahigherlearning-careers', 'weston', 'wondrhealth', 'worldpantry', 'wppmedia',
  'xperi', 'yespreppublicschools', 'ziff-davis', 'ziff-davis-shopping', 'zendesk',
  'sprinklr', 'medallia', 'ringcentral', 'docusign',
];

// JazzHR companies (350+ from CSV)
const JAZZHR_COMPANIES = [
  'abrigo', 'acecoretech', 'aceinfo', 'acmepacket', 'aerojet', 'agiliti', 'akuminc',
  'alethiatechnologies', 'alink', 'alpha', 'alyssa', 'ambassadorservices', 'ameridrives',
  'amicus', 'amundsendavislaw', 'animaker', 'anvilogic', 'apexsoftware', 'apexsystems',
  'appliedbiosystems', 'arborcrownevents', 'arcadianit', 'arcompany', 'archtis', 'ardatagroup',
  'argusmedical', 'ariomex', 'artillerydigital', 'aspentech', 'athenasecurityinc', 'attainix',
  'auriga', 'avalara', 'aware', 'axiompath', 'backbonetechnologies', 'baisystemsinc', 'balihoo',
  'beamit', 'beehive', 'bendingspoons', 'bestpick', 'bidairo', 'bigmotion', 'bisint',
  'blackhill', 'blackmore', 'blueskyconnections', 'bluestellar', 'bluewavecomputing',
  'bounteouscareers', 'brightspotcorp', 'briskheat', 'brodeur', 'burstly', 'bushel',
  'cactuscomm', 'cadienttalent', 'calavista', 'calefy', 'cambioresearch', 'campuslogic',
  'canvera', 'cardlytics', 'carecloud', 'careeritinc', 'casenetllc', 'cayenta', 'cedarhs',
  'celegene', 'cengage', 'centria', 'cepheid', 'ceterasolutions', 'cfldynamics', 'cgi',
  'chancelight', 'chargepointinc', 'charterhouse', 'chemonics', 'childrensprimary',
  'cirrusaircraft', 'cityresources', 'civilengineer', 'clarifire', 'claritassec',
  'claritycompliance', 'clearpathinc', 'clicksoftware', 'cloudblue', 'cloudera', 'cloverleaf',
  'cmit', 'cobaltiron', 'codefuel', 'cogent', 'cogentive', 'collaborative', 'collegesteps',
  'colliers', 'coloradotech', 'columbusdataservices', 'commerceone', 'componentspro',
  'compuware', 'concursol', 'conexess', 'conifer', 'consumertrack', 'corelation',
  'coremarkint', 'cornerstone', 'coyotelogistics', 'cprime', 'creativelive', 'creospan',
  'crescenthealth', 'criblabs', 'crossover', 'crowdstrike', 'ctoai', 'cumminsallison',
  'cunexa', 'cybage', 'cyberdyne', 'cybergrants', 'cynerge', 'dac', 'daktronics',
  'dallasnews', 'damassets', 'danaconnect', 'danainfo', 'datadotcom', 'dataguise',
  'datalogic', 'dataminr', 'datawire', 'dayzim', 'deepinstinct', 'deliverysolutions',
  'deltek', 'demandgen', 'dentsuaegis', 'deque', 'desireatech', 'devada', 'develandtech',
  'devsecops', 'dexcom', 'dgs', 'digitalglobe', 'digitalguardian', 'digitalribbons',
  'digitaltarget', 'directsupply', 'discoveryinc', 'divvyhomes', 'dli', 'dolphincs',
  'domaintools', 'domore', 'donnelly', 'drivemode', 'drt', 'drumbi', 'duarte', 'dxc',
  'dynamicsignal', 'eainfo', 'eagleeyenetworks', 'eastbanctech', 'ebsco', 'eclipsys',
  'ecoatm', 'ecobee', 'ecolab', 'ecotouch', 'edaptive', 'edelman', 'edgewell', 'edgile',
  'edifecs', 'educare', 'ees', 'efolder', 'eharmony', 'eisneramper', 'elead',
  'electricpower', 'elementdigital', 'elevateservices', 'elsevier', 'embarcadero',
  'emergentmethod', 'emids', 'empyrean', 'enclavesecurity', 'endeva', 'energysavvy',
  'engineerzone', 'enid', 'entrinsik', 'envato', 'envisionrx', 'epiq', 'epochsolutions',
  'equator', 'eranyatech', 'ermi', 'esri', 'etq', 'eventbrite', 'eventhorizon',
  'evergreen', 'everise', 'evermind', 'evolution', 'ewit', 'exabeam', 'exactech',
  'exceleraatit', 'execonline', 'exela', 'exelon', 'expedia', 'experianauto', 'eyntra',
];

// BambooHR companies (from CSV)
const BAMBOOHR_COMPANIES = [
  'cornelisnetworks', 'www', 'erdosmiller', 'coherehealth', 'flocksafety', 'heliocampusmd',
  'moduscreate', 'nutrient', 'pulsenicshr', 'zapierinc', 'zapier', 'postman', 'invision',
  'buffer', 'hotjar', 'basecamp', 'doist', 'automattic', 'gitlab', 'toptal', 'cloudflare',
  'hashicorp', 'ghost', 'trello', 'atlassian', 'envato', 'dribbble', 'convertkit',
  'mailchimp', 'hubspot', 'intercom', 'stripe', 'figma', 'notion', 'airtable',
];

// BreezyHR companies (350+ from CSV)
const BREEZYHR_COMPANIES = [
  'shuvel', 'datamaxis', 'onebridge', 'nexthire', 'reveleer', 'transact-campus', 'vetsez',
  'givzey', 'expression-networks', 'fitnext-co', 'international-consulting-associates-inc',
  'resultstack', 'mind-computing', 'navaide', 'ninjaholdings', 'nuview', 'pyrovio',
  'blenderbox', 'jway-group', 'red-cup-it-inc', 'sunpower', 'atlas-technica', 'bitdeer',
  'concurrent-technologies-corporation', 'nuclearn-ai', 'vagaro', 'wolfe-llc', 'aarki',
  'applied-imagination', 'cross-screen-media', 'cybervance', 'edgescore', 'everblue',
  'ips-inc', 'isaac-health', 'jarvis-ml', 'localize', 'marketview-education-technology',
  'mood', 'peoplefluent', 'personified-tech', 'prodev', 'socradar', 'soulchi', 'superdispatch',
  'virtualitics', 'avasure', 'bluetread', 'bosun-25f9d5ec70da', 'clever-real-estate',
  'colonial-surety-company', 'dc-logic-group', 'delan-associates-inc', 'dozuki',
  'everspring-inc', 'eyesoneyecare', 'founders-workshop', 'freeeup', 'government-market-strategies',
  'harris-jones-staffing-recruiting-llc', 'hctec', 'inorg-global', 'k-b-global-services',
  'knexus-research-corp', 'leap-tools', 'maleda-tech', 'matrix-design-group', 'montage-marketing',
  'moser-consulting', 'netrix-global', 'p3adaptive', 'parkar', 'property-meld',
  'punch-cyber-analytics-group', 'seeknow', 'sentinel-blue', 'serverless-guru-llc', 'sparkbox',
  'tactibit-technologies-llc', 'thirdandgrove', 'urrly', 'velox', 'vianai-systems',
];

// Workable companies (400+ from CSV)
const WORKABLE_COMPANIES = [
  'jobgether', 'tp-link-usa-corp', 'jobs', 'keepersecurity', 'tiger-analytics',
  'capgemini-insurance', 'zoneit', 'credence', 'salvo-software', 'axiom-software-solution',
  'control-risks-6', 'qodeworld', 'dmvitservice', 'tekspikes', 'assist-rx', 'onlogic-inc',
  'protera', 'sand-cherry-associates-1', 'two95-international-inc-3', 'aravo', 'kentro',
  'moxfivecyber', 'prepass', 'ssc-hr', 'hireframe', 'meshsystems', 'mlabs', 'node',
  'optitrack', 'rokt', 'telestream', 'toyota-tsusho-systems', 'valsoft-corp', 'walter-careers',
  'wavestrong', 'anvilogic-inc', 'consumeraffairs-1', 'cooperidge-consulting-firm', 'curology',
  'fieldcrest-ventures', 'futurex-1', 'innopeaktech', 'innovaccer-analytics', 'kahunaworkforce',
  'knowhirematch-1', 'mindex', 'ordermygear', 'pgtek', 'prox-works', 'rise-robotics',
  'safranpassengerinnovations', 'shift-robotics', 'stanbridge', 'tetrascience',
  'the-logical-answer', 'trailofbits', 'with-intelligence', 'worthai', 'accellor',
  'apexinformatics', 'architectural-control-systems-inc', 'atec-spine', 'bask-health-1',
  'c-the-signs', 'clearlyagile', 'datafied-1', 'dojo-five', 'ecp-123', 'evotek-1',
  'geodelphi', 'greenberg-larraby-inc-gli', 'hellogov', 'huggingface', 'itsacheckmate-dot-com',
  'jiffyshirts', 'mod-op', 'murmuration', 'nfi-parts', 'optisigns-inc', 'perryhomes',
  'persimmons-ai', 'persuit-1', 'planetart', 'pony-dot-ai', 'reveal-health-tech',
  'sapsol-technologies-inc-7', 'scalepex', 'sense', 'sparkfun-electronics-2', 'staffordgray',
  'sweep360', 'techfirefly', 'therapynotes', 'toloka-ai', 'trl11-inc', 'xcellink', 'zaelab',
];

// Rippling companies (250+ from CSV)
const RIPPLING_COMPANIES = [
  'apexanalytix-careers', 'archehealth-job-board', 'armada-careers', 'bayrock-labs',
  'bloomgrowth', 'brevian-careers', 'camlin-careers', 'castellumai', 'cbts', 'cintal',
  'clubessential', 'column', 'commandlink', 'convo-communications-llc', 'crunchafi-llc',
  'dmrtechnologies', 'epic-software', 'evosus-inc', 'feed-media-group', 'fellers',
  'fello-careers', 'fidelis-technologies', 'firstfedcareers', 'formant-careers', 'framework',
  'free-market-health', 'genios-ai', 'harborcompliance', 'hyperfi', 'impartner-software',
  'inspectoriocareers', 'invita-healthcare-technologies', 'ioactive-tc', 'issa',
  'keeblerhealth', 'kuvare-jobs', 'lavender-careers', 'legalontech-inc', 'lender-toolkit',
  'leverage-companies', 'liminal', 'lisinski-law-firm', 'lmg-technology-services',
  'loti-ai-inc', 'marketonce', 'ncd', 'netatwork', 'opaque', 'opennetworks', 'openyield',
  'parentsquare', 'pendulum-intelligence-jobs', 'phase2-careers', 'plmrcareers',
  'remote-legal', 'rsa-security', 'safety-radar-careers', 'scratch-financial',
  'search-leaders-llc', 'seattle-credit-union-careers', 'serviceupcareers', 'sheerid',
  'shipium', 'signaladvisors', 'smartwyre', 'solv-health', 'supplierio', 'telemed2u',
  'useorigin', 'utility', 'vheda-health', 'widewail', 'zivian-health-inc',
];

// ===================== SCRAPER FUNCTIONS =====================

// Greenhouse - uses public API with board discovery
async function scrapeGreenhouse(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Greenhouse] Searching for: ${query}, companies: ${GREENHOUSE_COMPANIES.length}`);
  
  // Limit concurrent requests
  const batchSize = 20;
  const batches = [];
  for (let i = 0; i < GREENHOUSE_COMPANIES.length && jobs.length < limit; i += batchSize) {
    batches.push(GREENHOUSE_COMPANIES.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    if (jobs.length >= limit) break;
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          const data = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
          const companyJobs: JobLink[] = [];
          
          if (data?.jobs) {
            for (const job of data.jobs) {
              const title = job.title?.toLowerCase() || '';
              const dept = job.departments?.[0]?.name?.toLowerCase() || '';
              const queryLower = query.toLowerCase();
              const location = job.location?.name || null;
              const postingDate = job.updated_at || null;
              
              const matchesQuery = !queryLower || title.includes(queryLower) || dept.includes(queryLower);
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesQuery && matchesLocation && isRecent) {
                const jobUrl = job.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${job.id}`;
                companyJobs.push({
                  job_url: jobUrl,
                  job_url_hash: hashUrl(jobUrl),
                  job_title: job.title || null,
                  company_name: company.charAt(0).toUpperCase() + company.slice(1),
                  ats_platform: 'greenhouse',
                  location,
                  posting_date: postingDate,
                });
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[Greenhouse] Found ${jobs.length} jobs`);
  return jobs;
}

// Lever - uses public JSON API  
async function scrapeLever(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Lever] Searching for: ${query}, companies: ${LEVER_COMPANIES.length}`);
  
  const batchSize = 20;
  const batches = [];
  for (let i = 0; i < LEVER_COMPANIES.length && jobs.length < limit; i += batchSize) {
    batches.push(LEVER_COMPANIES.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    if (jobs.length >= limit) break;
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          const data = await fetchJSON(`https://api.lever.co/v0/postings/${company}?mode=json`);
          const companyJobs: JobLink[] = [];
          
          if (Array.isArray(data)) {
            for (const job of data) {
              const title = job.text?.toLowerCase() || '';
              const categories = JSON.stringify(job.categories || {}).toLowerCase();
              const queryLower = query.toLowerCase();
              const location = job.categories?.location || null;
              const postingDate = job.createdAt ? new Date(job.createdAt).toISOString() : null;
              
              const matchesQuery = !queryLower || title.includes(queryLower) || categories.includes(queryLower);
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesQuery && matchesLocation && isRecent) {
                const jobUrl = job.hostedUrl || job.applyUrl;
                if (jobUrl) {
                  companyJobs.push({
                    job_url: jobUrl,
                    job_url_hash: hashUrl(jobUrl),
                    job_title: job.text || null,
                    company_name: company.charAt(0).toUpperCase() + company.slice(1),
                    ats_platform: 'lever',
                    location,
                    posting_date: postingDate,
                  });
                }
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[Lever] Found ${jobs.length} jobs`);
  return jobs;
}

// SmartRecruiters - public API
async function scrapeSmartRecruiters(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[SmartRecruiters] Searching for: ${query}, companies: ${SMARTRECRUITERS_COMPANIES.length}`);
  
  const batchSize = 15;
  const batches = [];
  for (let i = 0; i < SMARTRECRUITERS_COMPANIES.length && jobs.length < limit; i += batchSize) {
    batches.push(SMARTRECRUITERS_COMPANIES.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    if (jobs.length >= limit) break;
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          const searchQuery = query ? `&q=${encodeURIComponent(query)}` : '';
          const data = await fetchJSON(
            `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100${searchQuery}`
          );
          const companyJobs: JobLink[] = [];
          
          if (data?.content) {
            for (const job of data.content) {
              const location = job.location?.city 
                ? `${job.location.city}, ${job.location.country}` 
                : job.location?.country || null;
              const postingDate = job.releasedDate || null;
              
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesLocation && isRecent) {
                // CORRECT: Use public job URL, NOT the API ref
                const jobUrl = `https://jobs.smartrecruiters.com/${company}/${job.id}`;
                companyJobs.push({
                  job_url: jobUrl,
                  job_url_hash: hashUrl(jobUrl),
                  job_title: job.name || null,
                  company_name: job.company?.name || company,
                  ats_platform: 'smartrecruiters',
                  location,
                  posting_date: postingDate,
                });
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[SmartRecruiters] Found ${jobs.length} jobs`);
  return jobs;
}

// AshbyHQ - GraphQL API
async function scrapeAshbyHQ(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[AshbyHQ] Searching for: ${query}, companies: ${ASHBY_COMPANIES.length}`);
  
  const batchSize = 15;
  const batches = [];
  for (let i = 0; i < ASHBY_COMPANIES.length && jobs.length < limit; i += batchSize) {
    batches.push(ASHBY_COMPANIES.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    if (jobs.length >= limit) break;
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
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
          const companyJobs: JobLink[] = [];
          
          if (data?.data?.jobBoard?.jobs) {
            for (const job of data.data.jobBoard.jobs) {
              const title = job.title?.toLowerCase() || '';
              const queryLower = query.toLowerCase();
              const location = job.locationName || null;
              const postingDate = job.publishedDate || null;
              
              const matchesQuery = !queryLower || title.includes(queryLower);
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesQuery && matchesLocation && isRecent) {
                const jobUrl = `https://jobs.ashbyhq.com/${company}/${job.id}`;
                companyJobs.push({
                  job_url: jobUrl,
                  job_url_hash: hashUrl(jobUrl),
                  job_title: job.title || null,
                  company_name: company.charAt(0).toUpperCase() + company.slice(1),
                  ats_platform: 'ashbyhq',
                  location,
                  posting_date: postingDate,
                });
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[AshbyHQ] Found ${jobs.length} jobs`);
  return jobs;
}

// Jobvite
async function scrapeJobvite(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[Jobvite] Searching for: ${query}, companies: ${JOBVITE_COMPANIES.length}`);
  
  const batchSize = 10;
  for (let i = 0; i < JOBVITE_COMPANIES.length && jobs.length < limit; i += batchSize) {
    const batch = JOBVITE_COMPANIES.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          const data = await fetchJSON(`https://jobs.jobvite.com/${company}/jobs?q=${encodeURIComponent(query)}&format=json`);
          const companyJobs: JobLink[] = [];
          
          if (data?.requisitions) {
            for (const job of data.requisitions) {
              const location = job.location || null;
              const postingDate = job.postedDate || null;
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesLocation && isRecent) {
                const jobUrl = `https://jobs.jobvite.com/${company}/job/${job.eId}`;
                companyJobs.push({
                  job_url: jobUrl,
                  job_url_hash: hashUrl(jobUrl),
                  job_title: job.title || null,
                  company_name: company.charAt(0).toUpperCase() + company.slice(1),
                  ats_platform: 'jobvite',
                  location,
                  posting_date: postingDate,
                });
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[Jobvite] Found ${jobs.length} jobs`);
  return jobs;
}

// JazzHR
async function scrapeJazzHR(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[JazzHR] Searching for: ${query}, companies: ${JAZZHR_COMPANIES.length}`);
  
  // JazzHR uses board IDs, limited access without them
  console.log(`[JazzHR] Found ${jobs.length} jobs`);
  return jobs;
}

// BambooHR
async function scrapeBambooHR(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  const jobs: JobLink[] = [];
  console.log(`[BambooHR] Searching for: ${query}, companies: ${BAMBOOHR_COMPANIES.length}`);
  
  const batchSize = 10;
  for (let i = 0; i < BAMBOOHR_COMPANIES.length && jobs.length < limit; i += batchSize) {
    const batch = BAMBOOHR_COMPANIES.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          const data = await fetchJSON(`https://${company}.bamboohr.com/careers/list`);
          const companyJobs: JobLink[] = [];
          
          if (data?.result) {
            for (const job of data.result) {
              const title = job.jobOpeningName?.toLowerCase() || '';
              const queryLower = query.toLowerCase();
              const location = job.location?.city 
                ? `${job.location.city}, ${job.location.state || job.location.country}` 
                : null;
              const postingDate = job.dateCreated || null;
              
              const matchesQuery = !queryLower || title.includes(queryLower);
              const matchesLocation = !usaOnly || isUSALocation(location);
              const isRecent = isRecentJob(postingDate);
              
              if (matchesQuery && matchesLocation && isRecent) {
                const jobUrl = `https://${company}.bamboohr.com/careers/${job.id}`;
                companyJobs.push({
                  job_url: jobUrl,
                  job_url_hash: hashUrl(jobUrl),
                  job_title: job.jobOpeningName || null,
                  company_name: company.charAt(0).toUpperCase() + company.slice(1),
                  ats_platform: 'bamboohr',
                  location,
                  posting_date: postingDate,
                });
              }
            }
          }
          return companyJobs;
        } catch {
          return [];
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          if (jobs.length < limit) jobs.push(job);
        }
      }
    }
  }
  
  console.log(`[BambooHR] Found ${jobs.length} jobs`);
  return jobs;
}

// Workday (requires API access)
async function scrapeWorkday(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  console.log(`[Workday] Requires API key for full access`);
  return [];
}

// iCIMS (requires portal configuration)
async function scrapeICIMS(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  console.log(`[iCIMS] Requires portal-specific configuration`);
  return [];
}

// Taleo (requires authenticated API)
async function scrapeTaleo(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  console.log(`[Taleo] Requires authenticated API access`);
  return [];
}

// SuccessFactors (requires authenticated API)
async function scrapeSuccessFactors(query: string, limit: number, usaOnly: boolean): Promise<JobLink[]> {
  console.log(`[SuccessFactors] Requires authenticated API access`);
  return [];
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
      dedupeTableId = null,
      saveToTableId = null,
      usaOnly = true,  // Always USA-only by default
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
      ).catch(() => {});
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
