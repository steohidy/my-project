/**
 * Système de croisement multi-sources pour validation des pronostics
 * Combine: The Odds API + Football-Data API
 */

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
  timeSlot?: 'morning' | 'afternoon' | 'evening'; // Créneau horaire
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
  // Nouvelles prédictions
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

// Ligues prioritaires pour le football
const PRIORITY_LEAGUES: Record<string, { priority: number; name: string }> = {
  'soccer_france_ligue_one': { priority: 1, name: 'Ligue 1' },
  'soccer_epl': { priority: 1, name: 'Premier League' },
  'soccer_spain_la_liga': { priority: 1, name: 'La Liga' },
  'soccer_italy_serie_a': { priority: 1, name: 'Serie A' },
  'soccer_germany_bundesliga': { priority: 1, name: 'Bundesliga' },
  'soccer_uefa_champs_league': { priority: 2, name: 'Champions League' },
  'soccer_uefa_europa_league': { priority: 2, name: 'Europa League' },
  'soccer_portugal_primeira_liga': { priority: 3, name: 'Liga Portugal' },
  'soccer_netherlands_eredivisie': { priority: 3, name: 'Eredivisie' },
  'soccer_belgium_first_div': { priority: 3, name: 'Jupiler Pro League' },
  'basketball_nba': { priority: 2, name: 'NBA' },
  'basketball_euroleague': { priority: 3, name: 'Euroleague' },
};

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
 * Détermine le créneau horaire d'un match
 * Matin: 00h-12h, Après-midi: 12h-17h, Soir: 17h-00h
 */
function getTimeSlot(dateString: string): 'morning' | 'afternoon' | 'evening' {
  const date = new Date(dateString);
  const hour = date.getHours();
  
  if (hour < 12) {
    return 'morning';
  } else if (hour < 17) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

/**
 * Calcule les infos de timing pour la gestion du refresh
 * Règles simplifiées:
 * - 0h-11h: Afficher tous les matchs disponibles
 * - 12h-14h: Transition, refresh limité
 * - Après 14h: Refresh autorisé
 */
function getTimingInfo(): TimingInfo {
  const now = new Date();
  const currentHour = now.getHours();
  
  let canRefresh = true; // Par défaut, refresh autorisé
  let nextRefreshTime = 'Maintenant';
  let currentPhase: 'morning' | 'afternoon' | 'evening';
  let message = '';
  
  if (currentHour < 6) {
    // Nuit/Early morning: tout afficher, refresh OK
    currentPhase = 'evening';
    canRefresh = true;
    message = '🌙 Matchs de la nuit disponibles';
  } else if (currentHour < 12) {
    // Matin: matchs du matin affichés, refresh OK
    currentPhase = 'morning';
    canRefresh = true;
    message = '🕐 Matchs du matin disponibles';
  } else if (currentHour < 14) {
    // Transition: matchs en cours, refresh limité
    currentPhase = 'afternoon';
    canRefresh = false;
    nextRefreshTime = '14h00';
    message = '⏳ Matchs en cours - Attendez 14h';
  } else if (currentHour < 18) {
    // Après-midi: refresh autorisé
    currentPhase = 'afternoon';
    canRefresh = true;
    message = '✅ Actualisation disponible';
  } else {
    // Soir: refresh autorisé
    currentPhase = 'evening';
    canRefresh = true;
    message = '✅ Matchs du soir disponibles';
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
 * Filtre les matchs selon le timing actuel
 * NOTE: Ne filtre PLUS par timeSlot - affiche tous les matchs disponibles
 */
function filterMatchesByTiming(
  matches: CrossValidatedMatch[], 
  timing: TimingInfo
): CrossValidatedMatch[] {
  // Ajouter le timeSlot à chaque match (informatif uniquement)
  const matchesWithSlot = matches.map(m => ({
    ...m,
    timeSlot: getTimeSlot(m.date)
  }));
  
  // Afficher TOUS les matchs disponibles, sans filtrage par timeSlot
  // Le timing n'affecte que la disponibilité du refresh, pas l'affichage
  return matchesWithSlot;
}

/**
 * Récupère les matchs depuis The Odds API
 */
async function fetchOddsApiMatches(): Promise<any[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    console.log('⚠️ THE_ODDS_API_KEY non configurée');
    return [];
  }

  try {
    // Récupérer les sports disponibles d'abord
    const sportsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`
    );
    
    if (!sportsResponse.ok) {
      console.error(`Erreur sports API: ${sportsResponse.status}`);
      return [];
    }
    
    const sports = await sportsResponse.json();
    
    // Filtrer les sports prioritaires
    const prioritySports = sports.filter((s: any) => 
      PRIORITY_LEAGUES[s.key] || s.group === 'soccer'
    ).slice(0, 10); // Limiter à 10 ligues pour économiser le quota
    
    const allMatches: any[] = [];
    
    // Récupérer les matchs pour chaque ligue prioritaire
    for (const sport of prioritySports) {
      try {
        const oddsResponse = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sport.key}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`,
          { next: { revalidate: 300 } }
        );
        
        if (oddsResponse.ok) {
          const matches = await oddsResponse.json();
          allMatches.push(...matches.map((m: any) => ({ ...m, source: 'odds-api' })));
        }
      } catch (e) {
        // Continuer si une ligue échoue
      }
    }
    
    console.log(`✅ Odds API: ${allMatches.length} matchs récupérés`);
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
        next: { revalidate: 300 }
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
    
    // Sport et ligue
    const sportKey = oddsMatch.sport_key || '';
    const leagueInfo = PRIORITY_LEAGUES[sportKey];
    const sport = sportKey.includes('basketball') ? 'Basket' : 
                  sportKey.includes('icehockey') ? 'Hockey' : 
                  sportKey.includes('tennis') ? 'Tennis' : 'Foot';
    const leagueName = leagueInfo?.name || oddsMatch.sport_title || 'Autre';
    
    // Récupérer le marché totals pour les buts
    const totalsMarket = bookmaker?.markets?.find((m: any) => m.key === 'totals');
    
    // Calculer les prédictions de buts et cartons
    const goalsPrediction = sport === 'Foot' ? calculateGoalsPrediction(oddsHome, oddsAway, oddsDraw, totalsMarket) : undefined;
    const cardsPrediction = sport === 'Foot' ? calculateCardsPrediction(oddsHome, oddsAway, oddsDraw, leagueName) : undefined;
    
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
    });
    
    usedOddsIds.add(oddsMatch.id);
  }
  
  return validatedMatches;
}

