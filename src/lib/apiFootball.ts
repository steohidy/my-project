/**
 * API-Football Integration
 * Free plan: 100 requests/day
 * Provides: Injuries, Suspensions, Team Form, H2H
 * Documentation: https://www.api-football.com/documentation-v3
 */

// Cache for API responses (1 hour TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Rate limiting
let dailyRequests = 0;
let lastReset = new Date().toDateString();
const MAX_DAILY_REQUESTS = 100;

interface Injury {
  player: string;
  team: string;
  type: 'injury' | 'suspension';
  reason: string;
  matchMissed: string;
}

interface TeamForm {
  team: string;
  form: string; // e.g., "W-D-L-W-W"
  last5: { result: string; score: string; opponent: string }[];
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
}

interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
}

interface TeamStats {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string;
}

/**
 * Get API-Football API key from environment
 * Uses RAPIDAPI_KEY (same key for all RapidAPI services)
 */
function getApiKey(): string | null {
  return process.env.RAPIDAPI_KEY || process.env.API_FOOTBALL_KEY || null;
}

/**
 * Check if we have remaining API requests
 */
function canMakeRequest(): boolean {
  const today = new Date().toDateString();
  if (lastReset !== today) {
    dailyRequests = 0;
    lastReset = today;
  }
  return dailyRequests < MAX_DAILY_REQUESTS;
}

/**
 * Get cached data if valid
 */
function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Set cache data
 */
function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Make API request with caching
 */
