/**
 * Injury Scraper - Récupération des VRAIES blessures
 * 
 * Sources:
 * - Football: Transfermarkt (scraping)
 * - NBA: official.nba.com/nba-injury-report
 * 
 * GRATUIT - Données officielles à jour
 */

import ZAI from 'z-ai-web-dev-sdk';

// Types
export interface InjuryInfo {
  player: string;
  team: string;
  injury: string;
  status: 'out' | 'doubtful' | 'probable' | 'day-to-day';
  returnDate?: string;
  source: string;
  scrapedAt: string;
}

export interface TeamInjuries {
  team: string;
  sport: 'Foot' | 'Basket';
  injuries: InjuryInfo[];
  lastUpdated: string;
}

// Cache
let cachedFootballInjuries: Map<string, TeamInjuries> = new Map();
let cachedNBAInjuries: Map<string, TeamInjuries> = new Map();
let lastScrapeTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// URLs
const TRANSFERMARKT_URLS = {
  premierLeague: 'https://www.transfermarkt.com/premier-league/verletzte/spielwettbewerb/GB1',
  ligue1: 'https://www.transfermarkt.com/ligue-1/verletzte/spielwettbewerb/FR1',
  liga: 'https://www.transfermarkt.com/laliga/verletzte/spielwettbewerb/ES1',
  bundesliga: 'https://www.transfermarkt.com/bundesliga/verletzte/spielwettbewerb/L1',
  serieA: 'https://www.transfermarkt.com/serie-a/verletzte/spielwettbewerb/IT1',
  championsLeague: 'https://www.transfermarkt.com/champions-league/verletzte/spielwettbewerb/CL',
};

const NBA_INJURY_URL = 'https://official.nba.com/nba-injury-report-2025-26-season/';

// Mapping équipes NBA (noms courts vers noms complets)
const NBA_TEAM_NAMES: Record<string, string> = {
  'ATL': 'Atlanta Hawks',
  'BOS': 'Boston Celtics',
  'BKN': 'Brooklyn Nets',
  'CHA': 'Charlotte Hornets',
  'CHI': 'Chicago Bulls',
  'CLE': 'Cleveland Cavaliers',
  'DAL': 'Dallas Mavericks',
  'DEN': 'Denver Nuggets',
  'DET': 'Detroit Pistons',
  'GS': 'Golden State Warriors',
  'GSW': 'Golden State Warriors',
  'HOU': 'Houston Rockets',
  'IND': 'Indiana Pacers',
  'LAC': 'LA Clippers',
  'LAL': 'Los Angeles Lakers',
  'MEM': 'Memphis Grizzlies',
  'MIA': 'Miami Heat',
  'MIL': 'Milwaukee Bucks',
  'MIN': 'Minnesota Timberwolves',
  'NOP': 'New Orleans Pelicans',
  'NYK': 'New York Knicks',
  'OKC': 'Oklahoma City Thunder',
  'ORL': 'Orlando Magic',
  'PHI': 'Philadelphia 76ers',
  'PHX': 'Phoenix Suns',
  'POR': 'Portland Trail Blazers',
  'SAC': 'Sacramento Kings',
  'SAS': 'San Antonio Spurs',
  'TOR': 'Toronto Raptors',
  'UTA': 'Utah Jazz',
  'WAS': 'Washington Wizards',
  'WSH': 'Washington Wizards',
};

// Mapping équipes Football
const FOOTBALL_TEAM_ALIASES: Record<string, string[]> = {
  'Manchester City': ['Man City', 'Man. City', 'Manchester City FC'],
  'Manchester United': ['Man United', 'Man. United', 'Man Utd', 'Manchester United FC'],
  'Tottenham': ['Spurs', 'Tottenham Hotspur'],
  'Newcastle': ['Newcastle United'],
  'Brighton': ['Brighton & Hove Albion'],
  'West Ham': ['West Ham United'],
  'Wolves': ['Wolverhampton', 'Wolverhampton Wanderers'],
  'Paris Saint-Germain': ['PSG', 'Paris SG', 'Paris'],
  'Real Madrid': ['Real Madrid CF'],
  'Atletico Madrid': ['Atletico', 'Atlético Madrid'],
  'Bayern Munich': ['Bayern', 'FC Bayern Munich'],
  'Borussia Dortmund': ['Dortmund', 'BVB'],
  'Inter Milan': ['Inter', 'FC Internazionale'],
  'AC Milan': ['Milan'],
  'Juventus': ['Juventus FC'],
};

