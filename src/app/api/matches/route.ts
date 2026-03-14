import { NextResponse } from 'next/server';
import { 
  calculateFootballBettingOptions,
  calculateBasketballBettingOptions
} from '@/lib/extendedBettingOptions';
import { generateNHLPrediction } from '@/lib/nhlAdvancedModel';
import { generateAdvancedFootballPrediction } from '@/lib/footballAdvancedModel';

// Type local
interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  oddsHome: number;
  oddsDraw: number | null;
  oddsAway: number;
  status: string;
  timeSlot?: 'day' | 'night';
  // Scores live
  homeScore?: number;
  awayScore?: number;
  isLive?: boolean;
  minute?: string;
  period?: number;
  clock?: string;
  homeRecord?: string;
  awayRecord?: string;
  insight: {
    riskPercentage: number;
    valueBetDetected: boolean;
    valueBetType: string | null;
    confidence: string;
  };
  goalsPrediction?: any;
  // Options de paris étendues
  advancedPredictions?: {
    btts: { yes: number; no: number };
    correctScore: { home: number; away: number; prob: number }[];
    halfTime: { home: number; draw: number; away: number };
    // Facteurs avancés FBref
    fbrefFactors?: {
      form: { home: string | null; away: string | null };
      h2h: { totalMatches: number; homeWins: number; draws: number; awayWins: number } | null;
      xG: { home: number | null; away: number | null };
      injuries: { impactScore: number; homeCount: number; awayCount: number };
    };
    reasoning?: string[];
    valueBet?: {
      detected: boolean;
      type: 'home' | 'draw' | 'away' | null;
      edge: number;
      explanation: string;
    };
  };
  cardsPrediction?: {
    total: number;
    over45: number;
    under45: number;
    redCardRisk: number;
    prediction: string;
  };
  cornersPrediction?: {
    total: number;
    over85: number;
    under85: number;
    over95: number;
    prediction: string;
  };
  // Prédictions NBA
  nbaPredictions?: {
    predictedWinner: 'home' | 'away';
    winnerTeam: string;
    winnerProb: number;
    spread: { line: number; favorite: string; confidence: number };
    totalPoints: { line: number; predicted: number; overProb: number; recommendation: string };
    topScorer: { team: string; player: string; predictedPoints: number };
    keyMatchup: string;
    confidence: 'high' | 'medium' | 'low';
  };
  // Prédictions NHL avancées
  nhlPredictions?: {
    winner: 'home' | 'away';
    winnerTeam: string;
    confidence: number;
    projectedHomeGoals: number;
    projectedAwayGoals: number;
    homeWinProb: number;
    awayWinProb: number;
    drawProb: number;
    totalGoalsLine: number;
    overProb: number;
    underProb: number;
    valueBet: {
      detected: boolean;
      type: 'home' | 'away' | 'over' | 'under' | null;
      edge: number;
      explanation: string;
    };
  };
  nhlFactors?: {
    homeIceAdvantage: number;
    goalieMatchup: string;
    specialTeams: string;
    recentForm: string;
    corsiEdge: string;
    pdoRegression: string;
  };
}

interface TimingInfo {
  currentHour: number;
  canRefresh: boolean;
  nextRefreshTime: string;
  currentPhase: 'morning' | 'afternoon' | 'evening';
  message: string;
}

