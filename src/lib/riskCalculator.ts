/**
 * Calculateur de risque pour les pronostics
 * VERSION CLIENT-SIDE SAFE (sans Prisma)
 */

// Interface locale pour les données de match (compatible client-side)
export interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  date: Date | string;
  oddsHome: number;
  oddsDraw: number | null;
  oddsAway: number;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

interface RiskFactors {
  oddsDisparity: number;
  oddsValue: number;
  historicalPerformance?: number;
  teamForm?: number;
}

/**
 * Calcule le pourcentage de risque d'un pronostic
 * Basé sur plusieurs facteurs pondérés
 */
export function calculateRiskPercentage(
  match: MatchData,
  betType: 'home' | 'draw' | 'away'
): number {
  const odds = getOddsForBetType(match, betType);
  
  // Facteur 1: Valeur de la cote (plus la cote est haute, plus le risque est élevé)
  const oddsRisk = calculateOddsRisk(odds);
  
  // Facteur 2: Disparité des cotes (écart entre favori et outsider)
  const disparityRisk = calculateDisparityRisk(match);
  
  // Facteur 3: Indicateur de value bet potentiel
  const valueBetRisk = calculateValueBetRisk(match, betType);
  
  // Pondération des facteurs
  const weightedRisk = (oddsRisk * 0.4) + (disparityRisk * 0.3) + (valueBetRisk * 0.3);
  
  return Math.min(100, Math.max(0, Math.round(weightedRisk)));
}

/**
 * Obtient la cote correspondant au type de pari
 */
export function getOddsForBetType(match: MatchData, betType: 'home' | 'draw' | 'away'): number {
  switch (betType) {
    case 'home':
      return match.oddsHome;
    case 'draw':
      return match.oddsDraw || 3.0;
    case 'away':
      return match.oddsAway;
    default:
      return match.oddsHome;
  }
}

/**
 * Calcule le risque basé sur la valeur de la cote
 * Cote basse = moins de risque, cote haute = plus de risque
 */
function calculateOddsRisk(odds: number): number {
  // Cote < 1.5: risque très faible (10-20%)
  // Cote 1.5-2.0: risque faible (20-35%)
  // Cote 2.0-3.0: risque modéré (35-55%)
  // Cote 3.0-5.0: risque élevé (55-75%)
  // Cote > 5.0: risque très élevé (75-95%)
  
  if (odds < 1.5) return 15;
  if (odds < 2.0) return 27;
  if (odds < 2.5) return 40;
  if (odds < 3.0) return 52;
  if (odds < 4.0) return 65;
  if (odds < 5.0) return 75;
  return 85;
}

/**
 * Calcule le risque basé sur la disparité des cotes
 */
function calculateDisparityRisk(match: MatchData): number {
  const homeOdds = match.oddsHome;
  const awayOdds = match.oddsAway;
  
  // Plus l'écart est grand, plus le favori est "sûr" mais attention aux pièges
  const disparity = Math.abs(homeOdds - awayOdds);
  
  // Disparité élevée = favori clair = moins de risque sur le favori
  // Mais peut indiquer un piège potentiel
  if (disparity < 0.5) return 60; // Match serré, difficile à prédire
  if (disparity < 1.0) return 45;
  if (disparity < 2.0) return 35;
  if (disparity < 3.0) return 30;
  return 40; // Grand écart = possible piège
}

/**
 * Évalue si un pari pourrait être un value bet
 * Un value bet est une cote surévaluée par le bookmaker
 */
function calculateValueBetRisk(match: MatchData, betType: 'home' | 'draw' | 'away'): number {
  const odds = getOddsForBetType(match, betType);
  
  // Probabilité implicite (selon le bookmaker)
  const impliedProbability = 1 / odds;
  
  // Probabilité estimée (simulation simplifiée)
  // En production, ceci serait basé sur des données historiques
  const estimatedProbability = estimateTrueProbability(match, betType);
  
  // Si probabilité estimée > probabilité implicite = value bet potentiel
  const value = estimatedProbability - impliedProbability;
  
  if (value > 0.1) return 25; // Bon value bet = risque réduit
  if (value > 0.05) return 35;
  if (value > 0) return 45;
  if (value > -0.05) return 55;
  if (value > -0.1) return 65;
  return 75; // Mauvaise valeur
}

/**
 * Estime la vraie probabilité d'un résultat
 * (Version simplifiée - en production, utiliser des modèles ML)
 */
function estimateTrueProbability(match: MatchData, betType: 'home' | 'draw' | 'away'): number {
  const homeOdds = match.oddsHome;
  const awayOdds = match.oddsAway;
  const drawOdds = match.oddsDraw || 3.5;
  
  // Normaliser les probabilités implicites
  const totalImplied = (1 / homeOdds) + (1 / awayOdds) + (1 / drawOdds);
  
  // Ajuster pour obtenir une estimation "vraie"
  const homeProb = (1 / homeOdds) / totalImplied;
  const awayProb = (1 / awayOdds) / totalImplied;
  const drawProb = (1 / drawOdds) / totalImplied;
  
  // Ajouter un facteur aléatoire pour la simulation
  const randomFactor = 0.02 * (Math.random() - 0.5);
  
  switch (betType) {
    case 'home':
      return Math.min(0.95, Math.max(0.05, homeProb + randomFactor));
    case 'draw':
      return Math.min(0.95, Math.max(0.05, drawProb + randomFactor));
    case 'away':
      return Math.min(0.95, Math.max(0.05, awayProb + randomFactor));
    default:
      return 0.33;
  }
}

/**
 * Retourne le niveau de risque textuel
 */
export function getRiskLevel(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage <= 35) return 'low';
  if (percentage <= 60) return 'medium';
  return 'high';
}

/**
 * Retourne la couleur associée au niveau de risque
 */
export function getRiskColor(percentage: number): string {
  if (percentage <= 35) return 'text-green-500';
  if (percentage <= 60) return 'text-yellow-500';
  return 'text-red-500';
}

/**
 * Retourne la classe CSS pour le badge de risque
 */
export function getRiskBadgeClass(percentage: number): string {
  if (percentage <= 35) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (percentage <= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

/**
 * Génère une recommandation de confiance
 */
export function getConfidenceLevel(percentage: number): string {
  if (percentage <= 30) return 'Très haute confiance';
  if (percentage <= 45) return 'Haute confiance';
  if (percentage <= 55) return 'Confiance modérée';
  if (percentage <= 70) return 'Confiance faible';
  return 'Risque élevé';
}