/**
 * Normalise le nom d'une équipe
 */
function normalizeTeamName(name: string): string {
  const normalized = name.trim().toLowerCase();
  
  // Vérifier les alias
  for (const [canonical, aliases] of Object.entries(FOOTBALL_TEAM_ALIASES)) {
    if (normalized.includes(canonical.toLowerCase())) return canonical;
    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase())) return canonical;
    }
  }
  
  return name.trim();
}

/**
 * Parse le statut de blessure
 */
function parseInjuryStatus(status: string): 'out' | 'doubtful' | 'probable' | 'day-to-day' {
  const s = status.toLowerCase();
  if (s.includes('out') || s.includes('injured') || s.includes('blessé')) return 'out';
  if (s.includes('doubtful') || s.includes('doute') || s.includes('questionable')) return 'doubtful';
  if (s.includes('probable') || s.includes('probable')) return 'probable';
  return 'day-to-day';
}

/**
 * Scrape les blessures NBA depuis le rapport officiel
 */
export async function scrapeNBAInjuries(): Promise<Map<string, TeamInjuries>> {
  console.log('🏀 Scraping blessures NBA (official.nba.com)...');
  
  const injuries = new Map<string, TeamInjuries>();
  
  try {
    const zai = await ZAI.create();
    
    const result = await zai.functions.invoke('page_reader', {
      url: NBA_INJURY_URL
    });
    
    if (result.code !== 200 || !result.data?.html) {
      console.log('⚠️ Erreur accès NBA Injury Report');
      return injuries;
    }
    
    const html = result.data.html;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    
    // Parser les blessures (format typique du rapport NBA)
    // Patterns: "Player Name - Team - Injury - Status"
    const patterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–]\s*([A-Z]{2,3})\s*[-–]\s*([^–]+)\s*[-–]\s*(Out|Doubtful|Probable|Day-to-Day)/gi,
      /([A-Z][a-z]+ [A-Z][a-z]+)\s+\(([A-Z]{2,3})\)\s*[-–]?\s*([^,]+),\s*(Out|Doubtful|Probable)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const playerName = match[1].trim();
        const teamAbbr = match[2].toUpperCase();
        const injury = match[3].trim();
        const status = parseInjuryStatus(match[4]);
        
        const teamName = NBA_TEAM_NAMES[teamAbbr] || teamAbbr;
        
        const injuryInfo: InjuryInfo = {
          player: playerName,
          team: teamName,
          injury,
          status,
          source: 'NBA Official',
          scrapedAt: new Date().toISOString(),
        };
        
        if (!injuries.has(teamName)) {
          injuries.set(teamName, {
            team: teamName,
            sport: 'Basket',
            injuries: [],
            lastUpdated: new Date().toISOString(),
          });
        }
        
        injuries.get(teamName)!.injuries.push(injuryInfo);
      }
    }
    
    // Méthode alternative: chercher les tableaux
    if (injuries.size === 0) {
      // Parser les lignes de tableau typiques
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([^<]+)<\/td>/gi) || [];
        if (cells.length >= 3) {
          const playerCell = cells[0]?.replace(/<[^>]*>/g, '').trim();
          const teamCell = cells[1]?.replace(/<[^>]*>/g, '').trim();
          const injuryCell = cells[2]?.replace(/<[^>]*>/g, '').trim();
          const statusCell = cells[3]?.replace(/<[^>]*>/g, '').trim() || 'out';
          
          if (playerCell && teamCell && injuryCell && playerCell.length > 2) {
            const teamName = NBA_TEAM_NAMES[teamCell.toUpperCase()] || teamCell;
            
            const injuryInfo: InjuryInfo = {
              player: playerCell,
              team: teamName,
              injury: injuryCell,
              status: parseInjuryStatus(statusCell),
              source: 'NBA Official',
              scrapedAt: new Date().toISOString(),
            };
            
            if (!injuries.has(teamName)) {
              injuries.set(teamName, {
                team: teamName,
                sport: 'Basket',
                injuries: [],
                lastUpdated: new Date().toISOString(),
              });
            }
            
            injuries.get(teamName)!.injuries.push(injuryInfo);
          }
        }
      }
    }
    
    cachedNBAInjuries = injuries;
    console.log(`✅ NBA Injuries: ${injuries.size} équipes avec blessures`);
    
    return injuries;
    
  } catch (error) {
    console.error('Erreur scraping NBA injuries:', error);
    return injuries;
  }
}

