'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Database,
  Loader2,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface ApiStatusItem {
  provider: string;
  enabled: boolean;
}

interface QuotaInfo {
  maxMatchesPerDay: number;
  cacheDurationMinutes: number;
  monthlyQuota: number;
  estimatedDailyUsage: number;
  daysPossible: number;
}

interface RealOddsResponse {
  success: boolean;
  message: string;
  apiStatus?: ApiStatusItem[];
  quotaInfo?: QuotaInfo;
  stats?: {
    synced: number;
    active: number;
    maxPerDay: number;
    apiCallsUsed: number;
  };
  matches?: Array<{
    teams: string;
    sport: string;
    odds: string;
  }>;
  setupGuide?: Record<string, {
    name: string;
    url: string;
    freeTier: string;
    envVar: string;
  }>;
}

const providerNames: Record<string, string> = {
  'the-odds-api': 'Odds API',
  'api-football': 'Football',
};

export function ApiStatus() {
  const [status, setStatus] = useState<RealOddsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/real-odds');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching API status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/real-odds', { method: 'POST' });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const hasRealApi = status?.apiStatus?.some(api => api.enabled);

  // Version compacte et ergonomique - une seule ligne
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
      {/* Gauche: Statut global */}
      <div className="flex items-center gap-3">
        {loading ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Connexion...</span>
            </div>
          </>
        ) : hasRealApi ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/20">
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-500">API Connectée</span>
            </div>
            
            {/* Stats rapides */}
            {status?.stats && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {status.stats.synced} matchs
                </span>
                <span className="text-green-500">● {status.stats.active} actifs</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/20">
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">API Non configurée</span>
            </div>
          </>
        )}

        {/* Providers badges */}
        {!loading && status?.apiStatus && (
          <div className="flex items-center gap-1.5">
            {status.apiStatus.map((api) => (
              <Badge
                key={api.provider}
                variant="outline"
                className={`text-[10px] px-2 py-0.5 ${
                  api.enabled 
                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {api.enabled ? (
                  <CheckCircle className="h-2.5 w-2.5 mr-1" />
                ) : (
                  <XCircle className="h-2.5 w-2.5 mr-1" />
                )}
                {providerNames[api.provider] || api.provider}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Droite: Actions */}
      <div className="flex items-center gap-2">
        {hasRealApi ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 text-xs"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Sync
          </Button>
        ) : status?.setupGuide && (
          <a
            href={Object.values(status.setupGuide)[0]?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Configurer API
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
