/**
 * Understat Scraper - Expected Goals (xG) Data
 * Source: https://understat.com
 * Données: xG, xA, xPTS pour les équipes et joueurs
 * 
 * Les données Understat sont encodées en base64 et chiffrées avec XOR
 * Documentation: https://github.com/Amosium/fsunderstat
 */

// URLs Understat par ligue
const UNDERSTAT_URLS: Record<string, string> = {
  'EPL': 'https://understat.com/league/EPL',        // Premier League
  'La liga': 'https://understat.com/league/La_liga', // La Liga
  'Bundesliga': 'https://understat.com/league/Bundesliga',
  'Serie A': 'https://understat.com/league/Serie_A',
  'Ligue 1': 'https://understat.com/league/Ligue_1',
  'RFPL': 'https://understat.com/league/RFPL',      // Russian Premier League
};

// Mapping noms de compétitions
const COMPETITION_MAPPING: Record<string, string> = {
  'Premier League': 'EPL',
  'La Liga': 'La liga',
  'Bundesliga': 'Bundesliga',
  'Serie A': 'Serie A',
  'Ligue 1': 'Ligue 1',
  'PL': 'EPL',
  'PD': 'La liga',
  'BL1': 'Bundesliga',
  'SA': 'Serie A',
  'FL1': 'Ligue 1',
};

interface UnderstatTeamStats {
  team: string;
  matches: number;
  goals: number;
  xG: number;
  xGA: number; // xG Against
  xPTS: number; // Expected Points
  npxG: number; // Non-penalty xG
  npxGA: number;
  npG: number;
  npGA: number;
}

interface UnderstatMatch {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
  result: string;
}