/**
 * Scrape les blessures Football depuis Transfermarkt
 */
export async function scrapeFootballInjuries(): Promise<Map<string, TeamInjuries>> {
  console.log('⚽ Scraping blessures Football (Transfermarkt)...');
  
  const injuries = new Map<string, TeamInjuries>();
  
  try {
    const zai = await ZAI.create();
    
    // Scrape chaque ligue
    for (const [league, url] of Object.entries(TRANSFERMARKT_URLS)) {
      try {
        console.log(`  📌 ${league}...`);
        
        const result = await zai.functions.invoke('page_reader', {
          url
        });
        
        if (result.code !== 200 || !result.data?.html) {
          console.log(`  ⚠️ ${league}: erreur accès`);
          continue;
        }
        
        const html = result.data.html;
        
        // Parser les blessures Transfermarkt
        // Format typique: tableau avec joueur, équipe, blessure, retour
        const rows = html.match(/<tr[^>]*class="[^"]*odd[^"]*"[\s\S]*?<\/tr>|<tr[^>]*class="[^"]*even[^"]*"[\s\S]*?<\/tr>/gi) || [];
        
        for (const row of rows) {
          try {
            // Extraire les cellules
            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            
            if (cells.length >= 3) {
              const playerCell = cells[0]?.replace(/<[^>]*>/g, '').trim();
              const teamCell = cells[1]?.replace(/<[^>]*>/g, '').trim();
              const injuryCell = cells[2]?.replace(/<[^>]*>/g, '').trim();
              const returnCell = cells[3]?.replace(/<[^>]*>/g, '').trim();
              
              if (playerCell && teamCell && injuryCell && playerCell.length > 2) {
                const teamName = normalizeTeamName(teamCell);
                
                const injuryInfo: InjuryInfo = {
                  player: playerCell,
                  team: teamName,
                  injury: injuryCell,
                  status: returnCell?.toLowerCase().includes('return') ? 'probable' : 'out',
                  returnDate: returnCell || undefined,
                  source: 'Transfermarkt',
                  scrapedAt: new Date().toISOString(),
                };
                
                if (!injuries.has(teamName)) {
                  injuries.set(teamName, {
                    team: teamName,
                    sport: 'Foot',
                    injuries: [],
                    lastUpdated: new Date().toISOString(),
                  });
                }
                
                injuries.get(teamName)!.injuries.push(injuryInfo);
              }
            }
          } catch (e) {
            // Ignorer erreurs parsing individuelles
          }
        }
        
        // Délai entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (e) {
        console.log(`  ⚠️ ${league}: erreur`);
      }
    }
    
    cachedFootballInjuries = injuries;
    console.log(`✅ Football Injuries: ${injuries.size} équipes avec blessures`);
    
    return injuries;
    
  } catch (error) {
    console.error('Erreur scraping Football injuries:', error);
    return injuries;
  }
}

/**
 * Récupère les blessures pour une équipe spécifique
 */
export async function getTeamInjuries(
  teamName: string,
  sport: 'Foot' | 'Basket'
): Promise<TeamInjuries | null> {
  // Vérifier le cache
  const cache = sport === 'Basket' ? cachedNBAInjuries : cachedFootballInjuries;
  
  // Normaliser le nom
  const normalizedName = normalizeTeamName(teamName);
  
  // Chercher dans le cache
  for (const [team, data] of cache) {
    if (team.toLowerCase().includes(normalizedName.toLowerCase()) ||
        normalizedName.toLowerCase().includes(team.toLowerCase())) {
      return data;
    }
  }
  
  // Si pas en cache, scraper
  if (sport === 'Basket') {
    await scrapeNBAInjuries();
    const nbaCache = cachedNBAInjuries;
    for (const [team, data] of nbaCache) {
      if (team.toLowerCase().includes(normalizedName.toLowerCase()) ||
          normalizedName.toLowerCase().includes(team.toLowerCase())) {
        return data;
      }
    }
  } else {
    await scrapeFootballInjuries();
    const footCache = cachedFootballInjuries;
    for (const [team, data] of footCache) {
      if (team.toLowerCase().includes(normalizedName.toLowerCase()) ||
          normalizedName.toLowerCase().includes(team.toLowerCase())) {
        return data;
      }
    }
  }
  
  return null;
}

