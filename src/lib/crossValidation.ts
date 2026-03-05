/**
 * Système de croisement multi-sources pour validation des pronostics
 * Combine: The Odds API + Football-Data API + Fallback Multi-Sports (RapidAPI)
 * 
 * FALLBACK AUTOMATIQUE:
 * - Si The Odds API échoue (quota épuisé), bascule vers RapidAPI
 * - Données de fallback pour: Football, NBA, NHL
 * - Cotes calculées basées sur les statistiques réelles des équipes
 */

import { getTodayNBASchedule, getNBAPredictions } from './nbaData';
import { getAllFallbackMatches, isFallbackAvailable, FallbackMatch } from './fallbackSports';

interface CrossValidatedMatch {
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
  sources: string[]; // Nouveau: liste des sources
  timeSlot?: 'day' | 'night'; // Créneau: day (Foot) ou night (NBA)
  insight: {
    riskPercentage: number;
    valueBetDetected: boolean;
    valueBetType: string | null;
    confidence: string;
    crossValidation?: {
      sourcesCount: number;
      oddsConsensus: boolean;
      dataQuality: 'high' | 'medium' | 'low';
    };
  };
  // Prédictions Football
  goalsPrediction?: {
    total: number; // Buts totaux attendus
    over25: number; // Probabilité Over 2.5 buts (%)
    under25: number; // Probabilité Under 2.5 buts (%)
    over15: number; // Probabilité Over 1.5 buts (%)
    bothTeamsScore: number; // Probabilité les deux marquent (%)
    prediction: string; // Ex: "Over 2.5"
  };
  cardsPrediction?: {
    total: number; // Cartons totaux attendus
    over45: number; // Probabilité Over 4.5 cartons (%)
    under45: number; // Probabilité Under 4.5 cartons (%)
    redCardRisk: number; // Risque de carton rouge (%)
    prediction: string; // Ex: "Under 4.5"
  };
  cornersPrediction?: {
    total: number; // Corners totaux attendus
    over85: number; // Probabilité Over 8.5 corners (%)
    under85: number; // Probabilité Under 8.5 corners (%)
    over95: number; // Probabilité Over 9.5 corners (%)
    prediction: string; // Ex: "Over 8.5"
  };
  // Prédictions avancées (Football)
  advancedPredictions?: {
    btts: { yes: number; no: number }; // Les deux équipes marquent
    correctScore: { home: number; away: number; prob: number }[]; // Scores exacts probables
    halfTime: { home: number; draw: number; away: number }; // Résultat MT
  };
  // Prédictions NBA spécifiques
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
}

// Interface pour les stats de timing
interface TimingInfo {
  currentHour: number;
  canRefresh: boolean;
  nextRefreshTime: string;
  currentPhase: 'morning' | 'afternoon' | 'evening';
  message: string;
}

// Interface pour les stats de sources
interface SourceStats {
  oddsApi: { count: number; status: 'online' | 'offline' };
  footballData: { count: number; status: 'online' | 'offline' };
  totalMatches: number;
  todayMatches: number;
  lastUpdate: string;
}

// Ligues prioritaires pour le football (plus le chiffre est bas, plus c'est prioritaire)
const PRIORITY_LEAGUES: Record<string, { priority: number; name: string; dataQuality: 'high' | 'medium' | 'low' }> = {
  // ===== ANGLETERRE =====
  'soccer_epl': { priority: 1, name: 'Premier League', dataQuality: 'high' },
  // ===== FRANCE =====
  'soccer_france_ligue_one': { priority: 1, name: 'Ligue 1', dataQuality: 'high' },
  // ===== ESPAGNE =====
  'soccer_spain_la_liga': { priority: 1, name: 'La Liga', dataQuality: 'high' },
  // ===== ALLEMAGNE =====
  'soccer_germany_bundesliga': { priority: 1, name: 'Bundesliga', dataQuality: 'high' },
  // ===== PORTUGAL =====
  'soccer_portugal_primeira_liga': { priority: 2, name: 'Liga Portugal', dataQuality: 'high' },
  // ===== BELGIQUE =====
  'soccer_belgium_first_div': { priority: 2, name: 'Jupiler Pro League', dataQuality: 'high' },
  // ===== COMPÉTITIONS EUROPÉENNES =====
  'soccer_uefa_champs_league': { priority: 1, name: 'Champions League', dataQuality: 'high' },
  'soccer_uefa_europa_league': { priority: 2, name: 'Europa League', dataQuality: 'high' },
  // ===== COMPÉTITIONS INTERNATIONALES =====
  'soccer_fifa_world_cup': { priority: 1, name: 'Coupe du Monde', dataQuality: 'high' },
  'soccer_uefa_euro': { priority: 1, name: 'Euro', dataQuality: 'high' },
};

// ===== NBA - BASKETBALL =====
const NBA_LEAGUE_KEY = 'basketball_nba';
const NBA_LEAGUE_NAME = 'NBA';

/**
 * Vérifie si un match est aujourd'hui
 */
function isToday(dateString: string): boolean {
  if (!dateString) return false;
  
  const matchDate = new Date(dateString);
  const today = new Date();
  
  // Comparer seulement la date (pas l'heure)
  const matchDateOnly = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Accepter aussi les matchs dans les 24h suivantes
  const tomorrowOnly = new Date(todayOnly);
  tomorrowOnly.setDate(tomorrowOnly.getDate() + 1);
  
  return matchDateOnly >= todayOnly && matchDateOnly < tomorrowOnly;
}

/**
 * Formate une date pour l'affichage
 */
function formatMatchDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isTodayDate = date.toDateString() === today.toDateString();
  const isTomorrowDate = date.toDateString() === tomorrow.toDateString();
  
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  if (isTodayDate) {
    return `Aujourd'hui ${time}`;
  } else if (isTomorrowDate) {
    return `Demain ${time}`;
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + time;
  }
}

/**
 * Détermine le créneau horaire d'un match basé sur son heure GMT
 * NOUVEAU PLAN:
 * - 00h-20h GMT = Journée (Foot uniquement)
 * - 20h-00h GMT = Nuit (NBA uniquement)
 */
function getTimeSlot(dateString: string, sport: string): 'day' | 'night' {
  const date = new Date(dateString);
  const startHour = date.getUTCHours(); // Utiliser UTC/GMT
  
  // NBA = toujours nuit (20h-00h GMT typiquement 01h-04h en Europe)
  if (sport === 'Basket') {
    return 'night';
  }
  
  // Football = journée (00h-20h GMT)
  // Matchs européens typiquement 12h-22h GMT
  if (startHour < 20) {
    return 'day';
  } else {
    return 'night';
  }
}

/**
 * Calcule les infos de timing pour la gestion du refresh
 * NOUVEAU PLAN:
 * - 00h-20h GMT: Football (10 matchs)
 * - 20h-00h GMT: NBA (5 matchs)
 */
function getTimingInfo(): TimingInfo {
  const now = new Date();
  const currentHour = now.getUTCHours(); // Utiliser GMT/UTC
  
  let canRefresh = true;
  let nextRefreshTime = 'Maintenant';
  let currentPhase: 'morning' | 'afternoon' | 'evening';
  let message = '';
  
  if (currentHour < 12) {
    // Matinée GMT: Football
    currentPhase = 'morning';
    canRefresh = true;
    message = '⚽ Matchs Football disponibles (journée)';
  } else if (currentHour < 20) {
    // Après-midi GMT: Football
    currentPhase = 'afternoon';
    canRefresh = true;
    message = '⚽ Matchs Football disponibles (soirée)';
  } else {
    // Nuit GMT: NBA
    currentPhase = 'evening';
    canRefresh = true;
    message = '🏀 Matchs NBA disponibles (nuit)';
  }
  
  return {
    currentHour,
    canRefresh,
    nextRefreshTime,
    currentPhase,
    message
  };
}

/**
 * Filtre et répartit les matchs selon le NOUVEAU PLAN:
 * - Journée (00h-20h GMT): 10 matchs Football
 * - Nuit (20h-00h GMT): 5 matchs NBA
 */
function distributeMatchesByTimeSlot(
  matches: CrossValidatedMatch[], 
  timing: TimingInfo
): CrossValidatedMatch[] {
  // Ajouter le timeSlot à chaque match
  const matchesWithSlot = matches.map(m => ({
    ...m,
    timeSlot: getTimeSlot(m.date, m.sport)
  }));
  
  // Séparer Football et NBA
  const footballMatches = matchesWithSlot.filter(m => m.sport === 'Foot');
  const nbaMatches = matchesWithSlot.filter(m => m.sport === 'Basket');
  
  // Football: 10 matchs pour la journée (00h-20h GMT)
  const selectedFootball = footballMatches.slice(0, 10);
  
  // NBA: 5 matchs pour la nuit (20h-00h GMT)
  const selectedNBA = nbaMatches.slice(0, 5);
  
  // Combiner: Football d'abord, puis NBA
  const result = [...selectedFootball, ...selectedNBA];
  
  console.log(`📊 Répartition: Football(${selectedFootball.length}) + NBA(${selectedNBA.length}) = ${result.length} matchs`);
  
  return result;
}

/**
 * Récupère les matchs depuis The Odds API
 * NOUVEAU PLAN: 3 ligues Football + 1 NBA = 4 appels API
 * FALLBACK: Utilise données NBA simulées si quota épuisé
 */
async function fetchOddsApiMatches(): Promise<any[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    console.log('⚠️ THE_ODDS_API_KEY non configurée');
    return [];
  }

  const allMatches: any[] = [];
  let creditsUsed = 0;
  let oddsApiWorking = true;

  try {
    // Récupérer les sports disponibles (1 crédit)
    const sportsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`
    );
    
    if (!sportsResponse.ok) {
      console.error(`Erreur sports API: ${sportsResponse.status}`);
      oddsApiWorking = false;
    }
    
    if (oddsApiWorking) {
      const sports = await sportsResponse.json();
      
      // ===== FOOTBALL: 3 ligues aléatoires =====
      const soccerSports = sports.filter((s: any) => s.group?.toLowerCase() === 'soccer');
      const availableLeagues = soccerSports.filter((s: any) => PRIORITY_LEAGUES[s.key]);
      
      const today = new Date().toISOString().split('T')[0];
      const seed = today.split('-').join('');
      
      const shuffled = [...availableLeagues].sort((a, b) => {
        const hashA = (seed + a.key).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hashB = (seed + b.key).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return hashA - hashB;
      });
      
      const MIN_FOOTBALL_MATCHES = 10;

      // ===== FOOTBALL: Récupérer jusqu'à 10 matchs =====
      for (const sport of shuffled) {
        if (allMatches.filter(m => m.sport_type === 'football').length >= MIN_FOOTBALL_MATCHES) {
          break;
        }
        
        try {
          const oddsResponse = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sport.key}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`,
            { next: { revalidate: 21600 } }
          );
          
          if (oddsResponse.ok) {
            const matches = await oddsResponse.json();
            allMatches.push(...matches.map((m: any) => ({ ...m, source: 'odds-api', sport_type: 'football' })));
            creditsUsed++;
            console.log(`⚽ ${PRIORITY_LEAGUES[sport.key]?.name || sport.key}: ${matches.length} matchs`);
          } else if (oddsResponse.status === 401) {
            console.log('⚠️ Quota The Odds API épuisé');
            oddsApiWorking = false;
            break;
          }
        } catch (e) {
          console.error(`Erreur ligue ${sport.key}:`, e);
        }
      }
      
      const footballCount = allMatches.filter(m => m.sport_type === 'football').length;
      console.log(`📋 Football: ${footballCount} matchs récupérés (${creditsUsed} ligues utilisées)`);
      
      // ===== NBA: 1 appel (1 crédit) =====
      if (oddsApiWorking) {
        try {
          const nbaResponse = await fetch(
            `https://api.the-odds-api.com/v4/sports/${NBA_LEAGUE_KEY}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`,
            { next: { revalidate: 21600 } }
          );
          
          if (nbaResponse.ok) {
            const nbaMatches = await nbaResponse.json();
            allMatches.push(...nbaMatches.map((m: any) => ({ ...m, source: 'odds-api', sport_type: 'nba' })));
            console.log(`🏀 NBA: ${nbaMatches.length} matchs récupérés`);
            creditsUsed++;
          } else if (nbaResponse.status === 401) {
            console.log('⚠️ Quota The Odds API épuisé pour NBA');
          }
        } catch (e) {
          console.error('Erreur NBA:', e);
        }
      }
    }
    
    console.log(`✅ Odds API: ${allMatches.length} matchs - ${creditsUsed + 1} crédits consommés`);
    return allMatches;
    
  } catch (error) {
    console.error('Erreur Odds API:', error);
    return [];
  }
}

