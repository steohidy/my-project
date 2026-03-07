/**
 * Détecteur de Value Bets et pièges
 * VERSION CLIENT-SIDE SAFE (sans Prisma)
 */

import { MatchData } from './riskCalculator';

interface ValueBetResult {
  isValueBet: boolean;
  betType: 'home' | 'draw' | 'away';
  value: number;
  confidence: 'low' | 'medium' | 'high';
  explanation: string;
}

/**
 * Détecte les value bets potentiels sur un match
 * Un value bet est une cote surévaluée par le bookmaker
 */
export function detectValueBets(match: MatchData): ValueBetResult[] {
  const results: ValueBetResult[] = [];
  
  // Analyser les trois types de paris
  const homeAnalysis = analyzeValueBet(match, 'home');
  const drawAnalysis = analyzeValueBet(match, 'draw');
  const awayAnalysis = analyzeValueBet(match, 'away');
  
  if (homeAnalysis.isValueBet) results.push(homeAnalysis);
  if (drawAnalysis.isValueBet) results.push(drawAnalysis);
  if (awayAnalysis.isValueBet) results.push(awayAnalysis);
  
  return results;
}

/**
 * Analyse un type de pari spécifique pour détecter un value bet
 */
function analyzeValueBet(match: MatchData, betType: 'home' | 'draw' | 'away'): ValueBetResult {
  const odds = getOdds(match, betType);
  const impliedProbability = 1 / odds;
  const trueProbability = estimateTrueProbability(match, betType);
  
  const value = trueProbability - impliedProbability;
  const isValueBet = value > 0.03; // Seuil de 3% pour considérer un value bet
  
  return {
    isValueBet,
    betType,
    value: Math.round(value * 100) / 100,
    confidence: getConfidence(Math.abs(value)),
    explanation: generateExplanation(match, betType, odds, value, isValueBet)
  };
}

/**
 * Obtient la cote pour un type de pari
 */
function getOdds(match: MatchData, betType: 'home' | 'draw' | 'away'): number {
  switch (betType) {
    case 'home':
      return match.oddsHome;
    case 'draw':
      return match.oddsDraw || 3.5;
    case 'away':
      return match.oddsAway;
    default:
      return match.oddsHome;
  }
}

/**
 * Estime la vraie probabilité d'un résultat
 */
function estimateTrueProbability(match: MatchData, betType: 'home' | 'draw' | 'away'): number {
  const homeOdds = match.oddsHome;
  const awayOdds = match.oddsAway;
  const drawOdds = match.oddsDraw || 3.5;
  
  // Probabilités implicites brutes
  const rawHomeProb = 1 / homeOdds;
  const rawDrawProb = 1 / drawOdds;
  const rawAwayProb = 1 / awayOdds;
  
  // Normaliser pour enlever la marge du bookmaker
  const total = rawHomeProb + rawDrawProb + rawAwayProb;
  
  const homeProb = rawHomeProb / total;
  const drawProb = rawDrawProb / total;
  const awayProb = rawAwayProb / total;
  
  // Ajustements basés sur des facteurs additionnels
  // (En production, utiliser des modèles ML et données historiques)
  let adjustment = 0;
  
  // Facteur: Disparité des cotes
  const disparity = Math.abs(homeOdds - awayOdds);
  if (betType === 'home' && homeOdds < awayOdds && disparity > 2) {
    // Favori à domicile avec grand écart - légèrement plus de valeur
    adjustment = 0.02;
  } else if (betType === 'away' && awayOdds < homeOdds && disparity > 2) {
    // Favori à l'extérieur - plus risqué
    adjustment = -0.01;
  }
  
  // Facteur: Sport spécifique
  if (match.sport === 'NBA' || match.sport === 'NHL') {
    // Pas de match nul en NBA/NHL (en temps réglementaire)
    if (betType === 'draw') {
      return 0.05; // Très faible probabilité
    }
  }
  
  switch (betType) {
    case 'home':
      return Math.min(0.95, Math.max(0.05, homeProb + adjustment));
    case 'draw':
      return Math.min(0.95, Math.max(0.05, drawProb));
    case 'away':
      return Math.min(0.95, Math.max(0.05, awayProb + adjustment));
    default:
      return 0.33;
  }
}

/**
 * Détermine le niveau de confiance
 */
function getConfidence(valueGap: number): 'low' | 'medium' | 'high' {
  if (valueGap < 0.05) return 'low';
  if (valueGap < 0.10) return 'medium';
  return 'high';
}

/**
 * Génère une explication textuelle
 */
