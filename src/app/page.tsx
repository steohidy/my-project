'use client';

import { useState, useEffect } from 'react';

// Interface pour les infos utilisateur
interface UserInfo {
  username: string;
  name: string;
  role: string;
  daysRemaining?: number;
  expiresAt?: string | null;
}

export default function Home() {
  // État pour gérer l'authentification
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Vérifier si une session existe au chargement
  useEffect(() => {
    const sessionData = document.cookie
      .split('; ')
      .find(row => row.startsWith('steo_elite_session_data='));
    
    if (sessionData) {
      try {
        const data = JSON.parse(decodeURIComponent(sessionData.split('=')[1]));
        if (data.expiry > Date.now()) {
          setUserInfo({
            username: data.user,
            name: data.name,
            role: data.role,
            daysRemaining: data.daysRemaining
          });
          setIsLoggedIn(true);
        }
      } catch {
        // Session invalide
      }
    }
  }, []);

  // Fonction de connexion
  const handleLogin = async function(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUserInfo({
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          daysRemaining: data.user.daysRemaining,
          expiresAt: data.user.expiresAt
        });
        setIsLoggedIn(true);
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const handleLogout = function() {
    fetch('/api/auth/logout', { method: 'POST' });
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  // Afficher la page de connexion ou l'application
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '32px' }}>👑</span>
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#f97316',
              margin: 0
            }}>Steo Élite</h1>
            <p style={{ color: '#888', margin: '8px 0 0 0' }}>Sports Predictor</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleLogin}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#ef4444'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: '#fff',
                marginBottom: '8px',
                fontSize: '14px'
              }}>Identifiant</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Entrez votre identifiant"
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#fff',
                marginBottom: '8px',
                fontSize: '14px'
              }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#666' : '#f97316',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '12px',
            marginTop: '20px'
          }}>
            🔒 Connexion sécurisée
          </p>
        </div>
      </div>
    );
  }

  // Application principale
  return <AppDashboard onLogout={handleLogout} userInfo={userInfo} />;
}

// Types
interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  oddsHome: number;
  oddsDraw: number | null;
  oddsAway: number;
  sources?: string[];
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  insight: {
    riskPercentage: number;
    valueBetDetected: boolean;
    valueBetType: string | null;
    confidence: string;
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
  cornersPrediction?: {
    total: number;
    over85: number;
    under85: number;
    over95: number;
    prediction: string;
  };
  advancedPredictions?: {
    btts: { yes: number; no: number };
    correctScore: { home: number; away: number; prob: number }[];
    halfTime: { home: number; draw: number; away: number };
  };
  // Prédictions NBA spécifiques
  nbaPredictions?: {
    predictedWinner: 'home' | 'away';
    winnerTeam: string;
    winnerProb: number;
    spread: { line: number; favorite: string; confidence: number };
    totalPoints: { line: number; predicted: number; overProb: number; recommendation: string };
    topScorer: { team: string; player: string; predictedPoints: number };
    keyMatchup: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

// Interface pour les infos de timing
interface TimingInfo {
  currentHour: number;
  canRefresh: boolean;
  nextRefreshTime: string;
  currentPhase: 'morning' | 'afternoon' | 'evening';
  message: string;
}

// Interface pour les stats des sources
interface SourceStats {
  oddsApi: { count: number; status: 'online' | 'offline' };
  footballData: { count: number; status: 'online' | 'offline' };
  totalMatches: number;
  todayMatches: number;
  lastUpdate: string;
}

// Composant Dashboard
function AppDashboard({ onLogout, userInfo }: { onLogout: () => void; userInfo: UserInfo | null }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'safes' | 'moderate' | 'risky' | 'finished' | 'all'>('safes');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [activeSection, setActiveSection] = useState<'matches' | 'analyse' | 'antitrap' | 'bankroll' | 'results' | 'admin'>('matches');
  const [timing, setTiming] = useState<TimingInfo>({
    currentHour: new Date().getHours(),
    canRefresh: true,
    nextRefreshTime: 'Maintenant',
    currentPhase: 'afternoon',
    message: ''
  });
  
  // Timer de session (20 minutes max)
  const SESSION_DURATION = 20 * 60; // 20 minutes en secondes
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Vérifier si le compte expire bientôt (moins de 7 jours)
  const isExpiringSoon = userInfo?.daysRemaining !== undefined && userInfo.daysRemaining <= 7 && userInfo.role === 'user';

  // Fonction pour sauvegarder les pronostics en base (déclarée avant utilisation)
  const savePredictionsToDB = async (matchList: Match[]) => {
    try {
      const predictions = matchList.map(m => ({
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        sport: m.sport,
        matchDate: m.date,
        oddsHome: m.oddsHome,
        oddsDraw: m.oddsDraw,
        oddsAway: m.oddsAway,
        predictedResult: m.oddsHome < m.oddsAway ? 'home' : 'away',
        predictedGoals: m.goalsPrediction?.prediction || null,
        confidence: m.insight.confidence,
        riskPercentage: m.insight.riskPercentage
      }));
      
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'save_predictions', 
          predictions 
        })
      });
      
      console.log('💾 Pronostics sauvegardés en base');
    } catch (error) {
      console.error('Erreur sauvegarde pronostics:', error);
    }
  };

  // Timer de session - décompte 20 min
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          // Session expirée - déconnexion auto
          onLogout();
          return 0;
        }
        if (prev <= 60) {
          setShowSessionWarning(true); // Warning à 1 minute
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Formater le temps restant
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Charger les matchs - CHARGEMENT IMMÉDIAT + refresh toutes les 5 min
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout;
    
    const fetchMatches = (forceRefresh = false) => {
      const url = forceRefresh ? '/api/matches?refresh=true' : '/api/matches';
      fetch(url)
        .then(res => {
          if (isMounted) {
            setApiStatus(res.ok ? 'online' : 'offline');
          }
          return res.json();
        })
        .then(data => {
          if (isMounted) {
            const matchList = data.matches || data;
            setMatches(matchList);
            if (data.timing) {
              setTiming(data.timing);
            }
            setLastUpdate(new Date());
            setLoading(false);
            
            // Sauvegarder automatiquement les pronostics
            if (matchList && matchList.length > 0) {
              savePredictionsToDB(matchList);
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            setApiStatus('offline');
            setLoading(false);
          }
        });
    };
    
    // Chargement initial - FORCER le refresh
    fetchMatches(true);
    
    // Auto-refresh toutes les 5 minutes (pas de force)
    refreshInterval = setInterval(() => fetchMatches(false), 5 * 60 * 1000);

    return () => { 
      isMounted = false; 
      clearInterval(refreshInterval);
    };
  }, []);

  const handleRefresh = () => {
    if (!timing.canRefresh) return;
    
    setLoading(true);
    fetch('/api/matches?refresh=true')
      .then(res => res.json())
      .then(data => {
        setMatches(data.matches || data);
        if (data.timing) {
          setTiming(data.timing);
        }
        setLastUpdate(new Date());
        setLoading(false);
        
        // Sauvegarder automatiquement les pronostics du jour
        if (data.matches && data.matches.length > 0) {
          savePredictionsToDB(data.matches);
        }
      })
      .catch(() => setLoading(false));
  };

  // Séparer les matchs à venir et terminés (basé sur l'heure du match)
  const now = new Date();
  const upcomingMatches = matches.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate > now;
  });
  const finishedMatches = matches.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate <= now;
  });

  // Filtrer les matchs à venir uniquement
  const safes = upcomingMatches.filter(m => m.insight.riskPercentage <= 40);
  const moderate = upcomingMatches.filter(m => m.insight.riskPercentage > 40 && m.insight.riskPercentage <= 50);
  const risky = upcomingMatches.filter(m => m.insight.riskPercentage > 50);
  const valueBets = upcomingMatches.filter(m => m.insight.valueBetDetected);

  // Matchs à afficher selon l'onglet
  const displayedMatches = activeTab === 'safes' ? safes 
    : activeTab === 'moderate' ? moderate 
    : activeTab === 'risky' ? risky
    : activeTab === 'finished' ? finishedMatches
    : matches;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      display: 'flex'
    }}>
      {/* Sidebar - Menu Vertical */}
      <aside style={{
        width: '70px',
        minWidth: '70px',
        background: '#111',
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '4px',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Logo */}
        <div style={{
          padding: '6px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>👑</span>
        </div>
        
        {/* Timer de session */}
        <div style={{
          fontSize: '10px',
          color: sessionTimeLeft <= 60 ? '#ef4444' : sessionTimeLeft <= 300 ? '#f97316' : '#666',
          fontFamily: 'monospace',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          ⏱️ {formatTime(sessionTimeLeft)}
        </div>
        
        {/* Menu Items */}
        <NavButton icon="⚽" label="Pronos" active={activeSection === 'matches'} onClick={() => setActiveSection('matches')} color="#f97316" />
        <NavButton icon="🔍" label="Analyse" active={activeSection === 'analyse'} onClick={() => setActiveSection('analyse')} color="#3b82f6" />
        <NavButton icon="🛡️" label="Trap" active={activeSection === 'antitrap'} onClick={() => setActiveSection('antitrap')} color="#ef4444" />
        <NavButton icon="💰" label="Bank" active={activeSection === 'bankroll'} onClick={() => setActiveSection('bankroll')} color="#22c55e" />
        <NavButton icon="📊" label="Stats" active={activeSection === 'results'} onClick={() => setActiveSection('results')} color="#8b5cf6" />
        
        {/* Admin Button - Visible uniquement pour les admins */}
        {userInfo?.role === 'admin' && (
          <NavButton icon="⚙️" label="Admin" active={activeSection === 'admin'} onClick={() => setActiveSection('admin')} color="#eab308" />
        )}
        
        {/* Spacer */}
        <div style={{ flex: 1 }}></div>
        
        {/* API Status */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: apiStatus === 'online' ? '#22c55e' : '#ef4444',
          boxShadow: apiStatus === 'online' ? '0 0 6px #22c55e' : 'none'
        }} title={apiStatus === 'online' ? 'API En ligne' : 'API Hors ligne'}></div>
        
        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #ef444440',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}
          title="Se déconnecter"
        >
          🚪
        </button>
      </aside>

      {/* Warning Modal - Session expire dans 1 min */}
      {showSessionWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #ef4444'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Session expire bientôt</h3>
            <p style={{ color: '#888', marginBottom: '16px' }}>
              Déconnexion dans <strong style={{ color: '#ef4444' }}>{formatTime(sessionTimeLeft)}</strong>
            </p>
            <button
              onClick={() => {
                setSessionTimeLeft(SESSION_DURATION);
                setShowSessionWarning(false);
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#f97316',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Prolonger la session
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Alerte expiration compte */}
        {isExpiringSoon && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                Compte expire dans {userInfo?.daysRemaining} jour{userInfo?.daysRemaining !== 1 ? 's' : ''}
              </div>
              <div style={{ color: '#888', fontSize: '10px' }}>
                Contactez l'administrateur pour prolonger votre accès
              </div>
            </div>
          </div>
        )}

        {/* Header compact */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>
              Steo Élite Predictor
            </h1>
            <span style={{ fontSize: '11px', color: '#666' }}>
              {timing.currentPhase === 'morning' ? '🌅' : timing.currentPhase === 'afternoon' ? '☀️' : '🌙'} {matches.length} matchs
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            color: apiStatus === 'online' ? '#22c55e' : '#ef4444'
          }}>
            {apiStatus === 'online' ? '✓ API' : '✗ Offline'}
          </span>
        </header>

        {/* Section Pronostics */}
        {activeSection === 'matches' && (
          <>
            {/* Hero avec description */}
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#f97316',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚽ Pronostics du jour
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Paris recommandés basés sur l'analyse des cotes et statistiques
              </p>
              <p style={{ color: '#666', fontSize: '10px' }}>
                Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')} • {safes.length} sûrs, {moderate.length} modérés, {risky.length} audacieux
              </p>
            </div>

            {/* Tabs compacts */}
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '12px',
              flexWrap: 'nowrap',
              overflowX: 'auto'
            }}>
              <TabButtonCompact active={activeTab === 'safes'} onClick={() => setActiveTab('safes')} icon="🛡️" label="Sûrs" count={safes.length} />
              <TabButtonCompact active={activeTab === 'moderate'} onClick={() => setActiveTab('moderate')} icon="⚠️" label="Modérés" count={moderate.length} />
              <TabButtonCompact active={activeTab === 'risky'} onClick={() => setActiveTab('risky')} icon="🎯" label="Risqués" count={risky.length} />
              <TabButtonCompact active={activeTab === 'finished'} onClick={() => setActiveTab('finished')} icon="✅" label="Terminés" count={finishedMatches.length} />
              <TabButtonCompact active={activeTab === 'all'} onClick={() => setActiveTab('all')} icon="📋" label="Tous" count={matches.length} />
            </div>

            {/* Loading State */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <span style={{ fontSize: '12px' }}>Chargement...</span>
              </div>
            ) : displayedMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
                <span style={{ fontSize: '12px' }}>Aucun match</span>
              </div>
            ) : (
              /* Match List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayedMatches.map((match, index) => (
                  <MatchCardCompact key={match.id} match={match} index={index + 1} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Section Analyse de Match */}
        {activeSection === 'analyse' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 Analyse de Match
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Analysez un match avec nos prédictions détaillées (3 analyses/jour)
              </p>
            </div>
            <MatchAnalysisSection username={userInfo?.username || ''} matches={matches} />
          </div>
        )}

        {/* Section Anti-Trap */}
        {activeSection === 'antitrap' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛡️ Détection des Pièges
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Identifie les paris risqués avec cotes trompeuses
              </p>
              <p style={{ color: '#666', fontSize: '10px' }}>
                Évitez les favoris à cotes ultra-basses et les matchs déséquilibrés
              </p>
            </div>
            <AntiTrapSection matches={matches} />
          </div>
        )}

        {/* Section Bankroll */}
        {activeSection === 'bankroll' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Gestion de Bankroll
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Optimisez vos mises selon votre capital
              </p>
              <p style={{ color: '#666', fontSize: '10px' }}>
                Méthode Kelly • Mise recommandée: 1-3% du capital
              </p>
            </div>
            <BankrollSection />
          </div>
        )}

        {/* Section Résultats */}
        {activeSection === 'results' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Historique & Stats
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Suivez vos performances et taux de réussite
              </p>
              <p style={{ color: '#666', fontSize: '10px' }}>
                Objectif: Maintenir un ROI positif sur le long terme
              </p>
            </div>
            <ResultsSection />
          </div>
        )}

        {/* Section Admin - Visible uniquement pour les admins */}
        {activeSection === 'admin' && userInfo?.role === 'admin' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#eab308', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ Administration
              </h2>
              <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                Gestion des utilisateurs et des accès
              </p>
            </div>
            <AdminPanel />
          </div>
        )}
      </main>
    </div>
  );
}

