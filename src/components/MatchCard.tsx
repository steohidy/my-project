'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskIndicator } from './RiskIndicator';
import { 
  Clock,
  Sparkles,
  ChevronRight,
  Star,
  Radio,
  Zap,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

// Type pour la qualité des données
type DataQuality = 'real' | 'estimated' | 'none';

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
    isLive?: boolean;
    homeScore?: number;
    awayScore?: number;
    period?: number;
    clock?: string;
    league?: string;
    insight?: {
      riskPercentage: number;
      valueBetDetected: boolean;
      valueBetType: string | null;
      confidence: string;
    };
    // Qualité des données - TRANSPARENCE
    dataQuality?: {
      result: DataQuality;
      goals: DataQuality;
      cards: DataQuality;
      corners: DataQuality;
    };
    // Stats d'équipe (données réelles)
    teamStats?: {
      home: {
        form: string;
        avgGoalsScored: number;
        avgGoalsConceded: number;
        winRate: number;
        dataAvailable: boolean;
      };
      away: {
        form: string;
        avgGoalsScored: number;
        avgGoalsConceded: number;
        winRate: number;
        dataAvailable: boolean;
      };
    };
    goalsPrediction?: {
      total: number;
      over25: number;
      under25: number;
      over15: number;
      bothTeamsScore: number;
      prediction: string;
      basedOn: DataQuality;
    };
  };
  onAnalyze?: (matchId: string) => void;
  compact?: boolean;
}

// Configuration pour l'affichage de la qualité des données
const dataQualityConfig: Record<DataQuality, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  description: string;
}> = {
  real: {
    label: 'Données réelles',
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: 'bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400',
    description: 'Basé sur les stats réelles des équipes'
  },
  estimated: {
    label: 'Estimation',
    icon: <AlertTriangle className="h-3 w-3" />,
    color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400',
    description: 'Basé sur les cotes des bookmakers'
  },
  none: {
    label: 'Non disponible',
    icon: <HelpCircle className="h-3 w-3" />,
    color: 'bg-gray-500/15 text-gray-600 border-gray-500/30 dark:text-gray-400',
    description: 'Données non disponibles'
  }
};

