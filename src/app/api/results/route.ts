import { NextResponse } from 'next/server';
import PredictionStore from '@/lib/store';

/**
 * Normaliser le nom d'équipe pour la comparaison
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
}

/**
 * Trouver le résultat correspondant dans les données Football-Data
 */
function findMatchResult(
  fdMatch: any, 
  homeTeam: string,
  awayTeam: string
): { found: boolean; homeScore: number; awayScore: number } {
  const predHomeNorm = normalizeTeamName(homeTeam);
  const predAwayNorm = normalizeTeamName(awayTeam);
  
  const fdHomeNorm = normalizeTeamName(fdMatch.homeTeam?.name || '');
  const fdAwayNorm = normalizeTeamName(fdMatch.awayTeam?.name || '');
  
  const homeMatch = predHomeNorm === fdHomeNorm || 
                    predHomeNorm.includes(fdHomeNorm) || 
                    fdHomeNorm.includes(predHomeNorm);
  const awayMatch = predAwayNorm === fdAwayNorm || 
                    predAwayNorm.includes(fdAwayNorm) || 
                    fdAwayNorm.includes(predAwayNorm);
  
  if (homeMatch && awayMatch) {
    return {
      found: true,
      homeScore: fdMatch.score?.fullTime?.home ?? fdMatch.score?.fullTime?.homeTeam ?? 0,
      awayScore: fdMatch.score?.fullTime?.away ?? fdMatch.score?.fullTime?.awayTeam ?? 0
    };
  }
  
  return { found: false, homeScore: 0, awayScore: 0 };
}

/**
 * Récupérer les résultats réels d'hier via Football-Data API
 */
