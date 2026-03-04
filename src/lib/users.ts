/**
 * Système de gestion des utilisateurs
 * - Comptes Admin/Demo : permanents (pas d'expiration)
 * - Comptes Utilisateurs : 3 mois de validité à partir de la première connexion
 */

export interface User {
  login: string;
  password: string;
  role: 'admin' | 'demo' | 'user';
  firstLoginDate: string | null;  // Date de première connexion (ISO string)
  expiresAt: string | null;       // Date d'expiration (ISO string)
  isActive: boolean;
  lastLoginAt: string | null;
}

// Durée de validité des comptes utilisateurs (en mois)
const USER_VALIDITY_MONTHS = 3;

/**
 * Base de données des utilisateurs
 * Les comptes admin et demo n'ont pas de date d'expiration
 */
export const USERS_DB: User[] = [
  // ===== COMPTES ADMIN (permanents) =====
  {
    login: 'admin',
    password: 'admin123',
    role: 'admin',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },
  {
    login: 'demo',
    password: 'demo123',
    role: 'demo',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },

  // ===== COMPTES UTILISATEURS (3 mois de validité) =====
  {
    login: 'DD',
    password: '112233',
    role: 'user',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },
  {
    login: 'Lyno',
    password: '223345',
    role: 'user',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },
  {
    login: 'Elcapo',
    password: '234673',
    role: 'user',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },
  {
    login: 'PJ',
    password: '775553',
    role: 'user',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  },
  {
    login: 'Hans',
    password: '547633',
    role: 'user',
    firstLoginDate: null,
    expiresAt: null,
    isActive: true,
    lastLoginAt: null
  }
];

// Stockage des utilisateurs actifs (avec leurs dates)
// En production, cela serait dans une base de données
let activeUsers: Map<string, User> = new Map();

// Initialiser avec la base de données
USERS_DB.forEach(user => {
  activeUsers.set(user.login.toLowerCase(), { ...user });
});

/**
 * Récupère un utilisateur par son login
 */
export function getUserByLogin(login: string): User | undefined {
  return activeUsers.get(login.toLowerCase());
}

/**
 * Vérifie si un compte est expiré
 */
export function isAccountExpired(user: User): boolean {
  // Les comptes admin et demo n'expirent jamais
  if (user.role === 'admin' || user.role === 'demo') {
    return false;
  }

  // Si pas encore connecté, pas expiré
  if (!user.expiresAt) {
    return false;
  }

  // Vérifier la date d'expiration
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  return now > expiresAt;
}

/**
 * Vérifie les identifiants et gère l'expiration
 */