// Cache
let cachedData: { matches: MatchData[]; timing: TimingInfo } | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// Joueurs NBA populaires pour les prédictions
const NBA_TOP_SCORERS: Record<string, { player: string; avgPoints: number }> = {
  'Los Angeles Lakers': { player: 'LeBron James', avgPoints: 25.2 },
  'Golden State Warriors': { player: 'Stephen Curry', avgPoints: 26.8 },
  'Phoenix Suns': { player: 'Kevin Durant', avgPoints: 27.5 },
  'Dallas Mavericks': { player: 'Luka Doncic', avgPoints: 28.9 },
  'Milwaukee Bucks': { player: 'Giannis Antetokounmpo', avgPoints: 29.4 },
  'Boston Celtics': { player: 'Jayson Tatum', avgPoints: 26.7 },
  'Denver Nuggets': { player: 'Nikola Jokic', avgPoints: 24.8 },
  'Philadelphia 76ers': { player: 'Joel Embiid', avgPoints: 28.5 },
  'Miami Heat': { player: 'Jimmy Butler', avgPoints: 22.3 },
  'LA Clippers': { player: 'Kawhi Leonard', avgPoints: 24.1 },
  'New York Knicks': { player: 'Jalen Brunson', avgPoints: 24.6 },
  'Cleveland Cavaliers': { player: 'Donovan Mitchell', avgPoints: 26.2 },
  'Minnesota Timberwolves': { player: 'Anthony Edwards', avgPoints: 25.9 },
  'Oklahoma City Thunder': { player: 'Shai Gilgeous-Alexander', avgPoints: 28.3 },
  'Sacramento Kings': { player: 'De\'Aaron Fox', avgPoints: 25.1 },
  'Memphis Grizzlies': { player: 'Ja Morant', avgPoints: 23.8 },
  'New Orleans Pelicans': { player: 'Zion Williamson', avgPoints: 22.4 },
  'Atlanta Hawks': { player: 'Trae Young', avgPoints: 25.7 },
  'Chicago Bulls': { player: 'DeMar DeRozan', avgPoints: 23.1 },
  'Brooklyn Nets': { player: 'Mikal Bridges', avgPoints: 21.8 },
  'Toronto Raptors': { player: 'Scottie Barnes', avgPoints: 20.2 },
  'Houston Rockets': { player: 'Jalen Green', avgPoints: 21.6 },
  'San Antonio Spurs': { player: 'Victor Wembanyama', avgPoints: 23.5 },
  'Orlando Magic': { player: 'Paolo Banchero', avgPoints: 22.1 },
  'Indiana Pacers': { player: 'Tyrese Haliburton', avgPoints: 21.8 },
  'Detroit Pistons': { player: 'Cade Cunningham', avgPoints: 22.4 },
  'Charlotte Hornets': { player: 'LaMelo Ball', avgPoints: 23.2 },
  'Washington Wizards': { player: 'Kyle Kuzma', avgPoints: 21.5 },
  'Portland Trail Blazers': { player: 'Anfernee Simons', avgPoints: 22.8 },
  'Utah Jazz': { player: 'Lauri Markkanen', avgPoints: 23.4 },
};

// Mapping NHL team names to abbreviations
const NHL_TEAM_MAPPING: Record<string, string> = {
  'Ottawa Senators': 'OTT', 'Senators': 'OTT',
  'Montreal Canadiens': 'MTL', 'Canadiens': 'MTL',
  'Washington Capitals': 'WSH', 'Capitals': 'WSH',
  'Philadelphia Flyers': 'PHI', 'Flyers': 'PHI',
  'Toronto Maple Leafs': 'TOR', 'Maple Leafs': 'TOR',
  'Tampa Bay Lightning': 'TBL', 'Lightning': 'TBL',
  'Florida Panthers': 'FLA', 'Panthers': 'FLA',
  'Detroit Red Wings': 'DET', 'Red Wings': 'DET',
  'Buffalo Sabres': 'BUF', 'Sabres': 'BUF',
  'Boston Bruins': 'BOS', 'Bruins': 'BOS',
  'New York Rangers': 'NYR', 'Rangers': 'NYR',
  'Carolina Hurricanes': 'CAR', 'Hurricanes': 'CAR',
  'New Jersey Devils': 'NJD', 'Devils': 'NJD',
  'New York Islanders': 'NYI', 'Islanders': 'NYI',
  'Pittsburgh Penguins': 'PIT', 'Penguins': 'PIT',
  'Columbus Blue Jackets': 'CBJ', 'Blue Jackets': 'CBJ',
  'Winnipeg Jets': 'WPG', 'Jets': 'WPG',
  'Dallas Stars': 'DAL', 'Stars': 'DAL',
  'Colorado Avalanche': 'COL', 'Avalanche': 'COL',
  'Minnesota Wild': 'MIN', 'Wild': 'MIN',
  'Nashville Predators': 'NSH', 'Predators': 'NSH',
  'St. Louis Blues': 'STL', 'Blues': 'STL',
  'Chicago Blackhawks': 'CHI', 'Blackhawks': 'CHI',
  'Vegas Golden Knights': 'VGK', 'Golden Knights': 'VGK',
  'Edmonton Oilers': 'EDM', 'Oilers': 'EDM',
  'Vancouver Canucks': 'VAN', 'Canucks': 'VAN',
  'Calgary Flames': 'CGY', 'Flames': 'CGY',
  'Seattle Kraken': 'SEA', 'Kraken': 'SEA',
  'Los Angeles Kings': 'LAK', 'Kings': 'LAK',
  'Anaheim Ducks': 'ANA', 'Ducks': 'ANA',
  'San Jose Sharks': 'SJS', 'Sharks': 'SJS',
  'Arizona Coyotes': 'ARI', 'Coyotes': 'ARI',
};

