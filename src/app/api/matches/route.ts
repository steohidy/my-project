import { NextResponse } from 'next/server';

// Type local pour éviter les imports problématiques
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
  timeSlot?: 'morning' | 'afternoon' | 'evening';
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
  goalsPrediction?: {
    total: number;
    over25: number;
    under25: number;
    over15: number;
    bothTeamsScore: number;
    prediction: string;
  };
  cardsPrediction?: {
    total: number;
    over45: number;
    under45: number;
    redCardRisk: number;
    prediction: string;
  };
}

interface TimingInfo {
  currentHour: number;
  canRefresh: boolean;
  nextRefreshTime: string;
  currentPhase: 'morning' | 'afternoon' | 'evening';
  message: string;
}

// Cache en mémoire pour la durée de vie de l'instance serverless
let instanceCache: { matches: MatchData[]; timing: TimingInfo; date: string } | null = null;

/**
 * GET - Récupérer les matchs avec système de cache Vercel optimisé
 *
 * STRATÉGIE:
 * - Cache Vercel Edge: 6 heures (revalidate)
 * - Cache instance: Reset automatique si nouveau jour
 * - 1 seul appel API par jour par région edge
 *
 * AVANTAGE: Le nombre d'utilisateurs n'impacte PAS les crédits API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const today = new Date().toISOString().split('T')[0];

    // Vérifier si on a un cache instance valide (même jour)
    if (!forceRefresh && instanceCache && instanceCache.date === today) {
      console.log('⚡ Cache instance utilisé (même jour)');
      const { getTimingInfo } = await import('@/lib/crossValidation');
      return NextResponse.json({
        matches: instanceCache.matches,
        timing: getTimingInfo(),
        source: 'instance-cache',
        cachedDate: instanceCache.date
      });
    }

    // Nouveau jour détecté - reset du cache instance
    if (instanceCache && instanceCache.date !== today) {
      console.log(`🌅 Nouveau jour détecté: ${instanceCache.date} → ${today}`);
      instanceCache = null;
    }

    // Fetch des données depuis les APIs
    console.log('🔄 Fetch des données depuis les APIs...');
    const { getCrossValidatedMatches } = await import('@/lib/crossValidation');
    const result = await getCrossValidatedMatches();

    if (result.matches && result.matches.length > 0) {
      // Stocker en cache instance pour ce jour
      instanceCache = {
        matches: result.matches,
        timing: result.timing,
        date: today
      };

      console.log(`✅ ${result.matches.length} matchs récupérés et mis en cache pour ${today}`);

      // Générer la réponse avec headers de cache
      const response = NextResponse.json({
        matches: result.matches,
        timing: result.timing,
        source: 'fresh-fetch',
        cachedDate: today
      });

      // Cache Vercel Edge: 6 heures (les edge servers gardent la réponse)
      response.headers.set('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');
      response.headers.set('X-Cache-Date', today);

      return response;
    }

    // Aucun match disponible
    console.error('❌ Aucune donnée disponible');
    return NextResponse.json({
      error: 'Aucun match disponible actuellement',
      message: 'Veuillez réessayer dans quelques minutes',
      matches: [],
      timing: result.timing,
      source: 'empty'
    });

  } catch (error) {
    console.error('Erreur API matches:', error);
    return NextResponse.json({
      error: 'Erreur de connexion aux APIs',
      message: 'Vérifiez votre connexion et réessayez',
      matches: [],
      timing: {
        currentHour: new Date().getHours(),
        canRefresh: false,
        nextRefreshTime: '14h00',
        currentPhase: 'morning',
        message: 'Erreur de connexion'
      }
    }, { status: 500 });
  }
}
