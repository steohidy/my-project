/**
 * Football-Data API Service - SOURCE PRINCIPALE
 * Données: Matchs, classements, stats équipe, compétitions
 * Limite: 10 requêtes/min (gratuit)
 * Documentation: https://www.football-data.org/documentation/quickstart
 */

// Clé API
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || 'd77f3725a87e435ab4b9c2745b5977bc';
const BASE_URL = 'https://api.football-data.org/v4';

// Types
export interface FDMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  matchday: number;
  stage: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string;
  };
  season: {
    id: number;
    currentMatchday: number;
  };
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface FDStanding {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
}

export interface FDTeamStats {
  team: {
    id: number;
    name: string;
    shortName: string;
    crest: string;
  };
  statistics: {
    goalsScored: number;
    goalsConceded: number;
    avgGoalsScored: number;
    avgGoalsConceded: number;
    cleanSheets: number;
    failedToScore: number;
  };
}

// Cache pour éviter les appels répétés
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Requête avec cache et rate limiting
 */
async function fetchWithCache(endpoint: string): Promise<any> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📦 Cache: ${endpoint}`);
    return cached.data;
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-Auth-Token': FOOTBALL_DATA_API_KEY,
    },
    next: { revalidate: 300 } // Cache Next.js 5 min
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      console.error('⚠️ Rate limit Football-Data API atteint');
      // Retourner le cache même expiré si disponible
      if (cached) return cached.data;
    }
    throw new Error(`Football-Data API error: ${response.status}`);
  }
  
  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  console.log(`✅ Football-Data API: ${endpoint}`);
  return data;
}

/**
 * Récupère les matchs du jour et à venir
 */
export async function getMatches(dateFrom?: string, dateTo?: string): Promise<FDMatch[]> {
  const today = new Date();
  const from = dateFrom || today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 3);
  const to = dateTo || tomorrow.toISOString().split('T')[0];
  
  const data = await fetchWithCache(`/matches?dateFrom=${from}&dateTo=${to}`);
  return data.matches || [];
}

/**
 * Récupère les matchs d'une compétition
 */
export async function getCompetitionMatches(competitionCode: string): Promise<FDMatch[]> {
  const data = await fetchWithCache(`/competitions/${competitionCode}/matches?status=SCHEDULED,TIMED,LIVE,IN_PLAY`);
  return data.matches || [];
}

/**
 * Récupère le classement d'une compétition
 */
export async function getStandings(competitionCode: string): Promise<FDStanding[]> {
  const data = await fetchWithCache(`/competitions/${competitionCode}/standings`);
  
  if (data.standings && data.standings.length > 0) {
    // Retourner le classement général (TOTAL)
    const totalStandings = data.standings.find((s: any) => s.type === 'TOTAL');
    return totalStandings?.table || data.standings[0]?.table || [];
  }
  
  return [];
}

/**
 * Récupère les stats d'une équipe
 */
export async function getTeamStats(competitionCode: string): Promise<any> {
  const data = await fetchWithCache(`/competitions/${competitionCode}/teams`);
  return data.teams || [];
}

/**
 * Compétitions disponibles
 */
export const COMPETITIONS = {
  PL: { name: 'Premier League', country: 'England', priority: 1 },
  PD: { name: 'La Liga', country: 'Spain', priority: 1 },
  BL1: { name: 'Bundesliga', country: 'Germany', priority: 1 },
  SA: { name: 'Serie A', country: 'Italy', priority: 1 },
  FL1: { name: 'Ligue 1', country: 'France', priority: 1 },
  CL: { name: 'Champions League', country: 'Europe', priority: 0 },
  ELC: { name: 'Championship', country: 'England', priority: 2 },
  DED: { name: 'Eredivisie', country: 'Netherlands', priority: 2 },
  PPL: { name: 'Primeira Liga', country: 'Portugal', priority: 2 },
  BEL: { name: 'Jupiler Pro League', country: 'Belgium', priority: 3 },
  EC: { name: 'Euro Championship', country: 'Europe', priority: 0 },
  WC: { name: 'World Cup', country: 'World', priority: 0 },
} as const;

/**
 * Récupère les matchs de toutes les compétitions prioritaires
 */
export async function getAllMatches(): Promise<FDMatch[]> {
  const allMatches: FDMatch[] = [];
  
  // Récupérer les matchs du jour globaux
  try {
    const matches = await getMatches();
    allMatches.push(...matches);
  } catch (error) {
    console.error('Erreur récupération matchs globaux:', error);
  }
  
  // Filtrer par compétitions prioritaires
  const priorityCodes = Object.keys(COMPETITIONS).filter(
    code => COMPETITIONS[code as keyof typeof COMPETITIONS].priority <= 2
  );
  
  return allMatches.filter(m => 
    priorityCodes.includes(m.competition.code)
  );
}

/**
 * Enrichit les matchs avec les données de classement
 */
export async function enrichMatchesWithStandings(matches: FDMatch[]): Promise<FDMatch[]> {
  const standingsCache = new Map<string, FDStanding[]>();
  
  for (const match of matches) {
    const compCode = match.competition.code;
    
    if (!standingsCache.has(compCode)) {
      try {
        const standings = await getStandings(compCode);
        standingsCache.set(compCode, standings);
      } catch {
        // Ignorer les erreurs de classement
      }
    }
  }
  
  return matches;
}

/**
 * Calcule les probabilités estimées basées sur le classement
 */
export function estimateProbabilities(
  homeTeam: string,
  awayTeam: string,
  standings: FDStanding[]
): { home: number; draw: number; away: number } {
  const homeStanding = standings.find(s => 
    s.team.name.toLowerCase().includes(homeTeam.toLowerCase()) ||
    homeTeam.toLowerCase().includes(s.team.shortName.toLowerCase())
  );
  const awayStanding = standings.find(s => 
    s.team.name.toLowerCase().includes(awayTeam.toLowerCase()) ||
    awayTeam.toLowerCase().includes(s.team.shortName.toLowerCase())
  );
  
  if (!homeStanding || !awayStanding) {
    // Probabilités par défaut
    return { home: 45, draw: 28, away: 27 };
  }
  
  // Calcul basé sur la position et les points
  const homePoints = homeStanding.points;
  const awayPoints = awayStanding.points;
  const totalPoints = homePoints + awayPoints;
  
  // Avantage domicile
  const homeAdvantage = 1.15;
  
  // Probabilités de base
  let homeProb = (homePoints / totalPoints) * 55 * homeAdvantage;
  let awayProb = (awayPoints / totalPoints) * 45;
  
  // Ajustement basé sur la différence de buts
  const homeGD = homeStanding.goalDifference;
  const awayGD = awayStanding.goalDifference;
  
  if (homeGD > awayGD + 10) homeProb += 10;
  else if (awayGD > homeGD + 10) awayProb += 10;
  
  // Probabilité de nul (plus élevée si équipes proches)
  let drawProb = 25 + Math.abs(homeProb - awayProb) * 0.2;
  
  // Normaliser
  const total = homeProb + drawProb + awayProb;
  
  return {
    home: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    away: Math.round((awayProb / total) * 100),
  };
}

/**
 * Convertit un match Football-Data au format interne
 */
export function convertToInternalFormat(
  match: FDMatch,
  standings?: FDStanding[]
): {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  status: string;
  sources: string[];
  insight: any;
  homeScore?: number;
  awayScore?: number;
} {
  // Estimer les probabilités si classement disponible
  const probs = standings 
    ? estimateProbabilities(match.homeTeam.name, match.awayTeam.name, standings)
    : { home: 45, draw: 28, away: 27 };
  
  // Calculer les cotes depuis les probabilités
  const oddsHome = Math.round((1 / (probs.home / 100)) * 100) / 100;
  const oddsDraw = Math.round((1 / (probs.draw / 100)) * 100) / 100;
  const oddsAway = Math.round((1 / (probs.away / 100)) * 100) / 100;
  
  // Déterminer le risque
  const minOdds = Math.min(oddsHome, oddsAway);
  let riskPercentage = 50;
  if (minOdds < 1.3) riskPercentage = 15;
  else if (minOdds < 1.5) riskPercentage = 20;
  else if (minOdds < 1.8) riskPercentage = 30;
  else if (minOdds < 2.0) riskPercentage = 35;
  else if (minOdds < 2.5) riskPercentage = 45;
  else if (minOdds < 3.0) riskPercentage = 55;
  else riskPercentage = 70;
  
  // Statut du match
  let status = 'upcoming';
  if (match.status === 'IN_PLAY' || match.status === 'LIVE') status = 'live';
  else if (match.status === 'FINISHED') status = 'finished';
  else if (match.status === 'POSTPONED') status = 'postponed';
  
  return {
    id: `fd_${match.id}`,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    sport: 'Foot',
    league: match.competition.name,
    date: match.utcDate,
    oddsHome,
    oddsDraw,
    oddsAway,
    status,
    sources: ['Football-Data API'],
    insight: {
      riskPercentage,
      valueBetDetected: false,
      valueBetType: null,
      confidence: riskPercentage <= 35 ? 'high' : riskPercentage <= 50 ? 'medium' : 'low',
      probabilities: probs,
    },
    homeScore: match.score.fullTime.home ?? undefined,
    awayScore: match.score.fullTime.away ?? undefined,
  };
}

export { fetchWithCache };