/**
 * Extrait l'abbréviation NHL du nom d'équipe
 */
function getNHLAbbr(teamName: string): string {
  // Chercher d'abord dans le mapping complet
  if (NHL_TEAM_MAPPING[teamName]) {
    return NHL_TEAM_MAPPING[teamName];
  }
  
  // Chercher par partial match
  for (const [name, abbr] of Object.entries(NHL_TEAM_MAPPING)) {
    if (teamName.includes(name) || name.includes(teamName)) {
      return abbr;
    }
  }
  
  // Fallback: prendre les 3 premiers caractères en majuscules
  return teamName.slice(0, 3).toUpperCase();
}

/**
 * Génère les prédictions NBA pour un match
 */
function generateNBAPredictions(homeTeam: string, awayTeam: string, oddsHome: number, oddsAway: number): {
  predictedWinner: 'home' | 'away';
  winnerTeam: string;
  winnerProb: number;
  spread: { line: number; favorite: string; confidence: number };
  totalPoints: { line: number; predicted: number; overProb: number; recommendation: string };
  topScorer: { team: string; player: string; predictedPoints: number };
  keyMatchup: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const homeProb = (1 / oddsHome) / ((1 / oddsHome) + (1 / oddsAway));
  const awayProb = 1 - homeProb;
  
  const predictedWinner: 'home' | 'away' = homeProb > awayProb ? 'home' : 'away';
  const winnerTeam = predictedWinner === 'home' ? homeTeam : awayTeam;
  const winnerProb = Math.round(Math.max(homeProb, awayProb) * 100);
  
  // Spread
  const spreadLine = Math.round(Math.abs(homeProb - awayProb) * 15 * 10) / 10;
  const favorite = predictedWinner === 'home' ? homeTeam : awayTeam;
  
  // Total points
  const predictedTotal = 220 + Math.round((Math.random() - 0.5) * 20);
  const overProb = 45 + Math.round(Math.random() * 15);
  
  // Top scorer
  const topScorerHome = NBA_TOP_SCORERS[homeTeam] || { player: 'Joueur Clé', avgPoints: 20 };
  const topScorerAway = NBA_TOP_SCORERS[awayTeam] || { player: 'Joueur Clé', avgPoints: 20 };
  const topScorer = predictedWinner === 'home' ? topScorerHome : topScorerAway;
  
  // Confidence
  const confidence: 'high' | 'medium' | 'low' = winnerProb >= 60 ? 'high' : winnerProb >= 52 ? 'medium' : 'low';
  
  return {
    predictedWinner,
    winnerTeam,
    winnerProb,
    spread: {
      line: predictedWinner === 'home' ? -spreadLine : spreadLine,
      favorite,
      confidence: Math.round(85 - spreadLine)
    },
    totalPoints: {
      line: Math.round(predictedTotal / 5) * 5,
      predicted: predictedTotal,
      overProb,
      recommendation: overProb >= 52 ? `Over ${Math.round(predictedTotal / 5) * 5}` : `Under ${Math.round(predictedTotal / 5) * 5}`
    },
    topScorer: {
      team: topScorer === topScorerHome ? homeTeam : awayTeam,
      player: topScorer.player,
      predictedPoints: Math.round(topScorer.avgPoints + (Math.random() * 6 - 3))
    },
    keyMatchup: `${topScorerHome.player} vs ${topScorerAway.player}`,
    confidence
  };
}

