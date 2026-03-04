'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Zap
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
  'the-odds-api': 'The Odds API',
  'api-football': 'API-Football',
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

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Connexion à l'API...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRealApi = status?.apiStatus?.some(api => api.enabled);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Source de Données</CardTitle>
              <p className="text-sm text-muted-foreground">
                {hasRealApi ? 'The Odds API (temps réel)' : 'Configuration requise'}
              </p>
            </div>
          </div>
          {hasRealApi && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-primary/20 hover:bg-primary/10"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* API Status */}
        <div className="flex flex-wrap gap-2">
          {status?.apiStatus?.map((api) => (
            <Badge
              key={api.provider}
              variant="outline"
              className={api.enabled 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-muted text-muted-foreground border-border'
              }
            >
              {api.enabled ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {providerNames[api.provider] || api.provider}
            </Badge>
          ))}
        </div>

        {/* Quota Info */}
        {hasRealApi && status?.quotaInfo && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quota Optimisé</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Matchs/jour</div>
                <div className="font-semibold">{status.quotaInfo.maxMatchesPerDay}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cache</div>
                <div className="font-semibold">{status.quotaInfo.cacheDurationMinutes} min</div>
              </div>
              <div>
                <div className="text-muted-foreground">Quota mensuel</div>
                <div className="font-semibold">{status.quotaInfo.monthlyQuota} req</div>
              </div>
              <div>
                <div className="text-muted-foreground">Autonomie</div>
                <div className="font-semibold text-green-500">~{status.quotaInfo.daysPossible} jours</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {status?.stats && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-500">
                ✓ {status.stats.synced} matchs synchronisés
              </span>
              <Badge variant="outline" className="text-xs">
                {status.stats.active} actifs
              </Badge>
            </div>
          </div>
        )}

        {/* Matches Preview */}
        {status?.matches && status.matches.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Derniers matchs</div>
            {status.matches.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                <div>
                  <span className="font-medium">{m.teams}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">{m.sport}</Badge>
                </div>
                <span className="font-mono text-muted-foreground">{m.odds}</span>
              </div>
            ))}
          </div>
        )}

        {/* Setup Guide */}
        {!hasRealApi && status?.setupGuide && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Activez les vraies cotes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  1 requête = 15 matchs • 500 req/mois gratuit
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {Object.entries(status.setupGuide).slice(0, 1).map(([key, guide]) => (
                <div 
                  key={key}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                >
                  <div>
                    <span className="font-medium">{guide.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">({guide.freeTier})</span>
                  </div>
                  <a
                    href={guide.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    Obtenir clé
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Database className="h-3 w-3" />
          Mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </CardContent>
    </Card>
  );
}