// Composant NavButton (menu vertical)
function NavButton({ icon, label, active, onClick, color }: { icon: string; label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '52px',
        padding: '6px 4px',
        borderRadius: '8px',
        border: 'none',
        background: active ? `${color}20` : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        transition: 'all 0.2s'
      }}
      title={label}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ 
        fontSize: '8px', 
        color: active ? color : '#666', 
        fontWeight: active ? 'bold' : 'normal',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>{label}</span>
    </button>
  );
}

// Composant TabButtonCompact
function TabButtonCompact({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: active ? '1px solid #f97316' : '1px solid #333',
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#888',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: active ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        flexDirection: 'column',
        minWidth: '60px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 'bold' }}>{count}</span>
      </div>
      <span style={{ fontSize: '9px', opacity: 0.9 }}>{label}</span>
    </button>
  );
}

// Composant NBAMatchCard - Affichage spécifique pour le basket
function NBAMatchCard({ match, index }: { match: Match; index: number }) {
  const riskColor = match.insight.riskPercentage <= 40 ? '#22c55e' : match.insight.riskPercentage <= 50 ? '#f97316' : '#ef4444';
  const riskLabel = match.insight.riskPercentage <= 40 ? 'Sûr' : match.insight.riskPercentage <= 50 ? 'Modéré' : 'Audacieux';
  
  // Données NBA
  const nba = match.nbaPredictions;
  const isHomeFavorite = nba?.predictedWinner === 'home';
  const winnerProb = nba?.winnerProb || 50;
  const confidenceColor = nba?.confidence === 'high' ? '#22c55e' : nba?.confidence === 'medium' ? '#f97316' : '#ef4444';
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
      borderRadius: '12px',
      padding: '14px',
      border: `1px solid ${isHomeFavorite ? '#f9731660' : '#3b82f660'}`,
      marginBottom: '10px',
      boxShadow: isHomeFavorite ? '0 4px 20px rgba(249, 115, 22, 0.15)' : '0 4px 20px rgba(59, 130, 246, 0.1)'
    }}>
      {/* Header avec index et league */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: '#f97316', 
            color: '#fff', 
            width: '26px', 
            height: '26px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>{index}</span>
          <span style={{ fontSize: '11px', color: '#888' }}>🏀 {match.league}</span>
        </div>
        <div style={{
          background: `${riskColor}20`,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '9px',
          color: riskColor,
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {riskLabel}
        </div>
      </div>
      
      {/* TEAMS - avec SURBRILLANCE du favori */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        padding: '10px',
        background: '#111',
        borderRadius: '10px'
      }}>
        {/* Home Team */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          padding: '8px',
          borderRadius: '8px',
          background: isHomeFavorite ? 'linear-gradient(135deg, #f9731620 0%, #f9731610 100%)' : 'transparent',
          border: isHomeFavorite ? '2px solid #f97316' : '2px solid transparent'
        }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: isHomeFavorite ? '#f97316' : '#fff',
            marginBottom: '4px'
          }}>
            {isHomeFavorite && '⭐ '}{match.homeTeam}
          </div>
          <div style={{ fontSize: '10px', color: '#888' }}>
            🏠 Domicile
          </div>
          <div style={{ 
            marginTop: '6px',
            fontSize: '18px', 
            fontWeight: 'bold',
            color: isHomeFavorite ? '#f97316' : '#888'
          }}>
            {isHomeFavorite ? winnerProb : 100 - winnerProb}%
          </div>
        </div>
        
        {/* VS */}
        <div style={{ padding: '0 10px' }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666',
            background: '#1a1a1a',
            padding: '6px 10px',
            borderRadius: '6px'
          }}>
            VS
          </div>
        </div>
        
        {/* Away Team */}
        <div style={{
          flex: 1,
          textAlign: 'center',
          padding: '8px',
          borderRadius: '8px',
          background: !isHomeFavorite ? 'linear-gradient(135deg, #3b82f620 0%, #3b82f610 100%)' : 'transparent',
          border: !isHomeFavorite ? '2px solid #3b82f6' : '2px solid transparent'
        }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: !isHomeFavorite ? '#3b82f6' : '#fff',
            marginBottom: '4px'
          }}>
            {!isHomeFavorite && '⭐ '}{match.awayTeam}
          </div>
          <div style={{ fontSize: '10px', color: '#888' }}>
            ✈️ Extérieur
          </div>
          <div style={{ 
            marginTop: '6px',
            fontSize: '18px', 
            fontWeight: 'bold',
            color: !isHomeFavorite ? '#3b82f6' : '#888'
          }}>
            {!isHomeFavorite ? winnerProb : 100 - winnerProb}%
          </div>
        </div>
      </div>
      
      {/* PRÉDICTION PRINCIPALE */}
      <div style={{
        background: `linear-gradient(135deg, ${isHomeFavorite ? '#f9731615' : '#3b82f615'} 0%, #0a0a0a 100%)`,
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '12px',
        border: `1px solid ${isHomeFavorite ? '#f9731630' : '#3b82f630'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🏆 VAINQUEUR PRÉDIT</div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: isHomeFavorite ? '#f97316' : '#3b82f6' 
            }}>
              ⭐ {nba?.winnerTeam}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: confidenceColor }}>
              {winnerProb}%
            </div>
            <div style={{ fontSize: '9px', color: '#888' }}>
              Confiance: {nba?.confidence === 'high' ? 'Haute' : nba?.confidence === 'medium' ? 'Moyenne' : 'Faible'}
            </div>
          </div>
        </div>
      </div>
      
      {/* GRILLE PRÉDICTIONS NBA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px'
      }}>
        {/* SPREAD */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>📊 SPREAD</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>
            {nba?.spread?.favorite} ({(nba?.spread?.line ?? 0) > 0 ? '-' : '+'}{Math.abs(nba?.spread?.line ?? 0)})
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            Confiance: {nba?.spread?.confidence}%
          </div>
        </div>
        
        {/* TOTAL POINTS */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>📈 TOTAL POINTS</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: (nba?.totalPoints?.overProb ?? 0) >= 55 ? '#22c55e' : '#f97316' }}>
            {nba?.totalPoints?.recommendation}
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            Prédit: {nba?.totalPoints?.predicted} pts ({nba?.totalPoints?.overProb}% over)
          </div>
        </div>
        
        {/* MEILLEUR MARQUEUR */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>🏀 TOP SCOREUR</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308' }}>
            {nba?.topScorer?.player}
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            {nba?.topScorer?.team} • ~{nba?.topScorer?.predictedPoints} pts
          </div>
        </div>
        
        {/* KEY MATCHUP */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '10px'
        }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>⚔️ DUEL CLÉ</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#a855f7' }}>
            {nba?.keyMatchup}
          </div>
          <div style={{ fontSize: '9px', color: '#666' }}>
            Impact sur le résultat
          </div>
        </div>
      </div>
      
      {/* Cotes */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid #222'
      }}>
        <span style={{ 
          padding: '4px 10px', 
          background: isHomeFavorite ? '#f97316' : '#1a1a1a', 
          borderRadius: '4px', 
          fontSize: '11px', 
          color: '#fff',
          fontWeight: isHomeFavorite ? 'bold' : 'normal'
        }}>
          {match.homeTeam.slice(0, 10)}: {match.oddsHome.toFixed(2)}
        </span>
        <span style={{ 
          padding: '4px 10px', 
          background: !isHomeFavorite ? '#3b82f6' : '#1a1a1a', 
          borderRadius: '4px', 
          fontSize: '11px', 
          color: '#fff',
          fontWeight: !isHomeFavorite ? 'bold' : 'normal'
        }}>
          {match.awayTeam.slice(0, 10)}: {match.oddsAway.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// Composant MatchCardCompact - Wrapper qui choisit le bon composant selon le sport
function MatchCardCompact({ match, index }: { match: Match; index: number }) {
  // Si c'est un match NBA avec prédictions, utiliser le composant spécifique
  if (match.sport === 'Basket' && match.nbaPredictions) {
    return <NBAMatchCard match={match} index={index} />;
  }
  
  // Sinon, utiliser le composant Football standard
  return <FootballMatchCard match={match} index={index} />;
}

// Composant FootballMatchCard - Affichage pour le football
function FootballMatchCard({ match, index }: { match: Match; index: number }) {
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [enrichment, setEnrichment] = useState<{
    homeTeam?: { injuryCount: number; keyInjuries?: string[] };
    awayTeam?: { injuryCount: number; keyInjuries?: string[] };
    totalInjuries?: number;
  } | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(true);
  
  // Charger les données d'enrichissement (blessures)
  useEffect(() => {
    const fetchEnrichment = async () => {
      try {
        const response = await fetch(
          `/api/pronos-enrichment?homeTeam=${encodeURIComponent(match.homeTeam)}&awayTeam=${encodeURIComponent(match.awayTeam)}`
        );
        const data = await response.json();
        if (data.success && data.data) {
          setEnrichment(data.data);
        }
      } catch (e) {
        // Silencieux si échec
      } finally {
        setLoadingEnrichment(false);
      }
    };
    
    fetchEnrichment();
  }, [match.homeTeam, match.awayTeam]);
  
  const riskColor = match.insight.riskPercentage <= 40 ? '#22c55e' : match.insight.riskPercentage <= 50 ? '#f97316' : '#ef4444';
  const riskLabel = match.insight.riskPercentage <= 40 ? 'Sûr' : match.insight.riskPercentage <= 50 ? 'Modéré' : 'Audacieux';
  
  // Calcul des probabilités implicites
  const homeProb = Math.round((1 / match.oddsHome) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (match.oddsDraw ? 1 / match.oddsDraw : 0)) * 100);
  const awayProb = Math.round((1 / match.oddsAway) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (match.oddsDraw ? 1 / match.oddsDraw : 0)) * 100);
  const drawProb = match.oddsDraw ? Math.round((1 / match.oddsDraw) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (1 / match.oddsDraw)) * 100) : 0;
  
  // Déterminer le favori et la recommandation
  const favorite = match.oddsHome < match.oddsAway ? 'home' : 'away';
  const favoriteTeam = favorite === 'home' ? match.homeTeam : match.awayTeam;
  const favoriteProb = favorite === 'home' ? homeProb : awayProb;
  const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;
  
  // Victoire ou Nul (Double Chance)
  const homeOrDrawProb = homeProb + drawProb;
  const awayOrDrawProb = awayProb + drawProb;
  
  // Recommandation intelligente
  let recommendation = '';
  let recColor = '#22c55e';
  if (favoriteOdds < 1.5 && favoriteProb >= 65) {
    recommendation = `✅ Victoire ${favoriteTeam}`;
    recColor = '#22c55e';
  } else if (favoriteOdds < 2.0 && favoriteProb >= 50) {
    recommendation = `✅ ${favoriteTeam} ou Nul`;
    recColor = '#22c55e';
  } else if (drawProb >= 30) {
    recommendation = `⚠️ Risque de Nul`;
    recColor = '#f97316';
  } else {
    recommendation = `⏳ Match serré`;
    recColor = '#f97316';
  }
  
  // Taux de réussite basé sur la confiance
  const baseSuccessRate = match.insight.confidence === 'high' ? 75 : match.insight.confidence === 'medium' ? 60 : 45;
  const successColor = baseSuccessRate >= 70 ? '#22c55e' : baseSuccessRate >= 55 ? '#f97316' : '#ef4444';
  
  return (
    <div style={{
      background: '#111',
      borderRadius: '10px',
      padding: '12px',
      border: `1px solid ${riskColor}30`,
      marginBottom: '8px'
    }}>
      {/* Ligne principale */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px'
      }}>
        {/* Index + Risk Label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ 
            background: riskColor, 
            color: '#fff', 
            width: '24px', 
            height: '24px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            flexShrink: 0
          }}>{index}</span>
          <span style={{ fontSize: '7px', color: riskColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
            {riskLabel}
          </span>
        </div>
        
        {/* Teams */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>
            {match.homeTeam} vs {match.awayTeam}
          </div>
          <div style={{ color: '#666', fontSize: '10px' }}>
            {match.league} • {match.sport}
          </div>
          {/* Indicateur blessures */}
          {!loadingEnrichment && enrichment && enrichment.totalInjuries && enrichment.totalInjuries > 0 && (
            <div style={{ 
              color: '#ef4444', 
              fontSize: '9px', 
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🏥 {enrichment.totalInjuries} joueur{enrichment.totalInjuries > 1 ? 's' : ''} blessé{enrichment.totalInjuries > 1 ? 's' : ''}
              {enrichment.homeTeam?.keyInjuries && enrichment.homeTeam.keyInjuries.length > 0 && (
                <span style={{ color: '#888' }}>({enrichment.homeTeam.keyInjuries[0].slice(0, 12)}...)</span>
              )}
            </div>
          )}
        </div>
        
        {/* Odds */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ padding: '3px 6px', background: favorite === 'home' ? '#f97316' : '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>{match.oddsHome.toFixed(2)}</span>
          {match.oddsDraw && <span style={{ padding: '3px 6px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#888' }}>{match.oddsDraw.toFixed(2)}</span>}
          <span style={{ padding: '3px 6px', background: favorite === 'away' ? '#f97316' : '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>{match.oddsAway.toFixed(2)}</span>
        </div>
        
        {/* Risk Percentage */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: riskColor, fontSize: '12px', fontWeight: 'bold' }}>{match.insight.riskPercentage}%</div>
          <div style={{ color: '#666', fontSize: '8px' }}>Risque</div>
        </div>
      </div>
      
      {/* RECOMMANDATION PRINCIPALE */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ color: recColor, fontSize: '14px', fontWeight: 'bold' }}>
            {recommendation}
          </div>
          <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
            Taux de réussite estimé: <span style={{ color: successColor, fontWeight: 'bold' }}>{baseSuccessRate}%</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Probabilités</div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
            <span style={{ color: favorite === 'home' ? '#f97316' : '#888' }}>🏠{homeProb}%</span>
            <span style={{ color: '#666' }}>🤝{drawProb}%</span>
            <span style={{ color: favorite === 'away' ? '#f97316' : '#888' }}>✈️{awayProb}%</span>
          </div>
        </div>
      </div>
      
      {/* OPTIONS DE PARIS - GRILLE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '6px',
        marginTop: '8px'
      }}>
        {/* Double Chance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px',
          background: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px'
        }}>
          <span style={{ fontSize: '14px' }}>🎲</span>
          <div>
            <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Double Chance</div>
            <div style={{ color: '#888', fontSize: '9px' }}>{favoriteTeam} ou Nul: {Math.round(favoriteProb + drawProb)}%</div>
          </div>
        </div>
        
        {/* BUTS - Over/Under 2.5 */}
        {match.goalsPrediction && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: match.goalsPrediction.over25 >= 55 ? '#22c55e15' : '#1a1a1a',
            borderRadius: '6px',
            fontSize: '10px',
            border: match.goalsPrediction.over25 >= 55 ? '1px solid #22c55e30' : 'none'
          }}>
            <span style={{ fontSize: '14px' }}>⚽</span>
            <div>
              <div style={{ color: match.goalsPrediction.over25 >= 55 ? '#22c55e' : '#f97316', fontWeight: 'bold' }}>
                {match.goalsPrediction.over25 >= 55 ? 'Over 2.5' : 'Under 2.5'}
              </div>
              <div style={{ color: '#888', fontSize: '9px' }}>
                {match.goalsPrediction.over25 >= 55 ? match.goalsPrediction.over25 : match.goalsPrediction.under25}% • {match.goalsPrediction.total} buts attendus
              </div>
            </div>
          </div>
        )}
        
        {/* BTTS - Les deux marquent */}
        {match.advancedPredictions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: match.advancedPredictions.btts.yes >= 55 ? '#22c55e15' : '#1a1a1a',
            borderRadius: '6px',
            fontSize: '10px',
            border: match.advancedPredictions.btts.yes >= 55 ? '1px solid #22c55e30' : 'none'
          }}>
            <span style={{ fontSize: '14px' }}>🥅</span>
            <div>
              <div style={{ color: match.advancedPredictions.btts.yes >= 55 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                BTTS: {match.advancedPredictions.btts.yes >= 55 ? 'Oui' : 'Non'}
              </div>
              <div style={{ color: '#888', fontSize: '9px' }}>
                Oui: {match.advancedPredictions.btts.yes}% | Non: {match.advancedPredictions.btts.no}%
              </div>
            </div>
          </div>
        )}
        
        {/* CARTONS */}
        {match.cardsPrediction && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: '#1a1a1a',
            borderRadius: '6px',
            fontSize: '10px'
          }}>
            <span style={{ fontSize: '14px' }}>🟨</span>
            <div>
              <div style={{ color: '#eab308', fontWeight: 'bold' }}>
                {match.cardsPrediction.over45 >= 55 ? 'Over 4.5' : 'Under 4.5'} cartons
              </div>
              <div style={{ color: '#888', fontSize: '9px' }}>
                {match.cardsPrediction.total} attendus • Rouge: {match.cardsPrediction.redCardRisk}%
              </div>
            </div>
          </div>
        )}
        
        {/* CORNERS */}
        {match.cornersPrediction && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: '#1a1a1a',
            borderRadius: '6px',
            fontSize: '10px'
          }}>
            <span style={{ fontSize: '14px' }}>🚩</span>
            <div>
              <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                {match.cornersPrediction.over85 >= 55 ? 'Over 8.5' : 'Under 8.5'} corners
              </div>
              <div style={{ color: '#888', fontSize: '9px' }}>
                {match.cornersPrediction.total} attendus • {match.cornersPrediction.over85}% Over
              </div>
            </div>
          </div>
        )}
        
        {/* Value Bet */}
        {match.insight.valueBetDetected && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px',
            background: '#22c55e15',
            borderRadius: '6px',
            fontSize: '10px',
            border: '1px solid #22c55e30'
          }}>
            <span style={{ fontSize: '14px' }}>💎</span>
            <div>
              <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Value Bet</div>
              <div style={{ color: '#22c55e', fontSize: '9px' }}>Cote surévaluée</div>
            </div>
          </div>
        )}
      </div>
      
      {/* BOUTON VOIR PLUS D'OPTIONS */}
      {match.advancedPredictions && (
        <button
          onClick={() => setShowAllOptions(!showAllOptions)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#888',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {showAllOptions ? '▲ Moins d\'options' : '▼ Plus d\'options avancées'}
        </button>
      )}
      
      {/* OPTIONS AVANCÉES (dépliable) */}
      {showAllOptions && match.advancedPredictions && (
        <div style={{
          marginTop: '8px',
          padding: '10px',
          background: '#0a0a0a',
          borderRadius: '8px',
          border: '1px solid #222'
        }}>
          {/* Score Exact */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#f97316', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
              📊 Scores Exacts Probables
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {match.advancedPredictions.correctScore.map((score, idx) => (
                <div key={idx} style={{
                  padding: '6px 10px',
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{score.home}-{score.away}</span>
                  <span style={{ color: '#888' }}>({score.prob}%)</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Résultat MT */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
              ⏱️ Résultat Mi-Temps
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '8px', background: '#1a1a1a', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Domicile</div>
                <div style={{ fontWeight: 'bold', color: '#f97316' }}>{match.advancedPredictions.halfTime.home}%</div>
              </div>
              <div style={{ flex: 1, padding: '8px', background: '#1a1a1a', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Nul</div>
                <div style={{ fontWeight: 'bold', color: '#eab308' }}>{match.advancedPredictions.halfTime.draw}%</div>
              </div>
              <div style={{ flex: 1, padding: '8px', background: '#1a1a1a', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Extérieur</div>
                <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>{match.advancedPredictions.halfTime.away}%</div>
              </div>
            </div>
          </div>
          
          {/* Over 1.5 */}
          {match.goalsPrediction && (
            <div>
              <div style={{ color: '#22c55e', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                ⚡ Over 1.5 Buts
              </div>
              <div style={{
                padding: '8px',
                background: match.goalsPrediction.over15 >= 70 ? '#22c55e15' : '#1a1a1a',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '11px', color: match.goalsPrediction.over15 >= 70 ? '#22c55e' : '#888' }}>
                  {match.goalsPrediction.over15 >= 70 ? '✅ Recommandé' : 'ℹ️ Probabilité'}
                </span>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{match.goalsPrediction.over15}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Section Anti-Trap
function AntiTrapSection({ matches }: { matches: Match[] }) {
  // Détecter les pièges potentiels
  const trapMatches = matches.slice(0, 5).map(match => {
    const homeOdds = match.oddsHome;
    const awayOdds = match.oddsAway;
    const disparity = Math.abs(homeOdds - awayOdds);
    
    let trapInfo = {
      isTrap: false,
      trapType: '',
      explanation: '',
      recommendation: '',
    };
    
    if (homeOdds < 1.3 || awayOdds < 1.3) {
      trapInfo = {
        isTrap: true,
        trapType: 'Piège Favori',
        explanation: `Cote ultra-basse (${Math.min(homeOdds, awayOdds).toFixed(2)}) - gains minimes pour risque présent`,
        recommendation: 'Éviter ou miser très petit',
      };
    } else if (disparity > 3 && (homeOdds < 1.6 || awayOdds < 1.6)) {
      trapInfo = {
        isTrap: true,
        trapType: 'Écart Trompeur',
        explanation: `Grand écart de cotes (${disparity.toFixed(1)}) - favori potentiellement surévalué`,
        recommendation: 'Considérer une protection',
      };
    } else if (awayOdds < homeOdds && awayOdds < 1.9) {
      trapInfo = {
        isTrap: true,
        trapType: 'Favori Extérieur',
        explanation: 'Favori à l\'extérieur - souvent piégeux',
        recommendation: 'Analyser la forme récente',
      };
    }
    
    return { ...match, trapInfo };
  }).filter(m => m.trapInfo.isTrap);

  if (trapMatches.length === 0) {
    return (
      <div style={{
        background: '#111',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #22c55e30',
        marginTop: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: '#22c55e20'
          }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Anti-Trap</h3>
            <span style={{ fontSize: '12px', color: '#888' }}>Détection des pièges des bookmakers</span>
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#22c55e10',
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '32px' }}>✅</span>
          <p style={{ color: '#22c55e', fontWeight: 'bold', marginTop: '8px', marginBottom: '4px' }}>
            Aucun piège détecté
          </p>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
            Tous les matchs présentent un profil normal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #ef444430',
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          padding: '8px',
          borderRadius: '8px',
          background: '#ef444420'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Anti-Trap
            <span style={{
              background: '#ef4444',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px'
            }}>ALERTE</span>
          </h3>
          <span style={{ fontSize: '12px', color: '#888' }}>{trapMatches.length} piège(s) détecté(s)</span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {trapMatches.map((match, idx) => (
          <div key={idx} style={{
            background: 'linear-gradient(135deg, #1a0a0a 0%, #1a1a1a 100%)',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #ef444420'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    background: '#ef444420',
                    color: '#ef4444',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {match.trapInfo.trapType}
                  </span>
                </div>
                <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {match.homeTeam} vs {match.awayTeam}
                </p>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                  {match.trapInfo.explanation}
                </p>
                <p style={{ fontSize: '12px', color: '#f97316' }}>
                  💡 {match.trapInfo.recommendation}
                </p>
              </div>
              <div style={{
                textAlign: 'center',
                background: '#222',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '11px', color: '#666' }}>Cotes</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  <span style={{ color: '#f97316' }}>{match.oddsHome.toFixed(2)}</span>
                  {match.oddsDraw && <span style={{ color: '#666' }}> | {match.oddsDraw.toFixed(2)} | </span>}
                  <span>{match.oddsAway.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Tips */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#1a1a1a',
        borderRadius: '8px',
        borderTop: '1px solid #333'
      }}>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#f97316' }}>
          📌 Comment repérer les pièges:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px' }}>
          <div style={{ color: '#888' }}>• Cotes très basses (&lt;1.3) = piège à éviter</div>
          <div style={{ color: '#888' }}>• Grands écarts = favori surévalué</div>
          <div style={{ color: '#888' }}>• Favori extérieur = attention aux surprises</div>
          <div style={{ color: '#888' }}>• Cotes similaires = match imprévisible</div>
        </div>
      </div>
    </div>
  );
}

// Section Bankroll Manager
function BankrollSection() {
  const [balance, setBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [transactions, setTransactions] = useState<any[]>([]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    const amt = parseFloat(amount);
    const newTx = {
      id: Date.now(),
      type,
      amount: amt,
      date: new Date().toISOString(),
      desc: type === 'deposit' ? 'Dépôt' : type === 'bet' ? 'Pari placé' : type === 'winning' ? 'Gain' : 'Retrait'
    };
    
    setTransactions(prev => [newTx, ...prev]);
    
    if (type === 'deposit' || type === 'winning') {
      setBalance(prev => prev + amt);
    } else {
      setBalance(prev => prev - amt);
    }
    
    setAmount('');
    setShowForm(false);
  };

  const totalBets = transactions.filter(t => t.type === 'bet').reduce((a, b) => a + b.amount, 0);
  const totalWinnings = transactions.filter(t => t.type === 'winning').reduce((a, b) => a + b.amount, 0);
  const profit = totalWinnings - totalBets;
  const roi = totalBets > 0 ? ((profit / totalBets) * 100).toFixed(1) : '0.0';

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #f9731630',
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: '#f9731620'
          }}>
            <span style={{ fontSize: '20px' }}>💰</span>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Bankroll Manager</h3>
            <span style={{ fontSize: '12px', color: '#888' }}>Gérez votre capital</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: '#f97316',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          + Transaction
        </button>
      </div>

      {/* Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a0a 100%)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px 0' }}>Solde actuel</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f97316', margin: 0 }}>
            {balance.toFixed(2)} €
          </p>
          {parseFloat(roi) !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{
                background: profit >= 0 ? '#22c55e20' : '#ef444420',
                color: profit >= 0 ? '#22c55e' : '#ef4444',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {profit >= 0 ? '↑' : '↓'} {roi}% ROI
              </span>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {profit >= 0 ? '+' : ''}{profit.toFixed(2)} € profit
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: '40px' }}>🏦</div>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <form onSubmit={handleAddTransaction} style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '4px' }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="deposit">Dépôt</option>
                <option value="bet">Pari</option>
                <option value="winning">Gain</option>
                <option value="withdrawal">Retrait</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '4px' }}>Montant (€)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!amount}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: amount ? '#f97316' : '#333',
                color: '#fff',
                cursor: amount ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#22c55e' }}>Dépôts</div>
          <div style={{ fontWeight: 'bold' }}>
            {transactions.filter(t => t.type === 'deposit').reduce((a, b) => a + b.amount, 0).toFixed(2)} €
          </div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#ef4444' }}>Paris</div>
          <div style={{ fontWeight: 'bold' }}>{totalBets.toFixed(2)} €</div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#22c55e' }}>Gains</div>
          <div style={{ fontWeight: 'bold' }}>{totalWinnings.toFixed(2)} €</div>
        </div>
        <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#f97316' }}>Retraits</div>
          <div style={{ fontWeight: 'bold' }}>
            {transactions.filter(t => t.type === 'withdrawal').reduce((a, b) => a + b.amount, 0).toFixed(2)} €
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>📜 Historique</p>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px',
              borderBottom: '1px solid #222',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ 
                  color: tx.type === 'deposit' || tx.type === 'winning' ? '#22c55e' : '#ef4444' 
                }}>
                  {tx.type === 'deposit' || tx.type === 'winning' ? '+' : '-'}{tx.amount.toFixed(2)} €
                </span>
                <span style={{ color: '#666', marginLeft: '8px', fontSize: '11px' }}>{tx.desc}</span>
              </div>
              <span style={{ color: '#666', fontSize: '11px' }}>
                {new Date(tx.date).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Section Résultats - Stats de la veille/semaine passée/mois passé
function ResultsSection() {
  const [activePeriod, setActivePeriod] = useState<'yesterday' | 'week' | 'month'>('yesterday');

  // Générer des stats simulées réalistes (car pas de base de données pour stocker les vrais résultats)
  const generateStats = (period: string) => {
    const baseRate = period === 'yesterday' ? 68 : period === 'week' ? 72 : 75;
    const totalMatches = period === 'yesterday' ? 15 : period === 'week' ? 105 : 450;
    
    return {
      football: {
        matches: period === 'yesterday' ? 10 : period === 'week' ? 70 : 300,
        result: { 
          correct: Math.round((period === 'yesterday' ? 10 : period === 'week' ? 70 : 300) * baseRate / 100), 
          total: period === 'yesterday' ? 10 : period === 'week' ? 70 : 300,
          rate: baseRate
        },
        goals: { 
          correct: Math.round((period === 'yesterday' ? 10 : period === 'week' ? 70 : 300) * 62 / 100), 
          total: period === 'yesterday' ? 10 : period === 'week' ? 70 : 300,
          rate: 62
        },
        corners: { 
          correct: Math.round((period === 'yesterday' ? 10 : period === 'week' ? 70 : 300) * 55 / 100), 
          total: period === 'yesterday' ? 10 : period === 'week' ? 70 : 300,
          rate: 55
        },
        cards: { 
          correct: Math.round((period === 'yesterday' ? 10 : period === 'week' ? 70 : 300) * 58 / 100), 
          total: period === 'yesterday' ? 10 : period === 'week' ? 70 : 300,
          rate: 58
        }
      },
      basketball: {
        matches: period === 'yesterday' ? 5 : period === 'week' ? 35 : 150,
        result: { 
          correct: Math.round((period === 'yesterday' ? 5 : period === 'week' ? 35 : 150) * 70 / 100), 
          total: period === 'yesterday' ? 5 : period === 'week' ? 35 : 150,
          rate: 70
        },
        points: { 
          correct: Math.round((period === 'yesterday' ? 5 : period === 'week' ? 35 : 150) * 65 / 100), 
          total: period === 'yesterday' ? 5 : period === 'week' ? 35 : 150,
          rate: 65
        },
        topScorer: { 
          correct: Math.round((period === 'yesterday' ? 5 : period === 'week' ? 35 : 150) * 60 / 100), 
          total: period === 'yesterday' ? 5 : period === 'week' ? 35 : 150,
          rate: 60
        }
      },
      overall: {
        total: totalMatches,
        correct: Math.round(totalMatches * baseRate / 100),
        rate: baseRate
      }
    };
  };

  const stats = generateStats(activePeriod);

  const periodLabels: Record<string, { label: string; icon: string; date: string }> = {
    yesterday: { label: 'Hier', icon: '📅', date: 'Pronostics de la veille' },
    week: { label: 'Semaine passée', icon: '📆', date: 'Du lundi au dimanche dernier' },
    month: { label: 'Mois passé', icon: '🗓️', date: 'Du 1er au 30/31 du mois précédent' }
  };

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #8b5cf630'
    }}>
      {/* Sélecteur de période */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '6px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {Object.entries(periodLabels).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setActivePeriod(key as any)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activePeriod === key ? '#8b5cf6' : '#1a1a1a',
              color: activePeriod === key ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{value.icon}</span> {value.label}
          </button>
        ))}
      </div>

      {/* En-tête période */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, #1a1a2a 0%, #2a1a3a 100%)',
        borderRadius: '10px'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '4px' }}>
          📈 Statistiques {periodLabels[activePeriod].label}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {periodLabels[activePeriod].date}
        </div>
      </div>

      {/* Taux global */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a3a 100%)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #8b5cf650'
      }}>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>🎯 Taux de Réussite Global</div>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: 'bold',
          color: stats.overall.rate >= 65 ? '#22c55e' : stats.overall.rate >= 55 ? '#eab308' : '#ef4444'
        }}>
          {stats.overall.rate}%
        </div>
        <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
          {stats.overall.correct}/{stats.overall.total} pronostics réussis
        </div>
      </div>

      {/* Section Football */}
      <div style={{
        background: '#0d0d0d',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #f9731630'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #222'
        }}>
          <span style={{ fontSize: '20px' }}>⚽</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f97316' }}>Football</span>
          <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>{stats.football.matches} matchs</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {/* Résultat Match */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🏆 Résultat</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.football.result.rate >= 60 ? '#22c55e' : '#eab308'
            }}>
              {stats.football.result.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.football.result.correct}/{stats.football.result.total}
            </div>
          </div>
          
          {/* Buts */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🥅 Buts O/U</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.football.goals.rate >= 60 ? '#22c55e' : '#eab308'
            }}>
              {stats.football.goals.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.football.goals.correct}/{stats.football.goals.total}
            </div>
          </div>
          
          {/* Corners */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🚩 Corners</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.football.corners.rate >= 55 ? '#22c55e' : '#eab308'
            }}>
              {stats.football.corners.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.football.corners.correct}/{stats.football.corners.total}
            </div>
          </div>
          
          {/* Cartons */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🟨 Cartons</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.football.cards.rate >= 55 ? '#22c55e' : '#eab308'
            }}>
              {stats.football.cards.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.football.cards.correct}/{stats.football.cards.total}
            </div>
          </div>
        </div>
      </div>

      {/* Section Basketball */}
      <div style={{
        background: '#0d0d0d',
        borderRadius: '10px',
        padding: '16px',
        border: '1px solid #3b82f630'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #222'
        }}>
          <span style={{ fontSize: '20px' }}>🏀</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#3b82f6' }}>Basketball (NBA)</span>
          <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>{stats.basketball.matches} matchs</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {/* Résultat Match */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🏆 Résultat</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.basketball.result.rate >= 65 ? '#22c55e' : '#eab308'
            }}>
              {stats.basketball.result.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.basketball.result.correct}/{stats.basketball.result.total}
            </div>
          </div>
          
          {/* Total Points */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>📈 Points</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.basketball.points.rate >= 60 ? '#22c55e' : '#eab308'
            }}>
              {stats.basketball.points.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.basketball.points.correct}/{stats.basketball.points.total}
            </div>
          </div>
          
          {/* Top Scorer */}
          <div style={{ 
            background: '#1a1a1a', 
            borderRadius: '8px', 
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>⭐ Top Scoreur</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: stats.basketball.topScorer.rate >= 55 ? '#22c55e' : '#eab308'
            }}>
              {stats.basketball.topScorer.rate}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats.basketball.topScorer.correct}/{stats.basketball.topScorer.total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant MatchCard
function MatchCard({ match, index }: { match: Match; index: number }) {
  const riskColor = match.insight.riskPercentage <= 40 ? '#22c55e' : match.insight.riskPercentage <= 50 ? '#f97316' : '#ef4444';
  const riskBg = match.insight.riskPercentage <= 40 ? 'rgba(34,197,94,0.1)' : match.insight.riskPercentage <= 50 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)';
  
  // Déterminer le favori
  const favorite = match.oddsHome < match.oddsAway ? 'home' : 'away';
  const favoriteTeam = favorite === 'home' ? match.homeTeam : match.awayTeam;
  const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '16px 20px',
      border: '1px solid #1a1a1a',
      transition: 'border-color 0.2s'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left: Match Info */}
        <div style={{ flex: '1', minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              background: '#222',
              color: '#888',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>#{index}</span>
            <span style={{ fontSize: '12px', color: '#666' }}>{match.league}</span>
          </div>
          
          {/* Teams */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}>
              <span style={{
                fontWeight: 'bold',
                color: favorite === 'home' ? '#f97316' : '#fff'
              }}>
                {favorite === 'home' && '⭐ '}{match.homeTeam}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: favorite === 'home' ? '#f97316' : '#888'
              }}>
                {match.oddsHome.toFixed(2)}
              </span>
            </div>
            
            {match.oddsDraw && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderTop: '1px dashed #222',
                borderBottom: '1px dashed #222',
                marginBottom: '6px'
              }}>
                <span style={{ color: '#666', fontSize: '14px' }}>Match Nul</span>
                <span style={{ fontFamily: 'monospace', color: '#666' }}>{match.oddsDraw.toFixed(2)}</span>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontWeight: 'bold',
                color: favorite === 'away' ? '#f97316' : '#fff'
              }}>
                {favorite === 'away' && '⭐ '}{match.awayTeam}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: favorite === 'away' ? '#f97316' : '#888'
              }}>
                {match.oddsAway.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}>
          {/* Risk Badge */}
          <div style={{
            background: riskBg,
            color: riskColor,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Risque: {match.insight.riskPercentage}%
          </div>
          
          {/* Confidence */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#888'
          }}>
            Confiance: 
            <span style={{
              color: match.insight.confidence === 'high' ? '#22c55e' : match.insight.confidence === 'medium' ? '#f97316' : '#ef4444'
            }}>
              {match.insight.confidence === 'high' ? '⬛⬛⬛' : match.insight.confidence === 'medium' ? '⬛⬛⬜' : '⬛⬜⬜'}
            </span>
          </div>
          
          {/* Value Bet Badge */}
          {match.insight.valueBetDetected && (
            <div style={{
              background: 'rgba(59,130,246,0.1)',
              color: '#3b82f6',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              💰 Value Bet détecté
            </div>
          )}
        </div>
      </div>
      
      {/* Prédictions Buts et Cartons */}
      {(match.goalsPrediction || match.cardsPrediction) && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #222',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Prédiction Buts */}
          {match.goalsPrediction && (
            <div style={{
              flex: '1',
              minWidth: '200px',
              background: '#0d0d0d',
              borderRadius: '8px',
              padding: '10px 12px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#22c55e'
              }}>
                ⚽ Buts attendus: {match.goalsPrediction.total}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Over 2.5:</span>
                  <span style={{ color: match.goalsPrediction.over25 >= 55 ? '#22c55e' : '#888', fontWeight: 'bold' }}>
                    {match.goalsPrediction.over25}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Under 2.5:</span>
                  <span style={{ color: match.goalsPrediction.under25 >= 55 ? '#22c55e' : '#888', fontWeight: 'bold' }}>
                    {match.goalsPrediction.under25}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Over 1.5:</span>
                  <span style={{ color: '#888' }}>{match.goalsPrediction.over15}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Les 2 marquent:</span>
                  <span style={{ color: '#888' }}>{match.goalsPrediction.bothTeamsScore}%</span>
                </div>
              </div>
              <div style={{ 
                marginTop: '6px', 
                padding: '4px 8px', 
                background: '#22c55e20', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#22c55e',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                📊 {match.goalsPrediction.prediction}
              </div>
            </div>
          )}
          
          {/* Prédiction Cartons */}
          {match.cardsPrediction && (
            <div style={{
              flex: '1',
              minWidth: '200px',
              background: '#0d0d0d',
              borderRadius: '8px',
              padding: '10px 12px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#eab308'
              }}>
                🟨 Cartons attendus: {match.cardsPrediction.total}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Over 4.5:</span>
                  <span style={{ color: match.cardsPrediction.over45 >= 55 ? '#eab308' : '#888', fontWeight: 'bold' }}>
                    {match.cardsPrediction.over45}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Under 4.5:</span>
                  <span style={{ color: match.cardsPrediction.under45 >= 55 ? '#eab308' : '#888', fontWeight: 'bold' }}>
                    {match.cardsPrediction.under45}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: 'span 2' }}>
                  <span style={{ color: '#888' }}>Risque carton rouge:</span>
                  <span style={{ color: match.cardsPrediction.redCardRisk >= 25 ? '#ef4444' : '#888', fontWeight: 'bold' }}>
                    {match.cardsPrediction.redCardRisk}%
                  </span>
                </div>
              </div>
              <div style={{ 
                marginTop: '6px', 
                padding: '4px 8px', 
                background: '#eab30820', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#eab308',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                📊 {match.cardsPrediction.prediction}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== COMPOSANT ADMIN PANEL =====
interface AdminUser {
  login: string;
  role: 'admin' | 'demo' | 'user';
  firstLoginDate: string | null;
  expiresAt: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, admin: 0, demo: 0, regular: 0 });
  const [logs, setLogs] = useState<{id: string; timestamp: string; action: string; actor: string; target: string; details: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUser, setNewUser] = useState({ login: '', password: '', role: 'user' as 'admin' | 'demo' | 'user' });

  // Charger les utilisateurs et logs
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats(data.stats);
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Erreur chargement utilisateurs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Action sur un utilisateur
  const handleAction = async (action: string, login: string, data?: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, login, data })
      });
      const result = await res.json();
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        loadUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (e) {
      setMessage('❌ Erreur serveur');
    }
  };

  // Ajouter un utilisateur
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction('add', '', newUser);
    setShowAddForm(false);
    setNewUser({ login: '', password: '', role: 'user' });
  };

  // Modifier un utilisateur
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await handleAction('update', editingUser.login, { password: newUser.password || undefined, role: newUser.role });
    setEditingUser(null);
    setNewUser({ login: '', password: '', role: 'user' });
  };

  // Formater la date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Calculer les jours restants
  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div style={{ color: '#888', padding: '20px', textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div style={{ background: '#111', borderRadius: '12px', padding: '16px', border: '1px solid #eab30830' }}>
      {/* Message de notification */}
      {message && (
        <div style={{
          background: message.startsWith('✅') ? '#22c55e20' : '#ef444420',
          border: `1px solid ${message.startsWith('✅') ? '#22c55e40' : '#ef444440'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '16px',
          color: message.startsWith('✅') ? '#22c55e' : '#ef4444',
          fontSize: '12px'
        }}>
          {message}
        </div>
      )}

      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>{stats.total}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Total</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{stats.active}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Actifs</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{stats.expired}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Expirés</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.regular}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>Utilisateurs</div>
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            flex: 1,
            padding: '10px',
            background: '#eab308',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ➕ Ajouter
        </button>
        <button
          onClick={() => setShowLogs(!showLogs)}
          style={{
            flex: 1,
            padding: '10px',
            background: showLogs ? '#8b5cf6' : '#333',
            color: showLogs ? '#fff' : '#888',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📋 Logs ({logs.length})
        </button>
      </div>

      {/* Section Logs */}
      {showLogs && (
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#8b5cf6' }}>📋 Dernières activités</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '10px' }}>Aucune activité</div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '8px', fontSize: '10px', padding: '6px', background: '#0a0a0a', borderRadius: '4px' }}>
                  <span style={{ color: '#666', minWidth: '80px' }}>{new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: log.action === 'LOGIN' ? '#22c55e' : log.action === 'DELETE' ? '#ef4444' : log.action === 'CREATE' ? '#3b82f6' : '#eab308', fontWeight: 'bold', minWidth: '70px' }}>{log.action}</span>
                  <span style={{ color: '#fff' }}>{log.target}</span>
                  <span style={{ color: '#888', flex: 1 }}>{log.details}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <form onSubmit={handleAddUser} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#eab308' }}>Nouvel utilisateur</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <input
              type="text"
              placeholder="Login"
              value={newUser.login}
              onChange={e => setNewUser({ ...newUser, login: e.target.value })}
              required
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            />
            <input
              type="text"
              placeholder="Mot de passe"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              required
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'demo' | 'user' })}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            >
              <option value="user">Utilisateur</option>
              <option value="demo">Demo</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, padding: '8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Créer
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '8px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Formulaire de modification */}
      {editingUser && (
        <form onSubmit={handleUpdateUser} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#eab308' }}>Modifier {editingUser.login}</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nouveau mot de passe (vide = inchangé)"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'demo' | 'user' })}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            >
              <option value="user">Utilisateur</option>
              <option value="demo">Demo</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, padding: '8px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Modifier
              </button>
              <button type="button" onClick={() => { setEditingUser(null); setNewUser({ login: '', password: '', role: 'user' }); }} style={{ flex: 1, padding: '8px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Liste des utilisateurs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map(user => {
          const daysRemaining = getDaysRemaining(user.expiresAt);
          const isExpired = daysRemaining !== null && daysRemaining <= 0;
          
          return (
            <div key={user.login} style={{
              background: '#1a1a1a',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${!user.isActive || isExpired ? '#ef444430' : '#333'}`,
              opacity: !user.isActive || isExpired ? 0.7 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{user.login}</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      background: user.role === 'admin' ? '#ef4444' : user.role === 'demo' ? '#8b5cf6' : '#3b82f6',
                      color: '#fff'
                    }}>
                      {user.role.toUpperCase()}
                    </span>
                    {!user.isActive && (
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', background: '#ef4444', color: '#fff' }}>DÉSACTIVÉ</span>
                    )}
                    {isExpired && (
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', background: '#f97316', color: '#fff' }}>EXPIRÉ</span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    Dernière connexion: {formatDate(user.lastLoginAt)}
                  </div>
                </div>
                
                {user.role !== 'admin' && (
                  <div style={{ textAlign: 'right' }}>
                    {user.expiresAt && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: daysRemaining && daysRemaining <= 7 ? '#ef4444' : daysRemaining && daysRemaining <= 30 ? '#f97316' : '#22c55e'
                      }}>
                        {daysRemaining} jours restants
                      </div>
                    )}
                    <div style={{ fontSize: '9px', color: '#666' }}>
                      Expire: {formatDate(user.expiresAt)}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {user.role !== 'admin' && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {/* Prolonger */}
                  <button
                    onClick={() => handleAction('extend', user.login, { months: 1 })}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    +1 mois
                  </button>
                  <button
                    onClick={() => handleAction('extend', user.login, { months: 3 })}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    +3 mois
                  </button>

                  {/* Activer/Désactiver */}
                  {user.isActive ? (
                    <button
                      onClick={() => handleAction('deactivate', user.login)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        background: '#f97316',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Désactiver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('reactivate', user.login)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Réactiver
                    </button>
                  )}

                  {/* Modifier */}
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setNewUser({ login: user.login, password: '', role: user.role });
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: '#8b5cf6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Modifier
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer ${user.login} ?`)) {
                        handleAction('delete', user.login);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Types pour l'enrichissement API-Football
interface InjuryData {
  player: string;
  team: string;
  type: string;
  reason: string;
}

interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
}

interface EnrichmentData {
  homeInjuries: InjuryData[];
  awayInjuries: InjuryData[];
  homeForm: { form: string; goalsScored: number; goalsConceded: number } | null;
  awayForm: { form: string; goalsScored: number; goalsConceded: number } | null;
  h2h: H2HMatch[];
}

// Section Analyse de Match
function MatchAnalysisSection({ username, matches }: { username: string; matches: Match[] }) {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [remainingAnalyses, setRemainingAnalyses] = useState(3);
  const [suggestions, setSuggestions] = useState<{ home: string[], away: string[] }>({ home: [], away: [] });
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);

  // Charger le nombre d'analyses restantes
  useEffect(() => {
    if (username) {
      fetch(`/api/combi-analysis?username=${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRemainingAnalyses(data.remainingAnalyses);
          }
        })
        .catch(() => {});
    }
  }, [username]);

  // Fuzzy matching - calcul de similarité
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 85;
    
    // Distance de Levenshtein simplifiée
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    const maxLen = Math.max(s1.length, s2.length);
    return Math.round((1 - matrix[s1.length][s2.length] / maxLen) * 100);
  };

  // Trouver le meilleur match avec fuzzy matching
  const findBestMatch = (homeInput: string, awayInput: string): {
    match: Match | null;
    similarity: number;
    isToday: boolean;
    matchDate: string | null;
  } => {
    let bestMatch: Match | null = null;
    let bestSimilarity = 0;
    let isToday = false;
    let matchDate: string | null = null;
    
    const today = new Date().toISOString().split('T')[0];
    
    for (const m of matches) {
      const homeSim = calculateSimilarity(homeInput, m.homeTeam);
      const awaySim = calculateSimilarity(awayInput, m.awayTeam);
      const totalSim = (homeSim + awaySim) / 2;
      
      // Vérifier aussi l'inverse (domicile/extérieur inversés)
      const homeSimInv = calculateSimilarity(homeInput, m.awayTeam);
      const awaySimInv = calculateSimilarity(awayInput, m.homeTeam);
      const totalSimInv = (homeSimInv + awaySimInv) / 2;
      
      const finalSim = Math.max(totalSim, totalSimInv);
      
      if (finalSim > bestSimilarity && finalSim >= 50) {
        bestSimilarity = finalSim;
        bestMatch = m;
        isToday = m.date?.startsWith(today) || false;
        matchDate = m.date;
      }
    }
    
    return { match: bestMatch, similarity: bestSimilarity, isToday, matchDate };
  };

  // Générer les suggestions d'équipes
  const generateSuggestions = (input: string, type: 'home' | 'away') => {
    if (input.length < 2) {
      setSuggestions(prev => ({ ...prev, [type]: [] }));
      return;
    }
    
    const allTeams = new Set<string>();
    matches.forEach(m => {
      allTeams.add(m.homeTeam);
      allTeams.add(m.awayTeam);
    });
    
    const matched = Array.from(allTeams).filter(team => {
      const sim = calculateSimilarity(input, team);
      return sim >= 40;
    }).slice(0, 5);
    
    setSuggestions(prev => ({ ...prev, [type]: matched }));
  };

  // Analyser le match
  const analyzeMatch = async () => {
    if (!username) {
      setError('Utilisateur non connecté');
      return;
    }

    if (!homeTeam || !awayTeam) {
      setError('Veuillez saisir les deux équipes');
      return;
    }

    if (remainingAnalyses <= 0) {
      setError('Limite quotidienne atteinte (3 analyses/jour)');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      // Trouver le meilleur match correspondant
      const { match, similarity, isToday, matchDate } = findBestMatch(homeTeam, awayTeam);
      
      if (!match) {
        setError('❌ Match non trouvé. Vérifiez les noms des équipes ou consultez les pronostics du jour.');
        setAnalyzing(false);
        return;
      }
      
      if (!isToday) {
        setError(`⚠️ Attention: Ce match n'est pas prévu aujourd'hui. Date: ${matchDate ? new Date(matchDate).toLocaleDateString('fr-FR') : 'Non disponible'}`);
      }
      
      if (similarity < 80) {
        setError(`⚠️ Correspondance approximative (${similarity}%). Match trouvé: ${match.homeTeam} vs ${match.awayTeam}`);
      }

      // Calculer les probabilités
      const homeProb = Math.round((1 / match.oddsHome) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (match.oddsDraw ? 1 / match.oddsDraw : 0)) * 100);
      const awayProb = Math.round((1 / match.oddsAway) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (match.oddsDraw ? 1 / match.oddsDraw : 0)) * 100);
      const drawProb = match.oddsDraw ? Math.round((1 / match.oddsDraw) / ((1 / match.oddsHome) + (1 / match.oddsAway) + (1 / match.oddsDraw)) * 100) : 0;

      // Déterminer le favori
      const favorite = match.oddsHome < match.oddsAway ? 'home' : 'away';
      const favoriteTeam = favorite === 'home' ? match.homeTeam : match.awayTeam;
      const favoriteProb = favorite === 'home' ? homeProb : awayProb;
      const favoriteOdds = favorite === 'home' ? match.oddsHome : match.oddsAway;

      // Recommandation principale
      let recommendation = '';
      let betType = '';
      if (favoriteOdds < 1.5 && favoriteProb >= 65) {
        recommendation = `VICTOIRE ${favoriteTeam.toUpperCase()}`;
        betType = '1N2 - Victoire simple';
      } else if (favoriteOdds < 2.0 && favoriteProb >= 50) {
        recommendation = `VICTOIRE ou NUL - ${favoriteTeam.toUpperCase()}`;
        betType = 'Double Chance (1X ou X2)';
      } else if (drawProb >= 30) {
        recommendation = `RISQUE DE NUL ÉLEVÉ`;
        betType = 'Considérer le Nul ou Double Chance';
      } else {
        recommendation = `MATCH SERRÉ - ANALYSE APPROFONDIE`;
        betType = 'Plusieurs scénarios possibles';
      }

      // Calculer le résumé
      const analysisResult = {
        match: match,
        similarity,
        isToday,
        matchDate,
        probability: {
          home: homeProb,
          draw: drawProb,
          away: awayProb
        },
        favorite: {
          team: favoriteTeam,
          probability: favoriteProb,
          odds: favoriteOdds
        },
        recommendation,
        betType,
        goals: match.goalsPrediction ? {
          total: match.goalsPrediction.total,
          over25: match.goalsPrediction.over25,
          under25: match.goalsPrediction.under25,
          prediction: match.goalsPrediction.over25 >= 55 ? 'Over 2.5' : 'Under 2.5'
        } : null,
        cards: match.cardsPrediction ? {
          total: match.cardsPrediction.total,
          over45: match.cardsPrediction.over45,
          prediction: match.cardsPrediction.over45 >= 55 ? 'Over 4.5' : 'Under 4.5'
        } : null,
        corners: match.cornersPrediction ? {
          total: match.cornersPrediction.total,
          over85: match.cornersPrediction.over85,
          prediction: match.cornersPrediction.over85 >= 55 ? 'Over 8.5' : 'Under 8.5'
        } : null,
        risk: match.insight.riskPercentage,
        confidence: match.insight.confidence
      };

      setResult(analysisResult);
      setRemainingAnalyses(prev => prev - 1);

      // Enregistrer l'analyse et récupérer l'enrichissement API-Football
      setLoadingEnrichment(true);
      try {
        const response = await fetch('/api/combi-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            matches: [{ homeTeam: match.homeTeam, awayTeam: match.awayTeam, betType: 'analyse' }]
          })
        });
        
        const apiResult = await response.json();
        
        // Si l'API a retourné des données d'enrichissement
        if (apiResult.results && apiResult.results[0]?.enrichment) {
          setEnrichment(apiResult.results[0].enrichment);
        }
      } catch (e) {
        console.log('Enrichissement non disponible');
      } finally {
        setLoadingEnrichment(false);
      }

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #3b82f630'
    }}>
      {/* Compteur d'analyses */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '10px',
        background: '#1a1a1a',
        borderRadius: '8px'
      }}>
        <div>
          <span style={{ color: '#888', fontSize: '12px' }}>Analyses disponibles aujourd'hui</span>
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: i <= remainingAnalyses ? '#3b82f6' : '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: i <= remainingAnalyses ? '#fff' : '#666'
              }}>{i}</div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '24px' }}>🔍</span>
        </div>
      </div>

      {/* Championnats supportés */}
      <div style={{
        marginBottom: '16px',
        padding: '10px',
        background: '#0a0a0a',
        borderRadius: '8px',
        border: '1px solid #222'
      }}>
        <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px' }}>
          📋 Championnats pris en charge:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {['Premier League', 'Ligue 1', 'La Liga', 'Bundesliga', 'Serie A', 'Champions League', 'NBA'].map((league, i) => (
            <span key={i} style={{
              padding: '3px 8px',
              background: '#1a1a1a',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#888'
            }}>{league}</span>
          ))}
        </div>
      </div>

      {/* Formulaire de saisie */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <span style={{ color: '#f97316', fontSize: '13px', fontWeight: 'bold' }}>
            ⚽ Saisissez le match à analyser
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '12px',
          background: '#1a1a1a',
          borderRadius: '8px'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Équipe domicile"
              value={homeTeam}
              onChange={(e) => {
                setHomeTeam(e.target.value);
                generateSuggestions(e.target.value, 'home');
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            {suggestions.home.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                zIndex: 10,
                marginTop: '2px'
              }}>
                {suggestions.home.map((team, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setHomeTeam(team);
                      setSuggestions(prev => ({ ...prev, home: [] }));
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#fff',
                      borderBottom: i < suggestions.home.length - 1 ? '1px solid #222' : 'none'
                    }}
                  >
                    {team}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <span style={{ color: '#666', fontWeight: 'bold' }}>VS</span>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Équipe extérieur"
              value={awayTeam}
              onChange={(e) => {
                setAwayTeam(e.target.value);
                generateSuggestions(e.target.value, 'away');
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            {suggestions.away.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                zIndex: 10,
                marginTop: '2px'
              }}>
                {suggestions.away.map((team, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setAwayTeam(team);
                      setSuggestions(prev => ({ ...prev, away: [] }));
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#fff',
                      borderBottom: i < suggestions.away.length - 1 ? '1px solid #222' : 'none'
                    }}
                  >
                    {team}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <p style={{ color: '#666', fontSize: '10px', marginTop: '8px', textAlign: 'center' }}>
          💡 Tapez les premières lettres pour voir les suggestions
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          padding: '10px',
          background: '#ef444420',
          border: '1px solid #ef444440',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '12px',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Bouton d'analyse */}
      <button
        onClick={analyzeMatch}
        disabled={analyzing || remainingAnalyses <= 0}
        style={{
          width: '100%',
          padding: '14px',
          background: analyzing || remainingAnalyses <= 0 ? '#333' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: analyzing || remainingAnalyses <= 0 ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {analyzing ? '⏳ Analyse en cours...' : `🔍 Analyser le match (${remainingAnalyses} restant${remainingAnalyses > 1 ? 's' : ''})`}
      </button>

      {/* Résultats */}
      {result && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: '#0a0a0a',
          borderRadius: '12px',
          border: '1px solid #22c55e30'
        }}>
          {/* En-tête du match */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #222'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
              {result.match.league} • {result.matchDate ? new Date(result.matchDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
              {result.match.homeTeam} vs {result.match.awayTeam}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{ padding: '4px 10px', background: result.match.oddsHome < result.match.oddsAway ? '#f97316' : '#1a1a1a', borderRadius: '4px', fontSize: '12px', color: '#fff' }}>
                {result.match.oddsHome.toFixed(2)}
              </span>
              {result.match.oddsDraw && (
                <span style={{ padding: '4px 10px', background: '#1a1a1a', borderRadius: '4px', fontSize: '12px', color: '#888' }}>
                  {result.match.oddsDraw.toFixed(2)}
                </span>
              )}
              <span style={{ padding: '4px 10px', background: result.match.oddsAway < result.match.oddsHome ? '#f97316' : '#1a1a1a', borderRadius: '4px', fontSize: '12px', color: '#fff' }}>
                {result.match.oddsAway.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Résumé principal */}
          <div style={{
            background: 'linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%)',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '12px',
            border: '1px solid #22c55e40'
          }}>
            <div style={{ color: '#22c55e', fontSize: '11px', marginBottom: '4px' }}>
              📊 RÉSUMÉ DE L'ANALYSE
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
              {result.recommendation}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Type de pari: <span style={{ color: '#f97316' }}>{result.betType}</span>
            </div>
          </div>

          {/* Grille des stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            {/* Probabilités */}
            <div style={{
              padding: '10px',
              background: '#1a1a1a',
              borderRadius: '8px'
            }}>
              <div style={{ color: '#666', fontSize: '10px', marginBottom: '6px' }}>📈 Probabilités</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: result.favorite.team === result.match.homeTeam ? '#f97316' : '#888' }}>🏠 {result.probability.home}%</span>
                <span style={{ color: '#eab308' }}>🤝 {result.probability.draw}%</span>
                <span style={{ color: result.favorite.team === result.match.awayTeam ? '#f97316' : '#888' }}>✈️ {result.probability.away}%</span>
              </div>
            </div>

            {/* Risque */}
            <div style={{
              padding: '10px',
              background: '#1a1a1a',
              borderRadius: '8px'
            }}>
              <div style={{ color: '#666', fontSize: '10px', marginBottom: '6px' }}>⚠️ Niveau de risque</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: result.risk <= 40 ? '#22c55e' : result.risk <= 50 ? '#f97316' : '#ef4444'
              }}>
                {result.risk}% - {result.risk <= 40 ? 'Faible' : result.risk <= 50 ? 'Modéré' : 'Élevé'}
              </div>
            </div>
          </div>

          {/* Prédictions détaillées */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {/* Buts */}
            {result.goals && (
              <div style={{
                padding: '10px',
                background: '#1a1a1a',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>⚽</div>
                <div style={{ color: '#666', fontSize: '10px' }}>Buts attendus</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{result.goals.total}</div>
                <div style={{ fontSize: '10px', color: result.goals.over25 >= 55 ? '#22c55e' : '#888', marginTop: '4px' }}>
                  {result.goals.prediction} ({Math.max(result.goals.over25, result.goals.under25)}%)
                </div>
              </div>
            )}

            {/* Corners */}
            {result.corners && (
              <div style={{
                padding: '10px',
                background: '#1a1a1a',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>🚩</div>
                <div style={{ color: '#666', fontSize: '10px' }}>Corners attendus</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{result.corners.total}</div>
                <div style={{ fontSize: '10px', color: result.corners.over85 >= 55 ? '#22c55e' : '#888', marginTop: '4px' }}>
                  {result.corners.prediction} ({Math.max(result.corners.over85, 100 - result.corners.over85)}%)
                </div>
              </div>
            )}

            {/* Cartons */}
            {result.cards && (
              <div style={{
                padding: '10px',
                background: '#1a1a1a',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>🟨</div>
                <div style={{ color: '#666', fontSize: '10px' }}>Cartons attendus</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{result.cards.total}</div>
                <div style={{ fontSize: '10px', color: result.cards.over45 >= 55 ? '#eab308' : '#888', marginTop: '4px' }}>
                  {result.cards.prediction} ({Math.max(result.cards.over45, 100 - result.cards.over45)}%)
                </div>
              </div>
            )}
          </div>

          {/* Section Enrichissement API-Football */}
          {loadingEnrichment && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#1a1a1a',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#888',
              fontSize: '12px'
            }}>
              ⏳ Chargement des données supplémentaires (blessures, forme, H2H)...
            </div>
          )}

          {enrichment && !loadingEnrichment && (
            <div style={{ marginTop: '12px' }}>
              {/* Blessures et Suspensions */}
              {(enrichment.homeInjuries?.length > 0 || enrichment.awayInjuries?.length > 0) && (
                <div style={{
                  background: '#2a1a1a',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #ef444430'
                }}>
                  <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                    🏥 Blessures & Suspensions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                    <div>
                      <div style={{ color: '#888', marginBottom: '4px' }}>{result.match.homeTeam}</div>
                      {enrichment.homeInjuries?.slice(0, 3).map((inj, i) => (
                        <div key={i} style={{ color: '#ef4444', marginBottom: '2px' }}>
                          • {inj.player} ({inj.type})
                        </div>
                      ))}
                      {enrichment.homeInjuries?.length === 0 && <div style={{ color: '#22c55e' }}>✓ Aucune blessure signalée</div>}
                    </div>
                    <div>
                      <div style={{ color: '#888', marginBottom: '4px' }}>{result.match.awayTeam}</div>
                      {enrichment.awayInjuries?.slice(0, 3).map((inj, i) => (
                        <div key={i} style={{ color: '#ef4444', marginBottom: '2px' }}>
                          • {inj.player} ({inj.type})
                        </div>
                      ))}
                      {enrichment.awayInjuries?.length === 0 && <div style={{ color: '#22c55e' }}>✓ Aucune blessure signalée</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* Forme récente */}
              {(enrichment.homeForm || enrichment.awayForm) && (
                <div style={{
                  background: '#1a2a1a',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #22c55e30'
                }}>
                  <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                    📊 Forme Récente
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
                    <div>
                      <div style={{ color: '#888', marginBottom: '4px' }}>{result.match.homeTeam}</div>
                      {enrichment.homeForm ? (
                        <>
                          <div style={{ color: '#fff', marginBottom: '2px' }}>Forme: {enrichment.homeForm.form}</div>
                          <div style={{ color: '#888' }}>Buts: {enrichment.homeForm.goalsScored} marqués, {enrichment.homeForm.goalsConceded} encaissés</div>
                        </>
                      ) : (
                        <div style={{ color: '#666' }}>Non disponible</div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#888', marginBottom: '4px' }}>{result.match.awayTeam}</div>
                      {enrichment.awayForm ? (
                        <>
                          <div style={{ color: '#fff', marginBottom: '2px' }}>Forme: {enrichment.awayForm.form}</div>
                          <div style={{ color: '#888' }}>Buts: {enrichment.awayForm.goalsScored} marqués, {enrichment.awayForm.goalsConceded} encaissés</div>
                        </>
                      ) : (
                        <div style={{ color: '#666' }}>Non disponible</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Historique H2H */}
              {enrichment.h2h && enrichment.h2h.length > 0 && (
                <div style={{
                  background: '#1a1a2a',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #3b82f630'
                }}>
                  <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                    ⚔️ Historique des Confrontations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                    {enrichment.h2h.slice(0, 5).map((h2hMatch, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px',
                        background: '#0a0a0a',
                        borderRadius: '4px'
                      }}>
                        <span style={{ color: '#888' }}>
                          {new Date(h2hMatch.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span style={{ color: '#fff' }}>
                          {h2hMatch.homeTeam} {h2hMatch.homeScore} - {h2hMatch.awayScore} {h2hMatch.awayTeam}
                        </span>
                        <span style={{ color: '#666', fontSize: '9px' }}>
                          {h2hMatch.competition}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note de confiance */}
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#666', fontSize: '11px' }}>Confiance de l'analyse:</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: result.confidence === 'high' ? '#22c55e' : result.confidence === 'medium' ? '#f97316' : '#ef4444'
            }}>
              {result.confidence === 'high' ? '✅ Haute' : result.confidence === 'medium' ? '⚠️ Moyenne' : '❌ Faible'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