/**
 * GET - Récupérer les matchs (VERSION RAPIDE AVEC OPTIONS ÉTENDUES)
 * Timeout court pour Vercel Serverless
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  try {
    const now = Date.now();
    
    // Vérifier le cache (sauf si refresh forcé)
    if (!forceRefresh && cachedData && (now - lastFetchTime) < CACHE_TTL) {
      console.log('📦 Cache utilisé');
      return NextResponse.json(cachedData);
    }
    
    console.log('🔄 Récupération rapide des matchs avec options étendues...');
    
    // Utiliser la version rapide
    const { getFastMatches } = await import('@/lib/fastApi');
    const result = await getFastMatches();
    
    if (result.matches.length > 0) {
      // Convertir au format attendu avec options étendues - ASYNC pour FBref
      const matches: MatchData[] = await Promise.all(result.matches.map(async (m: any, i: number) => {
        const isBasket = m.sport === 'Basket' || m.sport === 'NBA';
        
        // Calculer le risque basé sur les cotes
        const totalImplied = (1 / m.oddsHome) + (1 / m.oddsAway) + (m.oddsDraw ? 1 / m.oddsDraw : 0);
        const homeProb = (1 / m.oddsHome) / totalImplied;
        const awayProb = (1 / m.oddsAway) / totalImplied;
        const drawProb = m.oddsDraw ? (1 / m.oddsDraw) / totalImplied : 0;
        
        const favorite = m.oddsHome < m.oddsAway ? 'home' : 'away';
        const favoriteProb = Math.round(Math.max(homeProb, awayProb) * 100);
        const riskPercentage = 100 - favoriteProb;
        
        // Base match data
        const matchData: MatchData = {
          id: m.id || `match_${i}`,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          sport: isBasket ? 'Basket' : m.sport,
          league: m.league,
          date: m.date,
          oddsHome: m.oddsHome,
          oddsDraw: m.oddsDraw,
          oddsAway: m.oddsAway,
          status: m.status || 'upcoming',
          timeSlot: isBasket ? 'night' : 'day',
          // Scores live
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          isLive: m.isLive,
          minute: m.minute,
          period: m.period,
          clock: m.clock,
          homeRecord: m.homeRecord,
          awayRecord: m.awayRecord,
          insight: {
            riskPercentage,
            valueBetDetected: riskPercentage < 35,
            valueBetType: riskPercentage < 35 ? favorite : null,
            confidence: riskPercentage <= 35 ? 'high' : riskPercentage <= 50 ? 'medium' : 'low',
          },
        };
        
        // Options de paris pour le FOOTBALL - AVEC INTÉGRATION FBREF
        if (!isBasket && m.oddsDraw) {
          // D'abord calculer les options de base
          const bettingOptions = calculateFootballBettingOptions(
            m.oddsHome, 
            m.oddsDraw, 
            m.oddsAway,
            m.homeTeam,
            m.awayTeam
          );
          
          // Tenter d'enrichir avec le modèle avancé FBref
          let enrichedPrediction: Awaited<ReturnType<typeof generateAdvancedFootballPrediction>> | null = null;
          try {
            enrichedPrediction = await generateAdvancedFootballPrediction(
              m.homeTeam,
              m.awayTeam,
              m.league,
              m.date,
              { home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway }
            );
            console.log(`📊 Prédiction avancée FBref pour ${m.homeTeam} vs ${m.awayTeam}: qualité ${enrichedPrediction.dataQuality.overallScore}%`);
          } catch (error) {
            console.log(`⚠️ Pas de données FBref pour ${m.homeTeam} vs ${m.awayTeam}, utilisation du modèle de base`);
          }
          
          // Utiliser les prédictions avancées si disponibles, sinon fallback
          const finalProbas = enrichedPrediction ? {
            homeWin: enrichedPrediction.probabilities.homeWin,
            draw: enrichedPrediction.probabilities.draw,
            awayWin: enrichedPrediction.probabilities.awayWin
          } : {
            homeWin: bettingOptions.result.home,
            draw: bettingOptions.result.draw,
            awayWin: bettingOptions.result.away
          };
          
          // Goals prediction - utiliser FBref si disponible
          matchData.goalsPrediction = enrichedPrediction ? {
            total: enrichedPrediction.fbrefData.homeXG && enrichedPrediction.fbrefData.awayXG 
              ? (enrichedPrediction.fbrefData.homeXG.xGDPer90 + enrichedPrediction.fbrefData.awayXG.xGDPer90)
              : bettingOptions.goals.expectedTotal,
            over25: enrichedPrediction.predictions.over25,
            under25: enrichedPrediction.predictions.under25,
            over15: bettingOptions.goals.over15,
            over05: bettingOptions.goals.over05,
            over35: bettingOptions.goals.over35,
            over45: bettingOptions.goals.over45,
            bothTeamsScore: enrichedPrediction.predictions.btts.yes,
            prediction: bettingOptions.goals.recommendation,
            // Indicateur de source de données
            dataSource: enrichedPrediction.dataQuality.hasFBrefData ? 'FBref' : 'Estimation',
            dataQuality: enrichedPrediction.dataQuality.overallScore
          } : {
            total: bettingOptions.goals.expectedTotal,
            over25: bettingOptions.goals.over25,
            under25: bettingOptions.goals.under25,
            over15: bettingOptions.goals.over15,
            over05: bettingOptions.goals.over05,
            over35: bettingOptions.goals.over35,
            over45: bettingOptions.goals.over45,
            bothTeamsScore: bettingOptions.btts.yes,
            prediction: bettingOptions.goals.recommendation,
            dataSource: 'Estimation',
            dataQuality: 40
          };
          
          // Advanced predictions - utiliser FBref si disponible
          matchData.advancedPredictions = enrichedPrediction ? {
            btts: enrichedPrediction.predictions.btts,
            correctScore: [enrichedPrediction.predictions.correctScore],
            halfTime: bettingOptions.halfTime,
            // Ajouter les facteurs avancés FBref
            fbrefFactors: {
              form: {
                home: enrichedPrediction.fbrefData.homeForm?.form || null,
                away: enrichedPrediction.fbrefData.awayForm?.form || null,
              },
              h2h: enrichedPrediction.fbrefData.h2h ? {
                totalMatches: enrichedPrediction.fbrefData.h2h.totalMatches,
                homeWins: enrichedPrediction.fbrefData.h2h.team1Wins,
                draws: enrichedPrediction.fbrefData.h2h.draws,
                awayWins: enrichedPrediction.fbrefData.h2h.team2Wins
              } : null,
              xG: {
                home: enrichedPrediction.fbrefData.homeXG?.xGDPer90 || null,
                away: enrichedPrediction.fbrefData.awayXG?.xGDPer90 || null
              },
              injuries: {
                impactScore: enrichedPrediction.injuries.impactScore,
                homeCount: enrichedPrediction.injuries.home.length,
                awayCount: enrichedPrediction.injuries.away.length
              }
            },
            reasoning: enrichedPrediction.predictions.reasoning,
            valueBet: enrichedPrediction.valueBet
          } : {
            btts: {
              yes: bettingOptions.btts.yes,
              no: bettingOptions.btts.no
            },
            correctScore: bettingOptions.correctScore.map(s => {
              const parts = s.score.split('-');
              return {
                home: parseInt(parts[0]) || 0,
                away: parseInt(parts[1]) || 0,
                prob: s.probability
              };
            }),
            halfTime: bettingOptions.halfTime
          };
          
          // Mettre à jour l'insight avec les données avancées
          if (enrichedPrediction) {
            matchData.insight = {
              riskPercentage: 100 - enrichedPrediction.predictions.confidence,
              valueBetDetected: enrichedPrediction.valueBet.detected,
              valueBetType: enrichedPrediction.valueBet.type,
              confidence: enrichedPrediction.predictions.confidence >= 65 ? 'high' : 
                          enrichedPrediction.predictions.confidence >= 50 ? 'medium' : 'low',
            };
          }
          
          // Cards prediction (estimation basée sur la ligue)
          const leagueCardAvg: Record<string, number> = {
            'Premier League': 3.2,
            'La Liga': 4.5,
            'Bundesliga': 3.8,
            'Serie A': 4.2,
            'Ligue 1': 3.5,
            'Ligue des Champions': 4.0,
            'Europa League': 3.8,
          };
          const baseCards = leagueCardAvg[m.league] || 3.5;
          const cardVariation = (Math.random() - 0.5) * 1.5;
          const totalCards = Math.round((baseCards + cardVariation) * 10) / 10;
          
          matchData.cardsPrediction = {
            total: totalCards,
            over45: Math.min(Math.round(40 + totalCards * 10), 70),
            under45: Math.max(Math.round(60 - totalCards * 10), 30),
            redCardRisk: Math.round(5 + Math.random() * 15),
            prediction: totalCards > 4.5 ? 'Over 4.5 cartons' : 'Under 4.5 cartons'
          };
          
          // Corners prediction
          const baseCorners = 9 + Math.round((Math.random() - 0.5) * 4);
          matchData.cornersPrediction = {
            total: baseCorners,
            over85: Math.min(Math.round(45 + baseCorners * 3), 65),
            under85: Math.max(Math.round(55 - baseCorners * 3), 35),
            over95: Math.min(Math.round(35 + baseCorners * 3), 55),
            prediction: baseCorners > 9 ? 'Over 8.5 corners' : 'Under 9.5 corners'
          };
        }
        
        // Options de paris pour le BASKETBALL
        if (isBasket) {
          const bettingOptions = calculateBasketballBettingOptions(
            m.oddsHome,
            m.oddsAway,
            m.homeTeam,
            m.awayTeam
          );
          
          matchData.nbaPredictions = generateNBAPredictions(
            m.homeTeam,
            m.awayTeam,
            m.oddsHome,
            m.oddsAway
          );
          
          // Ajouter les prédictions de base
          matchData.goalsPrediction = {
            total: bettingOptions.totalPoints.expected,
            over25: bettingOptions.totalPoints.overProb,
            under25: bettingOptions.totalPoints.underProb,
            over15: bettingOptions.totalPoints.overProb,
            bothTeamsScore: 50,
            prediction: bettingOptions.totalPoints.recommendation
          };
        }
        
        // Prédictions NHL avancées avec méthodologie rigoureuse
        if (m.sport === 'Hockey') {
          try {
            // Extraire les abbréviations des équipes NHL
            const homeAbbr = getNHLAbbr(m.homeTeam);
            const awayAbbr = getNHLAbbr(m.awayTeam);
            
            // Utiliser le modèle avancé
            const nhlModel = generateNHLPrediction(
              homeAbbr,
              awayAbbr,
              m.oddsHome,
              m.oddsAway,
              m.total?.line || 6.5
            );
            
            if (nhlModel) {
              matchData.nhlPredictions = {
                winner: nhlModel.prediction.winner,
                winnerTeam: nhlModel.prediction.winnerTeam,
                confidence: nhlModel.prediction.confidence,
                projectedHomeGoals: nhlModel.prediction.projectedHomeGoals,
                projectedAwayGoals: nhlModel.prediction.projectedAwayGoals,
                homeWinProb: nhlModel.prediction.homeWinProb,
                awayWinProb: nhlModel.prediction.awayWinProb,
                drawProb: nhlModel.prediction.drawProb,
                totalGoalsLine: nhlModel.prediction.totalGoalsLine,
                overProb: nhlModel.prediction.overProb,
                underProb: nhlModel.prediction.underProb,
                valueBet: nhlModel.prediction.valueBet
              };
              
              matchData.nhlFactors = nhlModel.factors;
              
              // Mettre à jour l'insight avec la confiance du modèle
              matchData.insight.confidence = nhlModel.prediction.confidence >= 60 ? 'high' : 
                                              nhlModel.prediction.confidence >= 50 ? 'medium' : 'low';
              matchData.insight.valueBetDetected = nhlModel.prediction.valueBet.detected;
              matchData.insight.valueBetType = nhlModel.prediction.valueBet.type;
            }
          } catch (error) {
            console.error('Erreur modèle NHL:', error);
          }
        }
        
        return matchData;
      }));
      
      // Timing
      const timing: TimingInfo = {
        currentHour: new Date().getUTCHours(),
        canRefresh: true,
        nextRefreshTime: 'Maintenant',
        currentPhase: result.timing.currentPhase,
        message: `${matches.length} matchs disponibles (LDC, Europa, NBA inclus)`
      };
      
      cachedData = { matches, timing };
      lastFetchTime = now;
      
      console.log(`✅ ${matches.length} matchs avec options étendues`);
      return NextResponse.json({ matches, timing });
    }
    
    // Aucun match
    return NextResponse.json({ 
      error: 'Aucun match disponible',
      matches: [],
      timing: {
        currentHour: new Date().getUTCHours(),
        canRefresh: true,
        nextRefreshTime: 'Maintenant',
        currentPhase: 'afternoon',
        message: 'Aucun match trouvé'
      }
    });
    
  } catch (error) {
    console.error('Erreur API matches:', error);
    return NextResponse.json({ 
      error: 'Erreur de connexion',
      matches: [],
      timing: {
        currentHour: new Date().getUTCHours(),
        canRefresh: false,
        nextRefreshTime: '1 min',
        currentPhase: 'afternoon',
        message: 'Erreur temporaire'
      }
    }, { status: 500 });
  }
}
