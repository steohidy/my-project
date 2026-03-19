import { NextResponse } from 'next/server';
import {
  getMatchesWithRealOdds,
  getDataStats
} from '@/lib/combinedDataService';
import { getModelStatus } from '@/lib/adaptiveThresholdsML';
import {
  loadCache,
  saveCache,
  getCachedAnalysis,
  cacheAnalysis,
  getCreditStats,
  shouldUseApiCredits,
  generateBettingRecommendations,
  type MatchAnalysis
} from '@/lib/mlAnalysisCache';

// In-memory cache for quick access
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate implied probabilities from odds
 */
function calculateImpliedProbabilities(oddsHome: number, oddsDraw: number | null, oddsAway: number) {
  if (!oddsHome || !oddsAway || oddsHome <= 1 || oddsAway <= 1) {
    return { home: 33, draw: 34, away: 33 };
  }

  const homeProb = 1 / oddsHome;
  const awayProb = 1 / oddsAway;
  const drawProb = oddsDraw && oddsDraw > 1 ? 1 / oddsDraw : 0.28;

  const total = homeProb + awayProb + drawProb;

  return {
    home: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    away: Math.round((awayProb / total) * 100),
  };
}

/**
 * Analyze a match and generate predictions
 */
function analyzeMatch(match: any): MatchAnalysis {
  const probs = calculateImpliedProbabilities(match.oddsHome, match.oddsDraw, match.oddsAway);
  
  // Calculate risk based on probability distribution
  const maxProb = Math.max(probs.home, probs.away, probs.draw);
  const riskPercentage = 100 - maxProb;
  
  // Determine confidence based on risk and data quality
  let confidence: 'very_high' | 'high' | 'medium' | 'low';
  const hasRealOdds = match.hasRealOdds;
  
  if (riskPercentage <= 30 && hasRealOdds) {
    confidence = 'very_high';
  } else if (riskPercentage <= 40 && hasRealOdds) {
    confidence = 'high';
  } else if (riskPercentage <= 55) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // Generate betting recommendations
  const recommendations = generateBettingRecommendations(
    probs,
    { home: match.oddsHome, draw: match.oddsDraw, away: match.oddsAway },
    confidence
  );
  
  // Extract value bets
  const valueBets = recommendations
    .filter(r => r.recommendation === 'strong' || r.recommendation === 'moderate')
    .map(r => ({
      type: r.label,
      edge: Math.round(r.value * 10) / 10,
      confidence: r.recommendation,
    }));
  
  return {
    matchId: match.id || `${match.homeTeam}-${match.awayTeam}-${match.date}`,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league || 'Unknown',
    date: match.date,
    oddsHome: match.oddsHome,
    oddsDraw: match.oddsDraw,
    oddsAway: match.oddsAway,
    probabilities: probs,
    riskPercentage,
    confidence,
    recommendations,
    valueBets,
    analyzedAt: new Date().toISOString(),
    dataQuality: hasRealOdds ? 'real' : 'estimated',
    apiCreditsUsed: hasRealOdds ? 1 : 0,
  };
}

/**
 * GET - Fetch matches with cached ML predictions
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const now = Date.now();

    // Check memory cache first
    if (!forceRefresh && cachedData && (now - lastFetchTime) < CACHE_TTL) {
      console.log('📦 Using memory cache');
      return NextResponse.json(cachedData);
    }

    console.log('🔄 Fetching matches...');
    
    // Get matches from data source
    const matches = await getMatchesWithRealOdds();
    
    // Get cached analyses from file
    const persistentCache = loadCache();
    
    // Enrich each match with ML analysis
    const enrichedMatches = matches.map((match: any) => {
      const matchId = match.id || `${match.homeTeam}-${match.awayTeam}-${match.date}`;
      
      // Check if we have a cached analysis
      let analysis = getCachedAnalysis(matchId);
      
      // If no cache or expired, analyze (but don't use API credits if not needed)
      if (!analysis) {
        console.log(`🧠 Analyzing match: ${match.homeTeam} vs ${match.awayTeam}`);
        analysis = analyzeMatch(match);
        
        // Cache the result
        cacheAnalysis(analysis);
      }
      
      // Build the match object with all required fields
      return {
        ...match,
        id: matchId,
        // Probabilities
        probabilities: analysis.probabilities,
        riskPercentage: analysis.riskPercentage,
        confidence: analysis.confidence,
        
        // Insight object for frontend
        insight: {
          riskPercentage: analysis.riskPercentage,
          confidence: analysis.confidence,
          valueBetDetected: analysis.valueBets.length > 0,
          valueBetType: analysis.valueBets[0]?.type || null,
        },
        
        // Betting recommendations
        recommendations: analysis.recommendations,
        valueBets: analysis.valueBets,
        
        // ML analysis details
        mlAnalysis: {
          probabilities: analysis.probabilities,
          confidence: analysis.confidence,
          factors: [],
          valueBetDetected: analysis.valueBets.length > 0,
          recommendation: analysis.recommendations[0]?.label || '',
        },
        
        // Data quality
        dataQuality: {
          overall: analysis.dataQuality,
          overallScore: analysis.dataQuality === 'real' ? 85 : 40,
          sources: analysis.dataQuality === 'real' ? ['The Odds API', 'ESPN'] : ['ESPN'],
          hasRealData: analysis.dataQuality === 'real',
        },
      };
    });

    // Calculate stats
    const dataStats = {
      total: enrichedMatches.length,
      withRealOdds: enrichedMatches.filter((m: any) => m.dataQuality?.hasRealData).length,
      highConfidence: enrichedMatches.filter((m: any) => m.confidence === 'high' || m.confidence === 'very_high').length,
      valueBets: enrichedMatches.filter((m: any) => m.valueBets?.length > 0).length,
    };

    const creditStats = getCreditStats();

    console.log(`✅ ${enrichedMatches.length} matches loaded (${dataStats.withRealOdds} with real odds, ${dataStats.valueBets} value bets)`);

    const result = {
      matches: enrichedMatches,
      timing: {
        currentHour: new Date().getUTCHours(),
        canRefresh: shouldUseApiCredits(),
        nextRefreshTime: '5 min',
        message: `${enrichedMatches.length} matchs analysés`,
      },
      dataStats,
      creditStats,
      mlStatus: getModelStatus(),
      lastUpdate: new Date().toISOString(),
    };

    // Update memory cache
    cachedData = result;
    lastFetchTime = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error('API matches error:', error);
    return NextResponse.json({
      error: 'Connection error',
      matches: [],
      timing: {
        currentHour: new Date().getUTCHours(),
        canRefresh: false,
        nextRefreshTime: '5 min',
        message: 'Erreur de chargement',
      },
      dataStats: { total: 0, withRealOdds: 0, highConfidence: 0, valueBets: 0 },
      mlStatus: null,
    });
  }
}

/**
 * POST - Clear cache and force refresh
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 Cache clear requested');

    // Clear memory cache
    cachedData = null;
    lastFetchTime = 0;

    return NextResponse.json({
      success: true,
      message: 'Cache cleared',
      creditStats: getCreditStats(),
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Clear failed',
    });
  }
}
