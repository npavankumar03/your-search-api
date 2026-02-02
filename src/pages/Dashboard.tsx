import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  LogOut, 
  Key, 
  Copy, 
  Trash2, 
  Plus, 
  Check,
  BarChart3,
  Clock,
  Activity,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface UsageStats {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    avgResponseTime: number;
    successRate: number;
  };
  dailyUsage: { date: string; requests: number }[];
  recentRequests: {
    id: string;
    endpoint: string;
    query: string;
    status: number;
    responseTime: number;
    timestamp: string;
  }[];
}

const Dashboard = () => {
  const { user, signOut, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('api-keys/list', {
        method: 'GET',
      });
      if (error) throw error;
      return data.keys as ApiKey[];
    },
  });

  // Fetch usage stats
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('usage', {
        method: 'GET',
      });
      if (error) throw error;
      return data as UsageStats;
    },
  });

  // Generate API key mutation
  const generateKey = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.functions.invoke('api-keys/generate', {
        method: 'POST',
        body: { name },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      setShowNewKey(true);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate API key',
      });
    },
  });

  // Revoke API key mutation
  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await supabase.functions.invoke('api-keys/revoke', {
        method: 'DELETE',
        body: { keyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Key revoked',
        description: 'The API key has been permanently deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke API key',
      });
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SearchAPI</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">Total Requests</span>
            </div>
            <div className="text-3xl font-bold">{usage?.summary.totalRequests || 0}</div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">Success Rate</span>
            </div>
            <div className="text-3xl font-bold">{usage?.summary.successRate || 0}%</div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">Avg Response</span>
            </div>
            <div className="text-3xl font-bold">{usage?.summary.avgResponseTime || 0}ms</div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">API Keys</span>
            </div>
            <div className="text-3xl font-bold">{apiKeys?.length || 0}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* API Keys Section */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Keys
              </h2>

              {/* Generate new key */}
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Key name (optional)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button
                  onClick={() => generateKey.mutate(newKeyName || 'Default Key')}
                  disabled={generateKey.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {generateKey.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Keys list */}
              <div className="space-y-3">
                {keysLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : apiKeys?.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No API keys yet. Generate one to get started.
                  </p>
                ) : (
                  apiKeys?.map((key) => (
                    <div
                      key={key.id}
                      className="p-4 bg-secondary/50 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{key.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeKey.mutate(key.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-muted-foreground font-mono">
                          {key.key_prefix}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key_prefix, key.id)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedId === key.id ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Created {formatDate(key.created_at)}
                        {key.last_used_at && ` • Last used ${formatDate(key.last_used_at)}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Usage Chart & Recent Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Chart */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                API Usage (Last 7 Days)
              </h2>
              
              {usageLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : usage?.dailyUsage && usage.dailyUsage.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage.dailyUsage}>
                      <defs>
                        <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(187, 100%, 50%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(215, 20%, 55%)"
                        tick={{ fill: 'hsl(215, 20%, 55%)' }}
                      />
                      <YAxis 
                        stroke="hsl(215, 20%, 55%)"
                        tick={{ fill: 'hsl(215, 20%, 55%)' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(222, 47%, 8%)', 
                          border: '1px solid hsl(222, 30%, 18%)',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="hsl(187, 100%, 50%)" 
                        fillOpacity={1} 
                        fill="url(#colorRequests)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No usage data yet. Make your first API call!
                </div>
              )}
            </div>

            {/* Recent Requests */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Requests</h2>
              
              {usageLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : usage?.recentRequests && usage.recentRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
                        <th className="pb-3">Query</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Response Time</th>
                        <th className="pb-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.recentRequests.map((req) => (
                        <tr key={req.id} className="border-b border-border/30">
                          <td className="py-3 font-mono text-sm">{req.query || '-'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              req.status === 200 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground">{req.responseTime}ms</td>
                          <td className="py-3 text-muted-foreground text-sm">
                            {formatDate(req.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No requests yet. Generate an API key and make your first call!
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Key Dialog */}
      <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2 p-4 bg-secondary rounded-lg">
              <code className="text-sm font-mono flex-1 break-all">{generatedKey}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generatedKey, 'new-key')}
              >
                {copiedId === 'new-key' ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Use this key in the <code className="text-primary">x-api-key</code> header or as a Bearer token.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