/**
 * Récupère toutes les blessures (Foot + NBA)
 */
export async function getAllInjuries(): Promise<{
  football: Map<string, TeamInjuries>;
  nba: Map<string, TeamInjuries>;
}> {
  const now = Date.now();
  
  // Utiliser le cache si récent
  if ((now - lastScrapeTime) < CACHE_TTL && 
      cachedFootballInjuries.size > 0 && 
      cachedNBAInjuries.size > 0) {
    console.log('📦 Utilisation du cache blessures');
    return {
      football: cachedFootballInjuries,
      nba: cachedNBAInjuries,
    };
  }
  
  // Scrape en parallèle
  const [football, nba] = await Promise.all([
    scrapeFootballInjuries(),
    scrapeNBAInjuries(),
  ]);
  
  lastScrapeTime = now;
  
  return { football, nba };
}

/**
 * Formate les blessures pour l'affichage
 */
export function formatInjuriesForDisplay(teamInjuries: TeamInjuries): string[] {
  const lines: string[] = [];
  
  for (const injury of teamInjuries.injuries) {
    const statusEmoji = injury.status === 'out' ? '❌' : 
                       injury.status === 'doubtful' ? '⚠️' : 
                       injury.status === 'probable' ? '✅' : '🔄';
    
    const returnInfo = injury.returnDate ? ` (Retour: ${injury.returnDate})` : '';
    
    lines.push(`${statusEmoji} ${injury.player} - ${injury.injury}${returnInfo}`);
  }
  
  return lines;
}

/**
 * Calcule l'impact des blessures sur un match
 */
export function calculateInjuryImpact(
  homeTeam: string,
  awayTeam: string,
  sport: 'Foot' | 'Basket'
): Promise<{
  homeInjuries: number;
  awayInjuries: number;
  impactLevel: 'low' | 'medium' | 'high';
  homeOut: string[];
  awayOut: string[];
}> {
  return new Promise(async (resolve) => {
    const result = {
      homeInjuries: 0,
      awayInjuries: 0,
      impactLevel: 'low' as 'low' | 'medium' | 'high',
      homeOut: [] as string[],
      awayOut: [] as string[],
    };
    
    try {
      const homeData = await getTeamInjuries(homeTeam, sport);
      const awayData = await getTeamInjuries(awayTeam, sport);
      
      if (homeData) {
        result.homeInjuries = homeData.injuries.length;
        result.homeOut = homeData.injuries
          .filter(i => i.status === 'out')
          .map(i => i.player);
      }
      
      if (awayData) {
        result.awayInjuries = awayData.injuries.length;
        result.awayOut = awayData.injuries
          .filter(i => i.status === 'out')
          .map(i => i.player);
      }
      
      // Calculer l'impact
      const totalOut = result.homeOut.length + result.awayOut.length;
      if (totalOut >= 4) {
        result.impactLevel = 'high';
      } else if (totalOut >= 2) {
        result.impactLevel = 'medium';
      }
      
    } catch (e) {
      console.error('Erreur calcul impact blessures:', e);
    }
    
    resolve(result);
  });
}

/**
 * Vide le cache
 */
export function clearInjuryCache(): void {
  cachedFootballInjuries = new Map();
  cachedNBAInjuries = new Map();
  lastScrapeTime = 0;
  console.log('🗑️ Cache blessures vidé');
}

// Export par défaut
const InjuryScraper = {
  scrapeNBAInjuries,
  scrapeFootballInjuries,
  getTeamInjuries,
  getAllInjuries,
  formatInjuriesForDisplay,
  calculateInjuryImpact,
  clearCache: clearInjuryCache,
};

// Export named pour utilisation directe
export { InjuryScraper };

export default InjuryScraper;
