import { Progress } from '@/components/ui/progress';
import { ScrapeMetadata, ATS_PLATFORMS } from '@/lib/api/job-scraper';

interface ScrapeProgressProps {
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: ScrapeMetadata | null;
  isLoading: boolean;
}

export function ScrapeProgress({ progress, metadata, isLoading }: ScrapeProgressProps) {
  if (!isLoading && progress.current === 0) {
    return null;
  }

  const getPlatformColor = (platformId: string) => {
    return ATS_PLATFORMS.find(p => p.id === platformId)?.color || '#6b7280';
  };

  const getPlatformName = (platformId: string) => {
    return ATS_PLATFORMS.find(p => p.id === platformId)?.name || platformId;
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {isLoading ? 'Scraping in progress...' : 'Scraping complete'}
          </span>
          <span className="text-foreground font-medium">
            {progress.current.toLocaleString()} jobs found
          </span>
        </div>
        <Progress 
          value={progress.percentage} 
          className="h-2"
        />
      </div>

      {/* Platform Stats */}
      {metadata?.platform_stats && Object.keys(metadata.platform_stats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(metadata.platform_stats).map(([platform, count]) => (
            <div
              key={platform}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${getPlatformColor(platform)}15`,
                color: getPlatformColor(platform),
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getPlatformColor(platform) }}
              />
              {getPlatformName(platform)}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Additional Stats */}
      {metadata && !isLoading && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {metadata.duplicates_filtered > 0 && (
            <span>
              Filtered {metadata.duplicates_filtered.toLocaleString()} duplicates
            </span>
          )}
          <span>
            Completed in {(metadata.response_time_ms / 1000).toFixed(1)}s
          </span>
        </div>
      )}
    </div>
  );
}
