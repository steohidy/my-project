import { NextResponse } from 'next/server';
import { securityConfig } from '@/lib/auth';

/**
 * POST - Déconnexion
 * Supprime les cookies de session
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Supprimer le cookie de session sécurisé
  response.cookies.delete(securityConfig.cookieName);
  
  // Supprimer le cookie de données de session
  response.cookies.delete('steo_elite_session_data');
  
  return response;
}
