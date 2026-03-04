import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateSessionToken, securityConfig, SESSION_DURATION, canCreateNewSession, registerSession } from '@/lib/auth';

// Store simple pour le rate limiting (en production, utiliser Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Vérifie et nettoie les anciennes tentatives de connexion
 */
function cleanOldAttempts() {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > securityConfig.lockoutDuration) {
      loginAttempts.delete(ip);
    }
  }
}

/**
 * Vérifie si l'IP est bloquée par rate limiting
 */
function isRateLimited(ip: string): boolean {
  cleanOldAttempts();
  const attempts = loginAttempts.get(ip);

  if (!attempts) return false;

  if (Date.now() - attempts.lastAttempt > securityConfig.lockoutDuration) {
    loginAttempts.delete(ip);
    return false;
  }

  return attempts.count >= securityConfig.maxLoginAttempts;
}

/**
 * Enregistre une tentative de connexion échouée
 */
function recordFailedAttempt(ip: string) {
  const existing = loginAttempts.get(ip);

  if (existing) {
    existing.count++;
    existing.lastAttempt = Date.now();
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
}

/**
 * Réinitialise les tentatives après une connexion réussie
 */
function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * POST - Connexion avec vérification des identifiants et expiration
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: 'Identifiant et mot de passe requis' },
        { status: 400 }
      );
    }

    const sanitizedUsername = username.trim().slice(0, 50);
    const sanitizedPassword = password.slice(0, 100);

    // Vérifier les identifiants avec le nouveau système
    const result = verifyCredentials(sanitizedUsername, sanitizedPassword);

    if (!result.valid || !result.user) {
      recordFailedAttempt(ip);
      await new Promise(resolve => setTimeout(resolve, 500));

      return NextResponse.json(
        { success: false, error: result.error || 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    if (!canCreateNewSession(sanitizedUsername)) {
      return NextResponse.json(
        { success: false, error: 'Limite de connexions simultanées atteinte. Réessayez plus tard.' },
        { status: 403 }
      );
    }

    resetAttempts(ip);

    const sessionToken = generateSessionToken();
    const sessionExpiry = Date.now() + SESSION_DURATION;

    registerSession(sessionToken, sanitizedUsername);

    // Déterminer le type d'abonnement
    const subscription = result.user.role === 'admin' || result.user.role === 'demo'
      ? 'premium'
      : 'standard';

    const response = NextResponse.json({
      success: true,
      user: {
        id: `${result.user.role}-user`,
        username: result.user.username,
        name: result.user.name,
        role: result.user.role,
        subscription,
        daysRemaining: result.user.daysRemaining,
        expiresAt: result.user.expiresAt,
      },
    });

    response.cookies.set({
      name: securityConfig.cookieName,
      value: sessionToken,
      ...securityConfig.cookieOptions,
      expires: new Date(sessionExpiry),
    });

    response.cookies.set({
      name: 'steo_elite_session_data',
      value: JSON.stringify({
        expiry: sessionExpiry,
        user: sanitizedUsername,
        name: result.user.name,
        role: result.user.role,
        daysRemaining: result.user.daysRemaining,
      }),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_DURATION / 1000,
    });

    return response;
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
