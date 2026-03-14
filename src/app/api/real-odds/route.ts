import { NextResponse } from 'next/server';

// Cache en mémoire
let cachedData: any[] = [];
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET - Récupérer les vraies cotes depuis The Odds API uniquement
 * Version simplifiée SANS croisement
 */
export async function GET() {
  try {
    const apiKey = process.env.THE_ODDS_API_KEY;
    const apiStatus = [{ provider: 'the-odds-api', enabled: !!apiKey }];

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'THE_ODDS_API_KEY non configurée',
        apiStatus,
        setupGuide: {
          'the-odds-api': {
            name: 'The Odds API',
            url: 'https://the-odds-api.com/',
            freeTier: '500 requêtes/mois',
            envVar: 'THE_ODDS_API_KEY',
          },
        },
      });
    }

    // Vérifier le cache
    const now = Date.now();
    if (cachedData.length > 0 && (now - lastCacheTime) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        message: `${cachedData.length} matchs (cache)`,
        apiStatus,
        quotaInfo: {
          maxMatchesPerDay: 15,
          cacheDurationMinutes: 5,
        },
        stats: {
          synced: cachedData.length,
          active: cachedData.length,
        },
        matches: cachedData,
      });
    }

    // Récupérer depuis The Odds API
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `Erreur API: ${response.status}`,
        apiStatus,
      });
    }

    const data = await response.json();

    // Mapper les données
    const matches = data.slice(0, 15).map((match: any) => {
      const bookmaker = match.bookmakers?.[0];
      const h2hMarket = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
      const outcomes = h2hMarket?.outcomes || [];

      let oddsHome = 0;
      let oddsDraw: number | null = null;
      let oddsAway = 0;

      for (const outcome of outcomes) {
        const name = outcome.name?.toLowerCase() || '';
        if (name === 'draw' || name === 'x' || name === 'nul') {
          oddsDraw = outcome.price;
        } else if (oddsHome === 0) {
          oddsHome = outcome.price;
        } else {
          oddsAway = outcome.price;
        }
      }

      return {
        teams: `${match.home_team} vs ${match.away_team}`,
        sport: match.sport_title || 'Football',
        odds: `${oddsHome.toFixed(2)} | ${oddsDraw?.toFixed(2) || '-'} | ${oddsAway.toFixed(2)}`,
        oddsHome,
        oddsDraw,
        oddsAway,
      };
    }).filter((m: any) => m.oddsHome > 0 && m.oddsAway > 0);

    // Mettre en cache
    cachedData = matches;
    lastCacheTime = now;

    return NextResponse.json({
      success: true,
      message: `${matches.length} matchs synchronisés`,
      apiStatus,
      quotaInfo: {
        maxMatchesPerDay: 15,
        cacheDurationMinutes: 5,
        monthlyQuota: 500,
      },
      stats: {
        synced: matches.length,
        active: matches.length,
        maxPerDay: 15,
        apiCallsUsed: 1,
      },
      matches,
    });

  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération',
    }, { status: 500 });
  }
}

/**
 * POST - Forcer la mise à jour
 */
export async function POST() {
  cachedData = [];
  lastCacheTime = 0;
  return GET();
}
