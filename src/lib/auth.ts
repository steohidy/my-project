/**
 * Configuration d'authentification
 * Support multi-utilisateurs avec limite de connexions simultanées
 */

// Utilisateurs autorisés (en production, utiliser une base de données avec hash)
interface User {
  username: string;
  password: string;
  name: string;
  role: string;
  maxConnections: number;
}

const VALID_USERS: User[] = [
  {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '1234567890',
    name: 'Administrateur',
    role: 'admin',
    maxConnections: 10,
  },
  {
    username: process.env.DEMO_USER || 'demo',
    password: process.env.DEMO_PASSWORD || '0987654321',
    name: 'Utilisateur Démo',
    role: 'demo',
    maxConnections: 6,
  },
];

// Store pour les sessions actives (en production, utiliser Redis)
const activeSessions = new Map<string, { username: string; createdAt: number }>();

// Limite globale de connexions simultanées
const MAX_GLOBAL_CONNECTIONS = 6;

// Session duration in milliseconds (24 hours)
export const SESSION_DURATION = 24 * 60 * 60 * 1000;

/**
 * Vérifie les identifiants de connexion
 */
export function verifyCredentials(username: string, password: string): { valid: boolean; user?: User } {
  const user = VALID_USERS.find(
    u => u.username === username && u.password === password
  );
  
  if (user) {
    return { valid: true, user };
  }
  
  return { valid: false };
}

/**
 * Vérifie si de nouvelles connexions sont autorisées
 */
export function canCreateNewSession(username: string): boolean {
  // Nettoyer les sessions expirées
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now - session.createdAt > SESSION_DURATION) {
      activeSessions.delete(token);
    }
  }
  
  // Compter les sessions actives globales
  const totalActiveSessions = activeSessions.size;
  
  // Vérifier la limite globale
  if (totalActiveSessions >= MAX_GLOBAL_CONNECTIONS) {
    return false;
  }
  
  // Vérifier la limite par utilisateur
  const userSessions = Array.from(activeSessions.values())
    .filter(s => s.username === username).length;
  
  const user = VALID_USERS.find(u => u.username === username);
  if (user && userSessions >= user.maxConnections) {
    return false;
  }
  
  return true;
}

/**
 * Enregistre une nouvelle session
 */
export function registerSession(token: string, username: string): void {
  activeSessions.set(token, { username, createdAt: Date.now() });
}

/**
 * Supprime une session
 */
export function removeSession(token: string): void {
  activeSessions.delete(token);
}

/**
 * Obtient le nombre de sessions actives
 */
export function getActiveSessionsCount(): number {
  return activeSessions.size;
}

/**
 * Génère un token de session simple
 * En production, utiliser JWT avec secret fort
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash un mot de passe avec SHA-256
 * Note: En production, utiliser bcrypt ou argon2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Vérifie si une session est valide
 */
export function isSessionValid(sessionExpiry: number): boolean {
  return Date.now() < sessionExpiry;
}

/**
 * Configuration de sécurité
 */
export const securityConfig = {
  // Rate limiting: max 5 tentatives par 15 minutes
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  
  // Cookie settings
  cookieName: 'steo_elite_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_DURATION / 1000,
  },
};
