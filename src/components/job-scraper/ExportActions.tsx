import { Download, RefreshCw, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { JobLink, downloadCSV, generateCSV } from '@/lib/api/job-scraper';

interface ExportActionsProps {
  jobs: JobLink[];
  onReset: () => void;
  isLoading: boolean;
}

export function ExportActions({ jobs, onReset, isLoading }: ExportActionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleDownloadCSV = () => {
    if (jobs.length === 0) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(jobs, `job-links-${timestamp}.csv`);
    
    toast({
      title: 'CSV Downloaded',
      description: `${jobs.length} job links exported successfully.`,
    });
  };

  const handleCopyLinks = async () => {
    if (jobs.length === 0) return;
    
    const links = jobs.map(j => j.job_url).join('\n');
    await navigator.clipboard.writeText(links);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: 'Links Copied',
      description: `${jobs.length} job links copied to clipboard.`,
    });
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="default"
        onClick={handleDownloadCSV}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90"
      >
        <Download className="h-4 w-4 mr-2" />
        Download CSV
      </Button>
      
      <Button
        variant="outline"
        onClick={handleCopyLinks}
        disabled={isLoading}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy All Links
          </>
        )}
      </Button>
      
      <Button
        variant="ghost"
        onClick={onReset}
        disabled={isLoading}
        className="text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        New Search
      </Button>
    </div>
  );
}