const sportConfig: Record<string, { icon: string; color: string }> = {
  Foot: { icon: '⚽', color: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400 dark:bg-green-500/20' },
  Basket: { icon: '🏀', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:bg-orange-500/20' },
  NBA: { icon: '🏀', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:bg-orange-500/20' },
  NHL: { icon: '🏒', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 dark:bg-blue-500/20' },
  AHL: { icon: '🏒', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400 dark:bg-cyan-500/20' },
};

// Fonction pour obtenir le texte de la période NBA
function getPeriodText(period?: number, sport?: string): string {
  if (!period || sport !== 'Basket') return '';
  
  if (period <= 4) {
    return `Q${period}`;
  } else if (period === 5) {
    return 'OT';
  } else {
    return `${period - 4}OT`;
  }
}

export function MatchCard({ match, onAnalyze, compact = false }: MatchCardProps) {
  const riskPercentage = match.insight?.riskPercentage || 50;
  const hasValueBet = match.insight?.valueBetDetected;
  const matchDate = new Date(match.date);
  const formattedDate = matchDate.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

  const favorite = match.oddsHome < match.oddsAway ? 'home' : 'away';
  const favoriteTeam = favorite === 'home' ? match.homeTeam : match.awayTeam;
  const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;

  const config = sportConfig[match.sport] || sportConfig.Foot;
  
  // Live status
  const isLive = match.isLive || match.status === 'live';
  const isFinished = match.status === 'finished' || match.status === 'completed';
  const periodText = getPeriodText(match.period, match.sport);

  if (compact) {
    return (
      <Card className={`group hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all cursor-pointer bg-card min-w-0 ${isLive ? 'border-red-500/50 bg-red-500/5' : ''}`}>
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
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <div className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                      <Radio className="h-3 w-3 animate-pulse" />
                      <span>LIVE</span>
                      {match.homeScore !== undefined && (
                        <span className="ml-1">{match.homeScore} - {match.awayScore}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      @{favoriteOdds.toFixed(2)} • {formattedDate}
                    </p>
                  )}
                </div>
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
    <Card className={`group hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all bg-card border-border/50 ${isLive ? 'border-red-500/50 bg-gradient-to-br from-red-500/5 to-transparent' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              <span className="mr-1">{config.icon}</span>
              {match.league || match.sport}
            </Badge>
            {isLive && (
              <Badge className="bg-red-500 text-white border-0 animate-pulse">
                <Radio className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
            {isFinished && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Terminé
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {isLive && periodText ? (
              <span className="font-medium text-red-500">{periodText} {match.clock}</span>
            ) : (
              formattedDate
            )}
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
              {/* Form indicator for home team */}
              {match.teamStats?.home?.dataAvailable && match.teamStats.home.form && (
                <div className="flex items-center gap-0.5 shrink-0" title={`Forme: ${match.teamStats.home.form}`}>
                  {match.teamStats.home.form.split('').map((result, i) => (
                    <span 
                      key={i} 
                      className={`w-2 h-2 rounded-sm text-[8px] flex items-center justify-center font-bold ${
                        result === 'W' ? 'bg-green-500' : 
                        result === 'D' ? 'bg-yellow-500' : 
                        result === 'L' ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Score or Odds */}
            {isLive && match.homeScore !== undefined ? (
              <span className="font-mono font-bold text-xl text-red-500 shrink-0">
                {match.homeScore}
              </span>
            ) : (
              <span className={`font-mono font-bold text-lg shrink-0 ${favorite === 'home' ? 'text-orange-500' : 'text-foreground'}`}>
                {match.oddsHome.toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Draw or Score */}
          {isLive && match.homeScore !== undefined ? (
            <div className="flex items-center justify-center py-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono font-bold text-lg">{match.homeScore}</span>
                <span className="text-lg">-</span>
                <span className="font-mono font-bold text-lg">{match.awayScore}</span>
              </div>
            </div>
          ) : match.oddsDraw ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground py-2 border-y border-dashed border-border/50 gap-3">
              <span className="font-medium">Nul</span>
              <span className="font-mono font-semibold shrink-0">{match.oddsDraw.toFixed(2)}</span>
            </div>
          ) : null}
          
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
              {/* Form indicator for away team */}
              {match.teamStats?.away?.dataAvailable && match.teamStats.away.form && (
                <div className="flex items-center gap-0.5 shrink-0" title={`Forme: ${match.teamStats.away.form}`}>
                  {match.teamStats.away.form.split('').map((result, i) => (
                    <span 
                      key={i} 
                      className={`w-2 h-2 rounded-sm text-[8px] flex items-center justify-center font-bold ${
                        result === 'W' ? 'bg-green-500' : 
                        result === 'D' ? 'bg-yellow-500' : 
                        result === 'L' ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Score or Odds */}
            {isLive && match.awayScore !== undefined ? (
              <span className="font-mono font-bold text-xl text-red-500 shrink-0">
                {match.awayScore}
              </span>
            ) : (
              <span className={`font-mono font-bold text-lg shrink-0 ${favorite === 'away' ? 'text-orange-500' : 'text-foreground'}`}>
                {match.oddsAway.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        {/* Stats d'équipe et prédictions (si disponibles) */}
        {match.teamStats?.home?.dataAvailable && match.teamStats?.away?.dataAvailable && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Home team stats */}
              <div className="text-center space-y-1">
                <p className="text-muted-foreground font-medium">{match.homeTeam.split(' ')[0]}</p>
                <div className="flex justify-center gap-2 text-[10px]">
                  <span className="text-green-500" title="Buts marqués/match">
                    ⬆️ {match.teamStats.home.avgGoalsScored.toFixed(1)}
                  </span>
                  <span className="text-red-500" title="Buts encaissés/match">
                    ⬇️ {match.teamStats.home.avgGoalsConceded.toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {match.teamStats.home.winRate.toFixed(0)}% victoires
                </p>
              </div>
              
              {/* Prediction */}
              {match.goalsPrediction && (
                <div className="text-center space-y-1 bg-orange-500/10 rounded-lg py-1.5 px-2">
                  <p className="font-semibold text-orange-600 dark:text-orange-400 text-xs">
                    {match.goalsPrediction.prediction}
                  </p>
                  <div className="flex justify-center gap-2 text-[10px] text-muted-foreground">
                    <span title="Over 2.5">O2.5: {match.goalsPrediction.over25}%</span>
                    <span title="Les deux marquent">BTTS: {match.goalsPrediction.bothTeamsScore}%</span>
                  </div>
                </div>
              )}
              
              {/* Away team stats */}
              <div className="text-center space-y-1">
                <p className="text-muted-foreground font-medium">{match.awayTeam.split(' ')[0]}</p>
                <div className="flex justify-center gap-2 text-[10px]">
                  <span className="text-green-500" title="Buts marqués/match">
                    ⬆️ {match.teamStats.away.avgGoalsScored.toFixed(1)}
                  </span>
                  <span className="text-red-500" title="Buts encaissés/match">
                    ⬇️ {match.teamStats.away.avgGoalsConceded.toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {match.teamStats.away.winRate.toFixed(0)}% victoires
                </p>
              </div>
            </div>
          </div>
        )}

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
            {isLive && (
              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400 text-xs shrink-0 font-medium">
                <Zap className="h-3 w-3 mr-1" />
                En direct
              </Badge>
            )}
            {/* Badge de qualité des données - TRANSPARENCE */}
            {match.dataQuality && match.dataQuality.result !== 'real' && (
              <Badge 
                className={`${dataQualityConfig[match.dataQuality.result].color} text-xs shrink-0 font-medium`}
                title={dataQualityConfig[match.dataQuality.result].description}
              >
                {dataQualityConfig[match.dataQuality.result].icon}
                <span className="ml-1">{dataQualityConfig[match.dataQuality.result].label}</span>
              </Badge>
            )}
            {match.dataQuality?.result === 'real' && (
              <Badge 
                className={`${dataQualityConfig.real.color} text-xs shrink-0 font-medium`}
                title={dataQualityConfig.real.description}
              >
                {dataQualityConfig.real.icon}
                <span className="ml-1">{dataQualityConfig.real.label}</span>
              </Badge>
            )}
          </div>
          
          {onAnalyze && !isLive && !isFinished && (
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
        
        {/* Avertissement de transparence */}
        {match.dataQuality && match.dataQuality.result === 'estimated' && !isLive && !isFinished && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Prédictions basées sur les cotes des bookmakers (pas de stats équipe disponibles)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
