'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // État simple pour gérer l'authentification
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
  return <AppDashboard onLogout={handleLogout} />;
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
function AppDashboard({ onLogout }: { onLogout: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'safes' | 'moderate' | 'risky' | 'all'>('safes');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [activeSection, setActiveSection] = useState<'matches' | 'antitrap' | 'bankroll' | 'results'>('matches');
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
  }, [onLogout]);

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

  // Filtrer les matchs
  const safes = matches.filter(m => m.insight.riskPercentage <= 40);
  const moderate = matches.filter(m => m.insight.riskPercentage > 40 && m.insight.riskPercentage <= 50);
  const risky = matches.filter(m => m.insight.riskPercentage > 50);
  const valueBets = matches.filter(m => m.insight.valueBetDetected);

  // Matchs à afficher selon l'onglet
  const displayedMatches = activeTab === 'safes' ? safes 
    : activeTab === 'moderate' ? moderate 
    : activeTab === 'risky' ? risky
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
        <NavButton icon="🛡️" label="Trap" active={activeSection === 'antitrap'} onClick={() => setActiveSection('antitrap')} color="#ef4444" />
        <NavButton icon="💰" label="Bank" active={activeSection === 'bankroll'} onClick={() => setActiveSection('bankroll')} color="#22c55e" />
        <NavButton icon="📊" label="Stats" active={activeSection === 'results'} onClick={() => setActiveSection('results')} color="#8b5cf6" />
        
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
              <TabButtonCompact active={activeTab === 'safes'} onClick={() => setActiveTab('safes')} icon="🛡️" count={safes.length} />
              <TabButtonCompact active={activeTab === 'moderate'} onClick={() => setActiveTab('moderate')} icon="⚠️" count={moderate.length} />
              <TabButtonCompact active={activeTab === 'risky'} onClick={() => setActiveTab('risky')} icon="🎯" count={risky.length} />
              <TabButtonCompact active={activeTab === 'all'} onClick={() => setActiveTab('all')} icon="📋" count={matches.length} />
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
function TabButtonCompact({ active, onClick, icon, count }: { active: boolean; onClick: () => void; icon: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: '6px',
        border: active ? '1px solid #f97316' : '1px solid #333',
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#888',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: active ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap'
      }}
    >
      <span>{icon}</span>
      <span>{count}</span>
    </button>
  );
}