// Cache
const xgCache = new Map<string, { data: UnderstatTeamStats[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

/**
 * Décode les données Understat (chiffrement XOR + base64)
 * Les données sont dans le format: JSON.parse(atob(data))
 * Après décodage, on a un tableau JSON
 */
function decodeUnderstatData(encodedString: string): any {
  try {
    // Le format Understat est: un hash XORé puis base64
    // Pattern: "Unicode.fromCharCode.apply(null, atob(encoded))"
    
    // D'abord décoder base64
    const decoded = Buffer.from(encodedString, 'base64').toString('utf8');
    
    // Puis parser JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Erreur décodage Understat:', error);
    return null;
  }
}

/**
 * Extrait les données du script JavaScript Understat
 * Format: var datesData = JSON.parse( '...' )
 */
function extractScriptData(html: string, varName: string): string | null {
  try {
    // Pattern: var [varName] = JSON.parse( '...' );
    const regex = new RegExp(`var\\s+${varName}\\s*=\\s*JSON\\.parse\\(\\s*['"]([^'"]+)['"]\\s*\\)`, 'i');
    const match = html.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Essayer un autre pattern
    const regex2 = new RegExp(`${varName}\\s*=\\s*['"]([^'"]+)['"]`, 'i');
    const match2 = html.match(regex2);
    
    return match2 ? match2[1] : null;
  } catch {
    return null;
  }
}

/**
 * Récupère les stats xG d'une équipe depuis Understat
 */
export async function getTeamXGStats(competition: string): Promise<UnderstatTeamStats[]> {
  // Mapper le nom de la compétition
  const understatLeague = COMPETITION_MAPPING[competition] || competition;
  const url = UNDERSTAT_URLS[understatLeague];
  
  if (!url) {
    console.log(`⚠️ Understat: Compétition non supportée: ${competition}`);
    return [];
  }
  
  // Vérifier le cache
  const cached = xgCache.get(understatLeague);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    console.log(`📥 Understat: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extraire les données teamsData
    const teamsDataEncoded = extractScriptData(html, 'teamsData');
    
    if (teamsDataEncoded) {
      const teamsData = decodeUnderstatData(teamsDataEncoded);
      
      if (teamsData) {
        // Parser les stats
        const stats: UnderstatTeamStats[] = Object.values(teamsData).map((team: any) => ({
          team: team.title || team.team,
          matches: team.history?.length || 0,
          goals: team.history?.reduce((sum: number, m: any) => sum + (m.goals || 0), 0) || 0,
          xG: team.history?.reduce((sum: number, m: any) => sum + (m.xG || 0), 0) || 0,
          xGA: team.history?.reduce((sum: number, m: any) => sum + (m.xGA || 0), 0) || 0,
          xPTS: team.history?.reduce((sum: number, m: any) => sum + (m.xpts || 0), 0) || 0,
          npxG: 0,
          npxGA: 0,
          npG: 0,
          npGA: 0,
        }));
        
        // Mettre en cache
        xgCache.set(understatLeague, { data: stats, timestamp: Date.now() });
        
        console.log(`✅ Understat: ${stats.length} équipes avec xG pour ${understatLeague}`);
        return stats;
      }
    }
    
    // Fallback: extraire depuis le tableau HTML
    return parseTableFromHTML(html, understatLeague);
    
  } catch (error: any) {
    console.error(`❌ Erreur Understat ${competition}:`, error.message);
    return [];
  }
}

/**
 * Parse les données xG depuis le HTML si le JS échoue
 */
function parseTableFromHTML(html: string, league: string): UnderstatTeamStats[] {
  const stats: UnderstatTeamStats[] = [];
  
  try {
    // Chercher le tableau xG dans le HTML
    // Les données sont généralement dans un <table>
    const tableMatch = html.match(/<table[^>]*class="[^"]*stat[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    
    if (tableMatch) {
      const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        
        if (cells.length >= 5) {
          const cleanCell = (c: string) => c.replace(/<[^>]*>/g, '').trim();
          
          const team = cleanCell(cells[0] || '');
          const matches = parseFloat(cleanCell(cells[1] || '0')) || 0;
          const goals = parseFloat(cleanCell(cells[2] || '0')) || 0;
          const xG = parseFloat(cleanCell(cells[3] || '0')) || 0;
          const xGA = parseFloat(cleanCell(cells[4] || '0')) || 0;
          
          if (team && matches > 0) {
            stats.push({
              team,
              matches,
              goals,
              xG,
              xGA,
              xPTS: 0,
              npxG: 0,
              npxGA: 0,
              npG: 0,
              npGA: 0,
            });
          }
        }
      }
    }
    
    if (stats.length > 0) {
      console.log(`✅ Understat (HTML): ${stats.length} équipes pour ${league}`);
      xgCache.set(league, { data: stats, timestamp: Date.now() });
    }
    
  } catch (error) {
    console.error('Erreur parsing HTML Understat:', error);
  }
  
  return stats;
}

/**
 * Trouve les stats xG pour une équipe
 */
export async function getTeamXG(teamName: string, competition: string): Promise<UnderstatTeamStats | null> {
  const allStats = await getTeamXGStats(competition);
  
  const normalizedName = teamName.toLowerCase().trim();
  
  return allStats.find(s => {
    const statTeam = s.team.toLowerCase().trim();
    return statTeam.includes(normalizedName) || normalizedName.includes(statTeam);
  }) || null;
}

/**
 * Calcule les prédictions basées sur les xG
 */
export function calculateXGPredictions(
  homeTeam: string,
  awayTeam: string,
  competition: string,
  homeXG?: number,
  awayXG?: number,
  homeXGA?: number,
  awayXGA?: number
): {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
  bttsProb: number;
} {
  // Valeurs par défaut si pas de xG
  const avgHomeXG = homeXG || 1.5;
  const avgAwayXG = awayXG || 1.2;
  const avgHomeXGA = homeXGA || 1.2;
  const avgAwayXGA = awayXGA || 1.5;
  
  // Buts attendus: combinaison de l'attaque et de la défense adverse
  const expectedHomeGoals = (avgHomeXG + avgAwayXGA) / 2;
  const expectedAwayGoals = (avgAwayXG + avgHomeXGA) / 2;
  
  // Distribution de Poisson pour les probabilités
  const poisson = (lambda: number, k: number): number => {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  };
  
  // Calculer les probabilités de résultat
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const prob = poisson(expectedHomeGoals, h) * poisson(expectedAwayGoals, a);
      
      if (h > a) homeWinProb += prob;
      else if (h === a) drawProb += prob;
      else awayWinProb += prob;
    }
  }
  
  // Over 2.5
  let over25Prob = 0;
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      if (h + a > 2.5) {
        over25Prob += poisson(expectedHomeGoals, h) * poisson(expectedAwayGoals, a);
      }
    }
  }
  
  // BTTS
  let bttsProb = 0;
  for (let h = 1; h <= 6; h++) {
    for (let a = 1; a <= 6; a++) {
      bttsProb += poisson(expectedHomeGoals, h) * poisson(expectedAwayGoals, a);
    }
  }
  
  return {
    expectedHomeGoals: Math.round(expectedHomeGoals * 100) / 100,
    expectedAwayGoals: Math.round(expectedAwayGoals * 100) / 100,
    homeWinProb: Math.round(homeWinProb * 100),
    drawProb: Math.round(drawProb * 100),
    awayWinProb: Math.round(awayWinProb * 100),
    over25Prob: Math.round(over25Prob * 100),
    bttsProb: Math.round(bttsProb * 100),
  };
}

// Helper
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

/**
 * Récupère les xG pour enrichir les matchs
 */
export async function enrichMatchWithXG(match: {
  homeTeam: string;
  awayTeam: string;
  league: string;
}): Promise<{
  homeXG: number | null;
  awayXG: number | null;
  homeXGA: number | null;
  awayXGA: number | null;
  predictions: ReturnType<typeof calculateXGPredictions>;
}> {
  try {
    const [homeStats, awayStats] = await Promise.all([
      getTeamXG(match.homeTeam, match.league),
      getTeamXG(match.awayTeam, match.league),
    ]);
    
    const homeXG = homeStats?.xG ? homeStats.xG / (homeStats.matches || 1) : null;
    const awayXG = awayStats?.xG ? awayStats.xG / (awayStats.matches || 1) : null;
    const homeXGA = homeStats?.xGA ? homeStats.xGA / (homeStats.matches || 1) : null;
    const awayXGA = awayStats?.xGA ? awayStats.xGA / (awayStats.matches || 1) : null;
    
    const predictions = calculateXGPredictions(
      match.homeTeam,
      match.awayTeam,
      match.league,
      homeXG || undefined,
      awayXG || undefined,
      homeXGA || undefined,
      awayXGA || undefined
    );
    
    return {
      homeXG,
      awayXG,
      homeXGA,
      awayXGA,
      predictions,
    };
  } catch (error) {
    console.error('Erreur enrichissement xG:', error);
    return {
      homeXG: null,
      awayXG: null,
      homeXGA: null,
      awayXGA: null,
      predictions: calculateXGPredictions(match.homeTeam, match.awayTeam, match.league),
    };
  }
}

export { UNDERSTAT_URLS, COMPETITION_MAPPING };
