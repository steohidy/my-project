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
  timeSlot?: 'day' | 'night';
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

// Cache partagé
let cachedData: { matches: MatchData[]; timing: TimingInfo } | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET - Récupérer les matchs avec croisement multi-sources
 * DONNÉES RÉELLES UNIQUEMENT
 * GESTION INTELLIGENTE DU TIMING
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const now = Date.now();
    
    // Vérifier le cache (ignorer si forceRefresh)
    if (!forceRefresh && cachedData && (now - lastFetchTime) < CACHE_TTL) {
      console.log('📦 Utilisation du cache');
      // Mais mettre à jour le timing (car l'heure change)
      const { getTimingInfo } = await import('@/lib/crossValidation');
      const currentTiming = getTimingInfo();
      return NextResponse.json({
        ...cachedData,
        timing: currentTiming
      });
    }

    // Import dynamique pour éviter les erreurs de build
    const { getCrossValidatedMatches, clearAllCaches } = await import('@/lib/crossValidation');
    
    // Forcer le refresh du cache interne si demandé
    if (forceRefresh) {
      console.log('🔄 Refresh forcé - vidage des caches');
      clearAllCaches();
    }
    
    const result = await getCrossValidatedMatches();
    
    if (result.matches && result.matches.length > 0) {
      cachedData = result;
      lastFetchTime = now;
      console.log(`✅ ${result.matches.length} matchs retournés`);
      return NextResponse.json(result);
    }
    
    // Aucun match - forcer le fallback
    console.error('❌ Aucun match - activation forcée du fallback');
    const { getAllFallbackMatches, convertFallbackToValidated } = await import('@/lib/fallbackSports');
    const fallbackMatches = await getAllFallbackMatches();
    const convertedMatches = fallbackMatches.map(convertFallbackToValidated);
    
    if (convertedMatches.length > 0) {
      const { getTimingInfo } = await import('@/lib/crossValidation');
      const fallbackResult = {
        matches: convertedMatches,
        timing: getTimingInfo()
      };
      cachedData = fallbackResult;
      lastFetchTime = now;
      console.log(`✅ Fallback: ${convertedMatches.length} matchs récupérés`);
      return NextResponse.json(fallbackResult);
    }
    
    return NextResponse.json({ 
      error: 'Aucun match disponible actuellement',
      message: 'Veuillez réessayer dans quelques minutes',
      matches: [],
      timing: result.timing
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
