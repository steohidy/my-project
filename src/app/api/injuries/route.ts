import { NextResponse } from 'next/server';
import { 
  scrapeNBAInjuries, 
  scrapeFootballInjuries, 
  getTeamInjuries, 
  calculateInjuryImpact 
} from '@/lib/injuryScraper';

/**
 * GET - Récupérer les blessures
 * 
 * Query params:
 * - sport: 'Foot' | 'Basket' | 'all' (défaut: all)
 * - team: nom de l'équipe spécifique
 * - homeTeam + awayTeam: calculer l'impact sur un match
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'all';
    const team = searchParams.get('team');
    const homeTeam = searchParams.get('homeTeam');
    const awayTeam = searchParams.get('awayTeam');
    
    // Si on demande l'impact sur un match spécifique
    if (homeTeam && awayTeam) {
      const matchSport = (searchParams.get('matchSport') || 'Foot') as 'Foot' | 'Basket';
      const impact = await calculateInjuryImpact(homeTeam, awayTeam, matchSport);
      
      return NextResponse.json({
        homeTeam,
        awayTeam,
        sport: matchSport,
        ...impact,
        scrapedAt: new Date().toISOString(),
      });
    }
    
    // Si on demande une équipe spécifique
    if (team) {
      const teamSport = (sport === 'Basket' ? 'Basket' : 'Foot') as 'Foot' | 'Basket';
      const injuries = await getTeamInjuries(team, teamSport);
      
      return NextResponse.json({
        team,
        sport: teamSport,
        injuries: injuries || { team, sport: teamSport, injuries: [], lastUpdated: null },
        scrapedAt: new Date().toISOString(),
      });
    }
    
    // Récupérer toutes les blessures
    if (sport === 'Basket') {
      const nba = await scrapeNBAInjuries();
      const injuriesArray = Array.from(nba.values());
      
      return NextResponse.json({
        sport: 'Basket',
        source: 'NBA Official Injury Report',
        teams: injuriesArray,
        totalInjuries: injuriesArray.reduce((sum, t) => sum + t.injuries.length, 0),
        scrapedAt: new Date().toISOString(),
      });
    }
    
    if (sport === 'Foot') {
      const football = await scrapeFootballInjuries();
      const injuriesArray = Array.from(football.values());
      
      return NextResponse.json({
        sport: 'Foot',
        source: 'Transfermarkt',
        teams: injuriesArray,
        totalInjuries: injuriesArray.reduce((sum, t) => sum + t.injuries.length, 0),
        scrapedAt: new Date().toISOString(),
      });
    }
    
    // Tous les sports
    const [football, nba] = await Promise.all([
      scrapeFootballInjuries(),
      scrapeNBAInjuries(),
    ]);
    
    const footballArray = Array.from(football.values());
    const nbaArray = Array.from(nba.values());
    
    return NextResponse.json({
      football: {
        source: 'Transfermarkt',
        teams: footballArray,
        totalInjuries: footballArray.reduce((sum, t) => sum + t.injuries.length, 0),
      },
      nba: {
        source: 'NBA Official Injury Report',
        teams: nbaArray,
        totalInjuries: nbaArray.reduce((sum, t) => sum + t.injuries.length, 0),
      },
      summary: {
        totalTeams: footballArray.length + nbaArray.length,
        totalInjuries: footballArray.reduce((sum, t) => sum + t.injuries.length, 0) +
                       nbaArray.reduce((sum, t) => sum + t.injuries.length, 0),
      },
      scrapedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Erreur API injuries:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération des blessures',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
