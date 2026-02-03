import { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobLink, ATS_PLATFORMS } from '@/lib/api/job-scraper';

interface JobResultsTableProps {
  jobs: JobLink[];
  isLoading?: boolean;
}

type SortField = 'job_title' | 'company_name' | 'ats_platform' | 'location' | 'posting_date';
type SortDirection = 'asc' | 'desc';

export function JobResultsTable({ jobs, isLoading }: JobResultsTableProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('posting_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const getPlatformColor = (platformId: string) => {
    return ATS_PLATFORMS.find(p => p.id === platformId)?.color || '#6b7280';
  };

  const getPlatformName = (platformId: string) => {
    return ATS_PLATFORMS.find(p => p.id === platformId)?.name || platformId;
  };

  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Apply search filter
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      result = result.filter(job =>
        job.job_title?.toLowerCase().includes(search) ||
        job.company_name?.toLowerCase().includes(search) ||
        job.location?.toLowerCase().includes(search)
      );
    }

    // Apply platform filter
    if (platformFilter !== 'all') {
      result = result.filter(job => job.ats_platform === platformFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (sortField === 'posting_date') {
        aVal = aVal ? new Date(aVal).getTime().toString() : '0';
        bVal = bVal ? new Date(bVal).getTime().toString() : '0';
      }

      const comparison = aVal.toString().localeCompare(bVal.toString());
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [jobs, searchFilter, platformFilter, sortField, sortDirection]);

  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedJobs.slice(start, start + itemsPerPage);
  }, [filteredAndSortedJobs, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedJobs.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  // Get unique platforms from the data
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(jobs.map(j => j.ats_platform));
    return ATS_PLATFORMS.filter(p => platforms.has(p.id));
  }, [jobs]);

  if (jobs.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No job links found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filter by title, company, or location..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-secondary/50 border-border/50"
          />
        </div>
        <Select
          value={platformFilter}
          onValueChange={(v) => {
            setPlatformFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-secondary/50 border-border/50">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {availablePlatforms.map(platform => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedJobs.length} of {filteredAndSortedJobs.length} results
        {filteredAndSortedJobs.length !== jobs.length && ` (${jobs.length} total)`}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('job_title')}
              >
                <span className="flex items-center">
                  Job Title <SortIcon field="job_title" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('company_name')}
              >
                <span className="flex items-center">
                  Company <SortIcon field="company_name" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('ats_platform')}
              >
                <span className="flex items-center">
                  Platform <SortIcon field="ats_platform" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('location')}
              >
                <span className="flex items-center">
                  Location <SortIcon field="location" />
                </span>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('posting_date')}
              >
                <span className="flex items-center">
                  Posted <SortIcon field="posting_date" />
                </span>
              </TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedJobs.map((job, index) => (
              <TableRow key={job.job_url_hash || index} className="hover:bg-secondary/20">
                <TableCell className="font-medium max-w-[300px] truncate">
                  {job.job_title || 'Untitled Position'}
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {job.company_name || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-xs border-0"
                    style={{
                      backgroundColor: `${getPlatformColor(job.ats_platform)}20`,
                      color: getPlatformColor(job.ats_platform),
                    }}
                  >
                    {getPlatformName(job.ats_platform)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] truncate">
                  {job.location || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {job.posting_date 
                    ? new Date(job.posting_date).toLocaleDateString()
                    : '-'
                  }
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-primary hover:text-primary/80"
                  >
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