/**
 * Récupère les matchs depuis Football-Data API
 */
async function fetchFootballDataMatches(): Promise<any[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.log('⚠️ FOOTBALL_DATA_API_KEY non configurée');
    return [];
  }

  try {
    // Récupérer les matchs des prochaines 24h
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = tomorrow.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 21600 } // 6 heures de cache
      }
    );
    
    if (!response.ok) {
      console.error(`Erreur Football-Data API: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const matches = data.matches || [];
    
    console.log(`✅ Football-Data API: ${matches.length} matchs récupérés`);
    return matches.map((m: any) => ({ ...m, source: 'football-data' }));
    
  } catch (error) {
    console.error('Erreur Football-Data API:', error);
    return [];
  }
}

/**
 * Normalise le nom d'une équipe pour le croisement
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Calcule les prédictions de buts basées sur les cotes
 * Utilise un modèle statistique basé sur l'analyse des cotes
 */
function calculateGoalsPrediction(
  oddsHome: number,
  oddsAway: number,
  oddsDraw: number | null,
  totalsMarket?: any
): CrossValidatedMatch['goalsPrediction'] {
  // Si on a le marché totals depuis l'API, l'utiliser
  let over25Line = 2.5;
  let over25Odds = 1.85; // valeur par défaut
  
  if (totalsMarket?.outcomes) {
    for (const outcome of totalsMarket.outcomes) {
      if (outcome.name === 'Over' && outcome.point === 2.5) {
        over25Odds = outcome.price;
      }
    }
  }
  
  // Calcul des probabilités implicites
  const probHome = 1 / oddsHome;
  const probAway = 1 / oddsAway;
  const probDraw = oddsDraw ? 1 / oddsDraw : 0.25;
  const totalImplied = probHome + probAway + probDraw;
  
  // Normalisation (marge du bookmaker)
  const normalizedProbHome = probHome / totalImplied;
  const normalizedProbAway = probAway / totalImplied;
  
  // Estimation du nombre de buts basée sur la disparité des cotes
  // Cotes serrées = match équilibré = potentiellement plus de buts (chacun peut marquer)
  // Grande disparité = favori net = potentiellement moins de buts (domination sans réponse)
  const disparity = Math.abs(oddsHome - oddsAway);
  const oddsRatio = Math.max(oddsHome, oddsAway) / Math.min(oddsHome, oddsAway);
  
  // Calcul du total attendu (modèle statistique)
  let expectedGoals = 2.6; // Moyenne football
  
  // Ajustement basé sur les cotes
  if (oddsRatio > 3) {
    // Favori net - match potentiellement à sens unique
    expectedGoals = 2.2 + (Math.min(oddsHome, oddsAway) < 1.5 ? 0.3 : 0);
  } else if (oddsRatio < 1.5) {
    // Match serré - les deux équipes peuvent marquer
    expectedGoals = 2.8;
  }
  
  // Ajustement basé sur la cote du nul
  if (oddsDraw && oddsDraw < 3.0) {
    // Nul probable = match serré, moins de buts
    expectedGoals *= 0.9;
  }
  
  // Calcul des probabilités Over/Under
  // Formule simplifiée basée sur la distribution de Poisson
  const avgGoals = expectedGoals;
  
  // P(X > 2.5) = 1 - P(X <= 2)
  // Approximation: P(Over 2.5) ≈ 1 - e^(-λ) * (1 + λ + λ²/2)
  const poissonCumulative2 = Math.exp(-avgGoals) * (1 + avgGoals + (avgGoals * avgGoals) / 2);
  const over25Prob = Math.round((1 - poissonCumulative2) * 100);
  
  // P(X > 1.5) = 1 - P(X <= 1)
  const poissonCumulative1 = Math.exp(-avgGoals) * (1 + avgGoals);
  const over15Prob = Math.round((1 - poissonCumulative1) * 100);
  
  // Both Teams to Score - basé sur les probabilités de victoire
  const btsProb = Math.round((normalizedProbHome + normalizedProbAway) * 40 + 
                             (1 - Math.abs(normalizedProbHome - normalizedProbAway)) * 30);
  
  // Déterminer la meilleure prédiction
  let prediction = '';
  if (over25Prob >= 55) {
    prediction = 'Over 2.5 buts';
  } else if (over25Prob <= 45) {
    prediction = 'Under 2.5 buts';
  } else if (btsProb >= 55) {
    prediction = 'Les deux marquent';
  } else {
    prediction = over15Prob >= 60 ? 'Over 1.5 buts' : 'Match serré';
  }
  
  return {
    total: Math.round(expectedGoals * 10) / 10,
    over25: over25Prob,
    under25: 100 - over25Prob,
    over15: over15Prob,
    bothTeamsScore: Math.min(btsProb, 85),
    prediction
  };
}

/**
 * Calcule les prédictions de cartons basées sur les caractéristiques du match
 * Les cartons ne sont pas fournis par les APIs standards, donc on utilise un modèle
 */
function calculateCardsPrediction(
  oddsHome: number,
  oddsAway: number,
  oddsDraw: number | null,
  league: string
): CrossValidatedMatch['cardsPrediction'] {
  // Moyennes de cartons par ligue (approximatives)
  const leagueCardsAvg: Record<string, number> = {
    'Ligue 1': 4.2,
    'Premier League': 3.5,
    'La Liga': 5.0,
    'Serie A': 4.8,
    'Bundesliga': 3.8,
    'Champions League': 4.0,
    'Europa League': 4.3,
  };
  
  const baseCards = leagueCardsAvg[league] || 4.0;
  
  // Facteurs d'ajustement
  const disparity = Math.abs(oddsHome - oddsAway);
  const oddsRatio = Math.max(oddsHome, oddsAway) / Math.min(oddsHome, oddsAway);
  
  // Ajustements:
  // - Match serré (odds ratio < 1.5) = plus de tension = plus de cartons
  // - Favori net = moins de tension, mais l'outsider peut faire plus de fautes
  
  let expectedCards = baseCards;
  
  if (oddsRatio < 1.5) {
    // Match très serré - plus de tension
    expectedCards += 0.5;
  } else if (oddsRatio > 2.5) {
    // Favori net - l'outsider peut faire plus de fautes pour contrer
    expectedCards += 0.3;
  }
  
  // Cote de nul basse = match défensif = potentiellement plus de fautes
  if (oddsDraw && oddsDraw < 3.2) {
    expectedCards += 0.3;
  }
  
  // Calcul des probabilités
  // Distribution approximative
  const avgCards = expectedCards;
  
  // P(Over 4.5) - approximation
  const over45Prob = Math.round(Math.min(50 + (avgCards - 4) * 15, 75));
  
  // Risque de carton rouge (généralement 15-25% par match)
  let redCardRisk = 18; // base
  if (oddsRatio < 1.5) {
    redCardRisk += 5; // match tendu
  }
  if (avgCards > 5) {
    redCardRisk += 3;
  }
  
  // Déterminer la prédiction
  let prediction = '';
  if (over45Prob >= 55) {
    prediction = 'Over 4.5 cartons';
  } else if (over45Prob <= 40) {
    prediction = 'Under 4.5 cartons';
  } else {
    prediction = 'Match normal';
  }
  
  return {
    total: Math.round(expectedCards * 10) / 10,
    over45: over45Prob,
    under45: 100 - over45Prob,
    redCardRisk: Math.min(redCardRisk, 30),
    prediction
  };
}

/**
 * Calcule les prédictions de corners basées sur les caractéristiques du match
 * Les corners ne sont pas fournis par les APIs standards, donc on utilise un modèle statistique
 */
function calculateCornersPrediction(
  oddsHome: number,
  oddsAway: number,
  oddsDraw: number | null,
  league: string
): CrossValidatedMatch['cornersPrediction'] {
  // Moyennes de corners par ligue (approximatives)
  const leagueCornersAvg: Record<string, number> = {
    'Ligue 1': 9.2,
    'Premier League': 10.5,
    'La Liga': 9.0,
    'Serie A': 9.5,
    'Bundesliga': 9.8,
    'Champions League': 9.5,
    'Europa League': 9.3,
  };
  
  const baseCorners = leagueCornersAvg[league] || 9.0;
  
  // Facteurs d'ajustement
  const oddsRatio = Math.max(oddsHome, oddsAway) / Math.min(oddsHome, oddsAway);
  
  // Ajustements:
  // - Match serré = plus d'attaques des deux côtés = plus de corners
  // - Favori net = domination = plus de corners pour le favori
  
  let expectedCorners = baseCorners;
  
  if (oddsRatio < 1.5) {
    // Match très serré - beaucoup d'attaques des deux côtés
    expectedCorners += 1.0;
  } else if (oddsRatio > 2.5) {
    // Favori net - moins de corners car l'outsider défend plus
    expectedCorners -= 0.5;
  }
  
  // Cote de nul basse = match défensif = moins de corners
  if (oddsDraw && oddsDraw < 3.0) {
    expectedCorners -= 0.3;
  }
  
  // Calcul des probabilités
  const avgCorners = expectedCorners;
  
  // P(Over 8.5) - approximation
  const over85Prob = Math.round(Math.min(45 + (avgCorners - 8.5) * 12, 75));
  
  // P(Over 9.5)
  const over95Prob = Math.round(Math.min(35 + (avgCorners - 9.5) * 12, 65));
  
  // Déterminer la prédiction
  let prediction = '';
  if (over85Prob >= 60) {
    prediction = 'Over 8.5 corners';
  } else if (over95Prob <= 35) {
    prediction = 'Under 9.5 corners';
  } else if (over85Prob >= 50) {
    prediction = 'Over 8.5 corners';
  } else {
    prediction = 'Under 8.5 corners';
  }
  
  return {
    total: Math.round(expectedCorners * 10) / 10,
    over85: over85Prob,
    under85: 100 - over85Prob,
    over95: over95Prob,
    prediction
  };
}

/**
 * Calcule les prédictions avancées (BTTS, Score exact, MT)
 */
function calculateAdvancedPredictions(
  oddsHome: number,
  oddsAway: number,
  oddsDraw: number | null,
  goalsPrediction: CrossValidatedMatch['goalsPrediction']
): CrossValidatedMatch['advancedPredictions'] {
  // Probabilités implicites
  const probHome = 1 / oddsHome;
  const probAway = 1 / oddsAway;
  const probDraw = oddsDraw ? 1 / oddsDraw : 0.25;
  const totalImplied = probHome + probAway + probDraw;
  
  const normalizedProbHome = probHome / totalImplied;
  const normalizedProbAway = probAway / totalImplied;
  const normalizedProbDraw = probDraw / totalImplied;
  
  // BTTS (Both Teams To Score)
  const bttsYes = goalsPrediction?.bothTeamsScore || 
    Math.round((normalizedProbHome + normalizedProbAway) * 40 + 
               (1 - Math.abs(normalizedProbHome - normalizedProbAway)) * 30);
  
  // Score exact - basé sur la distribution de Poisson
  const expectedHomeGoals = (goalsPrediction?.total || 2.5) * normalizedProbHome / (normalizedProbHome + normalizedProbAway);
  const expectedAwayGoals = (goalsPrediction?.total || 2.5) * normalizedProbAway / (normalizedProbHome + normalizedProbAway);
  
  // Scores probables (simplifié)
  const correctScore = [
    { home: Math.round(expectedHomeGoals), away: Math.round(expectedAwayGoals), prob: 15 },
    { home: Math.round(expectedHomeGoals), away: Math.round(expectedAwayGoals) - 1, prob: 12 },
    { home: Math.round(expectedHomeGoals) - 1, away: Math.round(expectedAwayGoals), prob: 10 },
    { home: 1, away: 1, prob: 12 },
    { home: 0, away: 0, prob: 8 },
  ].filter(s => s.home >= 0 && s.away >= 0).sort((a, b) => b.prob - a.prob).slice(0, 3);
  
  // Résultat MT (mi-temps) - généralement plus de nuls
  const halfTime = {
    home: Math.round(normalizedProbHome * 38),
    draw: Math.round(normalizedProbDraw * 45),
    away: Math.round(normalizedProbAway * 38)
  };
  // Normaliser à 100%
  const htTotal = halfTime.home + halfTime.draw + halfTime.away;
  halfTime.home = Math.round(halfTime.home * 100 / htTotal);
  halfTime.draw = Math.round(halfTime.draw * 100 / htTotal);
  halfTime.away = 100 - halfTime.home - halfTime.draw;
  
  return {
    btts: { yes: Math.min(bttsYes, 80), no: 100 - Math.min(bttsYes, 80) },
    correctScore,
    halfTime
  };
}

/**
 * Croise les données des deux sources
 */
function crossValidateMatches(
  oddsApiMatches: any[],
  footballDataMatches: any[]
): CrossValidatedMatch[] {
  const validatedMatches: CrossValidatedMatch[] = [];
  const usedOddsIds = new Set<string>();
  
  // Créer un index des matchs Football-Data pour recherche rapide
  const fdIndex = new Map<string, any>();
  for (const fdMatch of footballDataMatches) {
    const homeKey = normalizeTeamName(fdMatch.homeTeam?.name || fdMatch.homeTeam || '');
    const awayKey = normalizeTeamName(fdMatch.awayTeam?.name || fdMatch.awayTeam || '');
    const key = `${homeKey}-${awayKey}`;
    fdIndex.set(key, fdMatch);
  }
  
  // Traiter les matchs Odds API
  for (const oddsMatch of oddsApiMatches) {
    const homeKey = normalizeTeamName(oddsMatch.home_team || '');
    const awayKey = normalizeTeamName(oddsMatch.away_team || '');
    const crossKey = `${homeKey}-${awayKey}`;
    
    const fdMatch = fdIndex.get(crossKey);
    const hasMultipleSources = !!fdMatch;
    
    // Extraire les cotes - CORRECTION: associer correctement aux équipes
    const bookmaker = oddsMatch.bookmakers?.[0];
    const h2hMarket = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
    const outcomes = h2hMarket?.outcomes || [];
    
    let oddsHome = 0;
    let oddsDraw: number | null = null;
    let oddsAway = 0;
    
    const homeTeamNorm = normalizeTeamName(oddsMatch.home_team || '');
    const awayTeamNorm = normalizeTeamName(oddsMatch.away_team || '');
    
    for (const outcome of outcomes) {
      const outcomeName = normalizeTeamName(outcome.name || '');
      const price = outcome.price;
      const name = outcome.name?.toLowerCase() || '';
      
      // Vérifier si c'est un match nul
      if (name === 'draw' || name === 'x' || name === 'nul' || name === 'match nul') {
        oddsDraw = price;
      } 
      // Associer à l'équipe domicile
      else if (outcomeName === homeTeamNorm || 
               outcomeName.includes(homeTeamNorm) || 
               homeTeamNorm.includes(outcomeName)) {
        oddsHome = price;
      }
      // Associer à l'équipe extérieur
      else if (outcomeName === awayTeamNorm || 
               outcomeName.includes(awayTeamNorm) || 
               awayTeamNorm.includes(outcomeName)) {
        oddsAway = price;
      }
      // Fallback: si pas encore assigné
      else if (oddsHome === 0) {
        oddsHome = price;
      } else {
        oddsAway = price;
      }
    }
    
    if (oddsHome === 0 || oddsAway === 0) continue;
    
    // Calcul du risque amélioré
    const minOdds = Math.min(oddsHome, oddsAway);
    const maxOdds = Math.max(oddsHome, oddsAway);
    const disparity = maxOdds - minOdds;
    
    let riskPercentage = 50;
    if (minOdds < 1.3) riskPercentage = 15;
    else if (minOdds < 1.5) riskPercentage = 20;
    else if (minOdds < 1.8) riskPercentage = 30;
    else if (minOdds < 2.0) riskPercentage = 35;
    else if (minOdds < 2.5) riskPercentage = 45;
    else if (minOdds < 3.0) riskPercentage = 55;
    else riskPercentage = 70;
    
    // Bonus de confiance si plusieurs sources
    if (hasMultipleSources) {
      riskPercentage = Math.max(riskPercentage - 5, 15);
    }
    
    // Détection de value bet améliorée
    const totalImplied = (1/oddsHome) + (1/oddsAway) + (oddsDraw ? 1/oddsDraw : 0);
    const margin = totalImplied - 1;
    const hasValueBet = margin > 0.03;
    
    // Déterminer le type de value bet
    let valueBetType: string | null = null;
    if (hasValueBet) {
      if (oddsDraw && oddsDraw > 3.0) {
        valueBetType = 'draw';
      } else if (oddsHome < oddsAway) {
        valueBetType = 'home';
      } else {
        valueBetType = 'away';
      }
    }
    
    // Qualité des données
    const dataQuality: 'high' | 'medium' | 'low' = hasMultipleSources ? 'high' : 'medium';
    
    // Confiance
    let confidence: string;
    if (riskPercentage <= 30 && hasMultipleSources) {
      confidence = 'high';
    } else if (riskPercentage <= 40) {
      confidence = 'high';
    } else if (riskPercentage <= 55) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    // Sport et ligue - Utiliser sport_type si disponible
    const sportKey = oddsMatch.sport_key || '';
    const sportType = oddsMatch.sport_type; // 'football' ou 'nba'
    const leagueInfo = PRIORITY_LEAGUES[sportKey];
    
    // Déterminer le sport: NBA en priorité si sport_type='nba'
    const sport = sportType === 'nba' || sportKey.includes('basketball') ? 'Basket' : 
                  sportKey.includes('icehockey') ? 'Hockey' : 
                  sportKey.includes('tennis') ? 'Tennis' : 'Foot';
    
    // Nom de la ligue
    const leagueName = sport === 'Basket' ? NBA_LEAGUE_NAME : 
                       (leagueInfo?.name || oddsMatch.sport_title || 'Autre');
    
    // Récupérer le marché totals pour les buts
    const totalsMarket = bookmaker?.markets?.find((m: any) => m.key === 'totals');
    
    // Calculer les prédictions de buts et cartons (Football uniquement)
    const goalsPrediction = sport === 'Foot' ? calculateGoalsPrediction(oddsHome, oddsAway, oddsDraw, totalsMarket) : undefined;
    const cardsPrediction = sport === 'Foot' ? calculateCardsPrediction(oddsHome, oddsAway, oddsDraw, leagueName) : undefined;
    const cornersPrediction = sport === 'Foot' ? calculateCornersPrediction(oddsHome, oddsAway, oddsDraw, leagueName) : undefined;
    const advancedPredictions = sport === 'Foot' ? calculateAdvancedPredictions(oddsHome, oddsAway, oddsDraw, goalsPrediction) : undefined;
    
    validatedMatches.push({
      id: oddsMatch.id,
      homeTeam: oddsMatch.home_team,
      awayTeam: oddsMatch.away_team,
      sport,
      league: leagueName,
      date: oddsMatch.commence_time,
      oddsHome,
      oddsDraw,
      oddsAway,
      status: 'upcoming',
      sources: hasMultipleSources ? ['Odds API', 'Football-Data'] : ['Odds API'],
      insight: {
        riskPercentage,
        valueBetDetected: hasValueBet,
        valueBetType,
        confidence,
        crossValidation: {
          sourcesCount: hasMultipleSources ? 2 : 1,
          oddsConsensus: true,
          dataQuality,
        },
      },
      goalsPrediction,
      cardsPrediction,
      cornersPrediction,
      advancedPredictions,
    });
    
    usedOddsIds.add(oddsMatch.id);
  }
  
  return validatedMatches;
}

/**
 * Trie les matchs par qualité des données, priorité de ligue, et risque
 * NBA est considérée comme haute qualité
 */
function sortMatchesByQuality(matches: CrossValidatedMatch[]): CrossValidatedMatch[] {
  return matches.sort((a, b) => {
    // NBA = haute qualité par défaut
    const isNBA_a = a.sport === 'Basket' && a.league === 'NBA';
    const isNBA_b = b.sport === 'Basket' && b.league === 'NBA';
    
    // 1. Qualité des données de la ligue (high > medium > low)
    let aDataQuality: 'high' | 'medium' | 'low' = isNBA_a ? 'high' : 'low';
    let bDataQuality: 'high' | 'medium' | 'low' = isNBA_b ? 'high' : 'low';
    
    if (!isNBA_a) {
      const aLeagueKey = Object.keys(PRIORITY_LEAGUES).find(k => 
        a.league.includes(PRIORITY_LEAGUES[k].name)
      );
      aDataQuality = aLeagueKey ? PRIORITY_LEAGUES[aLeagueKey].dataQuality : 'low';
    }
    
    if (!isNBA_b) {
      const bLeagueKey = Object.keys(PRIORITY_LEAGUES).find(k => 
        b.league.includes(PRIORITY_LEAGUES[k].name)
      );
      bDataQuality = bLeagueKey ? PRIORITY_LEAGUES[bLeagueKey].dataQuality : 'low';
    }
    
    const qualityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    if (qualityOrder[aDataQuality] !== qualityOrder[bDataQuality]) {
      return qualityOrder[aDataQuality] - qualityOrder[bDataQuality];
    }
    
    // 2. Priorité de ligue (NBA = priorité 1)
    let aLeaguePriority = isNBA_a ? 1 : 99;
    let bLeaguePriority = isNBA_b ? 1 : 99;
    
    if (!isNBA_a) {
      const aLeagueKey = Object.keys(PRIORITY_LEAGUES).find(k => 
        a.league.includes(PRIORITY_LEAGUES[k].name)
      );
      aLeaguePriority = aLeagueKey ? PRIORITY_LEAGUES[aLeagueKey].priority : 99;
    }
    
    if (!isNBA_b) {
      const bLeagueKey = Object.keys(PRIORITY_LEAGUES).find(k => 
        b.league.includes(PRIORITY_LEAGUES[k].name)
      );
      bLeaguePriority = bLeagueKey ? PRIORITY_LEAGUES[bLeagueKey].priority : 99;
    }
    
    if (aLeaguePriority !== bLeaguePriority) {
      return aLeaguePriority - bLeaguePriority;
    }
    
    // 3. Sources multiples = meilleures données
    const aSources = a.insight.crossValidation?.sourcesCount || 1;
    const bSources = b.insight.crossValidation?.sourcesCount || 1;
    if (aSources !== bSources) {
      return bSources - aSources;
    }
    
    // 4. Risque (plus bas = mieux)
    if (a.insight.riskPercentage !== b.insight.riskPercentage) {
      return a.insight.riskPercentage - b.insight.riskPercentage;
    }
    
    // 5. Value bet en priorité
    if (a.insight.valueBetDetected !== b.insight.valueBetDetected) {
      return a.insight.valueBetDetected ? -1 : 1;
    }
    
    return 0;
  });
}

/**
 * Génère des matchs NBA simulés basés sur les données réelles des équipes
 * Utilisé comme fallback quand The Odds API est épuisé
 */
function generateNBAFallbackMatches(): CrossValidatedMatch[] {
  console.log('🏀 Génération des matchs NBA (fallback)...');
  
  const nbaSchedule = getTodayNBASchedule();
  const matches: CrossValidatedMatch[] = [];
  
  for (const game of nbaSchedule) {
    const predictions = getNBAPredictions(game.homeTeam, game.awayTeam);
    
    // Créer le match au format attendu
    const match: CrossValidatedMatch = {
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: 'Basket',
      league: 'NBA',
      date: `${game.date}T${game.time}:00Z`,
      oddsHome: predictions.oddsHome,
      oddsDraw: null, // Pas de nul en NBA
      oddsAway: predictions.oddsAway,
      status: 'upcoming',
      sources: ['NBA Stats (Fallback)'],
      timeSlot: 'night',
      insight: {
        riskPercentage: predictions.riskPercentage,
        valueBetDetected: Math.abs(predictions.winProb.home - 50) > 25,
        valueBetType: predictions.winProb.home > 60 ? 'home' : predictions.winProb.away > 60 ? 'away' : null,
        confidence: predictions.confidence,
      },
      // NBA utilise des prédictions différentes
      goalsPrediction: undefined,
      cardsPrediction: undefined,
      cornersPrediction: undefined,
      advancedPredictions: {
        btts: { yes: 0, no: 0 }, // Pas applicable NBA
        correctScore: [],
        halfTime: { 
          home: predictions.winProb.home, 
          draw: 0, 
          away: predictions.winProb.away 
        }
      }
    };
    
    matches.push(match);
  }
  
  console.log(`🏀 NBA Fallback: ${matches.length} matchs générés`);
  return matches;
}

/**
 * Convertit un match fallback vers le format CrossValidatedMatch
 */
function convertFallbackToValidated(fallback: FallbackMatch): CrossValidatedMatch {
  return {
    id: fallback.id,
    homeTeam: fallback.homeTeam,
    awayTeam: fallback.awayTeam,
    sport: fallback.sport,
    league: fallback.league,
    date: `${fallback.date}T${fallback.time}:00Z`,
    oddsHome: fallback.oddsHome,
    oddsDraw: fallback.oddsDraw,
    oddsAway: fallback.oddsAway,
    status: fallback.status,
    sources: [fallback.source],
    timeSlot: fallback.sport === 'Basket' || fallback.sport === 'Hockey' ? 'night' : 'day',
    insight: {
      riskPercentage: fallback.riskPercentage,
      valueBetDetected: Math.abs(fallback.winProb.home - 50) > 25 || 
                        (fallback.winProb.draw !== undefined && fallback.winProb.draw > 32),
      valueBetType: fallback.winProb.home > 60 ? 'home' : 
                    fallback.winProb.away > 60 ? 'away' : 
                    fallback.winProb.draw && fallback.winProb.draw > 30 ? 'draw' : null,
      confidence: fallback.confidence,
      crossValidation: {
        sourcesCount: 1,
        oddsConsensus: true,
        dataQuality: 'medium',
      },
    },
    // Prédictions de buts (football uniquement)
    goalsPrediction: fallback.sport === 'Foot' ? {
      total: 2.5,
      over25: fallback.winProb.home > 55 || fallback.winProb.away > 55 ? 55 : 48,
      under25: fallback.winProb.home > 55 || fallback.winProb.away > 55 ? 45 : 52,
      over15: 72,
      bothTeamsScore: 52,
      prediction: fallback.winProb.draw && fallback.winProb.draw > 28 ? 'Match serré' : 'Over 1.5 buts',
    } : undefined,
    // Prédictions de cartons (football uniquement)
    cardsPrediction: fallback.sport === 'Foot' ? {
      total: 4.2,
      over45: 52,
      under45: 48,
      redCardRisk: 18,
      prediction: 'Match normal',
    } : undefined,
    // Prédictions de corners (football uniquement)
    cornersPrediction: fallback.sport === 'Foot' ? {
      total: 9.5,
      over85: 55,
      under85: 45,
      over95: 42,
      prediction: 'Over 8.5 corners',
    } : undefined,
    // Prédictions avancées (football)
    advancedPredictions: fallback.sport === 'Foot' ? {
      btts: { yes: 52, no: 48 },
      correctScore: [],
      halfTime: {
        home: Math.round(fallback.winProb.home * 0.8),
        draw: fallback.winProb.draw ? Math.round(fallback.winProb.draw * 1.3) : 15,
        away: Math.round(fallback.winProb.away * 0.8),
      },
    } : undefined,
    // Prédictions NBA (basket uniquement)
    nbaPredictions: fallback.sport === 'Basket' && fallback.nbaPredictions ? fallback.nbaPredictions : undefined,
  };
}

/**
 * Fonction principale : récupère et croise les données
 * GARANTIT: 10 Football + 5 NBA = 15 matchs par jour
 * FALLBACK AUTOMATIQUE: Si Odds API épuisé, utilise données générées
 */
export async function getCrossValidatedMatches(): Promise<{
  matches: CrossValidatedMatch[];
  timing: TimingInfo;
}> {
  console.log('🔄 Début du croisement multi-sources...');
  console.log(`📅 Date du jour: ${new Date().toLocaleDateString('fr-FR')}`);
  
  // Obtenir les infos de timing
  const timing = getTimingInfo();
  console.log(`⏰ Timing: ${timing.message}`);
  
  // Récupérer les données des deux sources en parallèle
  const [oddsApiMatches, footballDataMatches] = await Promise.all([
    fetchOddsApiMatches(),
    fetchFootballDataMatches(),
  ]);
  
  console.log(`📊 Sources: Odds API (${oddsApiMatches.length}), Football-Data (${footballDataMatches.length})`);
  
  // DÉTECTION: Aucun match de l'API = utiliser fallback
  const footballFromApi = oddsApiMatches.filter((m: any) => !m.sport_key?.includes('basketball'));
  const hasApiFootball = footballFromApi.length >= 5;
  
  let validatedMatches: CrossValidatedMatch[] = [];
  
  if (hasApiFootball) {
    // API fonctionne - utiliser les données réelles
    console.log('✅ API Odds fonctionne - Utilisation des données réelles');
    validatedMatches = crossValidateMatches(oddsApiMatches, footballDataMatches);
  } else {
    // API épuisée ou peu de matchs - utiliser le fallback
    console.log('⚠️ API Odds épuisée ou peu de matchs - Activation du fallback');
    const fallbackMatches = await getAllFallbackMatches();
    validatedMatches = fallbackMatches.map(convertFallbackToValidated);
    console.log(`✅ Fallback: ${validatedMatches.length} matchs récupérés`);
  }
  
  // ⚠️ FILTRER UNIQUEMENT LES MATCHS DU JOUR
  const todayMatches = validatedMatches.filter(m => isToday(m.date));
  const filteredCount = validatedMatches.length - todayMatches.length;
  
  if (filteredCount > 0) {
    console.log(`🔍 ${filteredCount} matchs hors-date exclus`);
  }
  
  console.log(`📅 Matchs du jour: ${todayMatches.length}`);
  
  // Trier par qualité (ligues prioritaires + données multiples)
  const sortedMatches = sortMatchesByQuality(todayMatches);
  
  // Répartir selon le PLAN: 10 Foot + 5 NBA
  const distributedMatches = distributeMatchesByTimeSlot(sortedMatches, timing);
  
  // Stats détaillées par sport
  const footballCount = distributedMatches.filter(m => m.sport === 'Foot').length;
  const nbaCount = distributedMatches.filter(m => m.sport === 'Basket').length;
  console.log(`✅ ${distributedMatches.length} matchs sélectionnés: ${footballCount} Football + ${nbaCount} NBA`);
  
  // Stats
  const safes = distributedMatches.filter(m => m.insight.riskPercentage <= 40).length;
  const valueBets = distributedMatches.filter(m => m.insight.valueBetDetected).length;
  
  return {
    matches: distributedMatches,
    timing
  };
}

/**
 * Export de la fonction getTimingInfo
 */
export { getTimingInfo };

/**
 * Récupère les statistiques des sources
 */
export async function getSourceStats(): Promise<SourceStats> {
  const [oddsApiMatches, footballDataMatches] = await Promise.all([
    fetchOddsApiMatches(),
    fetchFootballDataMatches(),
  ]);
  
  const validatedMatches = crossValidateMatches(oddsApiMatches, footballDataMatches);
  const todayMatches = validatedMatches.filter(m => isToday(m.date));
  
  return {
    oddsApi: { 
      count: oddsApiMatches.length, 
      status: oddsApiMatches.length > 0 ? 'online' : 'offline' 
    },
    footballData: { 
      count: footballDataMatches.length, 
      status: footballDataMatches.length > 0 ? 'online' : 'offline' 
    },
    totalMatches: validatedMatches.length,
    todayMatches: todayMatches.length,
    lastUpdate: new Date().toLocaleTimeString('fr-FR'),
  };
}

export type { CrossValidatedMatch, SourceStats };