function generateExplanation(
  match: MatchData,
  betType: 'home' | 'draw' | 'away',
  odds: number,
  value: number,
  isValueBet: boolean
): string {
  const team = betType === 'home' ? match.homeTeam : betType === 'away' ? match.awayTeam : 'Match nul';
  
  if (!isValueBet) {
    return `Pas de value bet détecté sur ${team} (cote @${odds.toFixed(2)}). La cote reflète correctement la probabilité.`;
  }
  
  const valuePercent = (value * 100).toFixed(1);
  
  if (betType === 'draw') {
    return `Value bet potentiel sur le match nul ! Cote @${odds.toFixed(2)} surévaluée de ${valuePercent}%. Le bookmaker sous-estime la probabilité d'un match serré.`;
  }
  
  if (betType === 'home') {
    return `Value bet détecté sur ${match.homeTeam} ! Cote @${odds.toFixed(2)} surévaluée de ${valuePercent}%. Le favori pourrait être sous-estimé par le bookmaker.`;
  }
  
  return `Value bet détecté sur ${match.awayTeam} ! Cote @${odds.toFixed(2)} surévaluée de ${valuePercent}%. L'outsider a plus de chances que ce qu'indique la cote.`;
}

/**
 * Identifie les pièges à éviter (Anti-Trap)
 */
export function identifyTraps(match: MatchData): {
  isTrap: boolean;
  trapType: string;
  explanation: string;
  recommendation: string;
} {
  const homeOdds = match.oddsHome;
  const awayOdds = match.oddsAway;
  
  // Piège 1: Favori ultra-basique
  if (homeOdds < 1.2 || awayOdds < 1.2) {
    const favorite = homeOdds < awayOdds ? match.homeTeam : match.awayTeam;
    const odds = homeOdds < awayOdds ? homeOdds : awayOdds;
    
    return {
      isTrap: true,
      trapType: 'favorite_trap',
      explanation: `${favorite} est ultra-favori à @${odds.toFixed(2)}. Attention: gains minimes pour un risque toujours présent.`,
      recommendation: `Éviter ce pari ou miser petit. Le ratio gain/risque est défavorable.`
    };
  }
  
  // Piège 2: Match apparemment déséquilibré
  const disparity = Math.abs(homeOdds - awayOdds);
  if (disparity > 3 && (homeOdds < 1.5 || awayOdds < 1.5)) {
    const favorite = homeOdds < awayOdds ? match.homeTeam : match.awayTeam;
    return {
      isTrap: true,
      trapType: 'disparity_trap',
      explanation: `Écart de cotes important (${disparity.toFixed(1)}). ${favorite} semble imbattable, mais attention aux surprises!`,
      recommendation: `Considérer un pari sur l'outsider avec protection, ou éviter ce match.`
    };
  }
  
  // Piège 3: Cotes anormalement hautes
  if (homeOdds > 5 && awayOdds > 5) {
    return {
      isTrap: true,
      trapType: 'uncertainty_trap',
      explanation: `Les deux équipes ont des cotes très élevées. Match imprévisible avec beaucoup d'incertitude.`,
      recommendation: `Éviter ce match ou attendre plus d'informations avant de parier.`
    };
  }
  
  // Piège 4: Favori à l'extérieur
  if (awayOdds < homeOdds && awayOdds < 1.8) {
    return {
      isTrap: true,
      trapType: 'away_favorite_trap',
      explanation: `${match.awayTeam} est favori à l'extérieur (@${awayOdds.toFixed(2)}). Les favoris extérieurs sont souvent surévalués.`,
      recommendation: `Analyser la forme récente et l'historique des confrontations avant de parier.`
    };
  }
  
  return {
    isTrap: false,
    trapType: 'none',
    explanation: 'Ce match ne présente pas de pièges évidents.',
    recommendation: 'Procéder à une analyse normale des cotes et statistiques.'
  };
}

/**
 * Calcule le score global de sécurité d'un pari
 */
export function calculateSafetyScore(match: MatchData): number {
  const valueBets = detectValueBets(match);
  const trap = identifyTraps(match);
  
  let score = 50; // Score de base
  
  // Ajuster selon les value bets détectés
  const goodValueBets = valueBets.filter(vb => vb.isValueBet && vb.confidence !== 'low');
  score += goodValueBets.length * 10;
  
  // Pénaliser si piège détecté
  if (trap.isTrap) {
    score -= 25;
  }
  
  // Ajuster selon les cotes
  const minOdds = Math.min(match.oddsHome, match.oddsAway);
  if (minOdds < 1.3) score -= 15;
  if (minOdds > 2.5) score += 10;
  
  return Math.max(0, Math.min(100, score));
}
