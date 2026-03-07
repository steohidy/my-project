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
export async function GET() {
  try {
    const now = Date.now();
    
    // Vérifier le cache
    if (cachedData && (now - lastFetchTime) < CACHE_TTL) {
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
    const { getCrossValidatedMatches } = await import('@/lib/crossValidation');
    
    const result = await getCrossValidatedMatches();
    
    if (result.matches && result.matches.length > 0) {
      cachedData = result;
      lastFetchTime = now;
      return NextResponse.json(result);
    }
    
    // Aucun match - retourner un message d'erreur clair
    console.error('❌ Aucune donnée réelle disponible');
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
