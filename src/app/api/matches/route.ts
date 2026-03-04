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

// Cache mémoire pour la requête (court terme)
let memoryCache: { matches: MatchData[]; timing: TimingInfo } | null = null;
let memoryCacheTime = 0;
const MEMORY_CACHE_TTL = 60 * 1000; // 1 minute en mémoire

/**
 * GET - Récupérer les matchs avec système de cache quotidien
 * STRATÉGIE: 1 appel API par jour, stocké dans un fichier
 * Le site lit le fichier au lieu d'appeler les APIs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const now = Date.now();

    // Import du système de cache
    const {
      isCacheValid,
      readCache,
      writeCache,
      checkAndResetDaily
    } = await import('@/lib/dailyCache');

    // Vérifier et reset si nouveau jour
    checkAndResetDaily();

    // 1. Vérifier le cache mémoire (court terme - évite les lectures fichier)
    if (!forceRefresh && memoryCache && (now - memoryCacheTime) < MEMORY_CACHE_TTL) {
      console.log('⚡ Cache mémoire utilisé');
      const { getTimingInfo } = await import('@/lib/crossValidation');
      return NextResponse.json({
        ...memoryCache,
        timing: getTimingInfo(),
        source: 'memory-cache'
      });
    }

    // 2. Vérifier le cache fichier quotidien
    if (!forceRefresh && isCacheValid()) {
      const cachedData = readCache();
      if (cachedData && cachedData.matches.length > 0) {
        console.log('📦 Cache fichier quotidien utilisé');
        const { getTimingInfo } = await import('@/lib/crossValidation');

        // Mettre en cache mémoire aussi
        memoryCache = {
          matches: cachedData.matches,
          timing: cachedData.timing
        };
        memoryCacheTime = now;

        return NextResponse.json({
          matches: cachedData.matches,
          timing: getTimingInfo(),
          source: 'daily-cache',
          cachedAt: cachedData.lastFetchTime
        });
      }
    }

    // 3. Aucun cache valide -> Fetch depuis les APIs (1 SEUL APPEL PAR JOUR)
    console.log('🔄 Fetch des données depuis les APIs (quota journalier)...');

    const { getCrossValidatedMatches } = await import('@/lib/crossValidation');
    const result = await getCrossValidatedMatches();

    if (result.matches && result.matches.length > 0) {
      // Sauvegarder dans le cache fichier pour toute la journée
      writeCache(result.matches, result.timing);

      // Mettre en cache mémoire
      memoryCache = result;
      memoryCacheTime = now;

      console.log(`✅ ${result.matches.length} matchs récupérés et mis en cache pour aujourd'hui`);

      return NextResponse.json({
        ...result,
        source: 'fresh-fetch',
        cachedAt: new Date().toISOString()
      });
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
