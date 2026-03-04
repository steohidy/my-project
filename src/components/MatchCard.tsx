'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskIndicator } from './RiskIndicator';
import { 
  Clock,
  Sparkles,
  ChevronRight,
  Star
} from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
    date: string;
    oddsHome: number;
    oddsDraw: number | null;
    oddsAway: number;
    status: string;
    insight?: {
      riskPercentage: number;
      valueBetDetected: boolean;
      valueBetType: string | null;
      confidence: string;
    };
  };
  onAnalyze?: (matchId: string) => void;
  compact?: boolean;
}

const sportConfig: Record<string, { icon: string; color: string }> = {
  Foot: { icon: '⚽', color: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400 dark:bg-green-500/20' },
  NBA: { icon: '🏀', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:bg-orange-500/20' },
  NHL: { icon: '🏒', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 dark:bg-blue-500/20' },
  AHL: { icon: '🏒', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400 dark:bg-cyan-500/20' },
};

export function MatchCard({ match, onAnalyze, compact = false }: MatchCardProps) {
  const riskPercentage = match.insight?.riskPercentage || 50;
  const hasValueBet = match.insight?.valueBetDetected;
  const matchDate = new Date(match.date);
  const formattedDate = matchDate.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const favorite = match.oddsHome < match.oddsAway ? 'home' : 'away';
  const favoriteTeam = favorite === 'home' ? match.homeTeam : match.awayTeam;
  const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;

  const config = sportConfig[match.sport] || sportConfig.Foot;

  if (compact) {
    return (
      <Card className="group hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all cursor-pointer bg-card min-w-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl shrink-0">{config.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base">
                  <span className="inline">{match.homeTeam}</span>
                  <span className="inline mx-1">vs</span>
                  <span className="inline">{match.awayTeam}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  @{favoriteOdds.toFixed(2)} • {formattedDate}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <RiskIndicator percentage={riskPercentage} showLabel={false} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={config.color}>
            <span className="mr-1">{config.icon}</span>
            {match.sport}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {formattedDate}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-5">
        {/* Teams */}
        <div className="space-y-3">
          {/* Home Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className={`font-bold text-base ${favorite === 'home' ? 'text-orange-500' : 'text-foreground'}`}>
                {match.homeTeam}
              </span>
              {favorite === 'home' && (
                <Badge className="text-[10px] px-2 py-0 h-5 bg-orange-500 text-white border-0 shrink-0 font-medium">
                  <Star className="h-3 w-3 mr-0.5" />
                  FAV
                </Badge>
              )}
            </div>
            <span className={`font-mono font-bold text-lg shrink-0 ${favorite === 'home' ? 'text-orange-500' : 'text-foreground'}`}>
              {match.oddsHome.toFixed(2)}
            </span>
          </div>
          
          {/* Draw */}
          {match.oddsDraw && (
            <div className="flex items-center justify-between text-sm text-muted-foreground py-2 border-y border-dashed border-border/50 gap-3">
              <span className="font-medium">Nul</span>
              <span className="font-mono font-semibold shrink-0">{match.oddsDraw.toFixed(2)}</span>
            </div>
          )}
          
          {/* Away Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className={`font-bold text-base ${favorite === 'away' ? 'text-orange-500' : 'text-foreground'}`}>
                {match.awayTeam}
              </span>
              {favorite === 'away' && (
                <Badge className="text-[10px] px-2 py-0 h-5 bg-orange-500 text-white border-0 shrink-0 font-medium">
                  <Star className="h-3 w-3 mr-0.5" />
                  FAV
                </Badge>
              )}
            </div>
            <span className={`font-mono font-bold text-lg shrink-0 ${favorite === 'away' ? 'text-orange-500' : 'text-foreground'}`}>
              {match.oddsAway.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Risk and Value Bet indicators */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="shrink-0">
              <RiskIndicator percentage={riskPercentage} size="sm" />
            </div>
            {hasValueBet && (
              <Badge className="bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400 dark:bg-green-500/20 text-xs shrink-0 font-medium">
                <Sparkles className="h-3 w-3 mr-1" />
                Value Bet
              </Badge>
            )}
          </div>
          
          {onAnalyze && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => onAnalyze(match.id)}
              className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-medium"
            >
              Analyser
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