async function apiRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('⚠️ API_FOOTBALL_KEY not configured');
    return null;
  }

  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`📦 API-Football cache hit: ${endpoint}`);
    return cached;
  }

  if (!canMakeRequest()) {
    console.log('⚠️ API-Football daily limit reached');
    return null;
  }

  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api-football-v1.p.rapidapi.com/v3/${endpoint}?${queryString}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    });

    dailyRequests++;

    if (!response.ok) {
      console.error(`API-Football error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    setCache(cacheKey, data);
    console.log(`✅ API-Football: ${endpoint} (${dailyRequests}/${MAX_DAILY_REQUESTS} requests today)`);
    return data;

  } catch (error) {
    console.error('API-Football request failed:', error);
    return null;
  }
}

/**
 * Find team ID by name (with fuzzy matching)
 */
const teamIdCache = new Map<string, number>();

async function findTeamId(teamName: string, leagueId?: number): Promise<number | null> {
  const normalizedName = normalizeTeamName(teamName);
  
  // Check cache first
  if (teamIdCache.has(normalizedName)) {
    return teamIdCache.get(normalizedName) || null;
  }

  // Search for team
  const data = await apiRequest('teams', { search: teamName });
  
  if (data?.response && data.response.length > 0) {
    // Try to find best match
    for (const team of data.response) {
      const apiTeamName = normalizeTeamName(team.team.name);
      if (apiTeamName.includes(normalizedName) || normalizedName.includes(apiTeamName)) {
        teamIdCache.set(normalizedName, team.team.id);
        return team.team.id;
      }
    }
    // Return first result if no exact match
    const teamId = data.response[0].team.id;
    teamIdCache.set(normalizedName, teamId);
    return teamId;
  }

  return null;
}

/**
 * Normalize team name for comparison
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Get injuries and suspensions for a team
 */
export async function getInjuriesAndSuspensions(
  teamName: string,
  season: number = new Date().getFullYear()
): Promise<Injury[]> {
  const teamId = await findTeamId(teamName);
  if (!teamId) return [];

  const data = await apiRequest('injuries', {
    team: teamId.toString(),
    season: season.toString()
  });

  if (!data?.response) return [];

  const injuries: Injury[] = [];
  
  for (const item of data.response.slice(0, 10)) { // Limit to 10 most recent
    injuries.push({
      player: item.player.name,
      team: item.team.name,
      type: item.player.type || 'injury',
      reason: item.player.reason || 'Unknown',
      matchMissed: item.fixture?.date || 'Upcoming'
    });
  }

  return injuries;
}

/**
 * Get injuries for a specific fixture
 */
export async function getFixtureInjuries(fixtureId: string): Promise<Injury[]> {
  const data = await apiRequest('injuries', { fixture: fixtureId });
  
  if (!data?.response) return [];

  return data.response.map((item: any) => ({
    player: item.player.name,
    team: item.team.name,
    type: item.player.type || 'injury',
    reason: item.player.reason || 'Unknown',
    matchMissed: item.fixture?.date || 'Upcoming'
  }));
}

/**
 * Get team form (last 5 matches)
 */
export async function getTeamForm(teamName: string): Promise<TeamForm | null> {
  const teamId = await findTeamId(teamName);
  if (!teamId) return null;

  const data = await apiRequest('teams/statistics', {
    team: teamId.toString(),
    season: new Date().getFullYear().toString(),
    league: '61' // Default to Ligue 1, should be parameterized
  });

  if (!data?.response) return null;

  const stats = data.response;
  
  return {
    team: teamName,
    form: stats.form || 'N/A',
    last5: [], // Would need fixtures endpoint for detailed history
    goalsScored: stats.goals?.for?.total || 0,
    goalsConceded: stats.goals?.against?.total || 0,
    cleanSheets: stats.clean_sheet?.total || 0
  };
}

/**
 * Get Head to Head history between two teams
 */
export async function getH2HHistory(
  team1Name: string,
  team2Name: string,
  limit: number = 5
): Promise<H2HMatch[]> {
  const team1Id = await findTeamId(team1Name);
  const team2Id = await findTeamId(team2Name);

  if (!team1Id || !team2Id) return [];

  const data = await apiRequest('fixtures/headtohead', {
    h2h: `${team1Id}-${team2Id}`,
    last: limit.toString()
  });

  if (!data?.response) return [];

  return data.response.map((match: any) => ({
    date: match.fixture.date,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    homeScore: match.goals.home,
    awayScore: match.goals.away,
    competition: match.league.name
  }));
}

/**
 * Get team statistics
 */
export async function getTeamStatistics(
  teamName: string,
  leagueId: number = 61, // Default Ligue 1
  season: number = new Date().getFullYear()
): Promise<TeamStats | null> {
  const teamId = await findTeamId(teamName);
  if (!teamId) return null;

  const data = await apiRequest('teams/statistics', {
    team: teamId.toString(),
    league: leagueId.toString(),
    season: season.toString()
  });

  if (!data?.response) return null;

  const stats = data.response;
  
  return {
    team: teamName,
    played: stats.fixtures?.played?.total || 0,
    wins: stats.fixtures?.wins?.total || 0,
    draws: stats.fixtures?.draws?.total || 0,
    losses: stats.fixtures?.loses?.total || 0,
    goalsFor: stats.goals?.for?.total || 0,
    goalsAgainst: stats.goals?.against?.total || 0,
    form: stats.form || 'N/A'
  };
}

/**
 * Find fixture by team names
 */
export async function findFixture(
  homeTeam: string,
  awayTeam: string
): Promise<{ id: number; date: string; league: string; status: string } | null> {
  const homeId = await findTeamId(homeTeam);
  const awayId = await findTeamId(awayTeam);

  if (!homeId || !awayId) return null;

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const data = await apiRequest('fixtures', {
    from: today.toISOString().split('T')[0],
    to: nextWeek.toISOString().split('T')[0],
    team: homeId.toString()
  });

  if (!data?.response) return null;

  // Find match with the away team
  for (const fixture of data.response) {
    if (fixture.teams.home.id === homeId && fixture.teams.away.id === awayId) {
      return {
        id: fixture.fixture.id,
        date: fixture.fixture.date,
        league: fixture.league.name,
        status: fixture.fixture.status.short
      };
    }
  }

  return null;
}

/**
 * Get comprehensive match analysis data
 */
export async function getMatchAnalysisData(
  homeTeam: string,
  awayTeam: string
): Promise<{
  homeInjuries: Injury[];
  awayInjuries: Injury[];
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  h2h: H2HMatch[];
  fixture: { id: number; date: string; league: string; status: string } | null;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
}> {
  // Run all requests in parallel for efficiency
  const [homeInjuries, awayInjuries, homeForm, awayForm, h2h, fixture] = await Promise.all([
    getInjuriesAndSuspensions(homeTeam),
    getInjuriesAndSuspensions(awayTeam),
    getTeamForm(homeTeam),
    getTeamForm(awayTeam),
    getH2HHistory(homeTeam, awayTeam, 5),
    findFixture(homeTeam, awayTeam)
  ]);

  // Get stats if fixture found
  let homeStats: TeamStats | null = null;
  let awayStats: TeamStats | null = null;
  
  if (fixture) {
    [homeStats, awayStats] = await Promise.all([
      getTeamStatistics(homeTeam),
      getTeamStatistics(awayTeam)
    ]);
  }

  return {
    homeInjuries,
    awayInjuries,
    homeForm,
    awayForm,
    h2h,
    fixture,
    homeStats,
    awayStats
  };
}

/**
 * Get remaining API requests for today
 */
export function getRemainingRequests(): { used: number; remaining: number; max: number } {
  const today = new Date().toDateString();
  if (lastReset !== today) {
    dailyRequests = 0;
    lastReset = today;
  }
  
  return {
    used: dailyRequests,
    remaining: MAX_DAILY_REQUESTS - dailyRequests,
    max: MAX_DAILY_REQUESTS
  };
}

export type { Injury, TeamForm, H2HMatch, TeamStats };