async function fetchYesterdayResults(): Promise<any[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  
  if (!apiKey) {
    console.error('❌ FOOTBALL_DATA_API_KEY non configurée');
    return [];
  }
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    console.log(`📅 Récupération des résultats du ${dateStr}`);
    
    const response = await fetch(
      `https://api.football-data.org/v4/matches?date=${dateStr}`,
      {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 0 }
      }
    );
    
    if (!response.ok) {
      console.error(`Erreur API Football-Data: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    const finishedMatches = (data.matches || []).filter(
      (m: any) => m.status === 'FINISHED' || m.status === 'FT'
    );
    
    console.log(`✅ ${finishedMatches.length} matchs terminés trouvés`);
    
    return finishedMatches;
    
  } catch (error) {
    console.error('Erreur récupération résultats:', error);
    return [];
  }
}

/**
 * GET - Récupérer les statistiques et pronostics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    // Statistiques détaillées par période
    if (action === 'stats') {
      const detailedStats = PredictionStore.getDetailedStats();
      const info = PredictionStore.getInfo();
      const integrity = PredictionStore.verifyIntegrity();
      
      return NextResponse.json({
        // Stats par période
        daily: detailedStats.daily,
        weekly: detailedStats.weekly,
        monthly: detailedStats.monthly,
        overall: detailedStats.overall,
        // Infos générales
        ...info,
        // Intégrité
        integrity: integrity.valid,
        timestamp: new Date().toISOString()
      });
    }
    
    // Statistiques détaillées complètes
    if (action === 'detailed_stats') {
      const stats = PredictionStore.getDetailedStats();
      return NextResponse.json(stats);
    }
    
    // Historique des pronostics terminés
    if (action === 'history') {
      const predictions = PredictionStore.getCompleted();
      return NextResponse.json({ predictions });
    }
    
    // Pronostics en attente
    if (action === 'pending') {
      const predictions = PredictionStore.getPending();
      return NextResponse.json({ predictions });
    }
    
    // Tous les pronostics
    if (action === 'all') {
      const predictions = PredictionStore.getAll();
      const stats = PredictionStore.getDetailedStats();
      return NextResponse.json({ predictions, stats });
    }
    
    // Vérifier l'intégrité
    if (action === 'verify') {
      const integrity = PredictionStore.verifyIntegrity();
      return NextResponse.json(integrity);
    }
    
    return NextResponse.json({ predictions: [] });
    
  } catch (error) {
    console.error('Erreur API results GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST - Actions: sauvegarder, vérifier les résultats, nettoyer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, predictions } = body;
    
    // Sauvegarder les pronostics du jour
    if (action === 'save_predictions') {
      if (!predictions || !Array.isArray(predictions)) {
        return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
      }
      
      const saved = PredictionStore.addMany(predictions.map(p => ({
        matchId: p.matchId,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        league: p.league || 'Unknown',
        sport: p.sport || 'Foot',
        matchDate: p.matchDate || new Date().toISOString(),
        oddsHome: p.oddsHome,
        oddsDraw: p.oddsDraw || null,
        oddsAway: p.oddsAway,
        predictedResult: p.predictedResult,
        predictedGoals: p.predictedGoals,
        predictedCards: p.predictedCards,
        confidence: p.confidence || 'medium',
        riskPercentage: p.riskPercentage || 50
      })));
      
      return NextResponse.json({
        success: true,
        message: `${saved} nouveaux pronostics enregistrés`,
        saved
      });
    }
    
    // Vérifier les résultats d'hier
    if (action === 'check_results') {
      console.log('🔍 Vérification des résultats...');
      
      const realResults = await fetchYesterdayResults();
      
      if (realResults.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Aucun résultat disponible à vérifier',
          checked: 0,
          source: 'Football-Data API'
        });
      }
      
      const pendingPredictions = PredictionStore.getPending();
      
      let checkedCount = 0;
      let resultCorrect = 0;
      let goalsCorrect = 0;
      
      for (const prediction of pendingPredictions) {
        for (const realMatch of realResults) {
          const { found, homeScore, awayScore } = findMatchResult(
            realMatch, 
            prediction.homeTeam,
            prediction.awayTeam
          );
          
          if (found) {
            const actualResult = homeScore > awayScore ? 'home' 
              : homeScore < awayScore ? 'away' 
              : 'draw';
            
            const resultMatch = prediction.predictedResult === actualResult;
            if (resultMatch) resultCorrect++;
            
            let goalsMatch: boolean | undefined;
            
            if (prediction.predictedGoals) {
              const totalGoals = homeScore + awayScore;
              if (prediction.predictedGoals === 'over2.5') {
                goalsMatch = totalGoals > 2.5;
              } else if (prediction.predictedGoals === 'under2.5') {
                goalsMatch = totalGoals < 2.5;
              } else if (prediction.predictedGoals === 'btts') {
                goalsMatch = homeScore > 0 && awayScore > 0;
              }
              if (goalsMatch) goalsCorrect++;
            }
            
            PredictionStore.complete(prediction.matchId, {
              homeScore,
              awayScore,
              actualResult,
              resultMatch,
              goalsMatch
            });
            
            checkedCount++;
            console.log(`✅ ${prediction.homeTeam} ${homeScore}-${awayScore} ${prediction.awayTeam} - Résultat: ${resultMatch ? '✓' : '✗'}`);
            break;
          }
        }
      }
      
      // Récupérer les stats mises à jour
      const updatedStats = PredictionStore.getDetailedStats();
      
      return NextResponse.json({
        success: true,
        message: `${checkedCount} pronostics vérifiés`,
        checked: checkedCount,
        resultCorrect,
        goalsCorrect,
        source: 'Football-Data API',
        stats: updatedStats.daily
      });
    }
    
    // Nettoyer les anciennes données
    if (action === 'cleanup') {
      const removed = PredictionStore.cleanup();
      return NextResponse.json({
        success: true,
        message: `${removed} anciens pronostics supprimés`,
        removed
      });
    }
    
    // Supprimer toutes les données (reset complet)
    if (action === 'clear_all') {
      // Vérification de sécurité - nécessite un token
      const adminToken = body.token;
      const expectedToken = process.env.ADMIN_TOKEN || 'steo-admin-2026';
      
      if (adminToken !== expectedToken) {
        return NextResponse.json({ 
          error: 'Token administrateur requis' 
        }, { status: 403 });
      }
      
      const cleared = PredictionStore.clearAll();
      return NextResponse.json({
        success: cleared,
        message: cleared ? 'Toutes les données ont été supprimées' : 'Erreur lors de la suppression'
      });
    }
    
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    
  } catch (error) {
    console.error('Erreur API results POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
