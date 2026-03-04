import { NextResponse } from 'next/server';

/**
 * API MATCHS - Cache Intelligent pour Vercel Serverless
 *
 * STRATÉGIE D'ÉCONOMIE DE CRÉDITS:
 * 1. Réduire les sports à 5 prioritaires (au lieu de 15)
 * 2. Cache HTTP Edge avec s-maxage
 * 3. Cache instance avec reset à minuit
 *
 * CONSOMMATION: ~5 crédits/jour au lieu de 1600+
 */

// Cache global instance (persiste pendant la vie de l'instance serverless)
let globalCache: {
  matches: any[];
  timing: any;
  date: string;
  timestamp: number;
} | null = null;

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // 1. Vérifier reset quotidien (nouveau jour)
  if (globalCache && globalCache.date !== today) {
    console.log(`🌅 Nouveau jour: ${globalCache.date} → ${today}, reset cache`);
    globalCache = null;
  }

  // 2. Vérifier cache instance valide (même jour + pas expiré)
  if (!forceRefresh && globalCache && (now - globalCache.timestamp) < CACHE_TTL) {
    console.log(`📦 Cache instance: ${globalCache.matches.length} matchs`);

    const response = NextResponse.json({
      matches: globalCache.matches,
      timing: globalCache.timing,
      source: 'instance-cache',
      cachedDate: globalCache.date
    });

    // Cache Edge Vercel
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return response;
  }

  // 3. Fetch des données
  console.log('🔄 Récupération des matchs...');

  try {
    const { getCrossValidatedMatches } = await import('@/lib/crossValidation');
    const result = await getCrossValidatedMatches();

    if (result.matches && result.matches.length > 0) {
      // Mise en cache
      globalCache = {
        matches: result.matches,
        timing: result.timing,
        date: today,
        timestamp: now
      };

      console.log(`✅ ${result.matches.length} matchs mis en cache pour ${today}`);

      const response = NextResponse.json({
        matches: result.matches,
        timing: result.timing,
        source: 'fresh-fetch',
        cachedDate: today
      });

      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
      response.headers.set('X-Cache-Date', today);

      return response;
    }

    // Si pas de matchs mais cache existant, l'utiliser
    if (globalCache) {
      console.log('⚠️ Pas de nouveaux matchs, utilisation du cache');
      return NextResponse.json({
        matches: globalCache.matches,
        timing: globalCache.timing,
        source: 'fallback-cache',
        cachedDate: globalCache.date
      });
    }

    return NextResponse.json({
      error: 'Aucun match disponible',
      matches: [],
      timing: result.timing,
      source: 'empty'
    });

  } catch (error) {
    console.error('Erreur:', error);

    // Fallback sur le cache si disponible
    if (globalCache) {
      return NextResponse.json({
        matches: globalCache.matches,
        timing: globalCache.timing,
        source: 'error-fallback',
        cachedDate: globalCache.date,
        error: 'Données de cache (erreur API)'
      });
    }

    return NextResponse.json({
      error: 'Erreur de connexion',
      matches: [],
      timing: {
        currentHour: new Date().getHours(),
        canRefresh: false,
        nextRefreshTime: '--:--',
        currentPhase: 'morning',
        message: 'Erreur de connexion'
      }
    }, { status: 500 });
  }
}
