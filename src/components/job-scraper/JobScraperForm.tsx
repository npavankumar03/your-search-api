import { useState } from 'react';
import { Search, Settings2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { TableSelector } from './TableSelector';

interface JobScraperFormProps {
  onSubmit: (options: {
    query: string;
    platforms: string[];
    limit: number;
    filterDuplicates: boolean;
    dedupeTableId: string | null;
    saveToTableId: string | null;
    usaOnly: boolean;
  }) => void;
  isLoading: boolean;
}

export function JobScraperForm({ onSubmit, isLoading }: JobScraperFormProps) {
  const [query, setQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    ATS_PLATFORMS.filter(p => !['workday', 'icims', 'taleo', 'successfactors'].includes(p.id)).map(p => p.id)
  );
  const [limit, setLimit] = useState(400);
  const [filterDuplicates, setFilterDuplicates] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [dedupeTableId, setDedupeTableId] = useState<string | null>(null);
  const [saveToTableId, setSaveToTableId] = useState<string | null>(null);
  const [usaOnly, setUsaOnly] = useState(false);

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
      dedupeTableId,
      saveToTableId,
      usaOnly,
    });
  };

  // Separate main and enterprise ATS platforms
  const mainPlatforms = ATS_PLATFORMS.filter(p => 
    !['workday', 'icims', 'taleo', 'successfactors'].includes(p.id)
  );
  const enterprisePlatforms = ATS_PLATFORMS.filter(p => 
    ['workday', 'icims', 'taleo', 'successfactors'].includes(p.id)
  );

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
            <SelectContent className="bg-background border-border z-50">
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* USA Only Filter */}
        <div className="flex items-end">
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <MapPin className="h-4 w-4 text-primary" />
            <Label htmlFor="usaOnly" className="text-sm text-foreground/80 cursor-pointer">
              USA Only
            </Label>
            <Switch
              id="usaOnly"
              checked={usaOnly}
              onCheckedChange={setUsaOnly}
            />
          </div>
        </div>
      </div>

      {/* Duplicate Filtering Toggle */}
      <div className="flex items-center justify-between">
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
        
        {filterDuplicates && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowTableOptions(!showTableOptions)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {showTableOptions ? 'Hide' : 'Configure'} Tables
          </Button>
        )}
      </div>

      {/* Table Options */}
      {filterDuplicates && showTableOptions && (
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
          <TableSelector
            selectedDedupeTable={dedupeTableId}
            selectedSaveTable={saveToTableId}
            onDedupeTableChange={setDedupeTableId}
            onSaveTableChange={setSaveToTableId}
          />
        </div>
      )}

      {/* Advanced Settings - Platform Selection */}
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
        <CollapsibleContent className="mt-4 space-y-4">
          {/* Main ATS Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground/80">ATS Platforms (Working)</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-primary h-auto p-0"
                onClick={() => {
                  const mainIds = mainPlatforms.map(p => p.id);
                  if (mainIds.every(id => selectedPlatforms.includes(id))) {
                    setSelectedPlatforms(prev => prev.filter(p => !mainIds.includes(p)));
                  } else {
                    setSelectedPlatforms(prev => [...new Set([...prev, ...mainIds])]);
                  }
                }}
              >
                {mainPlatforms.every(p => selectedPlatforms.includes(p.id)) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mainPlatforms.map(platform => (
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

          {/* Enterprise ATS Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground/80 flex items-center gap-2">
                Enterprise ATS 
                <span className="text-xs text-muted-foreground">(Limited - requires API access)</span>
              </Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {enterprisePlatforms.map(platform => (
                <div
                  key={platform.id}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all opacity-60
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
