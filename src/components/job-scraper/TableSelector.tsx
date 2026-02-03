import { useState, useEffect } from 'react';
import { Plus, Trash2, Database, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  getUserJobTables, 
  createUserJobTable, 
  deleteUserJobTable,
  UserJobTable 
} from '@/lib/api/job-scraper';
import { toast } from 'sonner';

interface TableSelectorProps {
  selectedDedupeTable: string | null;
  selectedSaveTable: string | null;
  onDedupeTableChange: (tableId: string | null) => void;
  onSaveTableChange: (tableId: string | null) => void;
}

export function TableSelector({
  selectedDedupeTable,
  selectedSaveTable,
  onDedupeTableChange,
  onSaveTableChange,
}: TableSelectorProps) {
  const [tables, setTables] = useState<UserJobTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadTables = async () => {
    setIsLoading(true);
    const data = await getUserJobTables();
    setTables(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    setIsCreating(true);
    const newTable = await createUserJobTable(newTableName.trim(), newTableDescription.trim() || undefined);
    
    if (newTable) {
      toast.success(`Table "${newTableName}" created`);
      setTables(prev => [newTable, ...prev]);
      setNewTableName('');
      setNewTableDescription('');
      setCreateDialogOpen(false);
    } else {
      toast.error('Failed to create table');
    }
    setIsCreating(false);
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    const success = await deleteUserJobTable(tableId);
    
    if (success) {
      toast.success(`Table "${tableName}" deleted`);
      setTables(prev => prev.filter(t => t.id !== tableId));
      
      if (selectedDedupeTable === tableId) {
        onDedupeTableChange(null);
      }
      if (selectedSaveTable === tableId) {
        onSaveTableChange(null);
      }
    } else {
      toast.error('Failed to delete table');
    }
  };

  const selectedDedupeTableName = tables.find(t => t.id === selectedDedupeTable)?.name;
  const selectedSaveTableName = tables.find(t => t.id === selectedSaveTable)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-foreground/80 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Job Tables
        </Label>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Create Table
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle>Create New Job Table</DialogTitle>
              <DialogDescription>
                Create a table to store job links for deduplication across searches.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tableName">Table Name</Label>
                <Input
                  id="tableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., Engineering Jobs Q1 2024"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableDescription">Description (optional)</Label>
                <Input
                  id="tableDescription"
                  value={newTableDescription}
                  onChange={(e) => setNewTableDescription(e.target.value)}
                  placeholder="e.g., All software engineering roles"
                  className="bg-secondary/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTable} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Table'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Dedupe From Table */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Filter duplicates from</Label>
          <Select 
            value={selectedDedupeTable || '__global__'} 
            onValueChange={(v) => onDedupeTableChange(v === '__global__' ? null : v)}
          >
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select table..." />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="__global__">Global (all previous searches)</SelectItem>
              <SelectItem value="__none__" onSelect={() => onDedupeTableChange(null)}>
                None (no filtering)
              </SelectItem>
              {tables.map(table => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name} ({table.job_count} jobs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save To Table */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Save results to</Label>
          <Select 
            value={selectedSaveTable || '__none__'} 
            onValueChange={(v) => onSaveTableChange(v === '__none__' ? null : v)}
          >
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Select table..." />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="__none__">Don't save to table</SelectItem>
              {tables.map(table => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name} ({table.job_count} jobs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Existing Tables List */}
      {tables.length > 0 && (
        <div className="mt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Your Tables</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {tables.map(table => (
              <div 
                key={table.id} 
                className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/30"
              >
                <div>
                  <span className="text-sm font-medium">{table.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({table.job_count} jobs)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteTable(table.id, table.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
