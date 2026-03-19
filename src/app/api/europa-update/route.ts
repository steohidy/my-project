import { NextResponse } from 'next/server';

/**
 * API pour récupérer les matchs européens
 * - Champions League
 * - Europa League  
 * - Conference League
 * 
 * SOURCE: ESPN API (GRATUIT ET ILLIMITÉ)
 * Plus de problème de quota !
 */

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  oddsHome: number;
  oddsDraw: number | null;
  oddsAway: number;
  bookmaker: string;
  hasRealOdds: boolean;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'live' | 'finished';
  isLive?: boolean;
  predictions?: {
    result: { home: number; draw: number; away: number };
    goals: { expected: number; over25: number; recommendation: string };
    valueBet?: { detected: boolean; type: string; edge: number };
    confidence: string;
  };
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  status: {
    type: {
      state: string;
      name: string;
      completed: boolean;
    };
    period?: number;
    displayClock?: string;
  };
  competitions: Array<{
    competitors: Array<{
      homeAway: string;
      score: string;
      team: {
        id: string;
        displayName: string;
        abbreviation: string;
      };
    }>;
    odds?: Array<{
      provider: string;
      details: string;
      awayTeamOdds?: { moneyLine: number };
      homeTeamOdds?: { moneyLine: number };
      drawOdds?: { moneyLine: number };
    }>;
  }>;
}

// Compétitions européennes sur ESPN
const EUROPEAN_LEAGUES = [
  { key: 'uefa.champions', name: 'Champions League' },
  { key: 'uefa.europa', name: 'Europa League' },
  { key: 'uefa.europa.conf', name: 'Conference League' },
];

/**
 * Calculer les probabilités implicites depuis les cotes
 */
function calculateImpliedProbabilities(oddsHome: number, oddsDraw: number | null, oddsAway: number) {
  if (!oddsHome || !oddsAway || oddsHome <= 1 || oddsAway <= 1) {
    return { home: 33, draw: 34, away: 33 };
  }
  
  const homeProb = 1 / oddsHome;
  const awayProb = 1 / oddsAway;
  const drawProb = oddsDraw && oddsDraw > 1 ? 1 / oddsDraw : 0;
  
  const total = homeProb + awayProb + drawProb;
  
  return {
    home: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    away: Math.round((awayProb / total) * 100),
  };
}

/**
 * Estimer les cotes depuis les probabilités implicites
 * (utilisé si ESPN ne fournit pas de cotes)
 */
function estimateOddsFromTeams(homeTeam: string, awayTeam: string, league: string): { home: number; draw: number; away: number } {
  // Estimation basique basée sur le niveau des équipes
  // Dans un vrai système, on utiliserait un classement ou un historique
  
  const favoriteTeams = [
    // Champions League favorites
    'Real Madrid', 'Manchester City', 'Bayern Munich', 'Paris Saint-Germain', 'Barcelona',
    'Liverpool', 'Chelsea', 'Arsenal', 'Inter Milan', 'AC Milan', 'Borussia Dortmund',
    'Atletico Madrid', 'Juventus', 'Napoli', 'RB Leipzig',
    // Europa League favorites
    'Roma', 'Lazio', 'Bayer Leverkusen', 'West Ham', 'Brighton', 'Atalanta',
    // Conference League favorites
    'Fiorentina', 'Villarreal', 'AZ Alkmaar',
  ];
  
  const homeIsFavorite = favoriteTeams.some(t => homeTeam.toLowerCase().includes(t.toLowerCase()));
  const awayIsFavorite = favoriteTeams.some(t => awayTeam.toLowerCase().includes(t.toLowerCase()));
  
  if (homeIsFavorite && !awayIsFavorite) {
    return { home: 1.65, draw: 3.60, away: 5.00 };
  } else if (!homeIsFavorite && awayIsFavorite) {
    return { home: 4.50, draw: 3.60, away: 1.75 };
  } else if (homeIsFavorite && awayIsFavorite) {
    return { home: 2.30, draw: 3.30, away: 3.00 };
  } else {
    return { home: 2.50, draw: 3.30, away: 2.80 };
  }
}

/**
 * Calculer les prédictions
 */