// Composant MatchCardCompact
function MatchCardCompact({ match, index }: { match: Match; index: number }) {
  const riskColor = match.insight.riskPercentage <= 40 ? '#22c55e' : match.insight.riskPercentage <= 50 ? '#f97316' : '#ef4444';
  const riskLabel = match.insight.riskPercentage <= 40 ? 'Sûr' : match.insight.riskPercentage <= 50 ? 'Modéré' : 'Audacieux';
  
  // Générer les prédictions basées sur les cotes
  const totalOdds = match.oddsHome + (match.oddsDraw || 3.5) + match.oddsAway;
  const avgGoals = totalOdds < 8 ? 2.8 : totalOdds < 10 ? 2.5 : 2.2;
  const over25Prob = Math.round(45 + (avgGoals - 2.2) * 15);
  const bttsProb = Math.round(40 + Math.abs(match.oddsHome - match.oddsAway) * 5);
  
  // Cartons estimés
  const cardsEstimate = match.league.includes('Liga') || match.league.includes('Serie') ? 5.5 : 4.5;
  
  // Corners estimés
  const cornersEstimate = match.league.includes('Premier') ? 10.5 : 9.5;

  // Taux de réussite basé sur la confiance
  const baseSuccessRate = match.insight.confidence === 'high' ? 72 : match.insight.confidence === 'medium' ? 58 : 45;
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
          <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.homeTeam} vs {match.awayTeam}
          </div>
          <div style={{ color: '#666', fontSize: '10px' }}>
            {match.league} • {match.sport}
          </div>
        </div>
        
        {/* Odds */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <span style={{ padding: '3px 6px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>{match.oddsHome.toFixed(2)}</span>
          {match.oddsDraw && <span style={{ padding: '3px 6px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#888' }}>{match.oddsDraw.toFixed(2)}</span>}
          <span style={{ padding: '3px 6px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>{match.oddsAway.toFixed(2)}</span>
        </div>
        
        {/* Risk Percentage */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: riskColor, fontSize: '12px', fontWeight: 'bold' }}>{match.insight.riskPercentage}%</div>
          <div style={{ color: '#666', fontSize: '8px' }}>Risque</div>
        </div>
      </div>
      
      {/* Ligne des prédictions */}
      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        marginTop: '6px',
        paddingTop: '8px',
        borderTop: '1px solid #222'
      }}>
        {/* Buts */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 8px',
          background: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px'
        }}>
          <span>⚽</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: avgGoals >= 2.5 ? '#22c55e' : '#f97316', fontWeight: 'bold' }}>
              {avgGoals >= 2.5 ? `+${avgGoals.toFixed(1)} buts` : `-${(5 - avgGoals).toFixed(1)} buts`}
            </span>
            <span style={{ color: avgGoals >= 2.5 ? '#22c55e' : '#f97316', fontSize: '8px' }}>
              {avgGoals >= 2.5 ? 'Plus de buts' : 'Moins de buts'}
            </span>
            <span style={{ color: successColor, fontSize: '8px' }}>
              Réussite: {baseSuccessRate}%
            </span>
          </div>
        </div>
        
        {/* Cartons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 8px',
          background: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px'
        }}>
          <span>🟨</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f97316', fontWeight: 'bold' }}>
              {cardsEstimate.toFixed(1)} cartons
            </span>
            <span style={{ color: '#f97316', fontSize: '8px' }}>
              Réussite: {Math.round(baseSuccessRate * 0.85)}%
            </span>
          </div>
        </div>
        
        {/* Corners */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 8px',
          background: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px'
        }}>
          <span>🚩</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
              {cornersEstimate.toFixed(1)} corners
            </span>
            <span style={{ color: '#3b82f6', fontSize: '8px' }}>
              Réussite: {Math.round(baseSuccessRate * 0.9)}%
            </span>
          </div>
        </div>
        
        {/* BTTS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 8px',
          background: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px'
        }}>
          <span>🔄</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: bttsProb >= 50 ? '#22c55e' : '#888', fontWeight: 'bold' }}>
              Les 2 marquent
            </span>
            <span style={{ color: bttsProb >= 50 ? '#22c55e' : '#666', fontSize: '8px' }}>
              Probabilité: {bttsProb}%
            </span>
          </div>
        </div>
      </div>
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
  const [balance, setBalance] = useState(100);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'deposit', amount: 100, date: new Date().toISOString(), desc: 'Solde initial' }
  ]);

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

// Section Résultats - Taux de réussite
function ResultsSection() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'overall'>('daily');

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Charger les stats détaillées
    fetch('/api/results?action=stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    
    // Charger l'historique
    fetch('/api/results?action=history')
      .then(res => res.json())
      .then(data => {
        setHistory(data.predictions || []);
      })
      .catch(() => {});
  };

  // Vérifier les résultats d'hier
  const handleCheckResults = async () => {
    setChecking(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_results' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        // Recharger les données
        loadData();
      } else {
        setMessage(`❌ ${data.error || 'Erreur lors de la vérification'}`);
      }
    } catch (error) {
      setMessage('❌ Erreur de connexion');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        Chargement des statistiques...
      </div>
    );
  }

  // Récupérer les stats de la période active
  const currentStats = stats?.[activePeriod] || {
    totalPredictions: 0,
    results: { total: 0, correct: 0, rate: 0 },
    goals: { total: 0, correct: 0, rate: 0 },
    cards: { total: 0, correct: 0, rate: 0 },
    overall: 0,
    wins: 0,
    losses: 0,
    winRate: 0
  };

  // Vérifier s'il y a des données
  const hasData = stats?.overall?.totalPredictions > 0 || currentStats.totalPredictions > 0 || history.length > 0;

  // Si aucune donnée, afficher un message explicatif
  if (!hasData && !loading) {
    return (
      <div style={{
        background: '#111',
        borderRadius: '12px',
        padding: '30px',
        border: '1px solid #8b5cf630',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '12px' }}>
          Aucune statistique disponible
        </h3>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
          Les pronostics seront automatiquement enregistrés lorsque vous consultez les matchs du jour.
          <br />Revenez ici après avoir consulté les pronostics !
        </p>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#eab308', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            💡 Comment ça marche ?
          </p>
          <ul style={{ color: '#888', fontSize: '12px', textAlign: 'left', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '6px' }}>1️⃣ Allez dans l'onglet <strong style={{ color: '#f97316' }}>Pronostics</strong></li>
            <li style={{ marginBottom: '6px' }}>2️⃣ Les matchs du jour sont automatiquement sauvegardés</li>
            <li style={{ marginBottom: '6px' }}>3️⃣ Cliquez sur <strong style={{ color: '#8b5cf6' }}>Vérifier les résultats</strong> après les matchs</li>
          </ul>
        </div>
        <button
          onClick={() => loadData()}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🔄 Actualiser les statistiques
        </button>
      </div>
    );
  }

  // Noms des périodes pour l'affichage
  const periodLabels: Record<string, string> = {
    daily: 'du Jour',
    weekly: 'de la Semaine',
    monthly: 'du Mois',
    overall: 'Globales'
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
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'daily', label: 'Jour', icon: '📅' },
          { key: 'weekly', label: 'Semaine', icon: '📆' },
          { key: 'monthly', label: 'Mois', icon: '🗓️' },
          { key: 'overall', label: 'Global', icon: '📊' }
        ].map(period => (
          <button
            key={period.key}
            onClick={() => setActivePeriod(period.key as any)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activePeriod === period.key ? '#8b5cf6' : '#1a1a1a',
              color: activePeriod === period.key ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{period.icon}</span> {period.label}
          </button>
        ))}
      </div>

      {/* En-tête période */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        padding: '12px',
        background: 'linear-gradient(135deg, #1a1a2a 0%, #2a1a3a 100%)',
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#8b5cf6' }}>
          📈 Statistiques {periodLabels[activePeriod]}
        </span>
        {activePeriod === 'daily' && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Depuis minuit (00h00) • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
        {activePeriod === 'weekly' && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Depuis lundi 00h00
          </div>
        )}
        {activePeriod === 'monthly' && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Depuis le 1er du mois
          </div>
        )}
      </div>

      {/* Stats principales - Taux global + Victoires/Défaites */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Taux global */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a3a 100%)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: '1px solid #8b5cf640'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>🎯 Taux Global</div>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold',
            color: currentStats.overall >= 60 ? '#22c55e' : currentStats.overall >= 40 ? '#eab308' : '#ef4444'
          }}>
            {currentStats.overall}%
          </div>
        </div>

        {/* Victoires */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>✅ Victoires</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#22c55e' }}>
            {currentStats.wins || currentStats.results?.correct || 0}
          </div>
        </div>

        {/* Défaites */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>❌ Défaites</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ef4444' }}>
            {currentStats.losses || ((currentStats.results?.total || 0) - (currentStats.results?.correct || 0))}
          </div>
        </div>

        {/* Taux de réussite */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>📊 Win Rate</div>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold',
            color: (currentStats.winRate || currentStats.results?.rate || 0) >= 60 ? '#22c55e' : '#f97316'
          }}>
            {currentStats.winRate || currentStats.results?.rate || 0}%
          </div>
        </div>
      </div>

      {/* Stats détaillées par type de pronostic */}
      <div style={{
        background: '#0d0d0d',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid #8b5cf620'
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          color: '#8b5cf6',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          📋 Performance par Type de Pronostic
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Résultats 1N2 */}
          <div style={{ 
            textAlign: 'center', 
            padding: '14px', 
            background: '#1a1a1a', 
            borderRadius: '8px',
            border: '1px solid #f9731620'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚽</div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Résultats 1N2</div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 'bold',
              color: (currentStats.results?.rate || 0) >= 60 ? '#22c55e' : (currentStats.results?.rate || 0) >= 40 ? '#eab308' : '#ef4444'
            }}>
              {currentStats.results?.rate || 0}%
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              {currentStats.results?.correct || 0}/{currentStats.results?.total || 0}
            </div>
          </div>

          {/* Buts Over/Under */}
          <div style={{ 
            textAlign: 'center', 
            padding: '14px', 
            background: '#1a1a1a', 
            borderRadius: '8px',
            border: '1px solid #3b82f620'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🥅</div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Buts O/U</div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 'bold',
              color: (currentStats.goals?.rate || 0) >= 60 ? '#22c55e' : (currentStats.goals?.rate || 0) >= 40 ? '#eab308' : '#ef4444'
            }}>
              {currentStats.goals?.rate || 0}%
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              {currentStats.goals?.correct || 0}/{currentStats.goals?.total || 0}
            </div>
          </div>

          {/* Cartons */}
          <div style={{ 
            textAlign: 'center', 
            padding: '14px', 
            background: '#1a1a1a', 
            borderRadius: '8px',
            border: '1px solid #ef444420'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🟨</div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Cartons</div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 'bold',
              color: (currentStats.cards?.rate || 0) >= 60 ? '#22c55e' : (currentStats.cards?.rate || 0) >= 40 ? '#eab308' : '#ef4444'
            }}>
              {currentStats.cards?.rate || 0}%
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              {currentStats.cards?.correct || 0}/{currentStats.cards?.total || 0}
            </div>
          </div>
        </div>
      </div>

      {/* En attente / Vérifiés */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '12px', 
          background: '#1a1a1a', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>
            {currentStats.pending || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>⏳ En attente</div>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '12px', 
          background: '#1a1a1a', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>
            {currentStats.completed || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>✅ Vérifiés</div>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>Performance du modèle</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {currentStats.overall}% de réussite
          </span>
        </div>
        <div style={{
          height: '12px',
          background: '#333',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${currentStats.overall}%`,
            background: `linear-gradient(90deg, ${currentStats.overall >= 60 ? '#22c55e' : currentStats.overall >= 40 ? '#eab308' : '#ef4444'}, ${currentStats.overall >= 60 ? '#10b981' : currentStats.overall >= 40 ? '#f59e0b' : '#dc2626'})`,
            borderRadius: '6px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Historique récent */}
      <div style={{
        background: '#0d0d0d',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px' 
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#8b5cf6' }}>
            📜 Historique récent
          </span>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {history.length} matchs vérifiés
          </span>
        </div>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px' }}>
              Aucun résultat disponible pour le moment
            </div>
          ) : (
            history.slice(0, 8).map((pred, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #222',
                fontSize: '13px'
              }}>
                <div style={{ flex: '1' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    {pred.homeTeam} {pred.homeScore} - {pred.awayScore} {pred.awayTeam}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {pred.predictedResult === 'home' ? '1' : pred.predictedResult === 'away' ? '2' : 'N'}
                    {pred.goalsMatch !== undefined && ` • Buts: ${pred.goalsMatch ? '✓' : '✗'}`}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  background: pred.resultMatch ? '#22c55e20' : '#ef444420',
                  color: pred.resultMatch ? '#22c55e' : '#ef4444'
                }}>
                  {pred.resultMatch ? '✅' : '❌'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note explicative */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#1a1a1a',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#888',
        textAlign: 'center'
      }}>
        💡 <strong>Calcul des stats:</strong> Chaque type de pronostic (résultat, buts, cartons) est évalué séparément. 
        Le taux global combine toutes les prédictions correctes.
        <br />🔒 Données protégées par signature cryptographique.
      </div>

      {/* Bouton vérification */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={handleCheckResults}
          disabled={checking}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: checking ? '#333' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            color: '#fff',
            cursor: checking ? 'wait' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
          }}
        >
          {checking ? '⏳ Vérification...' : '🔍 Vérifier les résultats d\'hier'}
        </button>
        
        {message && (
          <div style={{
            marginTop: '12px',
            padding: '10px 16px',
            borderRadius: '8px',
            background: message.startsWith('✅') ? '#22c55e20' : '#ef444420',
            color: message.startsWith('✅') ? '#22c55e' : '#ef4444',
            fontSize: '13px'
          }}>
            {message}
          </div>
        )}
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