export function validateUser(login: string, password: string): {
  success: boolean;
  user?: User;
  error?: string;
  daysRemaining?: number;
} {
  const user = getUserByLogin(login);

  if (!user) {
    return { success: false, error: 'Identifiant incorrect' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Mot de passe incorrect' };
  }

  if (!user.isActive) {
    return { success: false, error: 'Compte désactivé' };
  }

  // Vérifier l'expiration
  if (isAccountExpired(user)) {
    return { success: false, error: 'Compte expiré. Veuillez contacter l\'administrateur.' };
  }

  // Première connexion -> définir la date d'expiration
  const now = new Date();
  
  if (!user.firstLoginDate && user.role === 'user') {
    user.firstLoginDate = now.toISOString();
    
    // Calculer la date d'expiration (3 mois)
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + USER_VALIDITY_MONTHS);
    user.expiresAt = expiresAt.toISOString();
    
    console.log(`📅 Première connexion pour ${login}. Compte valide jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}`);
  }

  // Mettre à jour la dernière connexion
  user.lastLoginAt = now.toISOString();

  // Calculer les jours restants
  let daysRemaining: number | undefined;
  if (user.expiresAt && user.role === 'user') {
    const expiresAt = new Date(user.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    success: true,
    user: {
      ...user,
      password: '' // Ne pas renvoyer le mot de passe
    },
    daysRemaining
  };
}

/**
 * Récupère tous les utilisateurs (pour l'admin)
 */
export function getAllUsers(): Omit<User, 'password'>[] {
  return Array.from(activeUsers.values()).map(user => ({
    ...user,
    password: ''
  }));
}

/**
 * Désactive un compte utilisateur
 */
export function deactivateUser(login: string): boolean {
  const user = getUserByLogin(login);
  if (user && user.role !== 'admin') {
    user.isActive = false;
    return true;
  }
  return false;
}

/**
 * Réactive un compte utilisateur
 */
export function reactivateUser(login: string): boolean {
  const user = getUserByLogin(login);
  if (user) {
    user.isActive = true;
    return true;
  }
  return false;
}

/**
 * Prolonge la validité d'un compte
 */
export function extendUserValidity(login: string, months: number): boolean {
  const user = getUserByLogin(login);
  if (user && user.role === 'user') {
    const now = new Date();
    const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : now;
    currentExpiry.setMonth(currentExpiry.getMonth() + months);
    user.expiresAt = currentExpiry.toISOString();
    return true;
  }
  return false;
}

/**
 * Nettoie les comptes expirés (peut être appelé périodiquement)
 */
export function cleanupExpiredAccounts(): number {
  let cleaned = 0;
  activeUsers.forEach((user, login) => {
    if (user.role === 'user' && isAccountExpired(user)) {
      user.isActive = false;
      cleaned++;
      console.log(`🗑️ Compte expiré désactivé: ${login}`);
    }
  });
  return cleaned;
}

/**
 * Obtient les statistiques des utilisateurs
 */
export function getUserStats(): {
  total: number;
  active: number;
  expired: number;
  admin: number;
  demo: number;
  regular: number;
} {
  const users = Array.from(activeUsers.values());
  
  return {
    total: users.length,
    active: users.filter(u => u.isActive && !isAccountExpired(u)).length,
    expired: users.filter(u => isAccountExpired(u)).length,
    admin: users.filter(u => u.role === 'admin').length,
    demo: users.filter(u => u.role === 'demo').length,
    regular: users.filter(u => u.role === 'user').length
  };
}

/**
 * Ajoute un nouvel utilisateur
 */
export function addUser(data: {
  login: string;
  password: string;
  role: 'admin' | 'demo' | 'user';
  isActive: boolean;
}): boolean {
  const loginLower = data.login.toLowerCase();
  
  // Vérifier si l'utilisateur existe déjà
  if (activeUsers.has(loginLower)) {
    return false;
  }

  const newUser: User = {
    login: data.login,
    password: data.password,
    role: data.role,
    firstLoginDate: null,
    expiresAt: null,
    isActive: data.isActive,
    lastLoginAt: null
  };

  activeUsers.set(loginLower, newUser);
  console.log(`✅ Nouvel utilisateur créé: ${data.login} (${data.role})`);
  return true;
}

/**
 * Modifie un utilisateur existant
 */
export function updateUser(login: string, data: {
  password?: string;
  role?: 'admin' | 'demo' | 'user';
  isActive?: boolean;
  expiresAt?: string | null;
}): boolean {
  const user = getUserByLogin(login);
  
  if (!user) {
    return false;
  }

  // Ne pas modifier l'admin principal
  if (user.role === 'admin' && login.toLowerCase() === 'admin') {
    return false;
  }

  if (data.password !== undefined) {
    user.password = data.password;
  }
  if (data.role !== undefined) {
    user.role = data.role;
  }
  if (data.isActive !== undefined) {
    user.isActive = data.isActive;
  }
  if (data.expiresAt !== undefined) {
    user.expiresAt = data.expiresAt;
  }

  console.log(`📝 Utilisateur modifié: ${login}`);
  return true;
}

/**
 * Supprime un utilisateur
 */
export function deleteUser(login: string): boolean {
  const user = getUserByLogin(login);
  
  if (!user) {
    return false;
  }

  // Ne pas supprimer l'admin principal
  if (user.role === 'admin' && login.toLowerCase() === 'admin') {
    return false;
  }

  activeUsers.delete(login.toLowerCase());
  console.log(`🗑️ Utilisateur supprimé: ${login}`);
  return true;
}