function calculatePredictions(match: Match) {
  const probs = calculateImpliedProbabilities(match.oddsHome, match.oddsDraw, match.oddsAway);
  
  // Expected goals basé sur les probabilités
  const expectedGoals = (probs.home / 100) * 2.2 + (probs.away / 100) * 0.9 + (probs.draw / 100) * 1.2;
  
  // Value bet detection
  const favorite = probs.home > probs.away ? 'home' : 'away';
  const favoriteProb = Math.max(probs.home, probs.away);
  const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;
  const impliedProb = 1 / favoriteOdds;
  const edge = favoriteProb - (impliedProb * 100);
  
  return {
    result: probs,
    goals: {
      expected: expectedGoals,
      over25: expectedGoals > 2.5 ? 55 : 45,
      recommendation: expectedGoals > 2.5 ? `Over 2.5 (${expectedGoals.toFixed(1)} buts attendus)` : `Under 2.5`,
    },
    valueBet: {
      detected: edge > 5,
      type: edge > 5 ? favorite : '',
      edge: Math.max(0, edge),
    },
    confidence: favoriteProb >= 60 ? 'high' : favoriteProb >= 45 ? 'medium' : 'low',
  };
}

/**
 * GET - Récupérer les matchs européens depuis ESPN (GRATUIT)
 */
export async function GET() {
  try {
    console.log('📡 Récupération matchs européens depuis ESPN (GRATUIT)...');
    
    const allMatches: Match[] = [];

    for (const league of EUROPEAN_LEAGUES) {
      try {
        console.log(`  📌 ${league.name}...`);
        
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.key}/scoreboard`,
          { next: { revalidate: 300 } } // Cache 5 minutes
        );

        if (!response.ok) {
          console.log(`  ⚠️ ${league.name}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const events: ESPNEvent[] = data.events || [];

        for (const event of events) {
          const competition = event.competitions?.[0];
          const homeCompetitor = competition?.competitors?.find(c => c.homeAway === 'home');
          const awayCompetitor = competition?.competitors?.find(c => c.homeAway === 'away');

          if (!homeCompetitor || !awayCompetitor) continue;

          const homeTeam = homeCompetitor.team?.displayName || 'Unknown';
          const awayTeam = awayCompetitor.team?.displayName || 'Unknown';
          
          // Récupérer les cotes depuis ESPN si disponibles
          const odds = competition?.odds?.[0];
          let oddsHome = odds?.homeTeamOdds?.moneyLine ? (odds.homeTeamOdds.moneyLine / 100) + 1 : 0;
          let oddsAway = odds?.awayTeamOdds?.moneyLine ? (odds.awayTeamOdds.moneyLine / 100) + 1 : 0;
          let oddsDraw = odds?.drawOdds?.moneyLine ? (odds.drawOdds.moneyLine / 100) + 1 : null;
          
          // Si pas de cotes, estimer
          if (!oddsHome || !oddsAway) {
            const estimated = estimateOddsFromTeams(homeTeam, awayTeam, league.name);
            oddsHome = estimated.home;
            oddsDraw = estimated.draw;
            oddsAway = estimated.away;
          }
          
          const isLive = event.status?.type?.state === 'in';
          const isFinished = event.status?.type?.completed;

          const matchData: Match = {
            id: `espn_${league.key}_${event.id}`,
            homeTeam,
            awayTeam,
            sport: 'Foot',
            league: league.name,
            date: event.date,
            oddsHome,
            oddsDraw,
            oddsAway,
            bookmaker: odds?.provider || 'ESPN',
            hasRealOdds: !!odds,
            homeScore: homeCompetitor.score ? parseInt(homeCompetitor.score) : undefined,
            awayScore: awayCompetitor.score ? parseInt(awayCompetitor.score) : undefined,
            status: isLive ? 'live' : isFinished ? 'finished' : 'upcoming',
            isLive,
          };

          // Calculer les prédictions
          matchData.predictions = calculatePredictions(matchData);

          allMatches.push(matchData);
        }

        console.log(`  ✅ ${league.name}: ${events.length} matchs`);

      } catch (error) {
        console.error(`  ❌ Erreur ${league.name}:`, error);
      }
    }

    // Trier par date
    allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Stats par ligue
    const byLeague: Record<string, number> = {};
    for (const m of allMatches) {
      byLeague[m.league] = (byLeague[m.league] || 0) + 1;
    }

    console.log(`✅ Total: ${allMatches.length} matchs européens (ESPN - GRATUIT)`);

    return NextResponse.json({
      success: true,
      message: `${allMatches.length} matchs européens (ESPN - Gratuit & Illimité)`,
      matches: allMatches,
      stats: {
        total: allMatches.length,
        byLeague,
        source: 'ESPN (Gratuit)',
        quotaCost: 0,
      },
      lastUpdate: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des matchs',
      matches: [],
    }, { status: 500 });
  }
}

/**
 * POST - Rafraîchir les données
 */
export async function POST() {
  return GET();
}
