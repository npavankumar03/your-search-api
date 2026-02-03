import { useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ATS_PLATFORMS, LIMIT_OPTIONS } from '@/lib/api/job-scraper';

interface JobScraperFormProps {
  onSubmit: (options: {
    query: string;
    platforms: string[];
    limit: number;
    filterDuplicates: boolean;
  }) => void;
  isLoading: boolean;
}

export function JobScraperForm({ onSubmit, isLoading }: JobScraperFormProps) {
  const [query, setQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    ATS_PLATFORMS.map(p => p.id)
  );
  const [limit, setLimit] = useState(400);
  const [filterDuplicates, setFilterDuplicates] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) return;
    
    onSubmit({
      query,
      platforms: selectedPlatforms,
      limit,
      filterDuplicates,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="query" className="text-foreground/80">
          Job Role or Keywords
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty to scrape all available jobs from selected platforms
        </p>
      </div>

      {/* Quick Settings */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-foreground/80 mb-2 block">Max Results</Label>
          <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="filterDuplicates"
              checked={filterDuplicates}
              onCheckedChange={(checked) => setFilterDuplicates(checked as boolean)}
            />
            <Label htmlFor="filterDuplicates" className="text-sm text-foreground/80 cursor-pointer">
              Filter duplicates from previous searches
            </Label>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Platform Selection
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground/80">ATS Platforms</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-primary h-auto p-0"
                onClick={() => {
                  if (selectedPlatforms.length === ATS_PLATFORMS.length) {
                    setSelectedPlatforms([]);
                  } else {
                    setSelectedPlatforms(ATS_PLATFORMS.map(p => p.id));
                  }
                }}
              >
                {selectedPlatforms.length === ATS_PLATFORMS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ATS_PLATFORMS.map(platform => (
                <div
                  key={platform.id}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all
                    ${selectedPlatforms.includes(platform.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-secondary/30 hover:border-border'
                    }
                  `}
                  onClick={() => handlePlatformToggle(platform.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm font-medium">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        disabled={isLoading || selectedPlatforms.length === 0}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
            Scraping Jobs...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Start Scraping
          </>
        )}
      </Button>

      {selectedPlatforms.length === 0 && (
        <p className="text-sm text-destructive text-center">
          Please select at least one ATS platform
        </p>
      )}
    </form>
  );
}