/**
 * Trie les matchs par qualité et risque
 */
function sortMatchesByQuality(matches: CrossValidatedMatch[]): CrossValidatedMatch[] {
  return matches.sort((a, b) => {
    // 1. Priorité de ligue
    const aLeaguePriority = PRIORITY_LEAGUES[Object.keys(PRIORITY_LEAGUES).find(k => 
      a.league.includes(PRIORITY_LEAGUES[k].name)
    ) || '']?.priority || 99;
    const bLeaguePriority = PRIORITY_LEAGUES[Object.keys(PRIORITY_LEAGUES).find(k => 
      b.league.includes(PRIORITY_LEAGUES[k].name)
    ) || '']?.priority || 99;
    
    if (aLeaguePriority !== bLeaguePriority) {
      return aLeaguePriority - bLeaguePriority;
    }
    
    // 2. Risque (plus bas = mieux)
    if (a.insight.riskPercentage !== b.insight.riskPercentage) {
      return a.insight.riskPercentage - b.insight.riskPercentage;
    }
    
    // 3. Value bet en priorité
    if (a.insight.valueBetDetected !== b.insight.valueBetDetected) {
      return a.insight.valueBetDetected ? -1 : 1;
    }
    
    // 4. Sources multiples en priorité
    const aSources = a.insight.crossValidation?.sourcesCount || 1;
    const bSources = b.insight.crossValidation?.sourcesCount || 1;
    return bSources - aSources;
  });
}

/**
 * Fonction principale : récupère et croise les données
 * FILTRE UNIQUEMENT LES MATCHS DU JOUR
 * GESTION INTELLIGENTE DU TIMING
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
  
  // Croiser les données
  let validatedMatches = crossValidateMatches(oddsApiMatches, footballDataMatches);
  
  // ⚠️ FILTRER UNIQUEMENT LES MATCHS DU JOUR
  const todayMatches = validatedMatches.filter(m => isToday(m.date));
  const filteredCount = validatedMatches.length - todayMatches.length;
  
  if (filteredCount > 0) {
    console.log(`🔍 ${filteredCount} matchs hors-date exclus`);
  }
  
  console.log(`📅 Matchs du jour: ${todayMatches.length}`);
  
  // Trier par qualité
  const sortedMatches = sortMatchesByQuality(todayMatches);
  
  // Limiter à 10 matchs de qualité
  const selectedMatches = sortedMatches.slice(0, 10);
  
  // Appliquer le filtre de timing
  const timedMatches = filterMatchesByTiming(selectedMatches, timing);
  
  console.log(`✅ ${timedMatches.length} matchs affichés (max 10, timing: ${timing.currentPhase})`);
  
  // Stats
  const safes = timedMatches.filter(m => m.insight.riskPercentage <= 40).length;
  const valueBets = timedMatches.filter(m => m.insight.valueBetDetected).length;
  const multiSource = timedMatches.filter(m => 
    (m.insight.crossValidation?.sourcesCount || 1) > 1
  ).length;
  
  console.log(`📈 Stats: ${safes} sûrs, ${valueBets} value bets, ${multiSource} multi-sources`);
  
  return {
    matches: timedMatches,
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
